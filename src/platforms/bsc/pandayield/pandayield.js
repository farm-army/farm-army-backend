"use strict";

const MasterChefAbi = require('./abi/masterchef.json');
const PancakePlatformFork = require("../../common").PancakePlatformFork;

module.exports = class pandayield extends PancakePlatformFork {
  static MASTER_ADDRESS = "0x51f015e3dEA234039fB536C358781118f36f1745"

  constructor(cache, priceOracle, tokenCollector, farmCollector, cacheManager) {
    super(cache, priceOracle);

    this.cache = cache;
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector;
    this.farmCollector = farmCollector;
    this.cacheManager = cacheManager;
  }

  async getFetchedFarms() {
    const cacheKey = `pandayield-v1-master-farms`

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    const foo = (await this.farmCollector.fetchForMasterChef(this.getMasterChefAddress())).filter(f => f.isFinished !== true);

    const reformat = foo.map(f => {
      f.lpAddresses = f.lpAddress

      if (f.isTokenOnly === true) {
        f.tokenAddresses = f.lpAddress
      }

      return f
    })

    await this.cacheManager.set(cacheKey, reformat, {ttl: 60 * 30})

    return reformat;
  }

  getRawFarms() {
    return this.getFetchedFarms();
  }

  getRawPools() {
    return [];
  }

  getName() {
    return 'pandayield';
  }

  getFarmLink() {
    return 'https://pandayield.com/#/farms/all';
  }

  getFarmEarns(farm) {
    return farm.id.startsWith(`${this.getName()}_farm_`)
      ? ['bboo']
      : undefined;

  }

  getPendingRewardContractMethod() {
    return 'pendingCake';
  }

  getSousAbi() {
    return [];
  }

  getMasterChefAbi() {
    return MasterChefAbi;
  }

  getMasterChefAddress() {
    return pandayield.MASTER_ADDRESS;
  }
};
