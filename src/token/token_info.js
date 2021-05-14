'use strict';

module.exports = class TokenInfo {
    constructor(cacheManager, tokenCollector, liquidityTokenCollector, priceCollector, db) {
        this.cacheManager = cacheManager;
        this.tokenCollector = tokenCollector;
        this.liquidityTokenCollector = liquidityTokenCollector;
        this.priceCollector = priceCollector;
        this.db = db;
    }

    async getTokenInfo(token) {
        const cacheKey = `token-info-v4-${token}`

        const cache = await this.cacheManager.get(cacheKey)
        if (cache) {
            return cache;
        }

        let result = {
            address: token,
        };

        const info = this.tokenCollector.getTokenByAddress(token);
        if (info) {
            result.token = info;
        }

        const lpToken = this.liquidityTokenCollector.get(token);
        if (lpToken) {
            result.liquidityPool = lpToken;

            if (lpToken.tokens.length === 2) {
                const equalLiquidityPools = this.liquidityTokenCollector.getPoolAddressesForPair(lpToken.tokens[0].address, lpToken.tokens[1].address)
                  .filter(p => p.address.toLowerCase() !== token)
                  .map(p => {
                      const price = this.priceCollector.getPrice(p.address);

                      if (price) {
                          p.price = price;
                      }

                      return p;
                  });

                if (equalLiquidityPools.length > 0) {
                    result.equalLiquidityPools = equalLiquidityPools
                }
            }
        }

        const price = this.priceCollector.getPrice(token);
        if (price) {
            result.price = price;
        }

        const candles = await this.db.getTokenPriceInWindow(token);
        if (candles && candles.length > 0) {
            result.candles = candles;
        }

        await this.cacheManager.set(cacheKey, result, {ttl: 60 * 10})

        return result
    }
}