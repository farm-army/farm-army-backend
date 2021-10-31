"use strict";

const MasterChefAbi = require('./abi/masterchef2.json');
const PancakePlatformFork = require("../../common").PancakePlatformFork;

module.exports = class openswap2 extends PancakePlatformFork {
  static MASTER_ADDRESS = "0xb2E9B85FB43082F3148B0D13450E8BEB5C9B63f2"

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
    return 'openswap_v2';
  }

  getChain() {
    return 'harmony';
  }

  getFarmLink(farm) {
    return 'https://app.openswap.one/farm';
  }

  getFarmEarns(farm) {
    return farm.id.startsWith(`${this.getName()}_farm_`)
      ? farm.raw.earns ? farm.raw.earns.map(i => i.symbol.toLowerCase()) : []
      : undefined;
  }

  getPendingRewardContractMethod() {
    return 'pendingOpenSwap';
  }

  getSousAbi() {
    return [];
  }

  async getMasterChefAbi() {
    return MasterChefAbi;
  }

  getMasterChefAddress() {
    return openswap2.MASTER_ADDRESS;
  }

  async onFarmsBuild(farms) {
    farms.forEach(farm => {
      farm.main_platform = 'openswap';
      farm.platform = 'openswap';
      farm.provider = 'openswap';

      if (!farm.actions) {
        farm.actions = [];
      }

      farm.actions.unshift({
        contract: '0xb2E9B85FB43082F3148B0D13450E8BEB5C9B63f2',
        method: 'collectAll',
        inputs: [],
        type: 'claim_all',
      });
    });
  }
};
