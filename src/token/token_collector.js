'use strict';

const STATIC_TOKENS = Object.freeze(require('./token_collector_static.json'))

module.exports = class TokenCollector {
  constructor(cacheManager) {
    this.cacheManager = cacheManager;
    this.tokens = {};
    this.tokenSymbols = {};

    STATIC_TOKENS.forEach(i => this.add(i))

    // init data
    setTimeout(async () => {
      const symbols = await this.cacheManager.get('token-collector-symbols');
      if (symbols) {
        this.tokenSymbols = symbols;
      }

      const addresses = await this.cacheManager.get('token-collector-addresses');
      if (addresses) {
        this.tokens = addresses;
      }
    }, 1)
  }

  add(token) {
    if (!token.symbol || !token.address || !token.decimals) {
      throw new Error(`Invalid token: ${JSON.stringify(token)}`)
    }

    if (token.symbol.length > 8 || !token.address.startsWith('0x') || token.decimals > 20 || token.decimals < 0) {
      throw new Error(`Invalid token: ${JSON.stringify(token)}`)
    }

    let tokenObject = Object.freeze({
      symbol: token.symbol.toLowerCase(),
      address: token.address,
      decimals: parseInt(token.decimals),
    });

    this.tokens[token.address.toLowerCase()] = tokenObject;
    this.tokenSymbols[token.symbol.toLowerCase()] = tokenObject;
  }

  all() {
    return Object.values(this.tokens);
  }

  async save() {
    await this.cacheManager.set('token-collector-symbols', this.tokenSymbols, {ttl: 60 * 60 * 24 * 7});
    await this.cacheManager.set('token-collector-addresses', this.tokens, {ttl: 60 * 60 * 24 * 7});
  }

  /**
   * @param {string} symbol
   * @returns {*|undefined}
   */
  getTokenBySymbol(symbol) {
    if (!symbol || symbol.length > 8) {
      throw new Error(`Invalid symbol: ${symbol}`)
    }

    return this.tokenSymbols[symbol.toLowerCase()] || undefined
  }

  /**
   * @param {string} address
   * @returns {*|undefined}
   */
  getTokenByAddress(address) {
    if (!address || !address.startsWith('0x')) {
      throw new Error(`Invalid address: ${address}`)
    }

    return this.tokens[address.toLowerCase()] || undefined
  }

  /**
   * @param {string} address
   * @param defaultDecimals
   * @returns {number}
   */
  getDecimals(address, defaultDecimals = 18) {
    if (!address || !address.startsWith('0x')) {
      throw new Error(`Invalid address: ${address}`)
    }

    const tokenStore = this.getTokenByAddress(address)

    return !tokenStore
      ? defaultDecimals
      : tokenStore.decimals;
  }
}
