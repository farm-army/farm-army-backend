"use strict";

const BigNumber = require("bignumber.js");
const Web3EthContract = require("web3-eth-contract");
const Utils = require("../../utils");

const VAULT_ABI = require('./abi/vault.json');

module.exports = class beefy {
  constructor(cache, priceOracle, tokenCollector) {
    this.cache = cache;
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector;
  }

  async getLbAddresses() {
    return (await this.getRawFarms())
      .filter(
        farm => farm.tokenAddress && farm.assets && farm.assets.length === 2
      )
      .map(farm => farm.tokenAddress);
  }

  async getRawFarms() {
    const cacheKey = `getAddressFarms-github-${this.getName()}`;

    const cacheItem = this.cache.get(cacheKey);
    if (cacheItem) {
      return cacheItem;
    }

    const poolsResponse = await Utils.requestGet(this.getGithubFarmsUrl());

    const pools = Object.freeze(
      eval(
        poolsResponse.replace(/export\s+const\s+\w+Pools\s+=\s+/, "")
      ).filter(p => {
        return p.status === "active" || p.depositsPaused !== false;
      })
    );

    this.cache.put(cacheKey, pools, { ttl: 600 * 1000 });

    return pools;
  }

  async getAddressFarms(address) {
    let cacheKey = `getAddressFarms-${this.getName()}-${address}`;

    const cacheItem = this.cache.get(cacheKey);
    if (cacheItem) {
      return cacheItem;
    }

    const pools = await this.getFarms();

    const tokenCalls = pools.map(myPool => {
      const token = new Web3EthContract(VAULT_ABI, myPool.raw.earnedTokenAddress);

      return {
        id: myPool.id,
        balanceOf: token.methods.balanceOf(address)
      };
    });

    const calls = await Utils.multiCall(tokenCalls, this.getChain());

    const result = calls
      .filter(v => new BigNumber(v.balanceOf).isGreaterThan(0))
      .map(v => v.id);

    this.cache.put(cacheKey, result, { ttl: 300 * 1000 });

    return result;
  }

  async getFarms(refresh = false) {
    let cacheKey = `getFarms-${this.getName()}`;

    if (!refresh) {
      const cacheItem = this.cache.get(cacheKey);
      if (cacheItem) {
        return cacheItem;
      }
    }

    let apys = {};
    try {
      apys = await Utils.requestJsonGet("https://api.beefy.finance/apy");
    } catch (e) {
      console.error("https://api.beefy.finance/apy", e.message);
    }

    const pools = await this.getRawFarms();

    const vaultCalls = pools.map(pool => {
      const vault = new Web3EthContract(VAULT_ABI, pool.earnedTokenAddress);

      return {
        id: pool.id,
        tokenAddress: pool.tokenAddress ? pool.tokenAddress : "",
        pricePerFullShare: vault.methods.getPricePerFullShare(),
        tvl: vault.methods.balance()
      };
    });

    const vault = await Utils.multiCallIndexBy("id", vaultCalls, this.getChain());

    const farms = [];
    pools.forEach(farm => {
      const item = {
        id: `${this.getName()}_${farm.id}`,
        name: farm.name,
        token: farm.token,
        platform: farm.platform,
        provider: this.getName(),
        has_details: !!(farm.earnedTokenAddress && farm.tokenAddress),
        raw: Object.freeze(farm),
        extra: {},
        chain: this.getChain(),
        compound: true,
      };

      const vaultElement = vault[farm.id];
      if (vaultElement.pricePerFullShare) {
        item.extra.pricePerFullShare = vaultElement.pricePerFullShare / 1e18;
      }

      if (vaultElement.tokenAddress) {
        item.extra.lpAddress = vaultElement.tokenAddress;
      }

      if (farm.earnedTokenAddress) {
        item.extra.transactionAddress = farm.earnedTokenAddress;
        item.extra.pricePerFullShareToken = farm.earnedTokenAddress;
      }

      if (vaultElement.tokenAddress) {
        item.extra.transactionToken = vaultElement.tokenAddress

        let price = this.priceOracle.findPrice(vaultElement.tokenAddress);
        if (!price) {
          price = this.priceOracle.findPrice(farm.id);
        }

        item.tvl = {
          amount: vaultElement.tvl / (10 ** this.tokenCollector.getDecimals(vaultElement.tokenAddress))
        };

        if (price) {
          item.tvl.usd = item.tvl.amount * price;
        }
      }

      if (apys[farm.id]) {
        item.yield = {
          apy: apys[farm.id] * 100
        };
      }

      farms.push(Object.freeze(item));
    });

    this.cache.put(cacheKey, farms, { ttl: 1000 * 60 * 30 });

    console.log(`${this.getName()} updated`);

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

    const tokenCalls = addressFarms.map(a => {
      const farm = farms.filter(f => f.id === a)[0];

      const token = new Web3EthContract(VAULT_ABI, farm.raw.earnedTokenAddress);

      return {
        id: farm.id,
        balanceOf: token.methods.balanceOf(address)
      };
    });

    const calls = await Utils.multiCall(tokenCalls, this.getChain());

    return calls.map(call => {
      const farm = farms.find(f => f.id === call.id);

      const amount = call.balanceOf * farm.extra.pricePerFullShare;

      const result = {};
      result.farm = farm;

      result.deposit = {
        symbol: "?",
        amount: amount / 1e18
      };

      if (farm.raw.tokenAddress) {
        let price = this.priceOracle.findPrice(farm.raw.tokenAddress, farm.raw.oracleId.toLowerCase());
        if (price) {
          result.deposit.usd = result.deposit.amount * price;
        }
      } else {
        console.log(`${this.getName()} no tokenAddress`, farm.id);
      }

      result.rewards = [];

      return result;
    });
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

    const yieldDetails = Utils.findYieldForDetails(result);
    if (yieldDetails) {
      result.yield = yieldDetails;
    }

    return result;
  }

  getGithubFarmsUrl() {
    return 'https://raw.githubusercontent.com/beefyfinance/beefy-app/master/src/features/configure/vault/bsc_pools.js';
  }

  getName() {
    return 'beefy';
  }

  getChain() {
    return 'bsc';
  }
};
