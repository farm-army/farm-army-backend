const _ = require("lodash");

module.exports = class Cronjobs {
  constructor(platforms, priceOracle, polygonPlatforms, polygonPriceOracle, fantomPlatforms, fantomPriceOracle, farmPlatformResolver, polygonFarmPlatformResolver, fantomFarmPlatformResolver, kccPlatforms, kccPriceOracle, kccFarmPlatformResolver, harmonyPlatforms, harmonyPriceOracle, harmonyFarmPlatformResolver, celoPlatforms, celoPriceOracle, celoFarmPlatformResolver, moonriverPlatforms, moonriverPriceOracle, moonriverFarmPlatformResolver) {
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

    this.celoPlatforms = celoPlatforms;
    this.celoPriceOracle = celoPriceOracle;
    this.celoFarmPlatformResolver = celoFarmPlatformResolver;

    this.moonriverPlatforms = moonriverPlatforms;
    this.moonriverPriceOracle = moonriverPriceOracle;
    this.moonriverFarmPlatformResolver = moonriverFarmPlatformResolver;
  }

  async cronInterval() {
    await this.priceOracle.updateTokens();

    const lps = (await Promise.all(this.platforms.getFunctionAwaits('getLbAddresses'))).flat()
    const addresses = _.uniqWith(lps, (a, b) => a.toLowerCase() === b.toLowerCase());
    await Promise.allSettled(_.chunk(addresses, 75).map(chunk => {
      return this.priceOracle.fetch(chunk);
    }));

    await this.priceOracle.onFetchDone();
  }

  async polygonCronInterval() {
    await this.polygonPriceOracle.updateTokens();

    const lps = (await Promise.all(this.polygonPlatforms.getFunctionAwaits('getLbAddresses'))).flat();
    const addresses = _.uniqWith(lps, (a, b) => a.toLowerCase() === b.toLowerCase());
    await Promise.allSettled(_.chunk(addresses, 75).map(chunk => {
      return this.polygonPriceOracle.fetch(chunk);
    }));

    await this.polygonPriceOracle.onFetchDone();
  }

  async fantomCronInterval() {
    await this.fantomPriceOracle.updateTokens();

    const lps = (await Promise.all(this.fantomPlatforms.getFunctionAwaits('getLbAddresses'))).flat();
    const addresses = _.uniqWith(lps, (a, b) => a.toLowerCase() === b.toLowerCase());
    await Promise.allSettled(_.chunk(addresses, 75).map(chunk => {
      return this.fantomPriceOracle.fetch(chunk);
    }));

    await this.fantomPriceOracle.onFetchDone();
  }

  async kccCronInterval() {
    await this.kccPriceOracle.updateTokens();

    const lps = (await Promise.all(this.kccPlatforms.getFunctionAwaits('getLbAddresses'))).flat();
    const addresses = _.uniqWith(lps, (a, b) => a.toLowerCase() === b.toLowerCase());
    await Promise.allSettled(_.chunk(addresses, 75).map(chunk => {
      return this.kccPriceOracle.fetch(chunk);
    }));

    await this.kccPriceOracle.onFetchDone();
  }

  async harmonyCronInterval() {
    await this.harmonyPriceOracle.updateTokens();

    const lps = (await Promise.all(this.harmonyPlatforms.getFunctionAwaits('getLbAddresses'))).flat();
    const addresses = _.uniqWith(lps, (a, b) => a.toLowerCase() === b.toLowerCase());
    await Promise.allSettled(_.chunk(addresses, 75).map(chunk => {
      return this.harmonyPriceOracle.fetch(chunk);
    }));

    await this.harmonyPriceOracle.onFetchDone();
  }

  async celoCronInterval() {
    await this.celoPriceOracle.updateTokens();

    const lps = (await Promise.all(this.celoPlatforms.getFunctionAwaits('getLbAddresses'))).flat();
    const addresses = _.uniqWith(lps, (a, b) => a.toLowerCase() === b.toLowerCase());
    await Promise.allSettled(_.chunk(addresses, 75).map(chunk => {
      return this.celoPriceOracle.fetch(chunk);
    }));

    await this.celoPriceOracle.onFetchDone();
  }

  async moonriverCronInterval() {
    await this.moonriverPriceOracle.updateTokens();

    const lps = (await Promise.all(this.moonriverPlatforms.getFunctionAwaits('getLbAddresses'))).flat();
    const addresses = _.uniqWith(lps, (a, b) => a.toLowerCase() === b.toLowerCase());
    await Promise.allSettled(_.chunk(addresses, 75).map(chunk => {
      return this.moonriverPriceOracle.fetch(chunk);
    }));

    await this.moonriverPriceOracle.onFetchDone();
  }

  async cronPlatforms() {
    Promise.allSettled([
      this.farmPlatformResolver.buildPlatformList((await Promise.all(this.platforms.getFunctionAwaits('getFarms'))).flat()),
      this.fantomFarmPlatformResolver.buildPlatformList((await Promise.all(this.fantomPlatforms.getFunctionAwaits('getFarms'))).flat()),
      this.kccFarmPlatformResolver.buildPlatformList((await Promise.all(this.kccPlatforms.getFunctionAwaits('getFarms'))).flat()),
      this.polygonFarmPlatformResolver.buildPlatformList((await Promise.all(this.polygonPlatforms.getFunctionAwaits('getFarms'))).flat()),
      this.harmonyFarmPlatformResolver.buildPlatformList((await Promise.all(this.harmonyPlatforms.getFunctionAwaits('getFarms'))).flat()),
      this.celoFarmPlatformResolver.buildPlatformList((await Promise.all(this.celoPlatforms.getFunctionAwaits('getFarms'))).flat()),
    ]);
  }
}
