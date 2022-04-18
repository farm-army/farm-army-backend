"use strict";

const BigNumber = require("bignumber.js");
const Web3EthContract = require("web3-eth-contract");
const Utils = require("../../../utils");
const _ = require("lodash");
const DEPOSITOR_ABI = require("./abi/depositor.json");

module.exports = class solidex {
  constructor(cacheManager, priceOracle, tokenCollector, liquidityTokenCollector) {
    this.cacheManager = cacheManager;
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector;
    this.liquidityTokenCollector = liquidityTokenCollector;
  }

  async getLbAddresses() {
    return (await this.getFarms())
      .filter(f => f.extra && f.extra.lpAddress)
      .map(f => f.extra.lpAddress);
  }

  async getRawFarms() {
    const cacheKey = `${this.getName()}-v1-raw-farms`

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    const pools = (await Utils.requestJsonGetRetry('https://api.solidexfinance.com/api/getLPDetails?v=fantom'))?.data?.poolDetailsAll || [];

    const calls = pools
      .filter(p => p.isPoolWhitelisted === true && p.poolAddress)
      .map(pool => {
        const web3EthContract = new Web3EthContract(DEPOSITOR_ABI, '0x26e1a0d851cf28e697870e1b7f053b605c8b060f');

        return {
          pool: pool.poolAddress.toLowerCase(),
          tokenForPool: web3EthContract.methods.tokenForPool(pool.poolAddress),
        };
      });

    let newVar = await Utils.multiCall(calls, this.getChain());

    const p = [];
    newVar.forEach(i => {
      if (!i.tokenForPool || i.tokenForPool.toLowerCase().startsWith('0x00000000000000000000000000000000000')) {
        return;
      }

      const p1 = pools.find(p => p?.poolAddress?.toLowerCase() === i.pool.toLowerCase());
      p1.tokenForPool = i.tokenForPool;
      p.push(p1)
    })

    await this.cacheManager.set(cacheKey, p, {ttl: 60 * 30});

    return p;
  }

  async getFarms(refresh = false) {
    const cacheKey = `getFarms-v2-${this.getName()}`;

    if (!refresh) {
      const cache = await this.cacheManager.get(cacheKey)
      if (cache) {
        return cache;
      }
    }

    const rawFarms = await this.getRawFarms();

    const farms = [];

    rawFarms.forEach(farm => {
      let tokenname = '?';

      if (farm.symbol) {
        tokenname = _.trim(farm.symbol.toLowerCase()
            .replace('samm', '')
            .replace('vamm', '')
            .replace('/', '-')
          , '-')
      }

      let name = this.tokenCollector.getSymbolByAddress(farm.tokenForPool);
      if (!name) {
        name = this.liquidityTokenCollector.getSymbolNames(farm.tokenForPool);
      }

      if (name) {
        tokenname = name;
      }

      const item = {
        id: `${this.getName()}_${farm.poolAddress.toLowerCase()}`,
        name: tokenname.toUpperCase(),
        token: tokenname.toLowerCase(),
        provider: this.getName(),
        has_details: true,
        raw: Object.freeze(farm),
        chain: this.getChain(),
        extra: {},
      };

      item.extra.transactionToken = farm.tokenForPool;
      item.extra.lpAddress = item.extra.transactionToken;
      item.extra.transactionAddress = '0x26e1a0d851cf28e697870e1b7f053b605c8b060f';

      if (farm?.solidexTVL?.usdBalance && farm.solidexTVL.usdBalance > 0) {
        item.tvl = {
          usd: farm.solidexTVL.usdBalance
        };
      }

      if (item?.extra?.transactionToken && this.liquidityTokenCollector.isStable(item.extra.transactionToken)) {
        if (!item.flags) {
          item.flags = [];
        }

        item.flags.push('stable');
      }

      farms.push(Object.freeze(item));
    })

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

    const tokenCalls = pools
      .filter(myPool => myPool.raw.poolAddress)
      .map(myPool => {
        const token = new Web3EthContract(DEPOSITOR_ABI, '0x26e1a0d851cf28e697870e1b7f053b605c8b060f');

        return {
          id: myPool.id.toLowerCase(),
          userBalances: token.methods.userBalances(address, myPool.raw.poolAddress),
        };
      });

    const calls = await Utils.multiCall(tokenCalls, this.getChain());

    const result = calls
      .filter(v => v.userBalances && new BigNumber(v.userBalances).isGreaterThan(Utils.DUST_FILTER))
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

    const calls = (await Utils.multiCall(addressFarms.map(id => {
      const farm = farms.find(f => f.id === id);

      const token = new Web3EthContract(DEPOSITOR_ABI, '0x26e1a0d851cf28e697870e1b7f053b605c8b060f');

      return {
        id: farm.id.toLowerCase(),
        userBalances: token.methods.userBalances(address, farm.raw.poolAddress),
      };
    }), this.getChain())).filter(v => v.userBalances && new BigNumber(v.userBalances).isGreaterThan(Utils.DUST_FILTER));

    const pendingRewards = await Utils.multiCallRpc([
      {
        reference: 'pendingRewards',
        contractAddress: '0x26e1a0d851cf28e697870e1b7f053b605c8b060f',
        abi: DEPOSITOR_ABI,
        calls: [
          {
            reference: "pendingRewards",
            method: "pendingRewards",
            parameters: [address, addressFarms.map(id => farms.find(f => f.id === id).raw.poolAddress)]
          }
        ],
      }
    ], this.getChain());

    calls.forEach((i, index) => {
      i.pendingRewards = Utils.convertRcpResultObject(pendingRewards[0].pendingRewards[index])
    });

    const results = [];
    calls.forEach(call => {
      const farm = farms.find(f => f.id === call.id);

      const result = {
        farm: farm
      };

      let depositDecimals = this.tokenCollector.getDecimals(farm.extra.transactionToken);
      let amount = call.userBalances;

      result.deposit = {
        symbol: "?",
        amount: amount / (10 ** depositDecimals)
      };

      const price = this.priceOracle.getAddressPrice(farm.extra.transactionToken);
      if (price) {
        result.deposit.usd = result.deposit.amount * price;
      }

      const rewards = [];

      if (call?.pendingRewards?.solid) {
        const token = '0x888ef71766ca594ded1f0fa3ae64ed2941740a20';

        const reward = {
          symbol: "solid",
          amount: call.pendingRewards.solid / (10 ** this.tokenCollector.getDecimals(token))
        };

        const price = this.priceOracle.findPrice(token);
        if (price) {
          reward.usd = reward.amount * price;
        }

        rewards.push(reward);
      }

      if (call?.pendingRewards?.sex) {
        const token = '0xd31fcd1f7ba190dbc75354046f6024a9b86014d7';

        const reward = {
          symbol: "sex",
          amount: call.pendingRewards.sex / (10 ** this.tokenCollector.getDecimals(token))
        };

        const price = this.priceOracle.findPrice(token);
        if (price) {
          reward.usd = reward.amount * price;
        }

        rewards.push(reward);
      }

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
    return 'solidex';
  }

  getChain() {
    return 'fantom';
  }
}
