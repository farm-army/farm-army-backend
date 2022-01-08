const crypto = require('crypto');

module.exports = class ContractAbiFetcher {
  constructor(bscscanRequest, cacheManager) {
    this.bscscanRequest = bscscanRequest;
    this.cacheManager = cacheManager;
  }

  async getAbiForContractAddress(address, chain = 'bsc', options = {}) {
    const hash = crypto.createHash('md5').update(JSON.stringify(options)).digest('hex');
    const cacheKey = `abi-contract-v1-${chain}-${address}-${hash}`

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    if (options && options.proxy) {
      address = options.proxy
    }

    let url;
    switch (chain) {
      case 'bsc':
        url = `https://api.bscscan.com/api?module=contract&action=getabi&address=${address}`;
        break;
      case 'polygon':
        url = `https://api.polygonscan.com/api?module=contract&action=getabi&address=${address}`;
        break;
      case 'fantom':
        url = `https://api.ftmscan.com/api?module=contract&action=getabi&address=${address}`;
        break;
      case 'kcc':
        url = `https://explorer.kcc.io/api?module=contract&action=getabi&address=${address}`;
        break;
      case 'harmony':
        url = `https://explorer.harmony.one/api?module=contract&action=getabi&address=${address}`;
        break;
      case 'celo':
        url = `https:/explorer.celo.org/api?module=contract&action=getabi&address=${address}`;
        break;
      case 'moonriver':
        url = `https:/blockscout.moonriver.moonbeam.network/api?module=contract&action=getabi&address=${address}`;
        break;
      default:
        throw new Error('Invalid chain');
    }

    let parse;

    try {
      parse = await this.bscscanRequest.get(url, chain);
    } catch (e) {
      console.log(`abi-fetch-error-${chain}`, url);
      return;
    }

    if (!parse.result) {
      console.log(`abi-fetch-error-${chain}`, url);
      return;
    }

    const abi = JSON.parse(parse.result);
    await this.cacheManager.set(cacheKey, abi, {ttl: 60 * 60 * 24 * 7})

    return abi;
  }
}
