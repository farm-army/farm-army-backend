'use strict';

module.exports = class AddressTransactions {
  constructor(platforms, cacheManager, bscscanRequest, liquidityTokenCollector, tokenCollector, priceCollector) {
    this.platforms = platforms;
    this.cacheManager = cacheManager;
    this.bscscanRequest = bscscanRequest;
    this.liquidityTokenCollector = liquidityTokenCollector;
    this.tokenCollector = tokenCollector;
    this.priceCollector = priceCollector;
  }

  async getTransactions(address, chain = 'bsc') {
    const cacheKey = `all-v3-transactions-${chain}-${address}`

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    let host;
    if (chain === 'bsc') {
      host = 'api.bscscan.com';
    } else if(chain === 'polygon') {
      host = 'api.polygonscan.com';
    } else if (chain === 'fantom') {
      host = 'api.ftmscan.com';
    } else if (chain === 'kcc') {
      host = 'explorer.kcc.io';
    } else if (chain === 'harmony') {
      host = 'explorer.harmony.one';
    } else if (chain === 'celo') {
      host = 'explorer.celo.org';
    } else if (chain === 'moonriver') {
      host = 'blockscout.moonriver.moonbeam.network';
    } else if (chain === 'cronos') {
      host = 'api.cronoscan.com';
    } else {
      host = 'api.bscscan.com';
    }

    const myUrl = 'https://' + host + '/api?module=account&action=tokentx&address=%address%&page=1&offset=300&sort=desc'
      .replace("%address%", address);

    let response = {};
    try {
      response = await this.bscscanRequest.get(myUrl, chain);
    } catch (e) {
      console.error(myUrl, e.message);
      return [];
    }

    const items = await Promise.all(
      this.platforms.getFunctionAwaits("getFarms")
    );

    const map = {}
    items.flat().forEach(i => {
      if (i.extra && i.extra.transactionAddress && i.extra.transactionToken) {
        let item = {
          id: i.id,
          provider: i.provider,
          name: i.name,
        };

        if (i.link) {
          item.link = i.link;
        }

        map[i.extra.transactionAddress.toLowerCase() + '-' + i.extra.transactionToken.toLowerCase()] = item
      }
    });

    const transactions = (response?.result || [])
      .filter(
        t =>
          t.value &&
          t.value > 0 &&
          t.tokenDecimal
      )
      .map(t => {
        let amount = t.value / 10 ** t.tokenDecimal;

        if (t.from.toLowerCase() === address.toLowerCase()) {
          amount = -amount;
        }

        let symbol = t.tokenSymbol.toLowerCase();

        const singleSymbol = this.liquidityTokenCollector.getSymbolNames(t.contractAddress);
        if (singleSymbol) {
          symbol = singleSymbol;
        }

        const lpSymbol = this.liquidityTokenCollector.getSymbolNames(t.contractAddress);
        if (lpSymbol) {
          symbol = lpSymbol;
        }

        let newVar = {
          timestamp: parseInt(t.timeStamp),
          amount: amount,
          hash: t.hash,
          symbol: symbol.toLowerCase(),
          tokenName: t.tokenName,
          tokenAddress: t.contractAddress,
          from: t.from,
          to: t.to,
        };

        let target = t.from.toLowerCase();
        if (target === address.toLowerCase()) {
          target = t.to.toLowerCase();
        }

        if (map[target + '-' + t.contractAddress.toLowerCase()]) {
          newVar.vault = map[target + '-' + t.contractAddress.toLowerCase()];
        }

        if (t.contractAddress) {
          const price = this.priceCollector.getPrice(t.contractAddress);
          if (price) {
            newVar.usd = newVar.amount * price;
          }
        }

        return newVar;
      });

    const result = transactions.sort(function (a, b) {
      return b.timestamp - a.timestamp;
    });

    await this.cacheManager.set(cacheKey, result, {ttl: 60 * 5})

    return result;
  }
}