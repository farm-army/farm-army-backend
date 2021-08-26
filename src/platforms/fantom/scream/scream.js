"use strict";

const Utils = require("../../../utils");
const QtokenAbi = require("./abi/qtoken.json");
const LendBorrowPlatform = require("../../common").LendBorrowPlatform;
const fetch = require("node-fetch");

module.exports = class scream extends LendBorrowPlatform {
  async getTokens() {
    const cacheKey = `getFarmsViaHtml-v1-${this.getName()}`;

    const cache = await this.cacheManager.get(cacheKey);
    if (cache) {
      return cache;
    }

    const responseObject = await fetch("https://api.thegraph.com/subgraphs/name/screamsh/scream-v1", {
      "headers": {
        "accept": "application/json, text/plain, */*",
        "accept-language": "en-US,en;q=0.9",
        "content-type": "application/json;charset=UTF-8",
        "sec-ch-ua": "\" Not A;Brand\";v=\"99\", \"Chromium\";v=\"92\"",
        "sec-ch-ua-mobile": "?0",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site"
      },
      "referrer": "https://scream.sh/",
      "referrerPolicy": "strict-origin-when-cross-origin",
      "body": "{\"query\":\"{\\n                    markets(first: 100) {\\n                      borrowRate\\n                      cash\\n                      collateralFactor\\n                      exchangeRate\\n                      interestRateModelAddress\\n                      name\\n                      reserves\\n                      supplyRate\\n                      symbol\\n                      id\\n                      totalBorrows\\n                      totalSupply\\n                      underlyingAddress\\n                      underlyingName\\n                      underlyingPrice\\n                      underlyingSymbol\\n                      underlyingPriceUSD\\n                      accrualBlockNumber\\n                      blockTimestamp\\n                      borrowIndex\\n                      reserveFactor\\n                      underlyingDecimals\\n                    }\\n                  }\"}",
      "method": "POST",
      "mode": "cors"
    });

    const response = await responseObject.json();

    const markets = response && response.data && response.data.markets
      ? response.data.markets
      : [];

    const result = markets
      .filter(m => m.cash > 0)
      .map(market => ({
        address: market.id,
        name: market.underlyingSymbol,
      }));

    await this.cacheManager.set(cacheKey, Object.freeze(result), {ttl: 60 * 30});

    return Object.freeze(result);
  }

  getName() {
    return 'scream';
  }

  getChain() {
    return 'fantom';
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
    return `https://scream.sh/`
  }

  getFarmEarns(farm) {
    return ['scream'];
  }
}
