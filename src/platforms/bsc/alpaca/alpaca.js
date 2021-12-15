"use strict";

const _ = require("lodash");
const Web3EthContract = require("web3-eth-contract");
const BigNumber = require("bignumber.js");
const Utils = require("../../../utils");
var crypto = require('crypto');

const FairlaunchAbi = require('./abi/fairlaunch.json');
const WorkerAbi = require('./abi/worker.json');
const VaultworkerAbi = require('./abi/vaultworker.json');
const FallbackVaults = require('./farms/fallback.json');

const fetch = require("node-fetch");
const AbortController = require("abort-controller")
const walk = require("acorn-walk");
const acorn = require("acorn");

module.exports = class alpaca {
  ibTokenMapping = {
    // ibWBNB => BNB
    ['0xd7D069493685A581d27824Fc46EdA46B7EfC0063'.toLowerCase()]: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
    // ibBUSD => BUSD
    ['0x7C9e73d4C71dae564d41F78d56439bB4ba87592f'.toLowerCase()]: '0xe9e7cea3dedca5984780bafc599bd69add087d56',
    // ibETH => ETH
    ['0xbfF4a34A4644a113E8200D7F1D79b3555f723AfE'.toLowerCase()]: '0x2170ed0880ac9a755fd29b2688956bd959f933f8',
    // ibALPACA => ALPACA
    ['0xf1bE8ecC990cBcb90e166b71E368299f0116d421'.toLowerCase()]: '0x8F0528cE5eF7B51152A59745bEfDD91D97091d2F',
    // ibBTCB => BTCB
    ['0x08FC9Ba2cAc74742177e0afC3dC8Aed6961c24e7'.toLowerCase()]: '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c',
    // ibTUSD => TUSD
    ['0x3282d2a151ca00BfE7ed17Aa16E42880248CD3Cd'.toLowerCase()]: '0x14016e85a25aeb13065688cafb43044c2ef86784',
    // ibUSDT => USDT
    ['0x158Da805682BdC8ee32d52833aD41E74bb951E59'.toLowerCase()]: '0x55d398326f99059ff775485246999027b3197955',
  }

  constructor(cacheManager, priceOracle, tokenCollector, liquidityTokenCollector, farmPlatformResolver) {
    this.cacheManager = cacheManager;
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector;
    this.liquidityTokenCollector = liquidityTokenCollector;
    this.farmPlatformResolver = farmPlatformResolver;
  }

  async getAddressFarms(address) {
    const cacheKey = `getAddressFarms-v2-alpaca-${address}`;

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    const farms = await this.getFarms();

    const stakeCalls = [];
    farms.forEach(farm => {
      if (farm.id.startsWith('alpaca_stake_')) {
        const contract = new Web3EthContract(FairlaunchAbi, farm.raw.masterAddress);

        stakeCalls.push({
          id: farm.id,
          userInfo: contract.methods.userInfo(farm.raw.pid, address)
        });
      }
    })

    const stake = await Utils.multiCall(stakeCalls);

    const all = stake
      .filter(v => new BigNumber(v.userInfo[0] || 0).isGreaterThan(0))
      .map(v => v.id);

    const positions = await this.getAddressPositions(address)

    positions.forEach(p => {
      const farm = farms.find(f => f.id.startsWith('alpaca_vault_') && f.raw.address.toLowerCase() === p.worker.toLowerCase());

      if (farm) {
        all.push(farm.id)
      }
    })

    await this.cacheManager.set(cacheKey, all, {ttl: 60 * 5});

    return all;
  }

  async getAddressPositions(address) {
    const cacheKey = `getAddressPositions-v3-alpaca-${address}`;

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    const json = await Utils.requestJsonGetRetry(`https://api.alpacafinance.org/v2/positions?owner=${encodeURIComponent(address)}&limit=100&offset=0`)

    const positions = [];
    if (json.data && json.data.positions) {
      json.data.positions.forEach(p => {
        if (!p.liquidatedBy && p.debtShare && parseInt(p.debtShare) > 0) {
          positions.push(p)
        }
      })
    } else {
      console.log('alpagraph error: ', address)
      await this.cacheManager.set(cacheKey, positions, {ttl: 60 * 30});

      return []
    }

    await this.cacheManager.set(cacheKey, positions, {ttl: 60 * 5});

    return positions;
  }

  async getRawFarms() {
    const cacheKey = "getRawFarms-alpaca-v1";

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    const javascriptFiles = await Utils.getJavascriptFiles("https://app.alpacafinance.org");
    let response = {};

    Object.values(javascriptFiles).forEach(body => {
      walk.simple(acorn.parse(body, {ecmaVersion: 'latest'}), {
        Literal(node) {
          if (node.value && node.value.toString().startsWith('{') && (node.value.toString().toLowerCase().includes('0x5379F32C8D5F663EACb61eeF63F722950294f452'.toLowerCase()) && node.value.toString().toLowerCase().includes('ProxyAdmin'.toLowerCase()))) {
            try {
              const foo = JSON.parse(node.value);
              if (foo?.Vaults) {
                response = JSON.parse(node.value);
              }
            } catch (e) {
              console.log('invalid farm json')
            }
          }
        }
      })
    });

    await this.cacheManager.set(cacheKey, response, {ttl: 60 * 60 * 3});

    return response;
  }

  async getFarms(refresh = false) {
    const cacheKey = "getFarms-alpaca-v2";

    if (!refresh) {
      const cache = await this.cacheManager.get(cacheKey)
      if (cache) {
        return cache;
      }
    }

    const response = await this.getRawFarms();
    if (!response?.FairLaunch || !response?.Vaults) {
      return [];
    }

    const idMap = {};
    response.FairLaunch.pools.forEach(pool => {
      idMap[pool.address] = pool.id
    })

    const vaultConfigCalls = [];

    response.Vaults.forEach(bearing => {
      bearing.workers.forEach(vault => {
        const contract = new Web3EthContract(VaultworkerAbi, vault.address);

        if (vault.address) {
          vaultConfigCalls.push({
            address: vault.address,
            lpToken: contract.methods.lpToken(),
            shareToBalance: contract.methods.shareToBalance(1000),
            totalShare: contract.methods.totalShare(),
          });
        }
      })
    })

    const vaultConfig = await Utils.multiCallIndexBy('address', vaultConfigCalls);

    const farms = [];

    response.Vaults.forEach(bearing => {
      let id = crypto.createHash('md5')
        .update(`${bearing.symbol.toLowerCase()}`)
        .digest("hex");

      let item = {
        id: `alpaca_stake_${id}`,
        name: bearing.symbol,
        token: bearing.symbol.replace('ib', '').toLowerCase().replace('wbnb', 'bnb'),
        platform: 'pancake',
        raw: {
          name: bearing.name,
          symbol: bearing.symbol,
          address: bearing.address,
          debtToken: bearing.debtToken,
          masterAddress: response.FairLaunch.address
        },
        provider: "alpaca",
        has_details: false,
        link: 'https://app.alpacafinance.org/stake',
        extra: {},
        earns: ['alpaca'],
        chain: 'bsc',
      };

      if (idMap[bearing.debtToken]) {
        item.raw.pid = idMap[bearing.debtToken];
      }

      farms.push(item);

      bearing.workers.forEach(vault => {
        let id = crypto.createHash('md5')
          .update(`${bearing.symbol.toLowerCase()}_${vault.name.toLowerCase()}`)
          .digest("hex");

        const ibVault = _.cloneDeep(vault);

        ibVault.ibDebtToken = bearing.debtToken;
        ibVault.ibAddress = bearing.address;

        if (vaultConfig[vault.address] && vaultConfig[vault.address].lpToken) {
          ibVault.lpToken = vaultConfig[vault.address].lpToken;
        }

        const item = {
          id: `alpaca_vault_${id}`,
          name: vault.name.replace(/(\s+(.*)worker)/i, '').replace('wbnb', 'bnb').trim(),
          platform: 'pancake',
          raw: Object.freeze(ibVault),
          provider: "alpaca",
          has_details: true,
          link: 'https://app.alpacafinance.org/farm',
          extra: {},
          earns: ['alpaca'],
          chain: 'bsc',
          leverage: true,
          compound: true
        };

        const workerPlatform = ibVault.name.match(/\s+(.*)worker/i);
        if (workerPlatform) {
          item.platform = workerPlatform[1].toLowerCase();
        }

        item.extra.transactionToken = vault.stakingToken;

        if (vault.stakingToken && this.liquidityTokenCollector.get(vault.stakingToken)) {
          item.extra.lpAddress = vault.stakingToken
        } else if(vault.name.match(/^([\w]{0,9})-([\w]{0,9})\s*/g)) {
          item.extra.lpAddress = vault.stakingToken
        }

        if (vault.stakingToken) {
          const platform = this.farmPlatformResolver.findMainPlatformNameForTokenAddress(vault.stakingToken);
          if (platform) {
            item.platform = platform;
          }
        }

        let vaultConfigFetch = vaultConfig[vault.address];
        if (vaultConfigFetch && vaultConfigFetch.lpToken && vaultConfigFetch.totalShare > 0 && vaultConfigFetch.shareToBalance > 0) {
          item.tvl = {
            amount: (vaultConfigFetch.totalShare / (10 ** this.tokenCollector.getDecimals(vaultConfigFetch.lpToken))) * (vaultConfigFetch.shareToBalance / 1000)
          };

          const addressPrice = this.priceOracle.getAddressPrice(vaultConfigFetch.lpToken);
          if (addressPrice) {
            item.tvl.usd = item.tvl.amount * addressPrice;
          }
        }

        farms.push(item);
      })
    })

    await this.cacheManager.set(cacheKey, farms, {ttl: 60 * 30});

    console.log("alpaca updated");

    return farms;
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

    let positions = []
    if (farmIds.find(id => id.startsWith('alpaca_vault_'))) {
      positions = await this.getAddressPositions(address)
    }

    const stakeCalls = [];
    farmIds.forEach(id => {
      const farm = farms.find(farm => farm.id === id);

      if (farm.id.startsWith('alpaca_stake_')) {
        const contract = new Web3EthContract(FairlaunchAbi, farm.raw.masterAddress);

        stakeCalls.push({
          id: farm.id,
          userInfo: contract.methods.userInfo(farm.raw.pid, address),
          pendingReward: contract.methods.pendingAlpaca(farm.raw.pid, address),
        });
      }

      if (farm.id.startsWith('alpaca_vault_')) {
        const position = positions.find(p => farm.raw.address.toLowerCase() === p.worker.toLowerCase());
        if (position) {
          const contract = new Web3EthContract(WorkerAbi, position.vault);

          stakeCalls.push({
            id: farm.id,
            positionInfo: contract.methods.positionInfo(position.positionId),
          });
        }
      }
    })

    const calls = await Utils.multiCall(stakeCalls);

    const stakes = calls
      .filter(v =>
        (v.userInfo && new BigNumber(v.userInfo[0] || 0).isGreaterThan(0)) ||
        (v.positionInfo && new BigNumber(v.positionInfo[0] || 0).isGreaterThan(0))
      )
      .map(call => {
        const farm = farms.find(f => f.id === call.id);

        const result = {};

        // normal stuff
        if (call.userInfo) {
          const amount = call.userInfo[0] || 0;
          if (amount > 0) {
            result.deposit = {
              symbol: "?",
              amount: amount / 1e18
            };
          }
        }

        // positions
        if (call.positionInfo) {
          // positionInfo[0]: position full value
          // positionInfo[1]: debit
          const amount = call.positionInfo[0] || 0;
          if (amount > 0) {
            result.deposit = {
              symbol: "?",
              amount: (amount - (call.positionInfo[1] || 0)) / 1e18, //  bnb or busd
            };

            if (farm.raw.ibAddress && this.ibTokenMapping[farm.raw.ibAddress.toLowerCase()]) {
              const price = this.priceOracle.getAddressPrice(this.ibTokenMapping[farm.raw.ibAddress.toLowerCase()]); // bnb or busd
              if (price) {
                result.deposit.usd = result.deposit.amount * price;

                // reverse lp amount based on the usd price
                if (farm.raw.lpToken) {
                  let lpPrice = this.priceOracle.findPrice(farm.raw.lpToken);
                  if (lpPrice) {
                    result.deposit.amount = result.deposit.usd / lpPrice
                  }
                }
              }
            }
          }
        }

        const rewards = call.pendingReward || 0;
        if (rewards > 0) {
          const reward = {
            symbol: farm.earns[0],
            amount: rewards / 1e18
          };

          const priceReward = this.priceOracle.getAddressPrice('0x8F0528cE5eF7B51152A59745bEfDD91D97091d2F'); // alpaca
          if (priceReward) {
            reward.usd = reward.amount * priceReward;
          }

          result.rewards = [reward];
        }

        result.farm = farm;

        return result;
      });

    return stakes;
  }

  async getTransactions(address, id) {
    return [];
  }

  async getDetails(address, id) {
    const farm = (await this.getFarms()).find(f => f.id === id);
    if (!farm) {
      return {};
    }

    const [yieldFarms] = await Promise.all([
      this.getYieldsInner(address, [farm.id]),
    ]);

    const result = {};

    let lpTokens = [];
    if (yieldFarms[0]) {
      result.farm = yieldFarms[0];
      lpTokens = this.priceOracle.getLpSplits(farm, yieldFarms[0]);
    }

    if (lpTokens && lpTokens.length > 0) {
      result.lpTokens = lpTokens;
    }

    return result;
  }

  getName() {
    return 'alpaca';
  }
};
