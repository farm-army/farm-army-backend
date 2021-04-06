"use strict";

const fs = require("fs");
const path = require("path");
const _ = require("lodash");
const Web3EthContract = require("web3-eth-contract");
const request = require("async-request");
const BigNumber = require("bignumber.js");
const Utils = require("../../utils");
var crypto = require('crypto');

module.exports = class acryptos {
  constructor(cache, priceOracle) {
    this.cache = cache;
    this.priceOracle = priceOracle;
  }

  async getAddressFarms(address) {
    const cacheKey = `getAddressFarms-alpaca-${address}`;

    const cacheItem = this.cache.get(cacheKey);
    if (cacheItem) {
      return cacheItem;
    }

    const farms = await this.getFarms();

    const all = [];

    this.cache.put(cacheKey, all, { ttl: 300 * 1000 });

    return all;
  }

  async getFarms(refresh = false) {
    const cacheKey = "getFarms-alpaca";

    if (!refresh) {
      const cacheItem = this.cache.get(cacheKey);
      if (cacheItem) {
        return cacheItem;
      }
    }

    const text = await request("https://raw.githubusercontent.com/alpaca-finance/alpaca-contract/master/.mainnet.json");

    const response = JSON.parse(text.body);
    const farms = [];

   (response.Vaults || []).forEach(bearing => {
     let id = crypto.createHash('md5')
       .update(`${bearing.symbol.toLowerCase()}`)
       .digest("hex");

     farms.push({
       id: `alpaca_stake_${id}`,
       name: bearing.symbol,
       token: bearing.symbol.replace('ib', '').toLowerCase().replace('wbnb', ''),
       platform: 'pancakeswap',
       raw: Object.freeze({
         name: bearing.name,
         symbol: bearing.symbol,
         address: bearing.address,
         debtToken: bearing.debtToken,
       }),
       provider: "alpaca",
       has_details: false,
       link: 'https://app.alpacafinance.org/stake',
       extra: {}
     });

      bearing.workers.forEach(vault => {
        let id = crypto.createHash('md5')
          .update(`${bearing.symbol.toLowerCase()}_${vault.name.toLowerCase()}`)
          .digest("hex");

        const item = {
          id: `alpaca_vault_${id}`,
          name: vault.name.replace(/(\s+(.*)worker)/i, '').replace('wbnb', 'bnb'),
          platform: 'pancakeswap',
          raw: Object.freeze(vault),
          provider: "alpaca",
          has_details: false,
          link: 'https://app.alpacafinance.org/farm',
          extra: {}
        };

        farms.push(item);
      })
    })

    this.cache.put(cacheKey, farms, { ttl: 1000 * 60 * 30 });

    console.log("alpaca updated");

    return farms;
  }

  async getYields(address) {
    const addressFarms = await this.getAddressFarms(address);
    if (addressFarms.length === 0) {
      return [];
    }

    return await this.getYieldsInner(address, addressFarms);
  }

  async getYieldsInner(address, addressFarms) {
    return [];
  }

  async getTransactions(address, id) {
    return [];
  }

  async getDetails(address, id) {
    return [];
  }
};
