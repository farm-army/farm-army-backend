"use strict";

const BigNumber = require("bignumber.js");
const _ = require("lodash");
const Utils = require("../../../utils");
const Web3EthContract = require("web3-eth-contract");

const MASTERCHEF_ABI = require("./abi/masterchef.json");

module.exports = class autofarm {
  constructor(cacheManager, priceOracle, liquidityTokenCollector) {
    this.cacheManager = cacheManager;
    this.priceOracle = priceOracle;
    this.liquidityTokenCollector = liquidityTokenCollector;
  }

  async getLbAddresses() {
    const response = await Utils.requestJsonGet(this.getFarmDataUrl());

    return Object.values(response?.pools || [])
      .filter(f => f.wantIsLP && f.wantAddress)
      .map(f => f.wantAddress);
  }

  async getAddressFarms(address) {
    const cacheKey = `getAddressFarms-${this.getName()}-${address}`;
    const cache = await this.cacheManager.get(cacheKey);
    if (cache) {
      return cache;
    }

    const farms = await this.getFarms();

    const tokenCalls = farms.map(farm => {
      const contract = new Web3EthContract(MASTERCHEF_ABI, this.getMasterChefAddress());
      return {
        id: farm.id,
        stakedWantTokens: contract.methods.stakedWantTokens(farm.raw.id, address)
      };
    });

    const calls = await Utils.multiCall(tokenCalls, this.getChain());

    const response = calls
      .filter(
        v =>
          new BigNumber(v.stakedWantTokens).isGreaterThan(Utils.DUST_FILTER)
      )
      .map(v => v.id);

    await this.cacheManager.set(cacheKey, response, {ttl: 60 * 5});

    return response;
  }

  async getFarms(refresh = false) {
    const cacheKey = `getFarms-${this.getName()}`;

    if (!refresh) {
      const cache = await this.cacheManager.get(cacheKey);
      if (cache) {
        return cache;
      }
    }

    const response = await Utils.requestJsonGet(this.getFarmDataUrl());

    const farms = [];

    for (const key of Object.keys(response?.pools || {})) {
      const farm = response.pools[key];

      if (!farm.display || farm.display !== true) {
        continue;
      }

      response.pools[key].id = key;

      let platform = farm.farmName;
      if (platform && platform.toLowerCase() === "pcs") {
        platform = "pancake";
      } else if(platform && platform.toLowerCase() === "pancake (v2)") {
        platform = "pancake";
      }

      const item = {
        id: `${this.getName()}_${key}`,
        name: farm.wantName.replace('\t', ''),
        platform: platform,
        raw: Object.freeze(response.pools[key]),
        provider: this.getName(),
        has_details: true,
        yield: {
          apr: farm.APR * 100,
          apy: farm.APY_total * 100
        },
        tvl: {
          usd: farm.poolWantTVL
        },
        extra: {},
        chain: this.getChain(),
        compound: true,
      };

      if (farm.wantPrice) {
        if (farm.poolInfo && farm.poolInfo.strat) {
          item.extra.pricePerFullShareToken = farm.poolInfo.strat;
        }

        item.extra.pricePerFullShare = farm.wantPrice;
      }

      if (farm.wantAddress) {
        item.extra.transactionToken = farm.wantAddress;
      }

      item.extra.transactionAddress = this.getMasterChefAddress();

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
        if (farm[key] && farm[key].toLowerCase() !== 'none') {
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

      if (farm.allowDeposits === false) {
        if (!item.flags) {
          item.flags = [];
        }

        item.flags = ['deprecated'];
      }

      if (item?.extra?.transactionToken && this.liquidityTokenCollector.isStable(item.extra.transactionToken)) {
        if (!item.flags) {
          item.flags = [];
        }

        item.flags.push('stable');
      }

      farms.push(Object.freeze(item));
    }

    await this.cacheManager.set(cacheKey, farms, {ttl: 60 * 30});

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

    const tokenCalls = [];

    addressFarms.map(id => {
      const farm = farms.find(f => f.id === id);

      if (!farm) {
        return;
      }

      const contract = new Web3EthContract(MASTERCHEF_ABI, this.getMasterChefAddress());
      tokenCalls.push({
        id: farm.id,
        pendingAUTO: contract.methods.pendingAUTO(farm.raw.id, address),
        stakedWantTokens: contract.methods.stakedWantTokens(farm.raw.id, address),
        // userInfo: contract.methods.userInfo(farm.raw.id, address)
      });
    });

    const calls = await Utils.multiCall(tokenCalls, this.getChain());

    const results = [];
    calls.forEach(call => {
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
          symbol: "?",
          amount: call.stakedWantTokens / 1e18
        };

        deposit.usd = (call.stakedWantTokens / 1e18) * farm.raw.wantPrice;

        // dust
        if (deposit.usd < 0.01) {
          return;
        }

        result.deposit = deposit;

        if (call.userInfo && call.userInfo[0]) {
          const myYield = (call.userInfo[0] / 1e18);

          deposit.yield = deposit.amount - myYield;
          deposit.usd_yield = deposit.yield * farm.raw.wantPrice;
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
        address,
        this.getChain()
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

  getFarmDataUrl() {
    return 'https://static.autofarm.network/bsc/farm_data.json';
  }

  getMasterChefAddress() {
    return '0x0895196562C7868C5Be92459FaE7f877ED450452';
  }

  getName() {
    return 'autofarm';
  }

  getChain() {
    return 'bsc';
  }
};
