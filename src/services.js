"use strict";

let balances;
let cache;
let cacheManager;
let database;
let db;
let priceOracle;
let platforms;
let http;
let tokenCollector;
let addressTransactions;
let liquidityTokenCollector;
let priceCollector;
let farmFetcher;

const Cache = require("timed-cache");
const Sqlite = require("better-sqlite3");
const Http = require("./http");
const Db = require("./db");
const Balances = require("./balances");
const Platforms = require("./platforms/platforms");
const PriceOracle = require("./price_oracle");
const TokenCollector = require("./token/token_collector");
const PriceCollector = require("./token/price_collector");
const cacheManagerInstance = require('cache-manager');
const fsStore = require('cache-manager-fs-hash');
const path = require("path");
const AddressTransactions = require("./token/address_transactions");
const LiquidityTokenCollector = require("./token/liquidity_token_collector");
const FarmFetcher = require("./farm/farm_fetcher");

const Pancake = require("./platforms/pancake/pancake");
const Swamp = require("./platforms/swamp/swamp");

let pancake;
let swamp;

const _ = require("lodash");
const fs = require("fs");

module.exports = {
  Utils: require("./utils"),

  CONFIG: _.merge(
    JSON.parse(fs.readFileSync(path.resolve(__dirname, "../config.json"), "utf8")),
    fs.existsSync(path.resolve(__dirname, "../config.json.local")) ? JSON.parse(fs.readFileSync(path.resolve(__dirname, "../config.json.local"), "utf8")) : {}
  ),

  getDatabase() {
    if (database) {
      return database;
    }

    const myDb = Sqlite("db.db");
    myDb.pragma("journal_mode = WAL");
    myDb.pragma("SYNCHRONOUS = 1;");
    myDb.pragma("LOCKING_MODE = EXCLUSIVE;");

    return (database = myDb);
  },

  getPriceOracle() {
    if (priceOracle) {
      return priceOracle;
    }

    return (priceOracle = new PriceOracle(
      this,
      this.getTokenCollector(),
      this.getLiquidityTokenCollector(),
      this.getPriceCollector(),
    ));
  },

  getPlatforms() {
    if (platforms) {
      return platforms;
    }

    return (platforms = new Platforms(
        [
          this.getPancake(),
          this.getSwamp(),
        ],
        this.getCache(),
        this.getPriceOracle(),
        this.getTokenCollector(),
    ));
  },

  getPancake() {
    if (pancake) {
      return pancake;
    }

    return (pancake = new Pancake(
      this.getCache(),
      this.getPriceOracle(),
      this.getTokenCollector(),
      this.getFarmFetcher(),
      this.getCacheManager(),
    ));
  },

  getSwamp() {
    if (swamp) {
      return swamp;
    }

    return (swamp = new Swamp(
      this.getCache(),
      this.getPriceOracle(),
      this.getTokenCollector(),
      this.getFarmFetcher(),
      this.getCacheManager(),
    ));
  },

  getCache() {
    if (cache) {
      return cache;
    }

    return (cache = new Cache());
  },

  getAddressTransactions() {
    if (addressTransactions) {
      return addressTransactions;
    }

    return (addressTransactions = new AddressTransactions(
      this.getPlatforms(),
      this.getUserCacheManager(),
      module.exports.CONFIG['BSCSCAN_API_KEY'],
      this.getLiquidityTokenCollector(),
      this.getTokenCollector(),
      this.getPriceCollector(),
    ));
  },

  getLiquidityTokenCollector() {
    if (liquidityTokenCollector) {
      return liquidityTokenCollector;
    }

    return (liquidityTokenCollector = new LiquidityTokenCollector(
      this.getCacheManager(),
    ));
  },

  getCacheManager() {
    if (cacheManager) {
      return cacheManager;
    }

    const cacheDir = path.resolve(__dirname, '../var/cache')

    const diskCache = cacheManagerInstance.caching({
      store: fsStore,
      options: {
        path: cacheDir,
        ttl: 60 * 60 * 24 * 30,
        subdirs: true,
        zip: false,
      }
    });

    return cacheManager = diskCache;
  },

  getUserCacheManager() {
    if (cacheManager) {
      return cacheManager;
    }

    const cacheDir = path.resolve(__dirname, '../var/cache')

    const diskCache = cacheManagerInstance.caching({
      store: fsStore,
      options: {
        path: cacheDir,
        ttl: 60 * 60 * 3,
        subdirs: true,
        zip: false,
      }
    });

    return cacheManager = diskCache;
  },

  getBalances() {
    if (balances) {
      return balances;
    }

    return (balances = new Balances(
      this.getCache(),
      this.getPriceOracle(),
      this.getTokenCollector(),
    ));
  },

  getTokenCollector() {
    if (tokenCollector) {
      return tokenCollector;
    }

    return (tokenCollector = new TokenCollector(this.getCacheManager()));
  },

  getPriceCollector() {
    if (priceCollector) {
      return priceCollector;
    }

    return (priceCollector = new PriceCollector(this.getCacheManager()));
  },

  getDb() {
    if (db) {
      return db;
    }

    return (db = new Db(
      this.getDatabase(),
      this.getPriceOracle(),
      this.getPlatforms(),
      this.getPriceCollector()
    ));
  },

  getHttp() {
    if (http) {
      return http;
    }

    return (http = new Http(
      this.getPriceOracle(),
      this.getPlatforms(),
      this.getBalances(),
      this.getAddressTransactions(),
      this.getTokenCollector(),
      this.getLiquidityTokenCollector(),
    ));
  },

  getFarmFetcher() {
    if (farmFetcher) {
      return farmFetcher;
    }

    return (farmFetcher = new FarmFetcher(
      module.exports.CONFIG['BSCSCAN_API_KEY'],
    ));
  },
};
