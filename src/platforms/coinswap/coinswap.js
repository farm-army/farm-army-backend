"use strict";

const MasterChefAbi = require('./abi/masterchef.json');
const PancakePlatformFork = require("../common").PancakePlatformFork;

module.exports = class coinswap extends PancakePlatformFork {
  static MASTER_ADDRESS = "0x3A0a988D680dBBB02DECBfd35F9E0676B4bEc292"

  constructor(cache, priceOracle, tokenCollector, farmCollector, cacheManager) {
    super(cache, priceOracle);

    this.cache = cache;
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector;
    this.farmCollector = farmCollector;
    this.cacheManager = cacheManager;
  }

  async getFetchedFarms() {
    const cacheKey = `coinswap-v2-master-farms`

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
    return 'coinswap';
  }

  getFarmLink(farm) {
    return 'https://master.coinswap.space/farm?coinswapfriend=0x898e99681C29479b86304292b03071C80A57948F';
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

  getMasterChefAbi() {
    return MasterChefAbi;
  }

  getMasterChefAddress() {
    return coinswap.MASTER_ADDRESS;
  }
};
