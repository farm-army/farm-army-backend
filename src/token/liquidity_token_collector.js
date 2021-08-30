'use strict';

module.exports = class LiquidityTokenCollector {
  constructor(cacheManager) {
    this.cacheManager = cacheManager;
    this.tokens = {};

    // init data
    setTimeout(async () => {
      let addresses = {};

      try {
        addresses = await this.cacheManager.get('liquidity-token-collector-addresses');
      } catch (e) {
        console.log('LiquidityTokenCollector: json is broken')
      }

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

    return this.tokens[lpToken.toLowerCase()] || undefined
  }

  getSymbolNames(lpToken) {
    let value = this.get(lpToken);

    return !value
      ? undefined
      : value.tokens.map(t => t.symbol.toLowerCase()).join('-')
  }

  getPoolAddressesForPair(token0, token1) {
    const myToken0 = token0.toLowerCase();
    const myToken1 = token1.toLowerCase();

    const same = [];

    Object.values(this.tokens).forEach(pair => {
      if (pair.tokens.length !== 2) {
        return;
      }

      let pToken0 = pair.tokens[0].address;
      let pToken1 = pair.tokens[1].address;
      if (!pToken0 || !pToken1) {
        return;
      }

      let isSamePair = (pToken0.toLowerCase() === myToken0 && pToken1.toLowerCase() === myToken1)
       || (pToken0.toLowerCase() === myToken1 && pToken1.toLowerCase() === myToken0);

      if (isSamePair) {
        same.push(pair);
      }
    });

    return same;
  }

  all() {
    return Object.values(this.tokens);
  }

  async save() {
    await this.cacheManager.set('liquidity-token-collector-addresses', this.tokens, {ttl: 60 * 60 * 3});
  }
}
