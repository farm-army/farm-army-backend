"use strict";

const _ = require("lodash");
const theanimal1 = require("./theanimal1");
const theanimal2 = require("./theanimal2");

module.exports = class theanimal {
  constructor(cache, priceOracle, tokenCollector, farmCollector, cacheManager) {
    this.cache = cache;
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector;
    this.farmCollector = farmCollector;
    this.cacheManager = cacheManager;

    this.master = new theanimal1(cache, priceOracle, tokenCollector, farmCollector, cacheManager);
    this.master2 = new theanimal2(cache, priceOracle, tokenCollector, farmCollector, cacheManager);
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
    if (id.includes('_1_')) {
      return this.master.getDetails(address, id);
    }

    return this.master2.getDetails(address, id);
  }

  getName() {
    return 'theanimal';
  }

  getChain() {
    return 'bsc';
  }
};
