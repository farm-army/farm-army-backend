"use strict";

const MasterChefFarmsAbi = require('./abi/0x22fB2663C7ca71Adc2cc99481C77Aaf21E152e2D.json');
const PancakePlatformFork = require("../common").PancakePlatformFork;
const Utils = require("../../utils");

module.exports = class wault extends PancakePlatformFork {
  /// static MASTER_ADDRESS = "0x52a2B3BEAfA46BA51A4792793a7447396D09423f" // old ones?
  static MASTER_ADDRESS = "0x22fB2663C7ca71Adc2cc99481C77Aaf21E152e2D" // more usable

  constructor(cache, priceOracle, tokenCollector, farmCollector, cacheManager) {
    super(cache, priceOracle);

    this.cache = cache;
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector;
    this.farmCollector = farmCollector;
    this.cacheManager = cacheManager;
  }

  async getPoolInfo() {
    const cacheKey = `wault-v1-pool-info`

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    let response
    try {
      response = await Utils.requestGet('https://api.wault.finance/farmsData2.js');
    } catch (e) {
      return {}
    }

    let poolsMatch = response.match(/^.*\s*\w+?\s*=\s*(.*)/);
    if (!poolsMatch || !poolsMatch[1]) {
      return {}
    }

    const pools = {};
    JSON.parse(poolsMatch[1]).filter(pool => pool.poolId).forEach(pool => {
      pools[pool.poolId.toString()] = pool
    });

    await this.cacheManager.set(cacheKey, pools, {ttl: 60 * 15})

    return pools;
  }

  async onFarmsBuild(farms) {
    const poolInfos = await this.getPoolInfo();

    farms.forEach(farm => {
      let poolInfo = poolInfos[farm.raw.pid.toString()];
      if (poolInfo && poolInfo.apy) {
        farm.yield = {
          apy: poolInfo.apy
        };
      }
    });
  }

  async getFetchedFarms() {
    const cacheKey = `wault-v1-master-farms`

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
    return 'wault';
  }

  getFarmLink() {
    return 'https://app.wault.finance/#farm';
  }

  getFarmEarns(farm) {
    return farm.id.startsWith(`${this.getName()}_farm_`)
      ? farm.raw.earns ? farm.raw.earns.map(i => i.symbol.toLowerCase()) : []
      : undefined;
  }

  getPendingRewardContractMethod() {
    return 'pendingWex';
  }

  getSousAbi() {
    return [];
  }

  getMasterChefAbi() {
    return MasterChefFarmsAbi;
  }

  getMasterChefAddress() {
    return wault.MASTER_ADDRESS;
  }
};
