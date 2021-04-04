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

      STATIC_TOKENS.forEach(i => this.add(i))
    }, 1)
  }

  add(token) {
    if (!token.symbol || !token.address || !token.decimals) {
      console.error(`Invalid token: ${JSON.stringify(token)}`);
      return;
    }

    if (token.symbol.length > 30 || !token.address.startsWith('0x') || token.decimals > 20 || token.decimals < 0) {
      console.error(`Invalid token: ${JSON.stringify(token)}`);
      return;
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

  allAsAddressMap() {
    return this.tokens;
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
    if (!symbol || symbol.length > 50) {
      console.error(`Invalid symbol: ${symbol}`)
      return undefined;
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

  /**
   * @param {string} symbol
   * @returns {string|undefined}
   */
  getAddressBySymbol(symbol) {
    if (!symbol || symbol.length > 50) {
      console.error(`Invalid symbol: ${symbol}`)
      return undefined;
    }

    const token = this.getTokenBySymbol(symbol)

    return token
      ? token.address
      : undefined;
  }
}
