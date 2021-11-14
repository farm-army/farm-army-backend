"use strict";

const MasterChefAbi = require('../abi/synapse/masterchef.json');
const PancakePlatformFork = require("./common").PancakePlatformFork;
const Curve = require("./curve");

module.exports = class synapse extends PancakePlatformFork {
  constructor(cache, priceOracle, tokenCollector, farmCollector, cacheManager, name, chain, masterChefAddress) {
    super(cache, priceOracle, tokenCollector);

    this.cache = cache;
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector;
    this.farmCollector = farmCollector;
    this.cacheManager = cacheManager;

    this.name = name;
    this.chain = chain;
    this.masterChefAddress = masterChefAddress;
  }

  async getRawFarms() {
    const cacheKey = `${this.getName()}-v5-master-farms`

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
       return cache;
    }

    const foo = (await this.farmCollector.fetchForMasterChef(this.getMasterChefAddress(), this.getChain(), {
      abi: MasterChefAbi,
    }));

    const lpInfos = await Curve.nerveSynapse(foo.map(f => f.lpAddress), this.getChain(), this.priceOracle, this.tokenCollector)

    const reformat = foo.map(f => {
      f.lpAddresses = f.lpAddress

      if (f.isTokenOnly === true) {
        f.tokenAddresses = f.lpAddress
      }

      const lpInfo = lpInfos[f.lpAddress.toLowerCase()];
      if (lpInfo) {
        f.lpSymbol = lpInfo.tokens.map(i => i.symbol.toLowerCase()).join('-').toUpperCase();
      }

      return f
    });

    await this.cacheManager.set(cacheKey, reformat, {ttl: 60 * 30})

    return reformat;
  }

  getRawPools() {
    return [];
  }

  getName() {
    return this.name;
  }

  getChain() {
    return this.chain;
  }

  getFarmLink(farm) {
    return 'https://synapseprotocol.com/stake';
  }

  getFarmEarns(farm) {
    return farm.id.startsWith(`${this.getName()}_farm_`)
      ? farm.raw.earns ? farm.raw.earns.map(i => i.symbol.toLowerCase()) : []
      : undefined;
  }

  getPendingRewardContractMethod() {
    return 'pendingSynapse';
  }

  getSousAbi() {
    return [];
  }

  async getMasterChefAbi() {
    return MasterChefAbi;
  }

  getMasterChefAddress() {
    return this.masterChefAddress
  }

  async onFarmsBuild(farms) {
    farms.forEach(farm => {
      farm.main_platform = 'synapse';
      farm.platform = 'synapse';
    });
  }
};
