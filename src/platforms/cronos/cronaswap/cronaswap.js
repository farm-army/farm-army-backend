"use strict";

const _ = require("lodash");
const cronaswap1 = require("./cronaswap1");
const cronaswap2 = require("./cronaswap2");

module.exports = class cronaswap {
  constructor(cache, priceOracle, tokenCollector, liquidityTokenCollector, farmCollector, cacheManager) {
    this.master = new cronaswap1(cache, priceOracle, tokenCollector, liquidityTokenCollector, farmCollector, cacheManager);
    this.master2 = new cronaswap2(cache, priceOracle, tokenCollector, liquidityTokenCollector, farmCollector, cacheManager);
  }


  async getLbAddresses() {
    return _.uniq((await Promise.all([
      this.master.getLbAddresses(),
      this.master2.getLbAddresses(),
    ])).flat());
  }

  async getFarms(refresh = false) {
    return (await Promise.all([
      this.master.getFarms(refresh),
      this.master2.getFarms(refresh),
    ])).flat();
  }

  async getYields(address) {
    return (await Promise.all([
      this.master.getYields(address),
      this.master2.getYields(address),
    ])).flat();
  }

  async getDetails(address, id) {
    if (id.includes('_v2_')) {
      return this.master2.getDetails(address, id);
    }

    return this.master.getDetails(address, id);
  }

  getName() {
    return 'cronoswap';
  }

  getChain() {
    return 'cronos';
  }
};
