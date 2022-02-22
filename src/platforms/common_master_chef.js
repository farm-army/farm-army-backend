"use strict";

const PancakePlatformFork = require("./common").PancakePlatformFork;

module.exports = class CommonMasterChef extends PancakePlatformFork {
  constructor(cacheManager, priceOracle, tokenCollector, liquidityTokenCollector, farmCollector, options) {
    super(cacheManager, priceOracle, tokenCollector, liquidityTokenCollector);

    this.farmCollector = farmCollector;
    this.options = options;
  }

  async getMasterChefAbi() {
    return (await this.getMatcherChefMeta())?.abi || [];
  }

  async getPendingRewardContractMethod() {
    return (await this.getMatcherChefMeta())?.methods?.pendingRewardsFunctionName || [];
  }

  getChain() {
    return this.options.chain;
  }

  getMasterChefAddress() {
    return this.options.masterChefAddress;
  }

  getName() {
    return this.options.name;
  }

  getFarmLink(farm) {
    return this.options.farmLinkVault;
  }

  getFarmEarns(farm) {
    return farm.id.startsWith(`${this.getName()}_farm_`)
      ? farm.raw.earns ? farm.raw.earns.map(i => i.symbol.toLowerCase()) : []
      : undefined;
  }

  async getMatcherChefMeta() {
    const cacheKey = `${this.getName()}-v3-master-meta`

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    const options = this?.options?.farmFetcherOptions || {};

    const foo = await this.farmCollector.fetchForMasterChefWithMeta(this.getMasterChefAddress(), this.getChain(), options);

    await this.cacheManager.set(cacheKey, foo, {ttl: 60 * 30})

    return foo;
  }

  async getFetchedFarms() {
    const cacheKey = `${this.getName()}-v1-master-farms`

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    const foo = (await this.getMatcherChefMeta())?.pools || [];

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

  async getRawFarms() {
    return this.getFetchedFarms();
  }

  async getRawPools() {
    return [];
  }

  async onFarmsBuild(farms) {
    farms.forEach(farm => {
      if (this?.options?.main_platform) {
        farm.main_platform = this.options.main_platform;
      }

      if (this?.options?.platform) {
        farm.platform = this.options.platform;
      }
    });
  }
}
