"use strict";

const MasterChefAbi = require('./abi/masterchef.json');
const PancakePlatformFork = require("../../common").PancakePlatformFork;

module.exports = class kukafe extends PancakePlatformFork {
  static MASTER_ADDRESS = "0x3cd0651a06b293e6c21c894afb71cc8251802fc5"

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

    const foo = (await this.farmCollector.fetchForMasterChef(
      this.getMasterChefAddress(),
      this.getChain(),
      {
        abi: MasterChefAbi
      }
    )).filter(f => f.isFinished !== true);

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
    return 'kukafe';
  }

  getChain() {
    return 'kcc';
  }

  getFarmLink(farm) {
    return 'https://ku.kafe.finance/#/';
  }

  getFarmEarns(farm) {
    return farm.id.startsWith(`${this.getName()}_farm_`)
      ? farm.raw.earns ? farm.raw.earns.map(i => i.symbol.toLowerCase()) : []
      : undefined;
  }

  getPendingRewardContractMethod() {
    return 'pendingKafe';
  }

  getSousAbi() {
    return [];
  }

  async getMasterChefAbi() {
    return MasterChefAbi;
  }

  getMasterChefAddress() {
    return kukafe.MASTER_ADDRESS;
  }
};
