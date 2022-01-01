'use strict';

const STATIC_TOKENS = Object.freeze(require('./token_collector_static.json'));
const STATIC_TOKENS_POLYGON = Object.freeze(require('./token_collector_static_polygon.json'));
const STATIC_TOKENS_FANTOM = Object.freeze(require('./token_collector_static_fantom.json'));
const STATIC_TOKENS_CRONOS = Object.freeze(require('./token_collector_static_cronos.json'));
const STATIC_TOKENS_MOONRIVER = Object.freeze(require('./token_collector_static_moonriver.json'));

module.exports = class TokenCollector {
  constructor(cacheManager, chain = undefined) {
    this.cacheManager = cacheManager;
    this.chain = chain;
    this.tokens = {};
    this.tokenSymbols = {};

    if (chain === 'bsc') {
      STATIC_TOKENS.forEach(i => this.add(i));
    } else if (chain === 'polygon') {
      STATIC_TOKENS_POLYGON.forEach(i => this.add(i));
    } else if (chain === 'fantom') {
      STATIC_TOKENS_FANTOM.forEach(i => this.add(i));
    } else if (chain === 'cronos') {
      STATIC_TOKENS_CRONOS.forEach(i => this.add(i));
    } else if (chain === 'moonriver') {
      STATIC_TOKENS_MOONRIVER.forEach(i => this.add(i));
    }

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

      if (chain === 'bsc') {
        STATIC_TOKENS.forEach(i => this.add(i))
      } else if (chain === 'polygon') {
        STATIC_TOKENS_POLYGON.forEach(i => this.add(i));
      } else if (chain === 'fantom') {
        STATIC_TOKENS_FANTOM.forEach(i => this.add(i));
      } else if (chain === 'moonriver') {
        STATIC_TOKENS_MOONRIVER.forEach(i => this.add(i));
      }
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
   * @param {string} address
   * @returns {number}
   */
  getSymbolByAddress(address) {
    if (!address || !address.startsWith('0x')) {
      throw new Error(`Invalid address: ${address}`)
    }

    const tokenStore = this.getTokenByAddress(address)

    return !tokenStore
      ? undefined
      : tokenStore.symbol;
  }

  /**
   * @param {string} address
   * @returns {string|undefined}
   */
  getAddressBySymbol(address) {
    if (!address || address.length > 50) {
      console.error(`Invalid symbol: ${address}`)
      return undefined;
    }

    const token = this.getTokenBySymbol(address)

    return token
      ? token.address
      : undefined;
  }
}
