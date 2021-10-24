"use strict";

const MasterChefWithAutoCompoundAndRewards = require("../../common").MasterChefWithAutoCompoundAndRewards;

module.exports = class planet extends MasterChefWithAutoCompoundAndRewards {
  constructor(cache, priceOracle, tokenCollector, farmCollector, cacheManager, farmPlatformResolver) {
    super(cache, priceOracle, tokenCollector, farmCollector, cacheManager, farmPlatformResolver);

    this.cache = cache;
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector;
    this.farmCollector = farmCollector;
    this.cacheManager = cacheManager;
    this.farmPlatformResolver = farmPlatformResolver;
  }

  getFarmLink() {
    return 'https://planetfinance.io/';
  }

  async farmInfo() {
    return [];
  }

  getMasterChefAddress() {
    return "0x0ac58fd25f334975b1b61732cf79564b6200a933";
  }

  getChain() {
    return 'bsc';
  }

  getTvlFunction() {
    return 'wantLockedTotal';
  }
};
