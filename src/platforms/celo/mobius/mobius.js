"use strict";

const crypto = require('crypto');
const BigNumber = require("bignumber.js");
const Web3EthContract = require("web3-eth-contract");
const Utils = require("../../../utils");

const MULTI_REWARD_ABI = require('./abi/gaugev3.json');
const ERC20_ABI = require('../../../abi/erc20.json');
const AstParser = require("../../../utils/ast_parser");
const _ = require("lodash");

// https://github.com/mobiusAMM/mobius-interface/blob/e9a482a39cf7e89ec91700b02f247b357cc2a902/src/state/stablePools/updater.ts

module.exports = class mobius {
  constructor(cacheManager, priceOracle, tokenCollector, liquidityTokenCollector) {
    this.cacheManager = cacheManager;
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector;
    this.liquidityTokenCollector = liquidityTokenCollector;
  }

  async getLbAddresses() {
    return [];
  }

  async getRawFarms() {
    const cacheKey = `getRawFarms-v3-${this.getName()}`;

    const cache = await this.cacheManager.get(cacheKey);
    if (cache) {
      return cache;
    }

    const files = await Utils.getJavascriptFiles('https://www.mobius.money/');

    const rawPools = [];
    Object.values(files).forEach(f => {
      rawPools.push(...AstParser.createJsonFromObjectExpression(f, keys => keys.includes('gaugeAddress') && keys.includes('name') && keys.includes('tokenAddresses')));
    });

    const pools = rawPools.map(i => {
      i.stakingRewardAddress = i.gaugeAddress;
      return i;
    });

    const calls = [];

    pools.forEach(myPool => {
      const token = new Web3EthContract(MULTI_REWARD_ABI, myPool.stakingRewardAddress);

      calls.push({
        stakingRewardAddress: myPool.stakingRewardAddress,
        stakingToken: token.methods.lp_token(),
        rewardsToken: '0x73a210637f6F6B7005512677Ba6B3C96bb4AA44B',
      });
    });

    const callsResult = await Utils.multiCall(calls, this.getChain());

    const foo = [];
    callsResult.forEach(i => {
      if (!i.stakingToken) {
        return;
      }

      const h = _.merge(
        _.cloneDeep(pools.find(p => p.stakingRewardAddress === i.stakingRewardAddress)),
        i
      );

      foo.push(h);
    });

    await this.cacheManager.set(cacheKey, foo, {ttl: 60 * 30});

    return foo;
  }

  async getFarms(refresh = false) {
    let cacheKey = `getFarms-v2-${this.getName()}`;

    if (!refresh) {
      const cache = await this.cacheManager.get(cacheKey);
      if (cache) {
        return cache;
      }
    }

    const rawFarms = await this.getRawFarms();

    const calls = [];

    Object.values(rawFarms).forEach(c => {
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

      let info = farm;

      let lpAddress = undefined;

      let symbol = undefined;

      // resolve: lp pools
      if (info && info.stakingToken) {
        symbol = this.liquidityTokenCollector.getSymbolNames(info.stakingToken);
        if (symbol) {
          lpAddress = info.stakingToken;
        }
      }

      if (!symbol && info.name) {
        symbol = info.name.replace('Pool', '').trim();
      }

      if (!symbol) {
        symbol = '?';
      }

      const item = {
        id: `${this.getName()}_${id}`,
        name: symbol,
        token: symbol.toLowerCase().replace(/(\s+\(.*\))/i, '').trim().toLowerCase(),
        provider: this.getName(),
        has_details: true,
        raw: Object.freeze(farm),
        extra: {},
        chain: this.getChain(),
        platform: 'mobius',
        main_platform: 'mobius',
      };

      item.extra.transactionAddress = farm.stakingRewardAddress;
      item.extra.transactionToken = info.stakingToken;

      if (lpAddress) {
        item.extra.lpAddress = item.extra.transactionToken;
      }

      item.earn = [info.rewardsToken, info.rewardsToken0, info.rewardsToken1, info.rewardsToken2]
        .filter(r => r)
        .map(address => ({
          'address': address.toLowerCase(),
          'symbol': this.tokenCollector.getSymbolByAddress(address) || '?',
          'decimals': this.tokenCollector.getDecimals(address),
        }));

      item.earns = item.earn.map(r => r.symbol);

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

    await this.cacheManager.set(cacheKey, farms, {ttl: 60 * 30});

    console.log(`${this.getName()} updated`);

    return farms;
  }

  async getAddressInfo(address, fetchRewards = false) {
    let cacheKey = `getAddressInfo-${this.getName()}-${address}-${fetchRewards}`;

    const cache = await this.cacheManager.get(cacheKey);
    if (cache) {
      return cache;
    }

    const pools = await this.getFarms();

    const tokenCalls = pools.map(myPool => {
      const token = new Web3EthContract(MULTI_REWARD_ABI, myPool.raw.stakingRewardAddress);

      const newVar = {
        id: myPool.id,
        balanceOf: token.methods.balanceOf(address),
        rewards: token.methods.claimable_tokens(address),
      };

      if (fetchRewards) {
        if (myPool.raw?.info?.rewardsToken0) {
          newVar.externalRewards0 = token.methods.externalRewards(address, myPool.raw.info.rewardsToken0);
        }

        if (myPool.raw?.info?.rewardsToken1) {
          newVar.externalRewards1 = token.methods.externalRewards(address, myPool.raw.info.rewardsToken1);
        }

        if (myPool.raw?.info?.rewardsToken2) {
          newVar.externalRewards2 = token.methods.externalRewards(address, myPool.raw.info.rewardsToken2);
        }
      }

      return newVar;
    });

    const calls = await Utils.multiCall(tokenCalls, this.getChain());

    const result = calls.filter(v =>
      new BigNumber(v.balanceOf).isGreaterThan(0) ||
      new BigNumber(v.rewards || 0).isGreaterThan(0)
    );

    await this.cacheManager.set(cacheKey, result, {ttl: 60 * 5});

    return result;
  }

  async getAddressFarms(address) {
    let cacheKey = `getAddressFarms-${this.getName()}-${address}`;

    const cache = await this.cacheManager.get(cacheKey);
    if (cache) {
      return cache;
    }

    const calls = await this.getAddressInfo(address);

    const result = calls
      .filter(v => new BigNumber(v.balanceOf).isGreaterThan(0) || new BigNumber(v.rewards || 0).isGreaterThan(0))
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
    const calls = (await this.getAddressInfo(address, true))
      .filter(c => addressFarms.includes(c.id));

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

      const rewards = [];

      [call.rewards, call.externalRewards0, call.externalRewards1, call.externalRewards2]
        .forEach((value, index) => {
          if (!value || !new BigNumber(value).isGreaterThan(0) || !farm.earn[index]) {
            return;
          }

          const reward = {
            symbol: farm.earn[index].symbol,
            amount: call.rewards / (10 ** farm.earn[index].decimals)
          };

          const price = this.priceOracle.findPrice(farm.earn[index].address);
          if (price) {
            reward.usd = reward.amount * price;
          }

          // ignore reward dust
          if (reward.usd && reward.usd < 0.01 && result.deposit <= 0) {
            return;
          }

          rewards.push(reward);
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
    return 'mobius';
  }

  getChain() {
    return 'celo';
  }
}