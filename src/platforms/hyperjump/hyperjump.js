"use strict";

const PancakePlatformFork = require("../common").PancakePlatformFork;

const MasterChefAbi = require('./abi/masterchef.json');
const SousChefAbi = require('./abi/souschef.json');

const Pools = require('./farms/pools.json');

module.exports = class hyperjump extends PancakePlatformFork {
  static MASTER_ADDRESS = "0x4F1818Ff649498a2441aE1AD29ccF55a8E1C6250"

  constructor(cache, priceOracle, tokenCollector, farmCollector, cacheManager) {
    super(cache, priceOracle);

    this.cache = cache;
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector;
    this.farmCollector = farmCollector;
    this.cacheManager = cacheManager;
  }

  async getFetchedFarms() {
    const cacheKey = `hyperjump-v1-master-farms`

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
    return Pools.filter(p => p.isFinished !== true);
  }

  getName() {
    return 'hyperjump';
  }

  getFarmLink(farm) {
    if (farm.id.startsWith(`${this.getName()}_sous_`)) {
      return 'https://farm.hyperjump.fi/pools';
    }

    return 'https://farm.hyperjump.fi/farms';
  }

  getFarmEarns(farm) {
    return farm.id.startsWith(`${this.getName()}_farm_`)
      ? ['alloy']
      : undefined;
  }

  getPendingRewardContractMethod() {
    return 'pendingAlloy';
  }

  getSousAbi() {
    return SousChefAbi;
  }

  getMasterChefAbi() {
    return MasterChefAbi;
  }

  getMasterChefAddress() {
    return hyperjump.MASTER_ADDRESS;
  }
};
