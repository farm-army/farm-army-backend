"use strict";

const MasterChefAbi = require('./abi/0xb96618aebd36f8d83fa03873fda796264597604d.json');
const PancakePlatformFork = require("../../common").PancakePlatformFork;

module.exports = class lootswap_loot extends PancakePlatformFork {
  static MASTER_ADDRESS = "0xb96618aebd36f8d83fa03873fda796264597604d"

  constructor(cache, priceOracle, tokenCollector, farmCollector, cacheManager) {
    super(cache, priceOracle);

    this.cache = cache;
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector;
    this.farmCollector = farmCollector;
    this.cacheManager = cacheManager;
  }

  async getFetchedFarms() {
    const cacheKey = `${this.getName()}-v2-master-farms`

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    const foo = (await this.farmCollector.fetchForMasterChef(this.getMasterChefAddress(), this.getChain(), {
      abi: await this.getMasterChefAbi(),
    })).filter(f => f.isFinished !== true);

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
    return 'lootswap_loot';
  }

  getChain() {
    return 'harmony';
  }

  getFarmLink(farm) {
    return 'https://lootswap.finance/questlog';
  }

  getFarmEarns(farm) {
    return farm.id.startsWith(`${this.getName()}_farm_`)
      ? farm.raw.earns ? farm.raw.earns.map(i => i.symbol.toLowerCase()) : []
      : undefined;
  }

  getPendingRewardContractMethod() {
    return 'pendingReward';
  }

  getSousAbi() {
    return [];
  }

  async getMasterChefAbi() {
    return MasterChefAbi;
  }

  getMasterChefAddress() {
    return lootswap_loot.MASTER_ADDRESS;
  }

  async onFarmsBuild(farms) {
    farms.forEach(farm => {
      farm.provider = 'lootswap';
    });
  }
};
