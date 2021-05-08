'use strict';

module.exports = class TokenInfo {
    constructor(cacheManager, tokenCollector, liquidityTokenCollector, priceCollector) {
        this.cacheManager = cacheManager;
        this.tokenCollector = tokenCollector;
        this.liquidityTokenCollector = liquidityTokenCollector;
        this.priceCollector = priceCollector;
    }

    async getTokenInfo(token) {
        const cacheKey = `token-info-v1-${token}`

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
        }

        const price = this.priceCollector.getPrice(token);
        if (price) {
            result.price = price;
        }

        await this.cacheManager.set(cacheKey, result, {ttl: 60 * 10})

        return result
    }
}