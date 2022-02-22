'use strict';

module.exports = class StableCollector {
  CACHE_KEY = 'cross-stable-coin-map-v1';

  constructor(cacheManager, priceFetcher) {
    this.cacheManager = cacheManager;
    this.priceFetcher = priceFetcher;
    this.tokens = {};

    // init data
    setTimeout(async () => {
      const tokens = await this.cacheManager.get(this.CACHE_KEY);
      if (tokens && Object.keys(tokens).length > 0 && Object.keys(this.tokens).length === 0) {
        this.tokens = Object.freeze(tokens);
      }
    }, 1)
  }

  isAllStables(chain, addresses) {
    if (!this.tokens[chain] || addresses.length === 0)  {
      return false;
    }

    for (const address of addresses) {
      if (!this.tokens[chain].includes(address.toLowerCase())) {
        return false;
      }
    }

    return true;
  }

  async updateStableTokenMap() {
    const tokens = await this.priceFetcher.getCoinGeckoTokens();
    if (tokens.length === 0) {
      console.error('getCoinGeckoTokens are empty')
      return;
    }

    const stables = ['usd-coin', 'tether', 'dai', 'magic-internet-money', 'mimatic', 'binance-usd', 'frax', 'ageur', 'celo-dollar', 'celo-euro', 'true-usd', 'wrapped-ust', 'viacoin', 'rusd', 'fantom-usd'];

    const chains = {
      moonriver: 'moonriver',
      harmony: 'harmony-shard-0',
      celo: 'celo',
      cronos: 'cronos',
      bsc: 'binance-smart-chain',
      polygon: 'polygon-pos',
      moonbeam: 'moonbeam',
      fantom: 'fantom',
      kcc: 'kucoin-community-chain',
    }

    const stableChainTokens = {
      fantom: [
        '0xe3a486c1903ea794eed5d5fa0c9473c7d7708f40', // cusd
      ],
      bsc: [
        '0x5801d0e1c7d977d78e4890880b8e579eb4943276', // usdo
      ],
      moonriver: [
        '0xFb2019DfD635a03cfFF624D210AEe6AF2B00fC2C', // mimatic
        '0x748134b5F553F2bcBD78c6826De99a70274bDEb3', // usdc.m
        '0xE936CAA7f6d9F5C9e907111FCAf7c351c184CDA7', // usdt.m
        '0x1A93B23281CC1CDE4C4741353F3064709A16197d', // frax
      ]
    };

    tokens.forEach(token => {
      if (!stables.includes(token.id)) {
        return;
      }

      for (const [chain, id] of Object.entries(chains)) {
        if (!token.platforms || !token.platforms[id]) {
          continue;
        }

        if (!stableChainTokens[chain]) {
          stableChainTokens[chain] = [];
        }

        const address = token.platforms[id].toLowerCase();
        if (!stableChainTokens[chain].includes(address)) {
          stableChainTokens[chain].push(address);
        }
      }
    });

    this.tokens = Object.freeze(stableChainTokens);
    await this.cacheManager.set(this.CACHE_KEY, Object.freeze(stableChainTokens), {ttl: 60 * 60 * 6});
  }
}