module.exports = class ContractAbiFetcher {
  constructor(bscscanRequest, cacheManager) {
    this.bscscanRequest = bscscanRequest;
    this.cacheManager = cacheManager;
  }

  async getAbiForContractAddress(address) {
    const cacheKey = `abi-contract-v1-${address}`

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    const text = await this.bscscanRequest.get(`https://api.bscscan.com/api?module=contract&action=getabi&address=${address}`);

    let parse = JSON.parse(text.body);
    const abi = JSON.parse(parse.result);

    await this.cacheManager.set(cacheKey, abi, {ttl: 60 * 24 * 7})

    return abi;
  }
}
