"use strict";

const Utils = require("../../../utils");
const QtokenAbi = require("./abi/qtoken.json");
const LendBorrowPlatform = require("../../common").LendBorrowPlatform;

module.exports = class pfortube extends LendBorrowPlatform {
  async getTokens() {
    const cacheKey = `getFarmsViaHtml-v1-${this.getName()}`;

    const cache = await this.cacheManager.get(cacheKey);
    if (cache) {
      return cache;
    }

    const response = await Utils.requestJsonGet('https://api.for.tube/api/v1/bank/public/chain/Polygon-Inno/markets');

    const markets = response && response.data
      ? response.data
      : [];

    const result = markets.map(market => ({
      address: market.cheque_token_address,
      name: market.token_symbol,
    }))

    await this.cacheManager.set(cacheKey, Object.freeze(result), {ttl: 60 * 30});

    return Object.freeze(result);
  }

  getName() {
    return 'pfortube';
  }

  getChain() {
    return 'polygon';
  }

  getTokenAbi() {
    return QtokenAbi;
  }

  getConfig() {
    return {
      exchangeRateMethod: 'exchangeRateStored',
      borrowBalanceOfMethod: 'borrowBalanceStored',
      cashMethod: 'totalCash'
    }
  }

  getFarmLink(farm) {
    return 'https://for.tube/market/index'
  }

  getFarmEarns(farm) {
    return [];
  }
}
