"use strict";

const MasterChefAbi = require('./abi/masterchef.json');
const PancakePlatformFork = require("../../common").PancakePlatformFork;

module.exports = class openswap1 extends PancakePlatformFork {
  static MASTER_ADDRESS = "0xaC71B617a58B3CC136D1f6A118252f331faB44fC"

  constructor(cache, priceOracle, tokenCollector, farmCollector, cacheManager) {
    super(cache, priceOracle);

    this.cache = cache;
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector;
    this.farmCollector = farmCollector;
    this.cacheManager = cacheManager;
    this.masterAbi = {};
  }

  async getFetchedFarms() {
    const cacheKey = `${this.getName()}-v1-master-farms`

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    const foo = (await this.farmCollector.fetchForMasterChef(this.getMasterChefAddress(), this.getChain(), {abi: await this.getMasterChefAbi()}))
      .filter(f => f.isFinished !== true);

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
    return 'openswap';
  }

  getChain() {
    return 'harmony';
  }

  getFarmLink(farm) {
    return 'https://app.v1.openswap.one/farm';
  }

  getFarmEarns(farm) {
    return farm.id.startsWith(`${this.getName()}_farm_`)
      ? farm.raw.earns ? farm.raw.earns.map(i => i.symbol.toLowerCase()) : []
      : undefined;
  }

  getPendingRewardContractMethod() {
    return 'pendingSushi';
  }

  getSousAbi() {
    return [];
  }

  async getMasterChefAbi() {
    return MasterChefAbi;
  }

  getMasterChefAddress() {
    return openswap1.MASTER_ADDRESS;
  }

  async onFarmsBuild(farms) {
    farms.forEach(farm => {
      farm.main_platform = 'openswap';
      farm.platform = 'openswap';
      farm.provider = 'openswap';

      if (!farm.tags) {
        farm.tags = [];
      }

      farm.tags.push('deprecated');

      if (!farm.actions) {
        farm.actions = [];
      }

      farm.actions.unshift({
        contract: '0xb1aD583BE88365B8031C7B4aA630411C59638d9A',
        method: 'collectAll',
        inputs: [],
        type: 'claim_all',
      });
    });
  }
};
