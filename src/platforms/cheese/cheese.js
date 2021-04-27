"use strict";

const MasterChefAbi = require('./abi/masterchef.json');
const PancakePlatformFork = require("../common").PancakePlatformFork;

module.exports = class cheese extends PancakePlatformFork {
  static MASTER_ADDRESS = "0x398d648c58ccf6337dded3dac7cbd7970ae474b8"

  constructor(cache, priceOracle, tokenCollector, farmCollector, cacheManager) {
    super(cache, priceOracle);

    this.cache = cache;
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector;
    this.farmCollector = farmCollector;
    this.cacheManager = cacheManager;
  }

  async getFetchedFarms() {
    const cacheKey = `cheese-v1-master-farms`

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
    return 'cheese';
  }

  getFarmLink(farm) {
    return farm.isTokenOnly === true
      ? 'https://app.cheesecakeswap.com/pools'
      : 'https://app.cheesecakeswap.com/farms';
  }

  getFarmEarns(farm) {
    return farm.id.startsWith(`${this.getName()}_farm_`)
      ? ['ccake']
      : undefined;

  }

  getPendingRewardContractMethod() {
    return 'pendingCcake';
  }

  getSousAbi() {
    return [];
  }

  getMasterChefAbi() {
    return MasterChefAbi;
  }

  getMasterChefAddress() {
    return cheese.MASTER_ADDRESS;
  }
};