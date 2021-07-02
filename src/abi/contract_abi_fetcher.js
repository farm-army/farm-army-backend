module.exports = class ContractAbiFetcher {
  constructor(bscscanRequest, cacheManager, bscApiKey) {
    this.bscscanRequest = bscscanRequest;
    this.cacheManager = cacheManager;
    this.bscApiKey = bscApiKey;
  }

  async getAbiForContractAddress(address, chain = 'bsc') {
    const cacheKey = `abi-contract-v1-${chain}-${address}`

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    let url;
    switch (chain) {
      case 'bsc':
        url = `https://api.bscscan.com/api?module=contract&action=getabi&address=${address}`;
        break;
      case 'polygon':
        url = `https://api.polygonscan.com/api?module=contract&action=getabi&address=${address}`;
        break;
      default:
        throw new Error('Invalid chain');
    }

    let parse;

    try {
      parse = await this.bscscanRequest.get(url);
    } catch (e) {
      console.log('error', url)
    }

    const abi = JSON.parse(parse.result);
    await this.cacheManager.set(cacheKey, abi, {ttl: 60 * 24 * 7})

    return abi;
  }
}
