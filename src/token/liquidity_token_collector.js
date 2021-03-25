'use strict';

module.exports = class LiquidityTokenCollector {
  constructor(cacheManager) {
    this.cacheManager = cacheManager;
    this.tokens = {};

    // init data
    setTimeout(async () => {
      const addresses = await this.cacheManager.get('liquidity-token-collector-addresses');
      if (addresses) {
        this.tokens = addresses;
      }
    }, 1)
  }

  add(lpToken, tokens) {
    if (!lpToken || !lpToken.startsWith('0x') || !tokens || tokens.length < 2) {
      throw new Error(`Invalid token: ${JSON.stringify([lpToken, tokens])}`)
    }

    this.tokens[lpToken.toLowerCase()] = {
      address: lpToken,
      tokens: tokens,
    };
  }

  get(lpToken) {
    if (!lpToken || !lpToken.startsWith('0x')) {
      throw new Error(`Invalid token: ${JSON.stringify([lpToken])}`)
    }

    return this.tokens[lpToken.toLowerCase()]
  }

  getSymbolNames(lpToken) {
    let value = this.get(lpToken);

    return !value
      ? undefined
      : value.tokens.map(t => t.symbol.toLowerCase()).join('-')
  }

  all() {
    return Object.values(this.tokens);
  }

  async save() {
    await this.cacheManager.set('liquidity-token-collector-addresses', this.tokens, {ttl: 60 * 60 * 3});
  }
}
