"use strict";

const Utils = require("../../../utils");
const TokenAbi = require("./abi/token.json");
const LendAbi = require("./abi/lend.json");
const Web3EthContract = require("web3-eth-contract");
const _ = require("lodash");
const LendBorrowPlatform = require("../../common").LendBorrowPlatform;

module.exports = class spiritswap_lend extends LendBorrowPlatform {
  async getTokens() {
    const cacheKey = `getFarmsViaHtml-v1-${this.getName()}`;

    const cache = await this.cacheManager.get(cacheKey);
    if (cache) {
      return cache;
    }

    const allMarkets = await Utils.multiCall([{
      allMarkets: new Web3EthContract(LendAbi, '0x892701d128d63c9856A9Eb5d967982F78FD3F2AE').methods.getAllMarkets(),
    }], this.getChain());

    const result = allMarkets[0].allMarkets.map(address => ({
      address: address,
    }))

    await this.cacheManager.set(cacheKey, Object.freeze(result), {ttl: 60 * 30});

    return Object.freeze(result);
  }

  getName() {
    return 'spiritswap_lend';
  }

  getChain() {
    return 'fantom';
  }

  getTokenAbi() {
    return TokenAbi;
  }

  getConfig() {
    return {
      exchangeRateMethod: 'exchangeRateStored',
      borrowBalanceOfMethod: 'borrowBalanceStored',
      cashMethod: 'totalSupply'
    }
  }

  getFarmLink(farm) {
    return 'https://app.ola.finance/networks/0x892701d128d63c9856A9Eb5d967982F78FD3F2AE/markets'
  }

  getFarmEarns(farm) {
    return [];
  }

  async onFarmsBuild(farms) {
    farms.forEach(farm => {
      farm.provider = 'spiritswap';
    });
  }
}
