"use strict";

const crypto = require('crypto');
const BigNumber = require("bignumber.js");
const Web3EthContract = require("web3-eth-contract");
const Utils = require("../../../utils");
const Curve = require("../../curve");

const GAUGE_ABI = require('./abi/gauge.json');
const LP_TOKEN_ABI = require('./abi/lp_token.json');
const LP_TOKEN_MINTER_ABI = require('./abi/lp_token_minter.json');
const REWARD_CONTRACT_ABI = require('./abi/reward_contract.json');

const POOLS = require('./pools');

module.exports = class fcurve {
  constructor(cacheManager, priceOracle, tokenCollector) {
    this.cacheManager = cacheManager;
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector;
  }

  async getPoolPrices() {
    const prices = await Curve.getPoolPrices(
      POOLS.map(p => p.addresses.lpToken),
      this.getChain(),
      this.priceOracle,
      this.tokenCollector
    );

    return prices;
  }

  async getRawFarms() {
    let cacheKey = `getRawFarms-v3-${this.getName()}`;

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    const pools = POOLS.map(p => {
      let symbol = p.assets
        .replaceAll('+', '-')
        .split('-')
        .map(i => {
          if (i.startsWith('g')) {
            i = i.substring(1);
          } else if(i.startsWith('cy')) {
            i = i.substring(2);
          }

          return i;
        })
        .join('-')
        .toLowerCase();

      return {
        id: p.id,
        name: p.name,
        symbol,
        token: p.addresses.swap,
        lpToken: p.addresses.lpToken,
        gauge: p.addresses.gauge,
        rewardsTokens: (p.additionalRewards || []).map(p => p.rewardTokenAddress),
      }
    });

    const rewardsContracts = pools.map(farm => {
      const token = new Web3EthContract(GAUGE_ABI, farm.gauge);

      return {
        gauge: farm.gauge,
        reward_contract: token.methods.reward_contract(),
      };
    });

    (await Utils.multiCall(rewardsContracts, this.getChain())).forEach(reward => {
      const farm = pools.find(f => f.gauge.toLowerCase() === reward.gauge.toLowerCase())
      if (farm) {
        farm.rewardContract = reward.reward_contract;
      }
    });

    const rewardsReceivers = pools
      .filter(farm => farm.rewardContract)
      .map(farm => {
        const token = new Web3EthContract(REWARD_CONTRACT_ABI, farm.rewardContract);

        return {
          gauge: farm.gauge,
          reward_receiver: token.methods.reward_receiver(),
        };
      });

    (await Utils.multiCall(rewardsReceivers, this.getChain())).forEach(reward => {
      const farm = pools.find(f => f.gauge.toLowerCase() === reward.gauge.toLowerCase())
      if (farm) {
        farm.rewardReceiver = reward.reward_receiver;
      }
    });

    const result = Object.freeze(pools);

    await this.cacheManager.set(cacheKey, result, {ttl: 60 * 60});

    return result;
  }

  async getFarms(refresh = false) {
    let cacheKey = `getFarms-${this.getName()}`;

    if (!refresh) {
      const cache = await this.cacheManager.get(cacheKey)
      if (cache) {
        return cache;
      }
    }

    const rawFarms = await this.getRawFarms();

    const tokenInfoPromises = [];
    const rewardInfoPromises = [];
    const tvlInfoPromises = [];

    rawFarms.forEach(farm => {
      tokenInfoPromises.push({
        gauge: farm.gauge,
        virtualPrice: new Web3EthContract(LP_TOKEN_ABI, farm.token).methods.get_virtual_price(),
      });

      if (farm.rewardReceiver) {
        const lpTokenContract = new Web3EthContract(LP_TOKEN_ABI, farm.lpToken);

        tvlInfoPromises.push({
          gauge: farm.gauge,
          balanceOf: lpTokenContract.methods.balanceOf(farm.rewardReceiver),
          decimals: lpTokenContract.methods.decimals(),
          type: '1',
        });
      }

      const lpTokenContract2 = new Web3EthContract(LP_TOKEN_ABI, farm.lpToken);

      tvlInfoPromises.push({
        gauge: farm.gauge,
        balanceOf: lpTokenContract2.methods.balanceOf(farm.gauge),
        decimals: lpTokenContract2.methods.decimals(),
        type: '2',
      });

      const rewardData = {
        gauge: farm.gauge,
      };

      const token = new Web3EthContract(REWARD_CONTRACT_ABI, farm.rewardContract);
      (farm.rewardsTokens || []).forEach((r, index) => {
        rewardData['reward' + index] = token.methods.reward_data(r);
      })

      rewardInfoPromises.push(rewardData);
    });

    const [rewardInfos, callsResult, tvlInfos] = await Promise.all([
      Utils.multiCallIndexBy('gauge', rewardInfoPromises, this.getChain()),
      Utils.multiCallIndexBy('gauge', tokenInfoPromises, this.getChain()),
      Utils.multiCall(tvlInfoPromises, this.getChain()),
    ]);

    const farms = [];

    const apys = await Utils.requestJsonGet('https://stats.curve.fi/raw-stats-ftm/apys.json');

    const prices = await this.getPoolPrices();

    rawFarms.forEach(farm => {
      let id = crypto.createHash('md5')
        .update(farm.gauge.toLowerCase())
        .digest('hex');

      const item = {
        id: `${this.getName()}_${id}`,
        name: farm.symbol.toUpperCase() + ' (' + farm.name.charAt(0).toUpperCase() + farm.name.slice(1) + ')',
        token: farm.symbol,
        provider: this.getName(),
        has_details: true,
        raw: Object.freeze(farm),
        extra: {},
        chain: 'fantom',
        main_platform: 'curve',
        platform: 'curve',
      };

      item.extra.transactionAddress = farm.gauge;
      item.extra.transactionToken = farm.token;

      let info = callsResult[farm.gauge];
      if (info && info.virtualPrice) {
        item.extra.virtualPrice = info.virtualPrice / 1e18;
      }

      const tvlInfo = tvlInfos.find(t => t.gauge.toLowerCase() === farm.gauge.toLowerCase() && t.balanceOf > 0);
      if (tvlInfo?.balanceOf > 0) {
        item.tvl = {
          amount: tvlInfo.balanceOf / (10 ** tvlInfo.decimals)
        };

        const price = prices[item.extra.transactionToken.toLowerCase()];
        if (price) {
          item.tvl.usd = item.tvl.amount * price;
        }
      }

      if (farm.rewardsTokens) {
        farm.rewardsTokens.forEach(rewardsToken => {
          const rewardToken = this.tokenCollector.getTokenByAddress(rewardsToken);
          if (rewardToken) {
            if (!item.earn) {
              item.earn = [];
            }

            if (!item.earns) {
              item.earns = [];
            }

            item.earn.push(rewardToken);
            item.earns.push(rewardToken.symbol);
          }
        });
      }

      if (apys?.apy?.day && apys?.apy?.day[farm.id]) {
        item.yield = {
          apy: apys?.apy?.day[farm.id] * 100,
        };
      }

      const rewardInfo = rewardInfos[farm.gauge];
      if (rewardInfo) {
        (farm.rewardsTokens || []).forEach((rewardsToken, index) => {
          const rewardTokenInfo = rewardInfo['reward' + index];
          if (!rewardTokenInfo || !item?.tvl?.usd) {
            return;
          }

          const [distributor, periodFinish, rate, duration, received, paid] = Object.values(rewardTokenInfo);

          const secondsPerYear = 31536000;
          const yearlyRewards = (Date.now() / 1000 > periodFinish) ? 0 : rate / (10 ** this.tokenCollector.getDecimals(rewardsToken)) * secondsPerYear;

          const price = this.priceOracle.findPrice(rewardsToken);
          if (!price) {
            return;
          }

          const yearlyRewardsInUsd = yearlyRewards * price;
          const dailyApr = yearlyRewardsInUsd / item.tvl.usd

          if (!item?.yield?.apy) {
            item.yield.apy = 0;
          }

          item.yield.apy += Utils.compound(dailyApr, 8760, 0.94) * 100;
        });
      }

      farms.push(Object.freeze(item));
    });

    await this.cacheManager.set(cacheKey, farms, {ttl: 60 * 30});

    console.log(`${this.getName()} updated`);

    return farms;
  }

  async getAddressFarms(address) {
    let cacheKey = `getAddressFarms-${this.getName()}-${address}`;

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    const pools = await this.getFarms();

    const tokenCalls = pools.map(farm => {
      const token = new Web3EthContract(GAUGE_ABI, farm.raw.gauge);

      return {
        id: farm.id,
        balanceOf: token.methods.balanceOf(address)
      };
    });

    const calls = await Utils.multiCall(tokenCalls, this.getChain());

    const result = calls
      .filter(v => new BigNumber(v.balanceOf).isGreaterThan(0))
      .map(v => v.id);

    await this.cacheManager.set(cacheKey, result, {ttl: 60 * 5});

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

    const tokenCalls = addressFarms.map(id => {
      const farm = farms.find(f => f.id === id);

      const token = new Web3EthContract(GAUGE_ABI, farm.raw.gauge);

      let newVar = {
        id: farm.id,
        balanceOf: token.methods.balanceOf(address),
      };

      farm.earn.forEach((r, index) => {
        newVar['rewards' + index] = token.methods.claimable_reward_write(address, r.address)
      })

      return newVar;
    });

    const calls = await Utils.multiCall(tokenCalls, this.getChain());

    const results = [];
    calls.forEach(call => {
      if (!new BigNumber(call.balanceOf).isGreaterThan(0)) {
        return
      }

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

        if (!price && farm.extra.virtualPrice) {
          price = farm.extra.virtualPrice;
        }

        if (price) {
          result.deposit.usd = result.deposit.amount * price;
        }
      }

      const rewards = [];

      farm.earn.forEach((earn, index) => {
        let rewardAmount = call['rewards' + index] || 0;

        if (new BigNumber(rewardAmount).isGreaterThan(0)) {
          const reward = {
            symbol: earn.symbol,
            amount: call['rewards' + index] / (10 ** earn.decimals)
          };

          const price = this.priceOracle.findPrice(earn.address);
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
    return 'fcurve';
  }

  getChain() {
    return 'fantom';
  }
}