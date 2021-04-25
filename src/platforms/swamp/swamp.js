"use strict";

const PancakePlatformFork = require("../common").PancakePlatformFork;
const MasterChefAbi = require('./abi/masterchef.json');

module.exports = class swamp extends PancakePlatformFork {
  static MASTER_ADDRESS = "0x33adbf5f1ec364a4ea3a5ca8f310b597b8afdee3"

  constructor(cache, priceOracle, tokenCollector, farmCollector, cacheManager) {
    super(cache, priceOracle);

    this.cache = cache;
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector;
    this.farmCollector = farmCollector;
    this.cacheManager = cacheManager;
  }

  async getFetchedFarms() {
    const cacheKey = `swamp-v3-master-farms`

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    const foo = (await this.farmCollector.fetchForMasterChef(swamp.MASTER_ADDRESS)).filter(f => f.isFinished !== true);

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

  async getRawFarms() {
    return this.getFetchedFarms();
  }

  getRawPools() {
    return [];
  }

  getName() {
    return 'swamp';
  }

  getFarmLink() {
    return 'https://swamp.finance/app/';
  }

  getFarmEarns(farm) {
    return farm.id.startsWith(`${this.getName()}_farm_`)
      ? ['swamp']
      : undefined;

  }

  getPendingRewardContractMethod() {
    return 'pendingNATIVE';
  }

  getSousAbi() {
    return [];
  }

  getMasterChefAbi() {
    return MasterChefAbi;
  }

  getMasterChefAddress() {
    return swamp.MASTER_ADDRESS;
  }
};
