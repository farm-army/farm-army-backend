"use strict";

const MasterChefAbi = require("./abi/masterchef.json");
const PancakePlatformFork = require("../common").PancakePlatformFork;

module.exports = class macaron extends PancakePlatformFork {
  static MASTER_ADDRESS = "0xFcDE390bF7a8B8614EC11fa8bde7565b3E64fe0b";

  constructor(cache, priceOracle, tokenCollector, farmCollector, cacheManager) {
    super(cache, priceOracle);

    this.cache = cache;
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector;
    this.farmCollector = farmCollector;
    this.cacheManager = cacheManager;
  }

  async getFetchedFarms() {
    const cacheKey = `macaronswap-master-farms`;

    const cache = await this.cacheManager.get(cacheKey);
    if (cache) {
      return cache;
    }

    const foo = (await this.farmCollector.fetchForMasterChef(this.getMasterChefAddress())).filter(
      (f) => f.isFinished !== true,
    );

    const reformat = foo.map((f) => {
      f.lpAddresses = f.lpAddress;

      if (f.isTokenOnly === true) {
        f.tokenAddresses = f.lpAddress;
      }

      return f;
    });

    await this.cacheManager.set(cacheKey, reformat, { ttl: 60 * 30 });

    return reformat;
  }

  getRawFarms() {
    return this.getFetchedFarms();
  }

  getRawPools() {
    return [];
  }

  getName() {
    return "macaron";
  }

  getFarmLink(farm) {
    return farm.isTokenOnly === true
      ? "https://macaronswap.finance/falls"
      : "https://macaronswap.finance/magicbox";
  }

  getFarmEarns(farm) {
    return farm.id.startsWith(`${this.getName()}_farm_`) ? ["macaron"] : undefined;
  }

  getPendingRewardContractMethod() {
    return "pendingMacaron";
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
