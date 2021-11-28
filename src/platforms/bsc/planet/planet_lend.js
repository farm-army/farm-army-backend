"use strict";

const Utils = require("../../../utils");
const QtokenAbi = require("./abi/token.json");
const Web3EthContract = require("web3-eth-contract");
const LendAbi = require("./abi/lend.json");
const LendBorrowPlatform = require("../../common").LendBorrowPlatform;

module.exports = class plant_lend extends LendBorrowPlatform {
  async getTokens() {
    const cacheKey = `getFarmsViaHtml-v1-${this.getName()}`;

    const cache = await this.cacheManager.get(cacheKey);
    if (cache) {
      return cache;
    }

    const allMarkets = await Utils.multiCall([{
      allMarkets: new Web3EthContract(LendAbi, '0xf54f9e7070a1584532572a6f640f09c606bb9a83').methods.getAllMarkets(),
    }], this.getChain());

    const result = allMarkets[0].allMarkets.map(address => ({
      address: address,
    }))

    await this.cacheManager.set(cacheKey, Object.freeze(result), {ttl: 60 * 30});

    return Object.freeze(result);
  }

  getName() {
    return 'planet_lend';
  }

  getChain() {
    return 'bsc';
  }

  getTokenAbi() {
    return QtokenAbi;
  }

  getConfig() {
    return {
      exchangeRateMethod: 'exchangeRateStored',
      borrowBalanceOfMethod: 'borrowBalanceStored',
      cashMethod: 'getCash'
    }
  }

  getFarmLink(farm) {
    return 'https://green.planetfinance.io/'
  }

  getFarmEarns(farm) {
    return ['gamma'];
  }

  async onFarmsBuild(farms) {
    farms.forEach(farm => {
      farm.provider = 'planet';
    });
  }
}
