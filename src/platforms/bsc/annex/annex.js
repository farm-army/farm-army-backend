"use strict";

const Utils = require("../../../utils");
const TokenAbi = require("./abi/token.json");
const _ = require("lodash");
const LendBorrowPlatform = require("../../common").LendBorrowPlatform;

module.exports = class annex extends LendBorrowPlatform {
  async getTokens() {
    const cacheKey = `getFarmsViaHtml-v2-${this.getName()}`;

    const cache = await this.cacheManager.get(cacheKey);
    if (cache) {
      return cache;
    }

    // 0x4d0891579e0bd3D09a0f0FB7DC3d9fCf2D9A77C1 => getAllMarkets is not working; wrongly deployed contract

    const json = await Utils.requestJsonGet('https://api.annex.finance/api/v1/governance/annex');

    const result = [];
    (json?.data?.markets || []).forEach(market => {
      if (!market.address) {
        return;
      }

      result.push({
        address: market.address,
        name: market.name,
        symbol: market.symbol,
      });
    });

    await this.cacheManager.set(cacheKey, Object.freeze(result), {ttl: 60 * 60});

    return Object.freeze(result);
  }

  getName() {
    return 'annex';
  }

  getChain() {
    return 'bsc';
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
    return 'https://app.annex.finance';
  }

  getFarmEarns(farm) {
    return [];
  }
}
