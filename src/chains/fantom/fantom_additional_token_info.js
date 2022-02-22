'use strict';

module.exports = class FantomAdditionalTokenInfo {
  constructor(cacheManager, tokenCollector, liquidityTokenCollector, priceCollector, priceOracle, beefy, yearn, robovault) {
    this.cacheManager = cacheManager;
    this.tokenCollector = tokenCollector;
    this.liquidityTokenCollector = liquidityTokenCollector;
    this.priceCollector = priceCollector;
    this.priceOracle = priceOracle;
    this.robovault = robovault;

    this.beefy = beefy;
    this.yearn = yearn;
    this.tokens = {};
  }

  async init() {
    // init data
    setTimeout(async () => {
      const tokens = await this.cacheManager.get('fantom-additional-token-info');
      if (tokens) {
        this.tokens = tokens;
      }
    }, 1);
  }

  async update() {
    const [beefyFarms, beefyLpPrices, yearnFarms, robovaultFarms] = await Promise.all([
      this.beefy.getFarms(),
      this.beefy.getLpPrices(),
      this.yearn.getFarms(),
      this.robovault.getFarms(),
    ]);

    const result = this.tokens;

    const ibTokens = [
      {
        label: 'Beefy',
        items: beefyFarms,
      },
      {
        label: 'yearn',
        items: yearnFarms,
      },
      {
        label: 'robovault',
        items: robovaultFarms,
      }
    ];

    ibTokens.forEach(ibToken => {
      const label = ibToken.label;

      ibToken.items.forEach(item => {
        if (!item?.extra?.pricePerFullShare || !item?.extra?.transactionToken || !item?.extra?.pricePerFullShareToken) {
          return;
        }

        const iToken = item.extra.pricePerFullShareToken.toLowerCase();

        let price;
        if (item?.raw?.oracleId && beefyLpPrices[item.raw.oracleId]) {
          price = beefyLpPrices[item.raw.oracleId];
        } else {
          price = this.priceOracle.findPrice(item.extra.transactionToken);
        }

        if (!result[iToken]) {
          result[iToken] = {};
        }

        result[iToken].name = item.name;
        result[iToken].symbol = item.token;

        if (price) {
          result[iToken].price = item.extra.pricePerFullShare * price;
        }

        // filter: interest bearing token
        if (item?.extra?.pricePerFullShare > 1.0) {
          result[iToken].platform = label

          if (item.platform && item.platform.toLowerCase() !== label.toLowerCase()) {
            result[iToken].platform = `${item.platform} (${label})`;
          }

          result[iToken].flags = ['ibToken'];
        }

        if (item?.yield?.apy) {
          result[iToken].apy = item.yield.apy;
        }
      });
    })

    this.tokens = result;

    await this.cacheManager.set('fantom-additional-token-info', this.tokens, {ttl: 60 * 60 * 24 * 7});
  }

  find(address) {
    return this.tokens[address.toLowerCase()] || undefined;
  }

  getPrice(address) {
    const price = this.find(address)?.price;
    if (price) {
      return price;
    }

    return this.priceOracle.findPrice(address.toLowerCase());
  }

  getYieldAsApy(address) {
    return this.find(address)?.apy || undefined;
  }

  getPlatform(address) {
    return this.find(address)?.platform || undefined;
  }

  getName(address) {
    return this.find(address)?.name || undefined;
  }

  getFlags(address) {
    return this.find(address)?.flags || [];
  }

  getSymbol(address) {
    const token = this.find(address)?.symbol;
    if (token) {
      return token;
    }

    const symbol2 = this.tokenCollector.getSymbolByAddress(address.toLowerCase());
    if (symbol2) {
      return symbol2;
    }

    return this.liquidityTokenCollector.getSymbolNames(address.toLowerCase());
  }

  isLiquidityPool(address) {
    if (this.liquidityTokenCollector.getSymbolNames(address.toLowerCase())) {
      return true;
    }

    return false;
  }
}