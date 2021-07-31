const _ = require("lodash");

module.exports = class Cronjobs {
  constructor(platforms, priceOracle, polygonPlatforms, polygonPriceOracle, fantomPlatforms, fantomPriceOracle, farmPlatformResolver, polygonFarmPlatformResolver, fantomFarmPlatformResolver) {
    this.platforms = platforms;
    this.priceOracle = priceOracle;
    this.farmPlatformResolver = farmPlatformResolver;

    this.polygonPlatforms = polygonPlatforms;
    this.polygonPriceOracle = polygonPriceOracle;
    this.polygonFarmPlatformResolver = polygonFarmPlatformResolver;

    this.fantomPlatforms = fantomPlatforms;
    this.fantomPriceOracle = fantomPriceOracle;
    this.fantomFarmPlatformResolver = fantomFarmPlatformResolver;
  }

  async cronInterval() {
    const lps = (await Promise.all(this.platforms.getFunctionAwaits('getLbAddresses'))).flat()
    await this.priceOracle.updateTokens();

    const addresses = _.uniqWith(lps, (a, b) => a.toLowerCase() === b.toLowerCase());
    await Promise.allSettled(_.chunk(addresses, 75).map(chunk => {
      return this.priceOracle.fetch(chunk);
    }));

    await this.farmPlatformResolver.buildPlatformList((await Promise.all(this.platforms.getFunctionAwaits('getFarms'))).flat());
  }

  async polygonCronInterval() {
    const lps = (await Promise.all(this.polygonPlatforms.getFunctionAwaits('getLbAddresses'))).flat()
    await this.polygonPriceOracle.updateTokens();

    const addresses = _.uniqWith(lps, (a, b) => a.toLowerCase() === b.toLowerCase());
    await Promise.allSettled(_.chunk(addresses, 75).map(chunk => {
      return this.polygonPriceOracle.fetch(chunk);
    }));

    await this.polygonFarmPlatformResolver.buildPlatformList((await Promise.all(this.polygonPlatforms.getFunctionAwaits('getFarms'))).flat());
  }

  async fantomCronInterval() {
    const lps = (await Promise.all(this.fantomPlatforms.getFunctionAwaits('getLbAddresses'))).flat()
    await this.fantomPriceOracle.updateTokens();

    const addresses = _.uniqWith(lps, (a, b) => a.toLowerCase() === b.toLowerCase());
    await Promise.allSettled(_.chunk(addresses, 75).map(chunk => {
      return this.fantomPriceOracle.fetch(chunk);
    }));

    await this.fantomFarmPlatformResolver.buildPlatformList((await Promise.all(this.fantomPlatforms.getFunctionAwaits('getFarms'))).flat());
  }
}
