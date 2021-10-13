const _ = require("lodash");
const Utils = require("../utils");
const PromiseThrottle = require('promise-throttle');

module.exports = class PriceFetcher {
  constructor(cacheManager) {
    this.cacheManager = cacheManager;
    this.coingeckoTokens = undefined;

    this.promiseThrottle = new PromiseThrottle({
      requestsPerSecond: 1,
      promiseImplementation: Promise
    });
  }

  async getCoinGeckoTokens() {
    const cacheKey = `coingecko-all-v1-token-addresses`

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    if (this.coingeckoTokens) {
      return this.coingeckoTokens;
    }

    return this.coingeckoTokens = (async () => {
      const result = await Utils.requestJsonGet('https://api.coingecko.com/api/v3/coins/list?include_platform=true', 30);

      await this.cacheManager.set(cacheKey, result, {ttl: 60 * 60})

      this.coingeckoTokens = undefined;

      return result;
    })();
  }

  async requestCoingeckoThrottled(url) {
    return this.promiseThrottle.add(async () => {
      const newVar = await Utils.requestJsonGet(url, 30);
      if (newVar) {
        return newVar;
      }

      return await Utils.requestJsonGet(url, 30, true);
    });
  }
}
