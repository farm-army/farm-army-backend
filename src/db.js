"use strict";

const batchCandleJSON = require("candlestick-convert").batchCandleJSON;

module.exports = class Db {
  static CANDLE_MINUTES_INTERVAL = 15;

  constructor(database, priceOracle, platforms, priceCollector, lpPriceCollector) {
    this.database = database;
    this.priceOracle = priceOracle;
    this.platforms = platforms;
    this.priceCollector = priceCollector;
    this.lpPriceCollector = lpPriceCollector;
  }

  async updateAddressMaps() {
    const inserts = [];
    for (const [key, value] of Object.entries(this.priceCollector.getAddressMap())) {
      inserts.push({
        token: key,
        price: value.toString()
      });
    }

    return this.insertPrices(inserts);
  }

  async updateLpInfoMaps() {
    const inserts = [];

    this.lpPriceCollector.all().forEach(i => {
      if (i.tokens.length === 2) {
        inserts.push({
          token: i.address.toLowerCase(),
          token0: i.tokens[0].amount,
          token1: i.tokens[1].amount
        });
      }
    });

    return this.insertLpInfo(inserts);
  }

  async updateFarmPrices() {
    const items = (
      await Promise.all(this.platforms.getFunctionAwaits('getFarms'))
    ).flat();

    const inserts = items
      .filter(
        farm =>
          farm.extra &&
          farm.extra.pricePerFullShareToken &&
          farm.extra.pricePerFullShare
      )
      .map(farm => {
        if (
          farm.extra.pricePerFullShare < 0.000001 ||
          farm.extra.pricePerFullShare > 5000000000000000
        ) {
          console.error(
            `possible wrong unit on farm price: ${farm.extra.pricePerFullShareToken} - ${farm.extra.pricePerFullShare}`
          );
        }

        return {
          token: farm.extra.pricePerFullShareToken,
          price: farm.extra.pricePerFullShare
        };
      });

    return this.insertPrices(inserts);
  }

  insertPrices(prices) {
    return new Promise(resolve => {
      const upsert = this.database.prepare(
        "INSERT INTO token_price(token, price, price_usd, created_at) VALUES ($token, $price, $price_usd, $created_at) " +
          "ON CONFLICT(token, created_at) DO UPDATE SET price=$price, price_usd=$price_usd"
      );

      const coff = 1000 * 60 * Db.CANDLE_MINUTES_INTERVAL;
      const date = new Date();
      const timeNow = Math.round(
        new Date(Math.floor(date / coff) * coff).getTime() / 1000
      );

      this.database.transaction(() => {
        prices.forEach(exchangeCandlestick => {
          const parameters = {
            token: exchangeCandlestick.token.toLowerCase(),
            price: exchangeCandlestick.price,
            price_usd: exchangeCandlestick.price_usd
              ? exchangeCandlestick.price_usd
              : null,
            created_at: timeNow
          };

          upsert.run(parameters);
        });
      })();

      resolve();
    });
  }

  insertLpInfo(prices) {
    return new Promise(resolve => {
      const upsert = this.database.prepare(
        "INSERT INTO lp_token_history(token, token0, token1, created_at) VALUES ($token, $token0, $token1, $created_at) " +
          "ON CONFLICT(token, created_at) DO UPDATE SET token0=$token0, token1=token1"
      );

      const coff = 1000 * 60 * Db.CANDLE_MINUTES_INTERVAL;
      const date = new Date();
      const timeNow = Math.round(
        new Date(Math.floor(date / coff) * coff).getTime() / 1000
      );

      this.database.transaction(() => {
        prices.forEach(exchangeCandlestick => {
          const parameters = {
            token: exchangeCandlestick.token.toLowerCase(),
            token0: exchangeCandlestick.token0,
            token1: exchangeCandlestick.token1,
            created_at: timeNow
          };

          upsert.run(parameters);
        });
      })();

      resolve();
    });
  }

  getTokenPricesOnAtTimestamp(token, timestamps) {
    return new Promise(resolve => {
      const stmt = this.database.prepare(
        `SELECT * FROM token_price WHERE token = ? AND created_at IN ( ${[
          ...timestamps
        ]
          .fill("?")
          .join(",")} ) order by created_at DESC`
      );

      resolve(stmt.all([token.toLowerCase(), ...timestamps]));
    });
  }

  getTokenPriceInWindow(token) {
    return new Promise(resolve => {
      const nowX = Math.floor(Date.now() / 1000);

      // full hour for cache hit
      const now = nowX - (nowX % 3600);

      const stmt = this.database.prepare('SELECT * FROM token_price WHERE token = ? AND created_at >= ? order by created_at ASC');

      let number = now - (60 * 60 * 24 * Db.CANDLE_MINUTES_INTERVAL);
      let all = stmt.all([token.toLowerCase(), number]);

      const candles = all.map(i => {
        return {
          time: i.created_at * 1000,
          open: parseFloat(i.price),
          high: parseFloat(i.price),
          low: parseFloat(i.price),
          close: parseFloat(i.price),
          volume: 0,
        }
      })

      const baseFrame = 60 * Db.CANDLE_MINUTES_INTERVAL; // 5 minutes
      const newFrame = 60 * 60; // 1 hour

      resolve(batchCandleJSON(candles, baseFrame, newFrame).map(c => {
        c.time = Math.round(c.time / 1000);
        return c;
      }));
    });
  }
};
