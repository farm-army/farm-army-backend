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

const Cache = require("timed-cache");
const Sqlite = require("better-sqlite3");
const Http = require("./http");
const Db = require("./db");
const Balances = require("./balances");
const Platforms = require("./platforms/platforms");
const PriceOracle = require("./price_oracle");
const TokenCollector = require("./token/token_collector");
const cacheManagerInstance = require('cache-manager');
const fsStore = require('cache-manager-fs-hash');
const path = require("path");

module.exports = {
  Utils: require("./utils"),

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

    return (priceOracle = new PriceOracle(this, this.getTokenCollector()));
  },

  getPlatforms() {
    if (platforms) {
      return platforms;
    }

    return (platforms = new Platforms(
        this.getCache(),
        this.getPriceOracle()
    ));
  },

  getCache() {
    if (cache) {
      return cache;
    }

    return (cache = new Cache());
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
        ttl: 60 * 24 * 30,
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

    return (balances = new Balances(this.getCache(), this.getPriceOracle()));
  },

  getTokenCollector() {
    if (tokenCollector) {
      return tokenCollector;
    }

    return (tokenCollector = new TokenCollector(this.getCacheManager()));
  },

  getDb() {
    if (db) {
      return db;
    }

    return (db = new Db(
      this.getDatabase(),
      this.getPriceOracle(),
      this.getPlatforms()
    ));
  },

  getHttp() {
    if (http) {
      return http;
    }

    return (http = new Http(
      this.getPriceOracle(),
      this.getPlatforms(),
      this.getBalances()
    ));
  }
};
