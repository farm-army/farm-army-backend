const Utils = require("../../../utils");
const Web3EthContract = require("web3-eth-contract");
const _ = require("lodash");
const BigNumber = require("bignumber.js");
const MasterV2Abi = require("./abi/masterchef.json");

module.exports = class revenant_farm {
  static MASTER_ADDRESS = '0xe0c43105235C1f18EA15fdb60Bb6d54814299938'

  constructor(priceOracle, tokenCollector, cacheManager, liquidityTokenCollector, farmPlatformResolver) {
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector;
    this.cacheManager = cacheManager;
    this.liquidityTokenCollector = liquidityTokenCollector;
    this.farmPlatformResolver = farmPlatformResolver;
  }

  async getLbAddresses() {
    return (await this.getFarms())
      .filter(farm => farm.extra.transactionToken)
      .map(farm => farm.extra.transactionToken);
  }

  async getRawFarms() {
    const cacheKey = `${this.getName()}-farm-getRawPools-v4`

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    const masterchefInfo = await Utils.multiCall([{
      poolLength: new Web3EthContract(MasterV2Abi, revenant_farm.MASTER_ADDRESS).methods.poolLength(),
    }], this.getChain());

    const numbers = [...Array(parseInt(masterchefInfo[0].poolLength)).keys()];
    const poolsa = await Utils.multiCallRpcIndex(numbers.map(id => ({
      reference: 'poolInfo' + id,
      contractAddress: revenant_farm.MASTER_ADDRESS,
      abi: MasterV2Abi,
      calls: [
        {
          reference: "poolInfo",
          method: "getPoolInfo",
          parameters: [id]
        },
        {
          reference: "rewardToken0",
          method: "RewardTokens",
          parameters: [0]
        },
        {
          reference: "rewardToken1",
          method: "RewardTokens",
          parameters: [1]
        },
        {
          reference: "rewardToken2",
          method: "RewardTokens",
          parameters: [2]
        },
        {
          reference: "rewardToken3",
          method: "RewardTokens",
          parameters: [3]
        }
      ]
    })), this.getChain());

    const result = Object.values(poolsa).map(i => {
      const convertRcpResultObject = Utils.convertRcpResultObject(i.poolInfo);

      convertRcpResultObject.pid = parseInt(i.id.substr('poolInfo'.length));

      convertRcpResultObject.AccRewardsPerShare = convertRcpResultObject.AccRewardsPerShare.map(i => i.toString());
      convertRcpResultObject.AllocPoints = convertRcpResultObject.AllocPoints.map(i => i.toString());

      if (i.rewardToken0) {
        convertRcpResultObject.rewardToken0 = i.rewardToken0;
      }

      if (i.rewardToken1) {
        convertRcpResultObject.rewardToken1 = i.rewardToken1;
      }

      if (i.rewardToken2) {
        convertRcpResultObject.rewardToken2 = i.rewardToken2;
      }

      if (i.rewardToken3) {
        convertRcpResultObject.rewardToken3 = i.rewardToken3;
      }

      if (i.rewardToken4) {
        convertRcpResultObject.rewardToken4 = i.rewardToken4;
      }

      return convertRcpResultObject;
    });

    await this.cacheManager.set(result, Object.freeze(result), {ttl: 60 * 60})

    return Object.freeze(result);
  }

  async getAddressFarms(address) {
    const cacheKey = `getAddressFarms-farm-v3-${this.getName()}-${address}`;

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    const farms = await this.getFarms();

    const tokenCalls = [];

    farms.forEach(farm => {
      tokenCalls.push({
        reference: farm.id,
        contractAddress: revenant_farm.MASTER_ADDRESS,
        abi: MasterV2Abi,
        calls: [
          {
            reference: "userInfo",
            method: "getUserInfo",
            parameters: [farm.raw.pid, address]
          },
        ]
      });
    });

    const calls = Object.values(await Utils.multiCallRpcIndex(tokenCalls, this.getChain()));

    const result = _.uniq(calls
      .filter(v =>
        v?.userInfo?.amount && new BigNumber(v.userInfo.amount.toString()).isGreaterThan(Utils.DUST_FILTER)
      )
      .map(v => v.id));

    await this.cacheManager.set(cacheKey, result, {ttl: 60 * 5});

    return result;
  }

  async getFarms(refresh = false) {
    let cacheKey = `getFarms-farm-v4-${this.getName()}`;

    if (!refresh) {
      const cache = await this.cacheManager.get(cacheKey)
      if (cache) {
        return cache;
      }
    }

    const farms = [];
    (await this.getRawFarms()).forEach(farm => {
      const token = '?';

      const item = {
        id: `${this.getName()}_farm_${farm.pid}`,
        name: token.toUpperCase().trim(),
        token: token.trim(),
        provider: this.getName(),
        has_details: true,
        raw: Object.freeze(farm),
        link: 'https://revenant.finance/creditum/farm',
        extra: {},
        chain: this.getChain(),
      };

      item.extra.transactionToken = farm.stakingToken;
      item.extra.transactionAddress = revenant_farm.MASTER_ADDRESS;

      // resolve: lp pools
      let symbol = this.tokenCollector.getSymbolByAddress(item.extra.transactionToken);
      if (!symbol) {
        symbol = this.liquidityTokenCollector.getSymbolNames(item.extra.transactionToken);

        if (symbol) {
          item.extra.lpAddress = item.extra.transactionToken;
        }
      }

      if (symbol) {
        item.name = symbol.toUpperCase();
        item.token = symbol.toLowerCase();
      }

      const earn = [];

      const found = []

      for (const [key, value] of Object.entries(farm)) {
        if (!key.startsWith('rewardToken') || found.includes(value.toLowerCase())) {
          continue;
        }

        const rewardId = key.substring('rewardToken'.length);
        const allocPoint = farm.AllocPoints[rewardId];
        if (allocPoint > 0) {
          found.push(value.toLowerCase());

          let e = {
            address: value,
            symbol: 'unknown',
            decimals: 18,
          };

          const rewardToken = this.tokenCollector.getTokenByAddress(value);
          if (rewardToken) {
            e = rewardToken;
          }

          earn.push(e);
        }
      }

      if (earn.length > 0) {
        item.earn = earn;
        item.earns = item.earn.map(i => i.symbol);
      }

      const platform = this.farmPlatformResolver.findMainPlatformNameForTokenAddress(item.extra.transactionToken);
      if (platform) {
        item.platform = platform;
      }

      if (farm.stakingTokenTotalAmount) {
        item.tvl = {
          amount: farm.stakingTokenTotalAmount / (10 ** this.tokenCollector.getDecimals(item.extra.transactionToken))
        };

        const price = this.priceOracle.findPrice(item.extra.transactionToken);
        if (price) {
          item.tvl.usd = item.tvl.amount * price;
        }
      }

      item.actions = [
        {
          contract: revenant_farm.MASTER_ADDRESS,
          method: 'deposit',
          inputs: [farm.pid, 0],
          type: 'claim',
        },
        {
          contract: revenant_farm.MASTER_ADDRESS,
          method: 'emergencyWithdraw',
          inputs: [farm.pid],
          type: 'emergency_withdraw',
        }
      ];

      farms.push(Object.freeze(item));
    });

    await this.cacheManager.set(cacheKey, farms, {ttl: 60 * 30});

    console.log(`${this.getName()} updated`);

    return farms;
  }

  async getYields(address) {
    const addressFarms = await this.getAddressFarms(address);
    if (addressFarms.length === 0) {
      return [];
    }

    return await this.getYieldsInner(address, addressFarms);
  }

  async getYieldsInner(address, addressFarms) {
    if (addressFarms.length === 0) {
      return [];
    }

    const farms = await this.getFarms();

    const callsPromise = [];

    addressFarms.forEach(id => {
      const farm = farms.find(f => f.id === id);

      callsPromise.push({
        reference: id,
        contractAddress: revenant_farm.MASTER_ADDRESS,
        abi: MasterV2Abi,
        calls: [
          {
            reference: "userInfo",
            method: "getUserInfo",
            parameters: [farm.raw.pid, address]
          },
          {
            reference: "pendingRewards",
            method: "pendingRewards",
            parameters: [farm.raw.pid, address]
          },
        ]
      });
    });

    const userInfo = await Utils.multiCallRpc(callsPromise, this.getChain());

    const result = userInfo.filter(v =>
      v?.userInfo?.amount && new BigNumber(v.userInfo.amount.toString()).isGreaterThan(Utils.DUST_FILTER)
    );

    return result
      .map(call => {
        const farm = farms.find(f => f.id === call.id);

        const amount = call.userInfo.amount.toString();

        const result = {
          farm: farm
        };

        result.deposit = {
          symbol: '?',
          amount: amount / (10 ** this.tokenCollector.getDecimals(farm.extra.transactionToken)),
        };

        let price = this.priceOracle.findPrice(farm.extra.transactionToken);
        if (price) {
          result.deposit.usd = result.deposit.amount * price;
        }

        const rewards = [];

        (call.pendingRewards || []).forEach((r, index) => {
          const pendingReward = r.toString();

          if (!new BigNumber(pendingReward).isGreaterThan(0)) {
            return;
          }

          if (!farm.earn[index]) {
            return;
          }

          const tokenInfo = farm.earn[index];

          const reward = {
            symbol: this.tokenCollector.getSymbolByAddress(tokenInfo.address) || '?',
            amount: pendingReward / (10 ** this.tokenCollector.getDecimals(tokenInfo.address))
          };

          const price = this.priceOracle.findPrice(tokenInfo.address);
          if (price) {
            reward.usd = reward.amount * price;
          }

          rewards.push(reward);
        });

        if (rewards.length > 0) {
          result.rewards = rewards;
        }

        return result;
      });
  }

  async getTransactions(address, id) {
    const farm = (await this.getFarms()).find(f => f.id === id);
    if (!farm) {
      return {};
    }

    if (farm.extra.transactionAddress && farm.extra.transactionToken) {
      return Utils.getTransactions(
        farm.extra.transactionAddress,
        farm.extra.transactionToken,
        address,
        this.getChain()
      );
    }

    return {};
  }

  async getDetails(address, id) {
    const farm = (await this.getFarms()).find(f => f.id === id);
    if (!farm) {
      return {};
    }

    const [yieldFarms, transactions] = await Promise.all([
      this.getYieldsInner(address, [farm.id]),
      this.getTransactions(address, id)
    ]);

    const result = {};

    let lpTokens = [];
    if (yieldFarms[0]) {
      result.farm = yieldFarms[0];
      lpTokens = this.priceOracle.getLpSplits(farm, yieldFarms[0]);
    }

    if (transactions && transactions.length > 0) {
      result.transactions = transactions;
    }

    if (lpTokens && lpTokens.length > 0) {
      result.lpTokens = lpTokens;
    }

    const yieldDetails = Utils.findYieldForDetails(result);
    if (yieldDetails) {
      result.yield = yieldDetails;
    }

    return result;
  }

  getName() {
    return 'revenant';
  }

  getChain() {
    return 'fantom';
  }
};
