"use strict";

const crypto = require('crypto');
const BigNumber = require("bignumber.js");
const Web3EthContract = require("web3-eth-contract");
const Utils = require("../../../utils");

const VAULT_ABI = require('./abi/vault.json');
const ERC20_ABI = require('../../../abi/erc20.json');

module.exports = class dfyn {
  constructor(cache, priceOracle, tokenCollector) {
    this.cache = cache;
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector;
  }

  async getLbAddresses() {
    return (await this.getFarms())
      .filter(f => f.extra && f.extra.lpAddress)
      .map(f => f.extra.lpAddress);
  }

  async getRawFarms() {
    const cacheKey = `getRawFarms-github-${this.getName()}`;

    const cacheItem = this.cache.get(cacheKey);
    if (cacheItem) {
      return cacheItem;
    }

    const urls = {
      'dual_stake': 'https://raw.githubusercontent.com/dfyn/dfyn-farms-info/main/dual-stake.js',
      'ecosystem_farms': 'https://raw.githubusercontent.com/dfyn/dfyn-farms-info/main/ecosystem-farms.js',
      'popular_farms': 'https://raw.githubusercontent.com/dfyn/dfyn-farms-info/main/popular-farms.js',
      'pre_staking_farms': 'https://raw.githubusercontent.com/dfyn/dfyn-farms-info/main/pre-staking-farms.js',
    }

    const requests = await Promise.allSettled(Object.values(urls).map(i => Utils.requestGet(i)));

    const pools = {};

    requests.forEach((request, index) => {
      if (request.status !== 'fulfilled') {
        return;
      }

      try {
        pools[Object.keys(urls)[index]] = Object.freeze(eval(request.value));
      } catch (e) {
        console.log('error', e)
      }

    })

    this.cache.put(cacheKey, pools, { ttl: 600 * 1000 });

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

    for (const [__, farmTypeFarms] of Object.entries(rawFarms)) {
      farmTypeFarms.forEach(myPool => {
        const token = new Web3EthContract(VAULT_ABI, myPool.stakingRewardAddress);

        calls.push({
          stakingRewardAddress: myPool.stakingRewardAddress.toLowerCase(),
          stakingToken: token.methods.stakingToken(),
          rewardsToken: token.methods.rewardsToken(),
        });
      });
    }

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

    for (const [farmType, farmTypeFarms] of Object.entries(rawFarms)) {
      farmTypeFarms.forEach(farm => {
        let id = crypto.createHash('md5')
          .update(farm.stakingRewardAddress.toLowerCase())
          .digest('hex');

        const item = {
          id: `${this.getName()}_${farmType}_${id}`,
          name: farm.tokens.map(i => i.symbol).join('-'),
          token: farm.tokens.map(i => i.symbol).join('-').toLowerCase(),
          provider: this.getName(),
          has_details: true,
          raw: Object.freeze(farm),
          extra: {},
          notes: [farmType.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')],
        };

        item.extra.transactionAddress = farm.stakingRewardAddress;

        let info = callsResult[farm.stakingRewardAddress.toLowerCase()];
        if (info && info.stakingToken) {
          item.extra.transactionToken = info.stakingToken;

          if (farm.tokens && farm.tokens.length > 0) {
            item.extra.lpAddress = item.extra.transactionToken;
          }
        }

        if (info.rewardsToken) {
          const rewardToken = this.tokenCollector.getTokenByAddress(info.rewardsToken);
          if (rewardToken) {
            item.earn = [rewardToken];

            if(rewardToken.symbol) {
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
    }

    this.cache.put(cacheKey, farms, { ttl: 1000 * 60 * 30 });

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
      const token = new Web3EthContract(VAULT_ABI, myPool.raw.stakingRewardAddress);

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

    this.cache.put(cacheKey, result, { ttl: 300 * 1000 });

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
    return 'dfyn';
  }

  getChain() {
    return 'polygon';
  }
}