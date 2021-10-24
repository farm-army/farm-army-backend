"use strict";

const {MasterChefWithAutoCompoundAndRewards} = require("../../common");
const ABI = require("./abi/masterchef_compound.json");

module.exports = class farmersonly_compound extends MasterChefWithAutoCompoundAndRewards {
  constructor(cache, priceOracle, tokenCollector, farmCollector, cacheManager, farmPlatformResolver) {
    super(cache, priceOracle, tokenCollector, farmCollector, cacheManager, farmPlatformResolver);

    this.cache = cache;
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector;
    this.farmCollector = farmCollector;
    this.cacheManager = cacheManager;
    this.farmPlatformResolver = farmPlatformResolver;
  }

  async getMatcherChefMeta() {
    const cacheKey = `${this.getName()}-v3-master-meta`

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    const foo = (await this.farmCollector.fetchForMasterChefWithMeta(this.getMasterChefAddress(), this.getChain(), {
      abi: ABI,
    }));

    await this.cacheManager.set(cacheKey, foo, {ttl: 60 * 30})

    return foo;
  }

  getFarmLink() {
    return 'https://app.farmersonly.fi/vaults';
  }

  async farmInfo() {
    return [];
  }

  getMasterChefAddress() {
    return "0x2914646e782cc36297c6639734892927b3b6fe56";
  }

  getChain() {
    return 'harmony';
  }

  getTvlFunction() {
    return undefined;
  }

  async onFarmsBuild(farms) {
    farms.forEach(farm => {
      farm.provider = 'farmersonly';
    });
  }
};
