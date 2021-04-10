"use strict";

const BigNumber = require("bignumber.js");
const _ = require("lodash");
const fs = require("fs");
const path = require("path");
const request = require("async-request");
const Utils = require("../../utils");
const Web3EthContract = require("web3-eth-contract");

module.exports = class autofarm {
  constructor(cache, priceOracle) {
    this.cache = cache;
    this.priceOracle = priceOracle;
  }

  static MASTER_CHEF = "0x0895196562C7868C5Be92459FaE7f877ED450452"

  async getLbAddresses() {
    const text = await request(
      "https://static.autofarm.network/bsc/farm_data.json"
    );
    const response = JSON.parse(text.body);

    return Object.values(response.pools)
      .filter(f => f.wantIsLP && f.wantAddress)
      .map(f => f.wantAddress);
  }

  async getAddressFarms(address) {
    const cacheKey = `getAddressFarms-autofarm-${address}`;
    const cacheItem = this.cache.get(cacheKey);
    if (cacheItem) {
      return cacheItem;
    }

    const abi = JSON.parse(
      fs.readFileSync(
        path.resolve(
          __dirname,
          "abi/0x0895196562C7868C5Be92459FaE7f877ED450452.json"
        ),
        "utf8"
      )
    );

    const farms = await this.getFarms();

    const tokenCalls = farms.map(farm => {
      const contract = new Web3EthContract(abi, autofarm.MASTER_CHEF);
      return {
        id: farm.id,
        stakedWantTokens: contract.methods.stakedWantTokens(farm.raw.id, address)
      };
    });

    const calls = await Utils.multiCall(tokenCalls);

    const response = calls
      .filter(
        v =>
          new BigNumber(v.stakedWantTokens).isGreaterThan(Utils.DUST_FILTER)
      )
      .map(v => v.id);

    this.cache.put(cacheKey, response, { ttl: 300 * 1000 });

    return response;
  }

  async getFarms(refresh = false) {
    const cacheKey = "getFarms-autofarm";

    if (!refresh) {
      const cacheItem = this.cache.get(cacheKey);
      if (cacheItem) {
        return cacheItem;
      }
    }

    const text = await request(
      "https://static.autofarm.network/bsc/farm_data.json"
    );

    const response = JSON.parse(text.body);

    const farms = [];

    for (const key of Object.keys(response.pools)) {
      const farm = response.pools[key];

      if (!farm.display || farm.display !== true) {
        continue;
      }

      response.pools[key].id = key;

      let platform = farm.farmName;
      if (platform && platform.toLowerCase() === "pcs") {
        platform = "pancake";
      }

      const item = {
        id: `autofarm_${key}`,
        name: farm.wantName,
        platform: platform,
        raw: Object.freeze(response.pools[key]),
        provider: "autofarm",
        has_details: true,
        yield: {
          apr: farm.APR * 100,
          apy: farm.APY_total * 100
        },
        tvl: {
          usd: farm.poolWantTVL
        },
        extra: {}
      };

      if (farm.wantPrice) {
        if (farm.poolInfo && farm.poolInfo.strat) {
          item.extra.pricePerFullShareToken = farm.poolInfo.strat;
        }

        item.extra.pricePerFullShare = farm.wantPrice;
      }

      const notes = [];
      if (farm.notes) {
        notes.push(...farm.notes);
      }

      [
        "controllerFeeText",
        "platformFeeText",
        "buybackrateText",
        "entranceFeeText"
      ].forEach(key => {
        if (farm[key]) {
          notes.push(farm[key]);
        }
      });

      if (notes.length > 0) {
        const finalNotes = _.uniq(
          notes
            .map(b => b.replace(/<\/?[^>]+(>|$)/g, "").trim())
            .filter(b => b.length > 0)
        );

        if (finalNotes.length > 0) {
          item.notes = finalNotes;
        }
      }

      if (
        farm.poolInfo &&
        farm.poolInfo.accAUTOPerShare &&
        new BigNumber(farm.poolInfo.accAUTOPerShare).isGreaterThan(0)
      ) {
        item.earns = ["auto"];
      }

      if (farm.wantIsLP === true) {
        item.extra.lpAddress = farm.wantAddress;
      }

      farms.push(Object.freeze(item));
    }

    this.cache.put(cacheKey, farms, { ttl: 1000 * 60 * 30 });

    console.log("autofarm updated");

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
          "abi/0x0895196562C7868C5Be92459FaE7f877ED450452.json"
        ),
        "utf8"
      )
    );

    const tokenCalls = addressFarms.map(id => {
      const farm = farms.find(f => f.id === id);

      const contract = new Web3EthContract(abi, autofarm.MASTER_CHEF);
      return {
        id: farm.id,
        pendingAUTO: contract.methods.pendingAUTO(farm.raw.id, address),
        stakedWantTokens: contract.methods.stakedWantTokens(
          farm.raw.id,
          address
        )
      };
    });

    const calls = await Utils.multiCall(tokenCalls);

    return calls.map(call => {
      const farm = farms.find(f => f.id === call.id);

      const result = {};
      result.farm = farm;

      if (new BigNumber(call.pendingAUTO).isGreaterThan(0)) {
        const reward = {
          symbol: "auto",
          amount: call.pendingAUTO / 1e18
        };

        const autoPrice = this.priceOracle.findPrice("auto");
        if (autoPrice) {
          reward.usd = reward.amount * autoPrice;
        }

        result.rewards = [reward];
      }

      if (new BigNumber(call.stakedWantTokens).isGreaterThan(0)) {
        const deposit = {
          symbol: "auto",
          amount: call.stakedWantTokens / 1e18
        };

        deposit.usd = (call.stakedWantTokens / 1e18) * farm.raw.wantPrice;

        result.deposit = deposit;
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
      autofarm.MASTER_CHEF,
      farm.raw.wantAddress,
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
