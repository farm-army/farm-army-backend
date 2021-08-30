'use strict';

module.exports = class PriceCollector {
  constructor(cacheManager) {
    this.cacheManager = cacheManager;
    this.prices = {};
    this.pricesSymbols = {};

    // init data
    setTimeout(async () => {
      let prices = {}
      try {
        prices = await this.cacheManager.get('price-collector-addresses');
      } catch (e) {
        console.log('PriceCollector: "price-collector-addresses" json is broken');
      }

      if (prices) {
        this.prices = prices;
      }

      let pricesSymbols = {};
      try {
        pricesSymbols = await this.cacheManager.get('price-collector-symbols');
      } catch (e) {
        console.log('PriceCollector: "price-collector-symbols" json is broken');
      }

      if (pricesSymbols) {
        this.pricesSymbols = pricesSymbols;
      }
    }, 1)
  }

  add(address, price) {
    if (!address || !price) {
      throw new Error(`Invalid price: ${JSON.stringify([address, price])}`)
    }

    if (!address || !address.startsWith('0x')) {
      throw new Error(`Invalid address: ${address}`)
    }

    if (price > 5000000000000000 || price < 0.0000000001) {
      // skipping invalid prices
      console.error('price issues:', address, price)
      return;
    }

    this.prices[address.toLowerCase()] = parseFloat(price);
  }

  addForSymbol(symbol, price) {
    if (price > 5000000000000000 || price < 0.0000000001) {
      // skipping invalid prices
      console.error('price issues:', symbol, price)
      return;
    }

    this.pricesSymbols[symbol.toLowerCase()] = parseFloat(price);
  }

  async save() {
    await this.cacheManager.set('price-collector-addresses', this.prices, {ttl: 60 * 60 * 3});
    await this.cacheManager.set('price-collector-symbols', this.pricesSymbols, {ttl: 60 * 60 * 3});
  }

  getAddressMap() {
    return this.prices;
  }

  getSymbolMap() {
    return this.pricesSymbols;
  }

  /**
   * @returns {float|undefined}
   * @param addressOrTokens
   */
  getPrice(...addressOrTokens) {
    for (let addressOrToken of addressOrTokens) {
      let context = addressOrToken.toLowerCase();

      // address: 0x
      if (addressOrToken.startsWith("0x")) {
        const price = this.prices[context];
        if (price) {
          return price;
        }

        continue;
      }

      // symbol: btc
      const price = this.pricesSymbols[context];
      if (price) {
        return price;
      }
    }

    return undefined
  }
}
