"use strict";

const _ = require("lodash");
const Web3EthContract = require("web3-eth-contract");
const request = require("async-request");
const BigNumber = require("bignumber.js");
const Utils = require("../../utils");
var crypto = require('crypto');

const FairlaunchAbi = require('./abi/fairlaunch.json');
const WorkerAbi = require('./abi/worker.json');
const VaultworkerAbi = require('./abi/vaultworker.json');

const fetch = require("node-fetch");
const AbortController = require("abort-controller")

module.exports = class acryptos {
  ibTokenMapping = {
    // ibWBNB => BNB
    ['0xd7D069493685A581d27824Fc46EdA46B7EfC0063'.toLowerCase()]: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
    // ibBUSD => BUSD
    ['0x7C9e73d4C71dae564d41F78d56439bB4ba87592f'.toLowerCase()]: '0xe9e7cea3dedca5984780bafc599bd69add087d56',
    // ibETH => BUSD
    ['0xbfF4a34A4644a113E8200D7F1D79b3555f723AfE'.toLowerCase()]: '0x2170ed0880ac9a755fd29b2688956bd959f933f8',
    // ibALPACA => ALPACA
    ['0xf1bE8ecC990cBcb90e166b71E368299f0116d421'.toLowerCase()]: '0x8F0528cE5eF7B51152A59745bEfDD91D97091d2F',
  }

  constructor(cache, priceOracle) {
    this.cache = cache;
    this.priceOracle = priceOracle;
  }

  async getAddressFarms(address) {
    const cacheKey = `getAddressFarms-alpaca-${address}`;

    const cacheItem = this.cache.get(cacheKey);
    if (cacheItem) {
      return cacheItem;
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

    this.cache.put(cacheKey, all, { ttl: 300 * 1000 });

    return all;
  }

  async getAddressPositions(address) {
    const cacheKey = `getAddressPositions-alpaca-${address}`;

    const cacheItem = this.cache.get(cacheKey);
    if (cacheItem) {
      return cacheItem;
    }

    const controller = new AbortController()
    setTimeout(() => controller.abort(), 7600)

    const opts = {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: "{\"operationName\":\"GetPositions\",\"variables\":{\"owner\":\"" + address +  "\"},\"query\":\"query GetPositions($owner: String) {\\n  positions(where: {owner: $owner}, orderBy: createdAt, orderDirection: desc) {\\n    id\\n    worker\\n    owner\\n    debtShare\\n    vaultAddress\\n    posID\\n    liquidatedTxHash\\n    left\\n    posVal\\n    __typename\\n  }\\n}\\n\"}",
      signal: controller.signal
    };

    let json = undefined
    try {
      const foo = await fetch("https://api.thegraph.com/subgraphs/name/alpaca-finance/alpagraph", opts);
      json = await foo.json();
    } catch (e) {
      console.log('alpagraph timeout: ', address, e.message)
      this.cache.put(cacheKey, [], { ttl: 30 * 1000 });

      return []
    }

    const positions = [];
    if (json.data && json.data.positions) {
      json.data.positions.forEach(p => {
        if (!p.liquidatedTxHash && p.debtShare && parseInt(p.debtShare) > 0) {
          positions.push(p)
        }
      })
    } else {
      console.log('alpagraph error: ', address)
      this.cache.put(cacheKey, positions, { ttl: 30 * 1000 });
      return []
    }

    this.cache.put(cacheKey, positions, { ttl: 300 * 1000 });

    return positions;
  }

  async getFarms(refresh = false) {
    const cacheKey = "getFarms-alpaca";

    if (!refresh) {
      const cacheItem = this.cache.get(cacheKey);
      if (cacheItem) {
        return cacheItem;
      }
    }

    const text = await request("https://raw.githubusercontent.com/alpaca-finance/bsc-alpaca-contract/main/.mainnet.json");

    const response = JSON.parse(text.body);
    const farms = [];

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
          });
        }
      })
    })

    const vaultConfig = await Utils.multiCallIndexBy('address', vaultConfigCalls);

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
      };

      if (idMap[bearing.debtToken]) {
        item.raw.pid = idMap[bearing.debtToken];
      }

      farms.push(item);

      bearing.workers.forEach(vault => {
        let id = crypto.createHash('md5')
          .update(`${bearing.symbol.toLowerCase()}_${vault.name.toLowerCase()}`)
          .digest("hex");

        const ibVault = vault

        ibVault.ibDebtToken = bearing.debtToken;
        ibVault.ibAddress = bearing.address;

        if (vaultConfig[vault.address] && vaultConfig[vault.address].lpToken) {
          ibVault.lpToken = vaultConfig[vault.address].lpToken;
        }

        const item = {
          id: `alpaca_vault_${id}`,
          name: vault.name.replace(/(\s+(.*)worker)/i, '').replace('wbnb', 'bnb'),
          platform: 'pancake',
          raw: Object.freeze(vault),
          provider: "alpaca",
          has_details: false,
          link: 'https://app.alpacafinance.org/farm',
          extra: {},
          earns: ['alpaca'],
        };

        farms.push(item);
      })
    })

    this.cache.put(cacheKey, farms, { ttl: 1000 * 60 * 30 });

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
          const contract = new Web3EthContract(WorkerAbi, position.vaultAddress);

          stakeCalls.push({
            id: farm.id,
            positionInfo: contract.methods.positionInfo(position.posID),
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
    return [];
  }
};
