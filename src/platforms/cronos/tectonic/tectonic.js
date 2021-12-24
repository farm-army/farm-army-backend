"use strict";

const Utils = require("../../../utils");
const TokenAbi = require("./abi/token.json");
const LendAbi = require("./abi/lend.json");
const Web3EthContract = require("web3-eth-contract");
const _ = require("lodash");
const LendBorrowPlatform = require("../../common").LendBorrowPlatform;

module.exports = class tectonic extends LendBorrowPlatform {
  async getTokens() {
    const cacheKey = `getFarmsViaHtml-v2-${this.getName()}`;

    const cache = await this.cacheManager.get(cacheKey);
    if (cache) {
     // return cache;
    }

    return [
      {
        address: '0xeAdf7c01DA7E93FdB5f16B0aa9ee85f978e89E95',
        name: 'CRO',
        symbol: 'CRO',
      },
      {
        address: '0x543F4Db9BD26C9Eb6aD4DD1C33522c966C625774',
        name: 'ETH',
        symbol: 'ETH',
      },
      {
        address: '0xB3bbf1bE947b245Aef26e3B6a9D777d7703F4c8e',
        name: 'USDC',
        symbol: 'USDC',
      },
      {
        address: '0xA683fdfD9286eeDfeA81CF6dA14703DA683c44E5',
        name: 'USDT',
        symbol: 'USDT',
      },
      {
        address: '0xE1c4c56f772686909c28C319079D41adFD6ec89b',
        name: 'DAI',
        symbol: 'DAI',
      },
      {
        address: '0x67fD498E94d95972a4A2a44AccE00a000AF7Fe00',
        name: 'BTC',
        symbol: 'BTC',
      },
    ];

    // 0x4d0891579e0bd3D09a0f0FB7DC3d9fCf2D9A77C1 => getAllMarkets is not working; wrongly deployed contract

    const json = await Utils.requestJsonGet('https://contracts.tectonic.finance/abi.json');

    const result = [];
    (json?.contracts || []).forEach(market => {
      if (!market.address) {
        return;
      }

      if (!market.abi || !market.abi.toLowerCase().includes('balanceofunderlying')) {
        return;
      }



      result.push({
        address: market.address,
        name: market.contractName.replace('tTokenDelegate', '').replace('_', ''),
        //symbol: market.symbol,
      });
    });

    await this.cacheManager.set(cacheKey, Object.freeze(result), {ttl: 60 * 60});

    return Object.freeze(result);


    const resultaaa = [
      {
        address: '0xeAdf7c01DA7E93FdB5f16B0aa9ee85f978e89E95',
        name: 'CRO',
        symbol: 'CRO',
      },
      {
        address: '0x543F4Db9BD26C9Eb6aD4DD1C33522c966C625774',
        name: 'ETH',
        symbol: 'ETH',
      }
    ];

    await this.cacheManager.set(cacheKey, Object.freeze(result), {ttl: 60 * 30});

    return Object.freeze(result);
  }

  getName() {
    return 'tectonic';
  }

  getChain() {
    return 'cronos';
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
    return 'https://app.tectonic.finance/markets/';
  }

  getFarmEarns(farm) {
    return ['tonic'];
  }
}
