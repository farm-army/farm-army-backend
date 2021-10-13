"use strict";

const _ = require("lodash");
const BigNumber = require("bignumber.js");
const Web3EthContract = require("web3-eth-contract");
const Utils = require("../../utils");

const Farms = require('./farms/farms.json');
const STAKING_ABI = require('./abi/staking.json');

module.exports = class jul {
  constructor(cacheManager, priceOracle, tokenCollector) {
    this.cacheManager = cacheManager;
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector;
  }

  async getLbAddresses() {
    const lbAddresses = []

    for (const [key, value] of Object.entries(Farms)) {
      if (value.ADDRESS && key.match(/^[\w]{2,4}_[\w]{2,4}$/)) {
        lbAddresses.push(value.ADDRESS)
      }
    }

    return _.uniq(lbAddresses);
  }

  async getAddressFarms(address) {
    const cacheKey = `getAddressFarms-jul-${address}`;
    const cache = await this.cacheManager.get(cacheKey);
    if (cache) {
      return cache;
    }

    const pools = await this.getFarms();

    const tokenCalls = pools.map(farm => {
      const vault = new Web3EthContract(STAKING_ABI, farm.raw.contract);

      return {
        id: farm.id,
        balanceOf: vault.methods.balanceOf(address),
      };
    });

    const calls = await Utils.multiCall(tokenCalls);

    const result = calls
      .filter(v => new BigNumber(v.balanceOf).isGreaterThan(0))
      .map(v => v.id);

    await this.cacheManager.set(cacheKey, result, {ttl: 60 * 5});

    return result;
  }

  async getFarms(refresh = false) {
    const cacheKey = "getFarms-jul";
    if (!refresh) {
      const cache = await this.cacheManager.get(cacheKey);
      if (cache) {
        return cache;
      }
    }

    const stakingCalls = []
    for (const [key, value] of Object.entries(Farms)) {
      if (key.endsWith('_STAKING')) {
        const vault = new Web3EthContract(STAKING_ABI, value.ADDRESS);

        stakingCalls.push({
          id: key,
          contract: value.ADDRESS,
          totalSupply: vault.methods.totalSupply(),
          rewardsToken: vault.methods.rewardsToken(),
          stakingToken: vault.methods.stakingToken(),
          periodFinish: vault.methods.periodFinish(),
        });
      }
    }

    const calls = await Utils.multiCall(stakingCalls);

    const farms = [];

    calls.forEach(call => {
      if (call.periodFinish <= 0 || !call.stakingToken || !call.rewardsToken) {
        return;
      }

      let name = call.id.replace('_STAKING', '').replace('_', ' ').replace('_', ' ').trim().replace(' ', '-');

      const item = {
        id: `jul_staking_${call.id.toLowerCase()}`,
        name: name,
        token: name.toLowerCase(),
        provider: "jul",
        raw: Object.freeze(call),
        link: "https://info.julswap.com/staking",
        has_details: true,
        extra: {},
        earns: [],
        chain: 'bsc',
      };

      item.extra.transactionToken = call.stakingToken;
      item.extra.transactionAddress = call.contract;

      const earnToken = this.tokenCollector.getTokenByAddress(call.rewardsToken)
      if (earnToken) {
        item.earns.push(earnToken.symbol)
      }

      if (call.totalSupply && call.totalSupply > 0) {
        item.tvl = {
          amount: call.totalSupply / (10 ** this.tokenCollector.getDecimals(item.extra.transactionToken))
        };

        let price = this.priceOracle.findPrice(call.stakingToken);
        if (price) {
          item.tvl.usd = item.tvl.amount * price;
        }
      }

      farms.push(item);
    })

    await this.cacheManager.set(cacheKey, farms, {ttl: 60 * 30});

    console.log("jul updated");

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

    const tokenCalls = addressFarms.map(farmId => {
      const farm = farms.find(f => f.id === farmId)
      const vault = new Web3EthContract(STAKING_ABI, farm.raw.contract);

      return {
        id: farm.id,
        earned: vault.methods.earned(address),
        rewards: vault.methods.rewards(address),
        balanceOf: vault.methods.balanceOf(address),
      };
    });

    const calls = await Utils.multiCall(tokenCalls);

    return calls.map(call => {
      const farm = farms.find(f => f.id === call.id);

      const result = {
        farm: farm
      };

      result.deposit = {
        symbol: "?",
        amount: call.balanceOf / 1e18
      };

      let price = this.priceOracle.findPrice(farm.raw.stakingToken);
      if (price) {
        result.deposit.usd = result.deposit.amount * price;
      }

      const rewardAmount = call.earned || 0
      if (rewardAmount > 0) {
        const reward = {
          amount: rewardAmount / 1e18,
          symbol: farm['earns'] && farm['earns'][0] ? farm['earns'][0] : 'unknown'
        };

        const price = this.priceOracle.findPrice(farm.raw.rewardsToken, reward.symbol);
        if (price) {
          reward.usd = reward.amount * price;
        }

        result.rewards = [reward];
      }


      return result;
    });
  }

  async getTransactions(address, id) {
    const farm = (await this.getFarms()).find(f => f.id === id);
    if (!farm) {
      return {};
    }

    return Utils.getTransactions(
      farm.extra.transactionAddress,
      farm.extra.transactionToken,
      address
    );
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
};
