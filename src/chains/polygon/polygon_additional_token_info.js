'use strict';

module.exports = class PolygonAdditionalTokenInfo {
  constructor(cacheManager, tokenCollector, liquidityTokenCollector, priceCollector, priceOracle) {
    this.cacheManager = cacheManager;
    this.tokenCollector = tokenCollector;
    this.liquidityTokenCollector = liquidityTokenCollector;
    this.priceCollector = priceCollector;
    this.priceOracle = priceOracle;

    this.tokens = {};
  }

  async init() {
    // init data
    setTimeout(async () => {
      const tokens = await this.cacheManager.get('fantom-additional-token-info');
      if (tokens) {
        this.tokens = tokens;
      }
    }, 1);
  }

  async update() {
    const [beefyFarms, beefyLpPrices] = await Promise.all([
      this.beefy.getFarms(),
      this.beefy.getLpPrices(),
    ]);

    const result = {};

    this.tokens = result;

    await this.cacheManager.set('fantom-additional-token-info', this.tokens, {ttl: 60 * 60 * 24 * 7});
  }

  find(address) {
    return this.tokens[address.toLowerCase()] || undefined;
  }

  getPrice(address) {
    const price = this.tokens[address.toLowerCase()]?.price;
    if (price) {
      return price;
    }

    return this.priceOracle.findPrice(address.toLowerCase());
  }

  getName(address) {
    return this.tokens[address.toLowerCase()]?.name || undefined;
  }

  getSymbol(address) {
    const token = this.tokens[address.toLowerCase()]?.symbol;
    if (token) {
      return token;
    }

    const symbol2 = this.tokenCollector.getSymbolByAddress(address.toLowerCase());
    if (symbol2) {
      return symbol2;
    }

    return this.liquidityTokenCollector.getSymbolNames(address.toLowerCase());
  }

  isLiquidityPool(address) {
    if (this.liquidityTokenCollector.getSymbolNames(address.toLowerCase())) {
      return true;
    }

    return false;
  }
}