"use strict";

const _ = require("lodash");
const fs = require("fs");
const path = require("path");
const request = require("async-request");
const BigNumber = require("bignumber.js");
const Web3EthContract = require("web3-eth-contract");
const Utils = require("../../utils");
const ABI = require("./abi/abi");

module.exports = class beefy {
  constructor(cache, priceOracle) {
    this.cache = cache;
    this.priceOracle = priceOracle;
  }

  static ABI = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "abi/balance.json"), "utf8")
  )

  async getLbAddresses() {
    return (await this.getRawFarms())
      .filter(
        farm => farm.tokenAddress && farm.assets && farm.assets.length === 2
      )
      .map(farm => farm.tokenAddress);
  }

  async getRawFarms() {
    const cacheKey = "getAddressFarms-github-beefy";

    const cacheItem = this.cache.get(cacheKey);
    if (cacheItem) {
      return cacheItem;
    }

    const poolsResponse = await request(
      "https://github.com/beefyfinance/beefy-app/raw/master/src/features/configure/bsc_pools.js"
    );
    const pools = Object.freeze(
      eval(
        poolsResponse.body.replace(/export\s+const\s+bscPools\s+=\s+/, "")
      ).filter(p => {
        return p.status === "active" || p.depositsPaused !== false;
      })
    );

    this.cache.put(cacheKey, pools, { ttl: 600 * 1000 });

    return pools;
  }

  async getAddressFarms(address) {
    const cacheItem = this.cache.get(`getAddressFarms-beefy-${address}`);
    if (cacheItem) {
      return cacheItem;
    }

    const pools = await this.getFarms();

    const tokenCalls = pools.map(myPool => {
      const token = new Web3EthContract(beefy.ABI, myPool.raw.earnedTokenAddress);

      return {
        id: myPool.id,
        balanceOf: token.methods.balanceOf(address)
      };
    });

    const calls = await Utils.multiCall(tokenCalls);

    const result = calls
      .filter(v => new BigNumber(v.balanceOf).isGreaterThan(0))
      .map(v => v.id);

    this.cache.put(`getAddressFarms-beefy-${address}`, result, { ttl: 300 * 1000 });

    return result;
  }

  async getFarms(refresh = false) {
    if (!refresh) {
      const cacheItem = this.cache.get("getFarms-beefy");
      if (cacheItem) {
        return cacheItem;
      }
    }

    let apys = {};
    try {
      const text = await request("https://api.beefy.finance/apy");
      apys = JSON.parse(text.body);
    } catch (e) {
      console.error("https://api.beefy.finance/apy", e.message);
    }

    const pools = await this.getRawFarms();

    const vaultCalls = pools.map(pool => {
      const vault = new Web3EthContract(ABI.vaultABI, pool.earnedTokenAddress);

      return {
        id: pool.id,
        tokenAddress: pool.tokenAddress ? pool.tokenAddress : "",
        pricePerFullShare: vault.methods.getPricePerFullShare(),
        tvl: vault.methods.balance()
      };
    });

    const vault = await Utils.multiCallIndexBy("id", vaultCalls);

    const farms = [];
    pools.forEach(farm => {
      const item = {
        id: `beefy_${farm.id}`,
        name: farm.name,
        token: farm.token,
        platform: farm.platform,
        provider: "beefy",
        has_details: !!(farm.earnedTokenAddress && farm.tokenAddress),
        raw: Object.freeze(farm),
        extra: {}
      };

      const vaultElement = vault[farm.id];
      if (vaultElement.pricePerFullShare) {
        item.extra.pricePerFullShare = vaultElement.pricePerFullShare / 1e18;
      }

      if (vaultElement.tokenAddress) {
        item.extra.lpAddress = vaultElement.tokenAddress;
      }

      if (farm.earnedTokenAddress) {
        item.extra.pricePerFullShareToken = farm.earnedTokenAddress;
      }

      if (vaultElement.tokenAddress) {
        let price = this.priceOracle.findPrice(vaultElement.tokenAddress);
        if (!price) {
          price = this.priceOracle.findPrice(farm.id);
        }

        item.tvl = {
          amount: vaultElement.tvl / 1e18
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

    this.cache.put("getFarms-beefy", farms, { ttl: 1000 * 60 * 30 });

    console.log("beefy updated");

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

      const token = new Web3EthContract(
        beefy.ABI,
        farm.raw.earnedTokenAddress
      );
      return {
        id: farm.id,
        balanceOf: token.methods.balanceOf(address)
      };
    });

    const calls = await Utils.multiCall(tokenCalls);

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
          result.deposit.usd = (amount / 1e18) * price;
        }
      } else {
        console.log("beefy no tokenAddress", farm.id);
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

    return Utils.getTransactions(
      farm.raw.earnedTokenAddress,
      farm.raw.tokenAddress,
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

    const yieldDetails = Utils.findYieldForDetails(result);
    if (yieldDetails) {
      result.yield = yieldDetails;
    }

    return result;
  }
};
