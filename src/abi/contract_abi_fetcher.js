const crypto = require('crypto');
const fs = require('fs');

module.exports = class ContractAbiFetcher {
  constructor(bscscanRequest, cacheManager, fileStorage) {
    this.bscscanRequest = bscscanRequest;
    this.cacheManager = cacheManager;
    this.fileStorage = fileStorage;
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
      case 'moonbeam':
        url = `https://blockscout.moonbeam.network/api?module=contract&action=getabi&address=${address}`;
        break;
      case 'cronos':
        url = [`https://api.cronoscan.com/api?module=contract&action=getabi&address=${address}`, `https://cronos.crypto.org/explorer/api?module=contract&action=getabi&address=${address}`];
        break;
      default:
        throw new Error('Invalid chain');
    }

    const urls = Array.isArray(url) ? url : [url];

    for (let url of urls) {
      let abi = [];

      let parse;

      try {
        parse = await this.bscscanRequest.get(url, chain);
      } catch (e) {
        console.log(`abi-fetch-error-${chain}`, url);
        continue;
      }

      if (!parse.result) {
        console.log(`abi-fetch-error-${chain}`, url);
        continue;
      }

      try {
        abi = JSON.parse(parse.result);
      } catch (e) {
        console.error(`Error fetching contract: ${chain} ${address} ${url}`);
        continue;
      }

      if (abi.length > 0) {
        const file = `${this.fileStorage}/${chain}-${address.toLowerCase()}.json`

        try {
          fs.writeFileSync(file, JSON.stringify(abi))
        } catch (err) {
          console.error('Contract file cache write error', file, err)
        }
      }

      await this.cacheManager.set(cacheKey, abi, {ttl: 60 * 60 * 24 * 7});

      return abi;
    }

    await this.cacheManager.set(cacheKey, [], {ttl: 60 * 60 * 15});

    return [];
  }
}
