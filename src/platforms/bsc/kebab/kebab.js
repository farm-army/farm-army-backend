"use strict";

const MasterChefAbi = require('./abi/masterchef.json');
const SousChefAbi = require('./abi/souschef.json');

const Pools = require('./farms/pools.json');

const PancakePlatformFork = require("../../common").PancakePlatformFork;

module.exports = class kebab extends PancakePlatformFork {
  static MASTER_ADDRESS = "0x76FCeffFcf5325c6156cA89639b17464ea833ECd"

  constructor(cache, priceOracle, tokenCollector, farmCollector, cacheManager) {
    super(cache, priceOracle);

    this.cache = cache;
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector;
    this.farmCollector = farmCollector;
    this.cacheManager = cacheManager;
  }

  async getFetchedFarms() {
    const cacheKey = `kebab-v1-master-farms`

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
    return 'kebab';
  }

  getFarmLink(farm) {
    if (farm.id.startsWith(`${this.getName()}_sous_`)) {
      return 'https://kebabfinance.com/#/pools';
    }

    return 'https://kebabfinance.com/#/farms';
  }

  getFarmEarns(farm) {
    return farm.id.startsWith(`${this.getName()}_farm_`)
      ? farm.raw.earns ? farm.raw.earns.map(i => i.symbol.toLowerCase()) : []
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
    return kebab.MASTER_ADDRESS;
  }
};
