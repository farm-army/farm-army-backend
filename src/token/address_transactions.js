'use strict';

const request = require("async-request");

module.exports = class AddressTransactions {
  constructor(platforms, cacheManager, bscApiKey, liquidityTokenCollector) {
    this.platforms = platforms;
    this.cacheManager = cacheManager;
    this.bscApiKey = bscApiKey;
    this.liquidityTokenCollector = liquidityTokenCollector;
  }

  async getTransactions(address) {
    const cacheKey = `all-transactions-${address}`

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    const myUrl = 'https://api.bscscan.com/api?module=account&action=tokentx&address=%address%&page=1&offset=300&sort=desc&apikey=%apikey%'
      .replace("%address%", address)
      .replace("%apikey%", this.bscApiKey);

    let response = {};
    try {
      const responseBody = await request(myUrl);
      response = JSON.parse(responseBody.body);
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
        map[i.extra.transactionAddress.toLowerCase() + '-' + i.extra.transactionToken.toLowerCase()] = i.id
      }
    });

    const transactions = response.result
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

        const lpSymbol = this.liquidityTokenCollector.getSymbolNames(t.contractAddress);
        if (lpSymbol) {
          symbol = lpSymbol;
        }

        let newVar = {
          timestamp: parseInt(t.timeStamp),
          amount: amount,
          hash: t.hash,
          symbol: symbol,
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

        return newVar;
      });

    const result = transactions.sort(function (a, b) {
      return b.timestamp - a.timestamp;
    });

    await this.cacheManager.set(cacheKey, result, {ttl: 60 * 5})

    return result;
  }
}