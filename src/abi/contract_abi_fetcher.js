const request = require("async-request");
const PromiseThrottle = require('promise-throttle');

module.exports = class ContractAbiFetcher {
  constructor(apiKey, cacheManager) {
    this.apiKey = apiKey;
    this.cacheManager = cacheManager;

    this.promiseThrottle = new PromiseThrottle({
      requestsPerSecond: 2,
      promiseImplementation: Promise
    });
  }

  async getAbiForContractAddress(address) {
    const cacheKey = `abi-contract-v1-${address}}`

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    // 5 sec limit; also need some window
    const text = await this.promiseThrottle.add(async () => {
      return await request(`https://api.bscscan.com/api?module=contract&action=getabi&address=${address}&apikey=${encodeURIComponent(this.apiKey)}`)
    });

    let parse = JSON.parse(text.body);
    const abi = JSON.parse(parse.result);

    await this.cacheManager.set(cacheKey, abi, {ttl: 60 * 24 * 7})

    return abi;
  }
}
