"use strict";

const Utils = require("../../../utils");
const QtokenAbi = require("./abi/qtoken.json");
const LendBorrowPlatform = require("../../common").LendBorrowPlatform;

module.exports = class fortress extends LendBorrowPlatform {
  async getTokens() {
    const cacheKey = `getFarmsViaHtml-v1-${this.getName()}`;

    const cache = await this.cacheManager.get(cacheKey);
    if (cache) {
      return cache;
    }

    const response = await Utils.requestJsonGet('https://apibsc.fortress.loans/api/markets');

    const markets = response && response.data && response.data.markets
      ? response.data.markets
      : [];

    const result = markets.map(market => ({
      address: market.address,
      name: market.underlyingSymbol,
    }))

    await this.cacheManager.set(cacheKey, Object.freeze(result), {ttl: 60 * 30});

    return Object.freeze(result);
  }

  getName() {
    return 'fortress';
  }

  getChain() {
    return 'bsc';
  }

  getTokenAbi() {
    return QtokenAbi;
  }

  getConfig() {
    return {
      exchangeRateMethod: 'exchangeRateStored',
      borrowBalanceOfMethod: 'borrowBalanceStored',
    }
  }

  getFarmLink(farm) {
    return `https://bsc.fortress.loans/market/${farm.raw.name}`
  }

  getFarmEarns(farm) {
    return ['fts'];
  }
}
