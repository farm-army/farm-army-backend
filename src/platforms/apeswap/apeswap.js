"use strict";

const MasterChefAbi = require('./abi/masterchef.json');
const SousChefAbi = require('./abi/souschef.json');

const Pools = require('./farms/pools.json');

const PancakePlatformFork = require("../common").PancakePlatformFork;

module.exports = class apeswap extends PancakePlatformFork {
  static MASTER_ADDRESS = "0x5c8D727b265DBAfaba67E050f2f739cAeEB4A6F9"

  constructor(cache, priceOracle, tokenCollector, farmCollector, cacheManager) {
    super(cache, priceOracle);

    this.cache = cache;
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector;
    this.farmCollector = farmCollector;
    this.cacheManager = cacheManager;
  }

  async getFetchedFarms() {
    const cacheKey = `apeswap-v1-master-farms`

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
    return 'apeswap';
  }

  getFarmLink(farm) {
    return farm.isTokenOnly === true
      ? 'https://apeswap.finance/pools'
      : 'https://apeswap.finance/farms';
  }

  getFarmEarns(farm) {
    return farm.id.startsWith(`${this.getName()}_farm_`)
      ? ['banana']
      : undefined;
  }

  getPendingRewardContractMethod() {
    return 'pendingCake';
  }

  getSousAbi() {
    return SousChefAbi;
  }

  getMasterChefAbi() {
    return MasterChefAbi;
  }

  getMasterChefAddress() {
    return apeswap.MASTER_ADDRESS;
  }
};
