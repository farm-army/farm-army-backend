"use strict";

const _ = require("lodash");
const Web3EthContract = require("web3-eth-contract");
const BigNumber = require("bignumber.js");
const Utils = require("../../utils");
const crypto = require('crypto');
const MasterAbi = require('./abi/master.json');

module.exports = class mdex {
  constructor(cache, priceOracle, tokenCollector, farmCollector, cacheManager) {
    this.cache = cache;
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector;
    this.farmCollector = farmCollector;
    this.cacheManager = cacheManager;
  }

  async getFetchedFarms() {
    const cacheKey = `mdex-v1-master-farms`

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    const foo = (await this.farmCollector.fetchForMasterChef('0xc48fe252aa631017df253578b1405ea399728a50'));

    const reformat = foo.map(f => {
      f.lpAddresses = f.lpAddress

      if (f.isTokenOnly === true) {
        f.tokenAddresses = f.lpAddress
      }

      return f
    })

    await this.cacheManager.set(cacheKey, reformat, {ttl: 60 * 30})

    return reformat;
  }

  async getLbAddresses() {
    return (await this.getFarms())
      .filter(item => item.extra.lpAddress)
      .map(item => item.extra.lpAddress);
  }

  async getAddressFarms(address) {
    const cacheKey = `getAddressFarms-mdex-${address}`;

    const cacheItem = this.cache.get(cacheKey);
    if (cacheItem) {
      return cacheItem;
    }

    const farms = await this.getFarms();

    const stakeCalls = farms.map(farm => {
      const contract = new Web3EthContract(MasterAbi, '0xc48fe252aa631017df253578b1405ea399728a50');

      return {
        id: farm.id,
        userInfo: contract.methods.userInfo(farm.raw.pid, address)
      };
    })

    const stake = await Utils.multiCall(stakeCalls);

    const all = stake
      .filter(v => new BigNumber(v.userInfo[0] || 0).isGreaterThan(0))
      .map(v => v.id);

    this.cache.put(cacheKey, all, { ttl: 300 * 1000 });

    return all;
  }

  async getFarms(refresh = false) {
    const cacheKey = "getFarms-mdex";

    if (!refresh) {
      const cacheItem = this.cache.get(cacheKey);
      if (cacheItem) {
        return cacheItem;
      }
    }

    const rawFarms = await this.getFetchedFarms()

    const farms = rawFarms.map(farm => {
      let id = crypto.createHash('md5')
        .update(farm.pid.toString())
        .digest("hex");

      let item = {
        id: `mdex_${id}`,
        name: farm.lpSymbol.toUpperCase(),
        token: farm.lpSymbol.toLowerCase(),
        platform: 'mdex',
        raw: Object.freeze(farm),
        provider: 'mdex',
        has_details: true,
        link: `https://mdex.com/#/pool/liquidity/mdx/${encodeURIComponent(farm.pid.toString())}`,
        extra: {},
        earns: ['mdx'],
      };

      item.extra.transactionToken = farm.lpAddress
      item.extra.transactionAddress = '0xc48fe252aa631017df253578b1405ea399728a50'

      if (item.token.includes('-')) {
        item.extra.lpAddress = farm.lpAddress;
      }

      return item;
    })

    this.cache.put(cacheKey, farms, { ttl: 1000 * 60 * 30 });

    console.log("mdex updated");

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

    const stakeCalls = farmIds.map(farmId => {
      const farm = farms.find(f => f.id === farmId)
      const contract = new Web3EthContract(MasterAbi, '0xc48fe252aa631017df253578b1405ea399728a50');

      return {
        id: farm.id,
        userInfo: contract.methods.userInfo(farm.raw.pid, address),
        pendingReward: contract.methods.pending(farm.raw.pid, address),
      };
    })

    const calls = await Utils.multiCall(stakeCalls);

    const stakes = calls
      .filter(v =>
        v.userInfo && new BigNumber(v.userInfo[0] || 0).isGreaterThan(0)
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

            let price = this.priceOracle.findPrice(farm.extra.transactionToken);
            if (price) {
              result.deposit.usd = result.deposit.amount * price;
            }
          }
        }

        const rewards = call.pendingReward[0] || 0;
        if (rewards > 0) {
          const reward = {
            symbol: farm.earns[0],
            amount: rewards / 1e18
          };

          const priceReward = this.priceOracle.getAddressPrice('0x9c65ab58d8d978db963e63f2bfb7121627e3a739'); // mdx
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
    const farm = (await this.getFarms()).find(f => f.id === id);
    if (!farm) {
      return {};
    }

    if (farm.extra.transactionAddress && farm.extra.transactionToken) {
      return Utils.getTransactions(
        farm.extra.transactionAddress,
        farm.extra.transactionToken,
        address
      );
    }

    return [];
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

    return result;
  }

  getName() {
    return 'mdex';
  }
};
