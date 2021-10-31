"use strict";

const {MasterChefWithAutoCompoundAndRewards} = require("../../common");

module.exports = class mars_masterchef1 extends MasterChefWithAutoCompoundAndRewards {
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
    return 'https://app.marsecosystem.com/farms';
  }

  async farmInfo() {
    return [];
  }

  getMasterChefAddress() {
    return "0xb7881F5142245531C3fB938a37b5D2489EFd2C01";
  }

  getChain() {
    return 'bsc';
  }

  getTvlFunction() {
    return 'sharesTotal';
  }

  async onFarmsBuild(farms) {
    farms.forEach(farm => {
      farm.provider = 'mars';
    });
  }
};
