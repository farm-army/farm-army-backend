"use strict";

let balances;
let cache;
let database;
let db;
let priceOracle;
let platforms;
let http;

const Cache = require("timed-cache");
const Sqlite = require("better-sqlite3");
const Http = require("./http");
const Db = require("./db");
const Balances = require("./balances");
const Platforms = require("./platforms/platforms");
const PriceOracle = require("./price_oracle");

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

    return (priceOracle = new PriceOracle(this));
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

  getBalances() {
    if (balances) {
      return balances;
    }

    return (balances = new Balances(this.getCache(), this.getPriceOracle()));
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
