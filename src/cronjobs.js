const _ = require("lodash");

module.exports = class Cronjobs {
  constructor(platforms, priceOracle, polygonPlatforms, polygonPriceOracle, fantomPlatforms, fantomPriceOracle, farmPlatformResolver, polygonFarmPlatformResolver, fantomFarmPlatformResolver, kccPlatforms, kccPriceOracle, kccFarmPlatformResolver, harmonyPlatforms, harmonyPriceOracle, harmonyFarmPlatformResolver) {
    this.platforms = platforms;
    this.priceOracle = priceOracle;
    this.farmPlatformResolver = farmPlatformResolver;

    this.polygonPlatforms = polygonPlatforms;
    this.polygonPriceOracle = polygonPriceOracle;
    this.polygonFarmPlatformResolver = polygonFarmPlatformResolver;

    this.fantomPlatforms = fantomPlatforms;
    this.fantomPriceOracle = fantomPriceOracle;
    this.fantomFarmPlatformResolver = fantomFarmPlatformResolver;

    this.kccPlatforms = kccPlatforms;
    this.kccPriceOracle = kccPriceOracle;
    this.kccFarmPlatformResolver = kccFarmPlatformResolver;

    this.harmonyPlatforms = harmonyPlatforms;
    this.harmonyPriceOracle = harmonyPriceOracle;
    this.harmonyFarmPlatformResolver = harmonyFarmPlatformResolver;
  }

  async cronInterval() {
    await this.priceOracle.updateTokens();

    const lps = (await Promise.all(this.platforms.getFunctionAwaits('getLbAddresses'))).flat()
    const addresses = _.uniqWith(lps, (a, b) => a.toLowerCase() === b.toLowerCase());
    await Promise.allSettled(_.chunk(addresses, 75).map(chunk => {
      return this.priceOracle.fetch(chunk);
    }));

    await this.farmPlatformResolver.buildPlatformList((await Promise.all(this.platforms.getFunctionAwaits('getFarms'))).flat());
  }

  async polygonCronInterval() {
    await this.polygonPriceOracle.updateTokens();

    const lps = (await Promise.all(this.polygonPlatforms.getFunctionAwaits('getLbAddresses'))).flat();
    const addresses = _.uniqWith(lps, (a, b) => a.toLowerCase() === b.toLowerCase());
    await Promise.allSettled(_.chunk(addresses, 75).map(chunk => {
      return this.polygonPriceOracle.fetch(chunk);
    }));
  }

  async fantomCronInterval() {
    await this.fantomPriceOracle.updateTokens();

    const lps = (await Promise.all(this.fantomPlatforms.getFunctionAwaits('getLbAddresses'))).flat();
    const addresses = _.uniqWith(lps, (a, b) => a.toLowerCase() === b.toLowerCase());
    await Promise.allSettled(_.chunk(addresses, 75).map(chunk => {
      return this.fantomPriceOracle.fetch(chunk);
    }));
  }

  async kccCronInterval() {
    await this.kccPriceOracle.updateTokens();

    const lps = (await Promise.all(this.kccPlatforms.getFunctionAwaits('getLbAddresses'))).flat();
    const addresses = _.uniqWith(lps, (a, b) => a.toLowerCase() === b.toLowerCase());
    await Promise.allSettled(_.chunk(addresses, 75).map(chunk => {
      return this.kccPriceOracle.fetch(chunk);
    }));
  }

  async harmonyCronInterval() {
    await this.harmonyPriceOracle.updateTokens();

    const lps = (await Promise.all(this.harmonyPlatforms.getFunctionAwaits('getLbAddresses'))).flat();
    const addresses = _.uniqWith(lps, (a, b) => a.toLowerCase() === b.toLowerCase());
    await Promise.allSettled(_.chunk(addresses, 75).map(chunk => {
      return this.harmonyPriceOracle.fetch(chunk);
    }));
  }

  async cronPlatforms() {
    Promise.allSettled([
      this.fantomFarmPlatformResolver.buildPlatformList((await Promise.all(this.fantomPlatforms.getFunctionAwaits('getFarms'))).flat()),
      this.kccFarmPlatformResolver.buildPlatformList((await Promise.all(this.kccPlatforms.getFunctionAwaits('getFarms'))).flat()),
      this.polygonFarmPlatformResolver.buildPlatformList((await Promise.all(this.polygonPlatforms.getFunctionAwaits('getFarms'))).flat()),
      this.harmonyFarmPlatformResolver.buildPlatformList((await Promise.all(this.harmonyPlatforms.getFunctionAwaits('getFarms'))).flat()),
    ]);
  }
}
