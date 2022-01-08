"use strict";

const Utils = require("../../../utils");
const TokenAbi = require("./abi/token.json");
const LendAbi = require("./abi/lend.json");
const Web3EthContract = require("web3-eth-contract");
const _ = require("lodash");
const LendBorrowPlatform = require("../../common").LendBorrowPlatform;

module.exports = class hhundred extends LendBorrowPlatform {
  async getTokens() {
    const cacheKey = `getFarms-v2-${this.getName()}`;

    const cache = await this.cacheManager.get(cacheKey);
    if (cache) {
      return cache;
    }

    const allMarkets = await Utils.multiCall([{
      allMarkets: new Web3EthContract(LendAbi, '0x0F390559F258eB8591C8e31Cf0905E97cf36ACE2').methods.getAllMarkets(),
    }], this.getChain());

    const result = allMarkets[0].allMarkets.map(address => ({
      address: address,
    }))

    await this.cacheManager.set(cacheKey, Object.freeze(result), {ttl: 60 * 30});

    return Object.freeze(result);
  }

  getName() {
    return 'hundred';
  }

  getChain() {
    return 'harmony';
  }

  getTokenAbi() {
    return TokenAbi;
  }

  getConfig() {
    return {
      exchangeRateMethod: 'exchangeRateStored',
      borrowBalanceOfMethod: 'borrowBalanceStored',
      cashMethod: 'getCash'
    }
  }

  getFarmLink(farm) {
    return 'https://hundred.finance'
  }

  getFarmEarns(farm) {
    return [];
  }
}
