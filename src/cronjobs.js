const _ = require("lodash");

module.exports = class Cronjobs {
  constructor(platforms,
              priceOracle,
              polygonPlatforms,
              polygonPriceOracle,
              fantomPlatforms,
              fantomPriceOracle,
              farmPlatformResolver,
              polygonFarmPlatformResolver,
              fantomFarmPlatformResolver,
              fantomAdditionalTokenInfo,
              kccPlatforms,
              kccPriceOracle,
              kccFarmPlatformResolver,
              harmonyPlatforms,
              harmonyPriceOracle,
              harmonyFarmPlatformResolver,
              celoPlatforms,
              celoPriceOracle,
              celoFarmPlatformResolver,
              moonriverPlatforms,
              moonriverPriceOracle,
              moonriverFarmPlatformResolver,
              cronosPlatforms,
              cronosPriceOracle,
              cronosFarmPlatformResolver,
              moonbeamPlatforms,
              moonbeamPriceOracle,
              moonbeamFarmPlatformResolver
  ) {
    this.platforms = platforms;
    this.priceOracle = priceOracle;
    this.farmPlatformResolver = farmPlatformResolver;

    this.polygonPlatforms = polygonPlatforms;
    this.polygonPriceOracle = polygonPriceOracle;
    this.polygonFarmPlatformResolver = polygonFarmPlatformResolver;

    this.fantomPlatforms = fantomPlatforms;
    this.fantomPriceOracle = fantomPriceOracle;
    this.fantomFarmPlatformResolver = fantomFarmPlatformResolver;
    this.fantomAdditionalTokenInfo = fantomAdditionalTokenInfo;

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

    this.cronosPlatforms = cronosPlatforms;
    this.cronosPriceOracle = cronosPriceOracle;
    this.cronosFarmPlatformResolver = cronosFarmPlatformResolver;

    this.moonbeamPlatforms = moonbeamPlatforms;
    this.moonbeamPriceOracle = moonbeamPriceOracle;
    this.moonbeamFarmPlatformResolver = moonbeamFarmPlatformResolver;
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
    await this.fantomAdditionalTokenInfo.update();
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

  async cronosCronInterval() {
    await this.cronosPriceOracle.updateTokens();

    const lps = (await Promise.all(this.cronosPlatforms.getFunctionAwaits('getLbAddresses'))).flat();
    const addresses = _.uniqWith(lps, (a, b) => a.toLowerCase() === b.toLowerCase());
    await Promise.allSettled(_.chunk(addresses, 75).map(chunk => {
      return this.cronosPriceOracle.fetch(chunk);
    }));

    await this.cronosPriceOracle.onFetchDone();
  }

  async moonbeamCronInterval() {
    await this.moonbeamPriceOracle.updateTokens();

    const lps = (await Promise.all(this.moonbeamPlatforms.getFunctionAwaits('getLbAddresses'))).flat();
    const addresses = _.uniqWith(lps, (a, b) => a.toLowerCase() === b.toLowerCase());
    await Promise.allSettled(_.chunk(addresses, 75).map(chunk => {
      return this.moonbeamPriceOracle.fetch(chunk);
    }));

    await this.moonbeamPriceOracle.onFetchDone();
  }

  async cronPlatforms() {
    Promise.allSettled([
      this.farmPlatformResolver.buildPlatformList((await Promise.all(this.platforms.getFunctionAwaits('getFarms'))).flat()),
      this.fantomFarmPlatformResolver.buildPlatformList((await Promise.all(this.fantomPlatforms.getFunctionAwaits('getFarms'))).flat()),
      this.kccFarmPlatformResolver.buildPlatformList((await Promise.all(this.kccPlatforms.getFunctionAwaits('getFarms'))).flat()),
      this.polygonFarmPlatformResolver.buildPlatformList((await Promise.all(this.polygonPlatforms.getFunctionAwaits('getFarms'))).flat()),
      this.harmonyFarmPlatformResolver.buildPlatformList((await Promise.all(this.harmonyPlatforms.getFunctionAwaits('getFarms'))).flat()),
      this.celoFarmPlatformResolver.buildPlatformList((await Promise.all(this.celoPlatforms.getFunctionAwaits('getFarms'))).flat()),
      this.moonriverFarmPlatformResolver.buildPlatformList((await Promise.all(this.moonriverPlatforms.getFunctionAwaits('getFarms'))).flat()),
      this.cronosFarmPlatformResolver.buildPlatformList((await Promise.all(this.cronosPlatforms.getFunctionAwaits('getFarms'))).flat()),
      this.moonbeamFarmPlatformResolver.buildPlatformList((await Promise.all(this.moonbeamPlatforms.getFunctionAwaits('getFarms'))).flat()),
    ]);
  }
}
