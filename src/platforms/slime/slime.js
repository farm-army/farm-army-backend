"use strict";

const MasterChefAbi = require('./abi/masterchef.json');
const SousChefAbi = require('./abi/souschef.json');

const Pools = require('./farms/pools.json');

const PancakePlatformFork = require("../common").PancakePlatformFork;

module.exports = class slime extends PancakePlatformFork {
  static MASTER_ADDRESS = "0xc4bC80Fa8349B1E4A3D848F0B2c8d4146403F515"

  constructor(cache, priceOracle, tokenCollector, farmCollector, cacheManager) {
    super(cache, priceOracle);

    this.cache = cache;
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector;
    this.farmCollector = farmCollector;
    this.cacheManager = cacheManager;
  }

  async getFetchedFarms() {
    const cacheKey = `slime-v1-master-farms`

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
    return 'slime';
  }

  getFarmLink(farm) {
    if (farm.id.startsWith(`${this.getName()}_sous_`)) {
      return 'https://slime.finance/pools';
    }

    return 'https://slime.finance/farms';
  }

  getFarmEarns(farm) {
    return farm.id.startsWith(`${this.getName()}_farm_`)
      ? ['slime']
      : undefined;
  }

  getPendingRewardContractMethod() {
    return 'pendingReward';
  }

  getSousAbi() {
    return SousChefAbi;
  }

  getMasterChefAbi() {
    return MasterChefAbi;
  }

  getMasterChefAddress() {
    return slime.MASTER_ADDRESS;
  }
};
