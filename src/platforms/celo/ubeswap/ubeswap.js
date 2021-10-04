"use strict";

const crypto = require('crypto');
const BigNumber = require("bignumber.js");
const Web3EthContract = require("web3-eth-contract");
const Utils = require("../../../utils");

const MULTI_REWARD_ABI = require('./abi/multi_reward_abi.json');
const ERC20_ABI = require('../../../abi/erc20.json');

module.exports = class ubeswap {
  constructor(cache, priceOracle, tokenCollector, liquidityTokenCollector) {
    this.cache = cache;
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector;
    this.liquidityTokenCollector = liquidityTokenCollector;
  }

  async getLbAddresses() {
    const rawFarms = await this.getRawFarms();

    const calls = [];

    rawFarms.forEach(myPool => {
      const token = new Web3EthContract(MULTI_REWARD_ABI, myPool.stakingRewardAddress);

      calls.push({
        stakingToken: token.methods.stakingToken(),
      });
    });

    const callsResult = (await Utils.multiCall(calls, this.getChain()))
      .filter(i => i.stakingToken)
      .map(i => i.stakingToken);

    return callsResult;
  }

  async getRawFarms() {
    const cacheKey = `getRawFarms-v3-${this.getName()}`;

    const cacheItem = this.cache.get(cacheKey);
    if (cacheItem) {
      return cacheItem;
    }

    const pools = [
      {
        address: "0xd930501A0848DC0AA3E301c7B9b8AFE8134D7f5F",
        underlyingPool: "0x19F1A692C77B481C23e9916E3E83Af919eD49765",
        basePool: "0x19F1A692C77B481C23e9916E3E83Af919eD49765",
        numRewards: 2,
        active: !0
      },
      {
        address: "0xbbC8C824c638fd238178a71F5b1E5Ce7e4Ce586B",
        underlyingPool: "0x66bD2eF224318cA5e3A93E165e77fAb6DD986E89",
        basePool: "0x66bD2eF224318cA5e3A93E165e77fAb6DD986E89",
        numRewards: 2,
        active: !0
      },
      {
        address: "0x0F3d01aea89dA0b6AD81712Edb96FA7AF1c17E9B",
        underlyingPool: "0x08252f2E68826950d31D268DfAE5E691EE8a2426",
        basePool: "0x08252f2E68826950d31D268DfAE5E691EE8a2426",
        numRewards: 2,
        active: !0
      },
      {
        address: "0x9D87c01672A7D02b2Dc0D0eB7A145C7e13793c3B",
        underlyingPool: "0x295D6f96081fEB1569d9Ce005F7f2710042ec6a1",
        basePool: "0x295D6f96081fEB1569d9Ce005F7f2710042ec6a1",
        numRewards: 2,
        active: !0
      },
      {
        address: "0x194478Aa91e4D7762c3E51EeE57376ea9ac72761",
        underlyingPool: "0xD7D6b5213b9B9DFffbb7ef008b3cF3c677eb2468",
        basePool: "0xD7D6b5213b9B9DFffbb7ef008b3cF3c677eb2468",
        numRewards: 2,
        active: !0
      },
      {
        address: "0x2f0ddEAa9DD2A0FB78d41e58AD35373d6A81EbB0",
        underlyingPool: "0xaf13437122cd537C5D8942f17787cbDBd787fE94",
        basePool: "0xaf13437122cd537C5D8942f17787cbDBd787fE94",
        numRewards: 2,
        active: !1
      },
      {
        address: "0x84Bb1795b699Bf7a798C0d63e9Aad4c96B0830f4",
        underlyingPool: "0xC087aEcAC0a4991f9b0e931Ce2aC77a826DDdaf3",
        basePool: "0xC087aEcAC0a4991f9b0e931Ce2aC77a826DDdaf3",
        numRewards: 2,
        active: !1
      },
      {
        address: "0x3d823f7979bB3af846D8F1a7d98922514eA203fC",
        underlyingPool: "0xb030882bfc44e223fd5e20d8645c961be9b30bb3",
        basePool: "0xaf13437122cd537C5D8942f17787cbDBd787fE94",
        numRewards: 3,
        active: !0
      },
      {
        address: "0x3c7beeA32A49D96d72ce45C7DeFb5b287479C2ba",
        underlyingPool: "0x8f309df7527f16dff49065d3338ea3f3c12b5d09",
        basePool: "0xC087aEcAC0a4991f9b0e931Ce2aC77a826DDdaf3",
        numRewards: 3,
        active: !0
      },
      {
        basePool: "0xA6f2ea3008E6BA42B0D3c09159860De24591cd0E",
      },
      {
        basePool: "0x9CbA6392D0c15F6437c7e6085A1350c5862c5aBB",
      }
    ].map(i => {
      i.stakingRewardAddress = i.basePool;

      return i;
    });

    this.cache.put(cacheKey, pools, {ttl: 600 * 1000});

    return pools;
  }

  async getFarms(refresh = false) {
    let cacheKey = `getFarms-${this.getName()}`;

    if (!refresh) {
      const cacheItem = this.cache.get(cacheKey);
      if (cacheItem) {
        return cacheItem;
      }
    }

    const rawFarms = await this.getRawFarms();

    const calls = [];

    rawFarms.forEach(myPool => {
      const token = new Web3EthContract(MULTI_REWARD_ABI, myPool.stakingRewardAddress);

      calls.push({
        stakingRewardAddress: myPool.basePool.toLowerCase(),
        stakingToken: token.methods.stakingToken(),
        rewardsToken: token.methods.rewardsToken(),
      });
    });

    const callsResult = await Utils.multiCallIndexBy('stakingRewardAddress', calls, this.getChain());

    Object.values(callsResult).forEach(c => {
      if (!c.stakingToken || !c.stakingRewardAddress) {
        return;
      }

      const contract = new Web3EthContract(ERC20_ABI, c.stakingToken);

      calls.push({
        stakingRewardAddress: c.stakingRewardAddress.toLowerCase(),
        balanceOf: contract.methods.balanceOf(c.stakingRewardAddress),
        decimals: contract.methods.decimals(),
      });
    });

    const callsTvl = await Utils.multiCallIndexBy('stakingRewardAddress', calls, this.getChain());

    const farms = [];

    rawFarms.forEach(farm => {
      let id = crypto.createHash('md5')
        .update(farm.stakingRewardAddress.toLowerCase())
        .digest('hex');

      let info = callsResult[farm.stakingRewardAddress.toLowerCase()];

      let lpAddress = undefined;

      let symbol = undefined;

      // resolve: lp pools
      if (info && info.stakingToken) {
        symbol = this.liquidityTokenCollector.getSymbolNames(info.stakingToken);
        if (symbol) {
          lpAddress = info.stakingToken;
        }
      }

      if (!symbol) {
        symbol = '?';
      }

      const item = {
        id: `${this.getName()}_${id}`,
        name: symbol.toUpperCase(),
        token: symbol.toLowerCase(),
        provider: this.getName(),
        has_details: true,
        raw: Object.freeze(farm),
        extra: {},
        chain: this.getChain(),
        platform: 'ubeswap',
        main_platform: 'ubeswap',
      };

      item.extra.transactionAddress = farm.stakingRewardAddress;
      item.extra.transactionToken = info.stakingToken;

      if (lpAddress) {
        item.extra.lpAddress = item.extra.transactionToken;
      }

      if (info.rewardsToken) {
        const rewardToken = this.tokenCollector.getTokenByAddress(info.rewardsToken);
        if (rewardToken) {
          item.earn = [rewardToken];

          if (rewardToken.symbol) {
            item.earns = [rewardToken.symbol];
          }
        }
      }

      let infoTvl = callsTvl[farm.stakingRewardAddress.toLowerCase()];
      if (infoTvl) {
        const decimals = infoTvl.decimals || 18
        item.tvl = {
          amount: infoTvl.balanceOf / (10 ** decimals)
        };

        if (item.extra.transactionToken) {
          let price = this.priceOracle.findPrice(item.extra.transactionToken);
          if (price) {
            item.tvl.usd = item.tvl.amount * price;
          }
        }
      }

      farms.push(Object.freeze(item));
    });

    this.cache.put(cacheKey, farms, {ttl: 1000 * 60 * 30});

    console.log(`${this.getName()} updated`);

    return farms;
  }

  async getAddressInfo(address) {
    let cacheKey = `getAddressInfo-${this.getName()}-${address}`;

    const cacheItem = this.cache.get(cacheKey);
    if (cacheItem) {
      return cacheItem;
    }

    const pools = await this.getFarms();

    const tokenCalls = pools.map(myPool => {
      const token = new Web3EthContract(MULTI_REWARD_ABI, myPool.raw.stakingRewardAddress);

      return {
        id: myPool.id,
        balanceOf: token.methods.balanceOf(address),
        rewards: token.methods.earned(address),
      };
    });

    const calls = await Utils.multiCall(tokenCalls, this.getChain());

    const result = calls.filter(v =>
      new BigNumber(v.balanceOf).isGreaterThan(0) ||
      new BigNumber(v.rewards || 0).isGreaterThan(0)
    );

    this.cache.put(cacheKey, result, {ttl: 60 * 1000});

    return result;
  }

  async getAddressFarms(address) {
    let cacheKey = `getAddressFarms-${this.getName()}-${address}`;

    const cacheItem = this.cache.get(cacheKey);
    if (cacheItem) {
      return cacheItem;
    }

    const calls = await this.getAddressInfo(address);

    const result = calls
      .filter(v => new BigNumber(v.balanceOf).isGreaterThan(0) || new BigNumber(v.rewards || 0).isGreaterThan(0))
      .map(v => v.id);

    this.cache.put(cacheKey, result, {ttl: 300 * 1000});

    return result;
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
    const calls = (await this.getAddressInfo(address)).filter(c => addressFarms.includes(c.id));

    const results = [];
    calls.forEach(call => {
      const farm = farms.find(f => f.id === call.id);

      const result = {
        farm: farm
      };

      let depositDecimals = farm.extra.transactionToken ? this.tokenCollector.getDecimals(farm.extra.transactionToken) : 18;
      result.deposit = {
        symbol: "?",
        amount: call.balanceOf / (10 ** depositDecimals)
      };

      if (farm.extra.transactionToken) {
        let price = this.priceOracle.findPrice(farm.extra.transactionToken);
        if (price) {
          result.deposit.usd = result.deposit.amount * price;
        }
      }

      if (new BigNumber(call.rewards).isGreaterThan(0) && farm.earn[0]) {
        const reward = {
          symbol: farm.earn[0].symbol,
          amount: call.rewards / (10 ** farm.earn[0].decimals)
        };

        const price = this.priceOracle.findPrice(farm.earn[0].address);
        if (price) {
          reward.usd = reward.amount * price;
        }

        // ignore reward dust
        if (reward.usd && reward.usd < 0.01 && result.deposit <= 0) {
          return;
        }

        result.rewards = [reward];
      }

      results.push(result);
    });

    return results;
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

    return result;
  }

  getName() {
    return 'ubeswap';
  }

  getChain() {
    return 'celo';
  }
}