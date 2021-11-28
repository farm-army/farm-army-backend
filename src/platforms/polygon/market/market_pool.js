"use strict";

const Utils = require("../../../utils");
const TokenAbi = require("./abi/token.json");
const LendAbi = require("./abi/lend.json");
const Web3EthContract = require("web3-eth-contract");
const _ = require("lodash");
const LendBorrowPlatform = require("../../common").LendBorrowPlatform;

module.exports = class market_pool extends LendBorrowPlatform {
  constructor(priceOracle, tokenCollector, cacheManager, liquidityTokenCollector, farmPlatformResolver, pool, address) {
    super(priceOracle, tokenCollector, cacheManager, liquidityTokenCollector, farmPlatformResolver);

    this.pool = pool;
    this.address = address;
  }

  async getTokens() {
    const cacheKey = `getFarmsViaHtml-v1-${this.getName()}`;

    const cache = await this.cacheManager.get(cacheKey);
    if (cache) {
      return cache;
    }

    const allMarkets = await Utils.multiCall([{
      allMarkets: new Web3EthContract(LendAbi, this.address).methods.getAllMarkets(),
    }], this.getChain());

    const result = allMarkets[0].allMarkets.map(address => ({
      address: address,
    }))

    await this.cacheManager.set(cacheKey, Object.freeze(result), {ttl: 60 * 30});

    return Object.freeze(result);
  }

  getName() {
    return `market_pool${this.pool}`;
  }

  getChain() {
    return 'polygon';
  }

  getTokenAbi() {
    return TokenAbi;
  }

  getConfig() {
    return {
      exchangeRateMethod: 'exchangeRateStored',
      borrowBalanceOfMethod: 'borrowBalanceStored',
      cashMethod: 'getCash'
    }
  }

  getFarmLink(farm) {
    return `https://polygon.market.xyz/pool/${this.pool}`;
  }

  getFarmEarns(farm) {
    return [];
  }

  async onFarmsBuild(farms) {
    farms.forEach(farm => {
      farm.provider = 'market';
    });
  }
}
