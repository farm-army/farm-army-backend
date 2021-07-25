const _ = require("lodash");

module.exports = class Cronjobs {
  constructor(platforms, priceOracle, polygonPlatforms, polygonPriceOracle, fantomPlatforms, fantomPriceOracle) {
    this.platforms = platforms;
    this.priceOracle = priceOracle;

    this.polygonPlatforms = polygonPlatforms;
    this.polygonPriceOracle = polygonPriceOracle;

    this.fantomPlatforms = fantomPlatforms;
    this.fantomPriceOracle = fantomPriceOracle;
  }

  async cronInterval() {
    const lps = (await Promise.all(this.platforms.getFunctionAwaits('getLbAddresses'))).flat()
    await this.priceOracle.updateTokens();

    await Promise.allSettled(_.chunk(_.uniq(lps), 75).map(chunk => {
      return this.priceOracle.fetch(chunk);
    }));
  }

  async polygonCronInterval() {
    const lps = (await Promise.all(this.polygonPlatforms.getFunctionAwaits('getLbAddresses'))).flat()
    await this.polygonPriceOracle.updateTokens();

    await Promise.allSettled(_.chunk(_.uniq(lps), 75).map(chunk => {
      return this.polygonPriceOracle.fetch(chunk);
    }));
  }

  async fantomCronInterval() {
    const lps = (await Promise.all(this.fantomPlatforms.getFunctionAwaits('getLbAddresses'))).flat()
    await this.fantomPriceOracle.updateTokens();

    await Promise.allSettled(_.chunk(_.uniq(lps), 75).map(chunk => {
      return this.fantomPriceOracle.fetch(chunk);
    }));
  }
}
