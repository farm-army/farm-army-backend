"use strict";

const BigNumber = require("bignumber.js");
const _ = require("lodash");
const fs = require("fs");
const path = require("path");
const request = require("async-request");
const Utils = require("../../utils");
const Web3EthContract = require("web3-eth-contract");

module.exports = class degentokenfarms {
  constructor(cache, priceOracle) {
    this.cache = cache;
    this.priceOracle = priceOracle;
  }

  static MASTER_CHEF = "0x8f83b6E14EE0C3218Bea11c08954137848afD6c8"

  async getLbAddresses() {
    const text = await request(
      "https://api.degentoken.finance/api/v1/global.json"
    );
    const response = JSON.parse(text.body);

    return Object.values(response.farms)
      .filter(f => f.wantIsLP && f.wantAddress)
      .map(f => f.wantAddress);
  }

  async getDGNZPrice() {
    const text = await request(
      "https://api.degentoken.finance/api/v1/0x8f83b6E14EE0C3218Bea11c08954137848afD6c8/farm/0"
    );
    const response = JSON.parse(text.body);
    return response.lpprice;
  }

  async getAddressFarms(address) {
    const cacheKey = `getAddressFarms-degentokenfarms-${address}`;
    const cacheItem = this.cache.get(cacheKey);
    if (cacheItem) {
      return cacheItem;
    }

    const abi = JSON.parse(
      fs.readFileSync(
        path.resolve(
          __dirname,
          "abi/0x8f83b6E14EE0C3218Bea11c08954137848afD6c8.json"
        ),
        "utf8"
      )
    );

    const farms = await this.getFarms();
    const DGNZPrice = await this.getDGNZPrice();

    const tokenCalls = farms.map(farm => {
      const contract = new Web3EthContract(abi, degentokenfarms.MASTER_CHEF);
      return {
        id: farm.id,
        userInfo: contract.methods.userInfo(farm.raw.id, address)
      };
    });

    const calls = await Utils.multiCall(tokenCalls);

    const response = calls
      .filter(
        v =>
          new BigNumber(v.userInfo[0]).isGreaterThan(Utils.DUST_FILTER)
      )
      .map(v => v.id);

    this.cache.put(cacheKey, response, { ttl: 300 * 1000 });

    return response;
  }

  async getFarms(refresh = false) {
    const cacheKey = "getFarms-degentokenfarms";

    if (!refresh) {
      const cacheItem = this.cache.get(cacheKey);
      if (cacheItem) {
        return cacheItem;
      }
    }

    const text = await request(
      "https://api.degentoken.finance/api/v1/global.json"
    );

    const response = JSON.parse(text.body);

    const farms = [];

    for (const key of Object.keys(response.farms)) {
      const farm = response.farms[key];

      if (!farm.display || farm.display !== true) {
        continue;
      }

      response.farms[key].id = key;

      let platform = farm.farmName;
      if (platform && platform.toLowerCase() === "pcs") {
        platform = "pancake";
      }
    
      let symbol
      if ( farm.t0sym !== '')
      {
        symbol = farm.t0sym + "-"+ farm.t1sym
      }
      else{
        symbol = farm.symbol
      }

    
      const item = {
        id: `degentokenfarms_${key}`,
        name: symbol,
        platform: platform,
        raw: Object.freeze(response.farms[key]),
        provider: "degentoken",
        has_details: true,
        yield: {
          apy: farm.apy * 36500
        },
        tvl: {
          usd: farm.tvlusd
        },
        extra: {}
      };

      if (farm.lpprice) {
        item.extra.pricePerFullShare = farm.lpprice;
      }

      if (farm.wantAddress) {
        item.extra.transactionToken = farm.wantAddress;
      }

      item.extra.transactionAddress = degentokenfarms.MASTER_CHEF;

      if (
        farm.poolInfo &&
        farm.poolInfo.accDGNZPerShare &&
        new BigNumber(farm.poolInfo.accDGNZPerShare).isGreaterThan(0)
      ) {
        item.earns = ["DGNZ"];
      }

      if (farm.wantIsLP === true) {
        item.extra.lpAddress = farm.wantAddress;
      }

      farms.push(Object.freeze(item));
    }

    this.cache.put(cacheKey, farms, { ttl: 1000 * 60 * 30 });

    console.log("degentokenfarms updated");

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

    const abi = JSON.parse(
      fs.readFileSync(
        path.resolve(
          __dirname,
          "abi/0x8f83b6E14EE0C3218Bea11c08954137848afD6c8.json"
        ),
        "utf8"
      )
    );

    const tokenCalls = addressFarms.map(id => {
      const farm = farms.find(f => f.id === id);

      const contract = new Web3EthContract(abi, degentokenfarms.MASTER_CHEF);
      return {
        id: farm.id,
        pendingDGNZ: contract.methods.pendingDGNZ(farm.raw.id, address),
        userInfo: contract.methods.userInfo(farm.raw.id, address)
      };
    });

    const calls = await Utils.multiCall(tokenCalls);
    const DGNZPrice = await this.getDGNZPrice();

    const results = [];
    calls.forEach(call => {
      const farm = farms.find(f => f.id === call.id);

      const result = {};
      result.farm = farm;

      if (new BigNumber(call.pendingDGNZ).isGreaterThan(0)) {
        const reward = {
          symbol: "DGNZ",
          amount: call.pendingDGNZ / 1e18
        };

        const farmPrice = farms.find(f => f.id === "degentokenfarms_0");
        if (DGNZPrice) {
          reward.usd = reward.amount * DGNZPrice;
        }

        result.rewards = [reward];
      }

      if (new BigNumber(call.userInfo[0]).isGreaterThan(0)) {
        const deposit = {
          symbol: "DGNZ",
          amount: call.userInfo[0] / 1e18
        };

        deposit.usd = (call.userInfo[0] / 1e18) * farm.raw.lpprice;

        // dust
        if (deposit.usd < 0.01) {
          return;
        }

        result.deposit = deposit;

        if (call.userInfo && call.userInfo[0]) {
          const myYield = (call.userInfo[0] / 1e18);

          deposit.yield = deposit.amount - myYield;
          deposit.usd_yield = deposit.yield * farm.raw.lpprice;
        }
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
        address
      );
    }

    return {}
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
