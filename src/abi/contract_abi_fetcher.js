const request = require("async-request");

module.exports = class ContractAbiFetcher {
  constructor(apiKey, cacheManager) {
    this.apiKey = apiKey;
    this.cacheManager = cacheManager;
  }

  async getAbiForContractAddress(address) {
    const cacheKey = `abi-contract-v1-${address}}`

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    const text = await request(`https://api.bscscan.com/api?module=contract&action=getabi&address=${address}&apikey=${encodeURIComponent(this.apiKey)}`);
    const abi = JSON.parse(JSON.parse(text.body).result);

    await this.cacheManager.set(cacheKey, abi, {ttl: 60 * 24 * 7})

    return abi;
  }
}
