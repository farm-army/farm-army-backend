"use strict";

const _ = require("lodash");
const LootswapCosmic = require("./lootswap_cosmic");
const LootswapLoot = require("./lootswap_loot");

module.exports = class lootswap {
  constructor(cache, priceOracle, tokenCollector, farmCollector, cacheManager) {
    this.cache = cache;
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector;
    this.farmCollector = farmCollector;
    this.cacheManager = cacheManager;

    this.masterchef1 = new LootswapCosmic(cache, priceOracle, tokenCollector, farmCollector, cacheManager);
    this.masterchef2 = new LootswapLoot(cache, priceOracle, tokenCollector, farmCollector, cacheManager);
  }

  async getLbAddresses() {
    return _.uniq((await Promise.all([
      this.masterchef1.getLbAddresses(),
      this.masterchef2.getLbAddresses(),
    ])).flat());
  }

  async getFarms(refresh = false) {
    return (await Promise.all([
      this.masterchef1.getFarms(refresh),
      this.masterchef2.getFarms(refresh),
    ])).flat();
  }

  async getYields(address) {
    return (await Promise.all([
      this.masterchef1.getYields(address),
      this.masterchef2.getYields(address),
    ])).flat();
  }

  async getDetails(address, id) {
    if (id.includes('_cosmic_')) {
      return this.masterchef1.getDetails(address, id);
    }

    if (id.includes('_loot_')) {
      return this.masterchef2.getDetails(address, id);
    }

    return undefined;
  }

  getName() {
    return 'lootswap';
  }

  getChain() {
    return 'harmony';
  }
};
