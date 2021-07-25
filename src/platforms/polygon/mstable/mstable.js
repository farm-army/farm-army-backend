"use strict";

const _ = require("lodash");
const Utils = require("../../../utils");
const Web3EthContract = require("web3-eth-contract");
const BigNumber = require("bignumber.js");
const ASSET_ABI = require(`./abi/asset_abi.json`);
const MTOKEN_ABI = require(`./abi/mtoken.json`);

module.exports = class mstable {
  static STATIC_TOKENS = [
    {
      symbol: 'mta',
      address: '0xf501dd45a1198c2e1b5aef5314a68b9006d842e0',
    },
    {
      symbol: 'matic',
      address: '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
    },
  ];

  constructor(cache, priceOracle, tokenCollector) {
    this.cache = cache;
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector
  }

  async getAddressFarms(address) {
    let cacheKey = `getAddressFarms-v1-mstable-${address}`;

    const cacheItem = this.cache.get(cacheKey);
    if (cacheItem) {
      return cacheItem;
    }

    const tokenCalls = (await this.getFarms()).map(farm => {
      const contract = new Web3EthContract(ASSET_ABI, farm.raw.address);
      return {
        id: farm.id.toString(),
        balanceOf: contract.methods.balanceOf(address)
      };
    });

    const result = (await Utils.multiCall(tokenCalls, 'polygon'))
      .filter(v => new BigNumber(v.balanceOf).isGreaterThan(0))
      .map(v => v.id);

    this.cache.put(cacheKey, result, {
      ttl: 300 * 1000
    });

    return result;
  }

  getRawFarms() {
    return [
      {
        id: 1,
        name: 'imUSD Vault',
        address: '0x32aba856dc5ffd5a56bcd182b13380e5c855aa29',
        token: 'USD',
        stakingToken: '0x5290ad3d83476ca6a2b178cd9727ee1ef72432af',
      }
    ];
  }

  async getFarms(refresh = false) {
    const cacheKey = "getFarms-mstable";

    if (!refresh) {
      const cacheItem = this.cache.get(cacheKey);
      if (cacheItem) {
        return cacheItem;
      }
    }

    let rawFarms = this.getRawFarms();

    let mTokenCalls = rawFarms.map(farm => {
      const contract = new Web3EthContract(MTOKEN_ABI, farm.stakingToken);

      return {
        stakingToken: farm.stakingToken.toLowerCase(),
        exchangeRate: contract.methods.exchangeRate(),
      };
    });

    const result = await Utils.multiCallIndexBy('stakingToken', mTokenCalls, 'polygon');

    const farms = rawFarms.map(farm => {
      const item = {
        id: `mstable_${farm.id}`,
        name: farm.name,
        token: farm.token,
        raw: Object.freeze(farm),
        provider: "mstable",
        link: `https://mstable.org/`,
        has_details: true,
        extra: {},
        earns: mstable.STATIC_TOKENS.map(i => i.symbol)
      };

      item.extra.pricePerFullShare = result[farm.stakingToken.toLowerCase()].exchangeRate / 1e18;
      item.extra.transactionAddress = farm.address
      item.extra.transactionToken = farm.stakingToken

      return item;
    });

    this.cache.put(cacheKey, farms, {ttl: 1000 * 60 * 30});

    console.log("mstable updated");

    return farms;
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
        'polygon'
      );
    }

    return [];
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

    const tokenCalls = addressFarms
      .map(farmId => farms.find(f => f.id.toString() === farmId.toString()))
      .map(farm => {
        const contract = new Web3EthContract(ASSET_ABI, farm.raw.address);

        return {
          id: farm.id.toString(),
          balanceOf: contract.methods.balanceOf(address),
          earned: contract.methods.earned(address),
        };
      });

    const result = (await Utils.multiCall(tokenCalls, 'polygon'))
      .filter(v => new BigNumber(v.balanceOf).isGreaterThan(0));

    const results = [];

    result.forEach(call => {
      const farm = farms.find(f => f.id === call.id);

      const result = {
        farm: farm
      };

      result.deposit = {
        symbol: "?",
        amount: call.balanceOf / 1e18
      };

      let price = this.priceOracle.findPrice(farm.raw.stakingToken);
      if (!price) {
        price = 1
      }

      result.deposit.usd = result.deposit.amount * farm.extra.pricePerFullShare * price;

      const rewards = [];

      const xxx = Object.values(call.earned).slice(0, -1);

      xxx.forEach((e, index) => {
        let rewardToken = mstable.STATIC_TOKENS[index];
        if (!rewardToken) {
          return;
        }

        if (new BigNumber(e).isGreaterThan(0)) {
          const reward = {
            symbol: rewardToken.symbol,
            amount: e / 1e18
          };

          const price = this.priceOracle.findPrice(rewardToken.address, rewardToken.symbol);
          if (price) {
            reward.usd = reward.amount * price;
          }

          rewards.push(reward);
        }
      });

      if (rewards.length > 0) {
        result.rewards = rewards;
      }

      results.push(result);
    })

    return results;
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

    if (yieldFarms[0]) {
      result.farm = yieldFarms[0];
    }

    if (transactions && transactions.length > 0) {
      result.transactions = transactions;
    }

    return result;
  }
};
