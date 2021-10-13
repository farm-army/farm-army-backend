"use strict";

const Utils = require("../../../utils");
const Web3EthContract = require("web3-eth-contract");
const DebtAbi = require("./abi/debt.json");
const GoblinAbi = require("./abi/goblin.json");
const FairlaunchAbi = require("./abi/fairlaunch.json");
const _ = require("lodash");

module.exports = class rabbit {
  static DEBT_ADDRESS = "0xc18907269640D11E2A91D7204f33C5115Ce3419e"

  constructor(priceOracle, tokenCollector, cacheManager, liquidityTokenCollector, farmPlatformResolver) {
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector;
    this.cacheManager = cacheManager;
    this.liquidityTokenCollector = liquidityTokenCollector;
    this.farmPlatformResolver = farmPlatformResolver;
  }

  async getFarms(refresh = false) {
    const cacheKey = "getFarms-rabbit-v1";

    if (!refresh) {
      const cache = await this.cacheManager.get(cacheKey)
      if (cache) {
        return cache;
      }
    }

    let newVar = await this.getRawFarms();

    const vaultConfigs = await Utils.multiCall(_.uniq(newVar.map(i => i.goblin), (a, b) => a.toLowerCase() === b.toLowerCase()).map(goblin => {
      const contract = new Web3EthContract(GoblinAbi, goblin);

      return {
        goblin: goblin.toLowerCase(),
        lpToken: contract.methods.lpToken(),
        shareToBalance: contract.methods.shareToBalance(1000),
        totalShare: contract.methods.totalShare(),
        mdx: contract.methods.mdx(),
        fairLaunchAddr: contract.methods.fairLaunchAddr(),
        fairLaunchPoolId: contract.methods.fairLaunchPoolId(),
      }
    }), this.getChain());

    const farms = [];

    vaultConfigs.forEach(vaultConfig => {
      const symbol = this.liquidityTokenCollector.getSymbolNames(vaultConfig.lpToken)

      const productions = newVar.filter(z => z.goblin.toLowerCase() === vaultConfig.goblin.toLowerCase());

      const raw = _.cloneDeep(vaultConfig);
      raw.productions = productions;

      const item = {
        id: `rabbit_goblin_${vaultConfig.goblin}`,
        name: (symbol || '?').toUpperCase(),
        token: (symbol || 'unknown').toLowerCase(),
        raw: Object.freeze(raw),
        provider: "rabbit",
        has_details: false,
        link: 'https://rabbitfinance.io/positions',
        extra: {},
        earns: ['rabbit'],
        chain: 'bsc',
        leverage: true,
      };

      if (vaultConfig.mdx) {
        item.earns.push('mdx')
      } else {
        // pancake is compounding
        item.compound = true;
      }

      item.extra.transactionToken = vaultConfig.lpToken;

      if (this.liquidityTokenCollector.get(item.extra.transactionToken)) {
        item.extra.lpAddress = item.extra.transactionToken
      }

      const platform = this.farmPlatformResolver.findMainPlatformNameForTokenAddress(item.extra.transactionToken);
      if (platform) {
        item.platform = platform;
      }

      if (vaultConfig && vaultConfig.lpToken && vaultConfig.totalShare > 0 && vaultConfig.shareToBalance > 0) {
        item.tvl = {
          amount: (vaultConfig.totalShare / (10 ** this.tokenCollector.getDecimals(vaultConfig.lpToken))) * (vaultConfig.shareToBalance / 1000)
        };

        const addressPrice = this.priceOracle.getAddressPrice(vaultConfig.lpToken);
        if (addressPrice) {
          item.tvl.usd = item.tvl.amount * addressPrice;
        }
      }

      farms.push(item);
    })

    await this.cacheManager.set(cacheKey, farms, {ttl: 60 * 30});

    console.log("rabbit updated");

    return farms;
  }

  async getAddressFarms(address) {
    const cacheKey = `getAddressFarms-v5-rabbit-${address}`;

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    let calls1 = [
      {
        reference: 'userPosition',
        contractAddress: rabbit.DEBT_ADDRESS,
        abi: DebtAbi,
        calls: [
          {
            reference: "userPositions",
            method: "getUserPosition",
            parameters: [address]
          }
        ],
      }
    ];

    let calls
    try {
      calls = await Utils.multiCallRpc(calls1, this.getChain());
    } catch (e) {
      console.log(`${this.getChain()} ${this.getName()}: address info failed: ${address} ${e.message}`)
    }

    let result = [];
    if (calls[0] && calls[0].userPositions) {
      result = (calls[0].userPositions || [])
        .filter(position => position.posid.gt(0) && position.positionsValue.gt(0))
        .map(position => position.posid.toString());
    }

    await this.cacheManager.set(cacheKey, result, {ttl: 60 * 30});

    return result;
  }

  async getYields(address) {
    const addressFarms = await this.getAddressFarms(address);
    if (addressFarms.length === 0) {
      return [];
    }

    return await this.getYieldsInner(address, addressFarms);
  }

  async getYieldsInner(address, farmIds) {
    if (farmIds.length === 0) {
      return [];
    }

    const farms = await this.getFarms();

    const calls = await Utils.multiCallIndexBy('id', farmIds.map(id => {
      const contract = new Web3EthContract(DebtAbi, rabbit.DEBT_ADDRESS);

      return {
        id: id.toString(),
        positionInfo: contract.methods.positionInfo(id),
      };
    }), this.getChain());

    const goblins = _.uniq(Object.values(calls).map(call => {
      const [productionId] = Object.values(call.positionInfo);

      const farm = farms.find(f => {
        return f.raw.productions.find(p => p.id === productionId);
      });

      return farm ? farm.raw.goblin : undefined;
    }).filter(p => p), (a, b) => a.toLowerCase() === b.toLowerCase());

    const pendingRabbitCalls = [];
    goblins.forEach(goblin => {
      const farm = farms.find(f => f.raw.goblin.toLowerCase() === goblin.toLowerCase());

      if (farm.raw.fairLaunchAddr && farm.raw.fairLaunchPoolId) {
        const contract = new Web3EthContract(FairlaunchAbi, farm.raw.fairLaunchAddr);

        pendingRabbitCalls.push({
          goblin: goblin.toLowerCase(),
          earned: contract.methods.pendingRabbit(farm.raw.fairLaunchPoolId, address),
        });
      }
    });

    let goblingConfigCalls = goblins.map(goblin => {
      const contract = new Web3EthContract(GoblinAbi, goblin);

      return {
        goblin: goblin.toLowerCase(),
        earned: contract.methods.earned(address),
      };
    });

    const [pendingRabbit, goblinConfigs] = await Promise.all([
      Utils.multiCallIndexBy('goblin', pendingRabbitCalls, this.getChain()),
      Utils.multiCallIndexBy('goblin', goblingConfigCalls, this.getChain()),
    ]);

    const results = [];

    farmIds.forEach(id => {
      const positionInfo = calls[id] && calls[id].positionInfo ? calls[id].positionInfo : undefined;
      if (!positionInfo) {
        return;
      }

      const [productionId, borrowToken, debtShare, owner] = Object.values(positionInfo);

      const farm = farms.find(f => {
        return f.raw.productions.find(p => p.id === productionId);
      });

      const result = {
        farm: farm
      };

      // positions
      // borrowToken: position full value
      // debtShare: debit

      if (borrowToken > 0) {
        const prod = farm.raw.productions.find(p => p.id === productionId);

        const amount = (borrowToken - debtShare) / (10 ** this.tokenCollector.getDecimals(prod.borrowToken));
        result.deposit = {
          symbol: '?',
          amount: amount, // value in borrowToken token
        };

        const price = this.priceOracle.getAddressPrice(prod.borrowToken); // bnb or busd
        if (price) {
          result.deposit.usd = result.deposit.amount * price;

          // reverse lp amount based on the usd price
          let lpPrice = this.priceOracle.findPrice(farm.raw.lpToken);
          if (lpPrice) {
            result.deposit.amount = result.deposit.usd / lpPrice
          }
        }
      }

      const vaultRewards = [];

      // rabbit
      if (pendingRabbit[farm.raw.goblin.toLowerCase()] && pendingRabbit[farm.raw.goblin.toLowerCase()].earned && pendingRabbit[farm.raw.goblin.toLowerCase()].earned > 0) {
        const rewards = pendingRabbit[farm.raw.goblin.toLowerCase()].earned;

        // first wins on multiple goblin positions
        delete pendingRabbit[farm.raw.goblin.toLowerCase()];

        if (rewards > 0) {
          const reward = {
            symbol: 'rabbit',
            amount: rewards  / (10 ** this.tokenCollector.getDecimals('0x95a1199eba84ac5f19546519e287d43d2f0e1b41'))
          };

          const priceReward = this.priceOracle.getAddressPrice('0x95a1199eba84ac5f19546519e287d43d2f0e1b41'); // rabbit
          if (priceReward) {
            reward.usd = reward.amount * priceReward;
          }

          vaultRewards.push(reward);
        }
      }

      // mdex
      if (goblinConfigs[farm.raw.goblin.toLowerCase()] && goblinConfigs[farm.raw.goblin.toLowerCase()].earned && goblinConfigs[farm.raw.goblin.toLowerCase()].earned > 0) {
        const rewards = goblinConfigs[farm.raw.goblin.toLowerCase()].earned;

        // first wins on multiple goblin positions
        delete goblinConfigs[farm.raw.goblin.toLowerCase()];

        if (rewards > 0) {
          const reward = {
            symbol: 'mdx',
            amount: rewards  / (10 ** this.tokenCollector.getDecimals('0x9c65ab58d8d978db963e63f2bfb7121627e3a739'))
          };

          const priceReward = this.priceOracle.getAddressPrice('0x9c65ab58d8d978db963e63f2bfb7121627e3a739'); // mdx
          if (priceReward) {
            reward.usd = reward.amount * priceReward;
          }

          vaultRewards.push(reward);
        }
      }

      if (vaultRewards.length > 0) {
        result.rewards = vaultRewards;
      }

      results.push(result);
    })

    return results;
  }

  getName() {
    return 'rabbit';
  }

  getChain() {
    return 'bsc';
  }

  async getRawFarms() {
    const cacheKey = 'rabbit-farms-v4';

    const cache = await this.cacheManager.get(cacheKey);
    if (cache) {
      return cache;
    }

    const currentPids = await Utils.multiCall([{
      currentPid: new Web3EthContract(DebtAbi, rabbit.DEBT_ADDRESS).methods.currentPid(),
    }], this.getChain());

    const poolCallsPromise = [...Array(parseInt(currentPids[0].currentPid)).keys()].slice(1).map(id => {
      return {
        id: id.toString(),
        pool: new Web3EthContract(DebtAbi, rabbit.DEBT_ADDRESS).methods.productions(id),
      }
    });

    const poolCalls = (await Utils.multiCall(poolCallsPromise, this.getChain()))
      .map(p => ({
        id: p.id,
        coinToken: p.pool[0],
        currencyToken: p.pool[1],
        borrowToken: p.pool[2],
        isOpen: p.pool[3],
        canBorrow: p.pool[4],
        goblin: p.pool[5],
        minDebt: p.pool[6],
        maxDebt: p.pool[7],
        openFactor: p.pool[8],
        liquidateFactor: p.pool[9],
      })).filter(p => p.isOpen === true);

    await this.cacheManager.set(cacheKey, poolCalls, {ttl: 60 * 30});

    return poolCalls;
  }
};
