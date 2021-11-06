"use strict";

const TokenAbi = require("./abi/token.json");
const _ = require("lodash");
const LendBorrowPlatform = require("../../common").LendBorrowPlatform;

module.exports = class tranquil extends LendBorrowPlatform {
  async getTokens() {
    const cacheKey = `getFarmsViaHtml-v1-${this.getName()}`;

    const cache = await this.cacheManager.get(cacheKey);
    if (cache) {
      return cache;
    }

    // find allMarkets Contract
    const allMarkets = [
      {
        "contractAddress": "0x34B9aa82D89AE04f0f546Ca5eC9C93eFE1288940",
        "underlyingTokenAddress": "",
        "symbol": "ONE",
        "icon": "/icons/one.svg",
        "underlyingDecimals": 18,
        "pairOracleAddress": "0x88023dDAa1d04e7d87734BEaE020802997519248"
      },
      {
        "contractAddress": "0xd9c0D8Ad06ABE10aB29655ff98DcAAA0E059184A",
        "underlyingTokenAddress": "0x3095c7557bcb296ccc6e363de01b760ba031f2d9",
        "symbol": "1WBTC",
        "icon": "/icons/wbtc.svg",
        "underlyingDecimals": 8,
        "pairOracleAddress": "0xbd69ad94354933D459abAD93F8769f1f146DDC0a"
      },
      {
        "contractAddress": "0xc63AB8c72e636C9961c5e9288b697eC5F0B8E1F7",
        "underlyingTokenAddress": "0x6983d1e6def3690c4d616b13597a09e6193ea013",
        "symbol": "1ETH",
        "icon": "/icons/eth.svg",
        "underlyingDecimals": 18,
        "pairOracleAddress": "0x3096CDdAcc8a81C27c3F8F225B9b61A6c52E2CAd"
      },
      {
        "contractAddress": "0xCa3e902eFdb2a410C952Fd3e4ac38d7DBDCB8E96",
        "underlyingTokenAddress": "0x985458e523db3d53125813ed68c274899e9dfab4",
        "symbol": "1USDC",
        "icon": "/icons/usdc.svg",
        "underlyingDecimals": 6,
        "pairOracleAddress": "0xfD494aa1617446843Db82ad4f2F3B18f7b1393Ca"
      },
      {
        "contractAddress": "0x7af2430eFa179dB0e76257E5208bCAf2407B2468",
        "underlyingTokenAddress": "0x3c2b8be99c50593081eaa2a724f0b8285f5aba8f",
        "symbol": "1USDT",
        "icon": "/icons/usdt.svg",
        "underlyingDecimals": 6,
        "pairOracleAddress": "0x64f48DF335a79dABDB1cB754729Fa80B065d788d"
      }
    ];

    const result = allMarkets.map(address => ({
      address: address.contractAddress,
      symbol: address.symbol,
    }))

    await this.cacheManager.set(cacheKey, Object.freeze(result), {ttl: 60 * 30});

    return Object.freeze(result);
  }

  getName() {
    return 'tranquil';
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
    return 'https://app.tranquil.finance/markets';
  }

  getFarmEarns(farm) {
    return [];
  }
}
