"use strict";

const MasterChefAbi = require('./abi/0x12dC61f46718DD00e993Da7865da15E8cb713094.json');
const PancakePlatformFork = require("../../common").PancakePlatformFork;

module.exports = class lootswap_cosmic extends PancakePlatformFork {
  static MASTER_ADDRESS = "0x12dC61f46718DD00e993Da7865da15E8cb713094"

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
    return 'lootswap_cosmic';
  }

  getChain() {
    return 'harmony';
  }

  getFarmLink(farm) {
    return 'https://lootswap.finance/guilds/cosmic';
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
    return lootswap_cosmic.MASTER_ADDRESS;
  }

  async onFarmsBuild(farms) {
    farms.forEach(farm => {
      farm.provider = 'lootswap';
    });
  }
};
