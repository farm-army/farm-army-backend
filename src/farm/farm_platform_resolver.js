'use strict';

module.exports = class FarmPlatformResolver {
  static CACHE_KEY = 'farm_platform_resolver_list';

  constructor(cacheManager) {
    this.cacheManager = cacheManager;

    this.map = {};

    // init data
    setTimeout(async () => {
      const addresses = await this.cacheManager.get(FarmPlatformResolver.CACHE_KEY);
      if (addresses) {
        this.map = addresses;
      }
    }, 1)
  }

  async buildPlatformList(farms) {
    const map = {}

    farms.forEach(farm => {
      if (farm.main_platform && farm.extra.transactionToken) {
        map[farm.extra.transactionToken.toLowerCase()] = farm.main_platform;
      }
    })

    this.map = Object.freeze(map);

    await this.cacheManager.set(FarmPlatformResolver.CACHE_KEY, Object.freeze(map), {ttl: 60 * 60 * 3})
  }

  findMainPlatformNameForTokenAddress(address) {
    return this.map[address.toLowerCase()] || undefined
  }
}