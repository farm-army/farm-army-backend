"use strict";

const Utils = require("../../../utils");
const _ = require("lodash");
const QtokenAbi = require("./abi/qtoken.json");
const LendBorrowPlatform = require("../../common").LendBorrowPlatform;

module.exports = class cream extends LendBorrowPlatform {
  getMarketsUrl() {
    return 'https://api.cream.finance/api/v1/crtoken?comptroller=bsc';
  }

  async getTokens() {
    const cacheKey = `getFarmsViaHtml-v2-${this.getName()}`;

    const cache = await this.cacheManager.get(cacheKey);
    if (cache) {
      return cache;
    }

    const markets = (await Utils.requestJsonGet(this.getMarketsUrl())) || [];

    const result = markets.map(market => ({
      address: market.token_address,
      name: market.underlying_symbol,
    }))

    await this.cacheManager.set(cacheKey, Object.freeze(result), {ttl: 60 * 30});

    return Object.freeze(result);
  }

  getTokenAbi() {
    return QtokenAbi;
  }

  getConfig() {
    return {
      exchangeRateMethod: 'exchangeRateStored',
      borrowBalanceOfMethod: 'borrowBalanceStored',
      cashMethod: 'getCash'
    }
  }

  getFarmLink(farm) {
    return 'https://app.cream.finance/'
  }

  getFarmEarns(farm) {
    return [];
  }

  getName() {
    return 'cream';
  }

  getChain() {
    return 'bsc';
  }
}
