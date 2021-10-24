"use strict";

const MasterChefAbi = require('./abi/masterchef.json');
const PancakePlatformFork = require("../../common").PancakePlatformFork;

module.exports = class huckleberry extends PancakePlatformFork {
  static MASTER_ADDRESS = "0x1f4b7660b6AdC3943b5038e3426B33c1c0e343E6"

  constructor(cache, priceOracle, tokenCollector, farmCollector, cacheManager) {
    super(cache, priceOracle);

    this.cache = cache;
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector;
    this.farmCollector = farmCollector;
    this.cacheManager = cacheManager;
  }

  async getFetchedFarms() {
    const cacheKey = `${this.getName()}-v1-master-farms`

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    const foo = (await this.farmCollector.fetchForMasterChef(this.getMasterChefAddress(), this.getChain(), {
      abi: MasterChefAbi,
      rewardTokenFunctionName: 'finn'
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
    return 'huckleberry';
  }

  getChain() {
    return 'moonriver';
  }

  getFarmLink(farm) {
    return 'https://www.huckleberry.finance/#/farm';
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
    return huckleberry.MASTER_ADDRESS;
  }

  async onFarmsBuild(farms) {
    farms.forEach(farm => {
      farm.name = farm.name.replaceAll('.M', '');

      farm.main_platform = 'huckleberry';
      farm.platform = 'huckleberry';
    });
  }
};
