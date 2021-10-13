"use strict";

const crypto = require('crypto');
const BigNumber = require("bignumber.js");
const Web3EthContract = require("web3-eth-contract");
const Utils = require("../../../utils");

const VAULT_ABI = require('./abi/vault.json');
const ERC20_ABI = require('../../../abi/erc20.json');

module.exports = class quickswap {
  constructor(cacheManager, priceOracle, tokenCollector, liquidityTokenCollector) {
    this.cacheManager = cacheManager;
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector;
    this.liquidityTokenCollector = liquidityTokenCollector;
  }

  async getLbAddresses() {
    return (await this.getRawFarms())
      .filter(f => f.pair)
      .map(f => f.pair);
  }

  async getRawFarms() {
    const cacheKey = `getRawFarms-github-${this.getName()}`;

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    const result = await Utils.requestGet('https://raw.githubusercontent.com/vfat-tools/vfat-tools/master/src/static/js/matic_quick.js');

    let match = result.match(/const\s*QuickStakingContracts\s*=\s*/);
    const pos = match.index;

    let x = result
      .substring(pos)
      .replace(/const\s*QuickStakingContracts\s*=\s*/, "")

    const pools = eval(x) || [];

    await this.cacheManager.set(cacheKey, pools, {ttl: 60 * 60 * 5});

    return pools;
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

    const calls = [];

    rawFarms.forEach(myPool => {
      const token = new Web3EthContract(VAULT_ABI, myPool.stakingRewardAddress);

      calls.push({
        stakingRewardAddress: myPool.stakingRewardAddress.toLowerCase(),
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

      // single token?
      if (!symbol) {
        return;
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
        platform: 'quickswap',
        main_platform: 'quickswap',
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

    await this.cacheManager.set(cacheKey, farms, {ttl: 60 * 30});

    console.log(`${this.getName()} updated`);

    return farms;
  }

  async getAddressInfo(address) {
    let cacheKey = `getAddressInfo-${this.getName()}-${address}`;

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
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

    await this.cacheManager.set(cacheKey, result, {ttl: 60});

    return result;
  }

  async getAddressFarms(address) {
    let cacheKey = `getAddressFarms-${this.getName()}-${address}`;

    const cache = await this.cacheManager.get(cacheKey)
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
    return 'quickswap';
  }

  getChain() {
    return 'polygon';
  }
}