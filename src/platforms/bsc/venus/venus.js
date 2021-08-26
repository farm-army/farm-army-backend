"use strict";

const Utils = require("../../../utils");
const Web3EthContract = require("web3-eth-contract");
const _ = require("lodash");
const walk = require("acorn-walk");
const acorn = require("acorn");
const QtokenAbi = require("./abi/qtoken.json");
const AstParser = require("../../../utils/ast_parser");

module.exports = class venus {
  constructor(priceOracle, tokenCollector, cacheManager) {
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector;
    this.cacheManager = cacheManager;
  }

  async getTokens() {
    const cacheKey = `getTokens-v1-${this.getName()}`;

    const cache = await this.cacheManager.get(cacheKey);
    if (cache) {
      return cache;
    }

    const javascriptFiles = await Utils.getJavascriptFiles("https://app.venus.io/");

    let result = [];
    Object.values(javascriptFiles).forEach(f => {
      AstParser.createJsonFromObjectExpression(f, keys => keys.includes('usdc') && keys.includes('btcb')).forEach(array => {
        // only "VBEP" array key needed; filter by known
        if (array.btcb && typeof array.btcb === 'string' && array.btcb.toLowerCase() === '0x882C173bC7Ff3b7786CA16dfeD3DFFfb9Ee7847B'.toLowerCase() && array.usdc && typeof array.usdc === 'string' &&  array.usdc.toLowerCase() === '0xecA88125a5ADbe82614ffC12D0DB554E2e2867C8'.toLowerCase()) {
          for (const [key, value] of Object.entries(array)) {
            result.push({
              name: key,
              address: value,
            })
          }
        }
      })
    });

    await this.cacheManager.set(cacheKey, Object.freeze(result), {ttl: 60 * 30});

    return Object.freeze(result);
  }

  async getFarms(refresh) {
    const cacheKey = `getFarms-${this.getName()}-v4`;

    if (!refresh) {
      const cache = await this.cacheManager.get(cacheKey);
      if (cache) {
        return cache;
      }
    }

    let rawFarms = await this.getTokens();

    let tvlCalls = rawFarms.map(token => {
      const contract = new Web3EthContract(QtokenAbi, token.address);

      return {
        address: token.address.toLowerCase(),
        tvl: contract.methods.getCash(),
        exchangeRate: contract.methods.exchangeRateStored(),
        underlying: contract.methods.underlying(),
      };
    });

    const tvl = await Utils.multiCallIndexBy('address', tvlCalls, this.getChain());

    const farms = [];

    rawFarms.forEach(token => {
      const info = tvl[token.address.toLowerCase()];
      if (!info) {
        return;
      }

      if (!info.underlying) {
        info.underlying = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'
      }

      let symbol = this.tokenCollector.getSymbolByAddress(info.underlying);
      if (!symbol && token.name) {
        symbol = token.name;
      }

      if (!symbol) {
        symbol = '?';
      }

      const item = {
        id: `${this.getName()}_${token.address.toLowerCase()}`,
        name: symbol.toUpperCase(),
        token: symbol.toLowerCase(),
        raw: Object.freeze(_.merge(token, {
          exchangeRate: info.exchangeRate,
          underlying: info.underlying,
        })),
        provider: this.getName(),
        has_details: false,
        link: 'https://app.venus.io/',
        extra: {},
        earns: ['xvs'],
        chain: this.getChain(),
        flags: ['lend', 'borrow'],
      };

      item.extra.transactionToken = info.underlying;
      item.extra.transactionAddress = token.address;

      if (info && info.tvl) {
        item.tvl = {
          amount: info.tvl / (10 ** this.tokenCollector.getDecimals(item.extra.transactionToken))
        };

        const addressPrice = this.priceOracle.getAddressPrice(item.extra.transactionToken);
        if (addressPrice) {
          item.tvl.usd = item.tvl.amount * addressPrice;
        }
      }

      farms.push(item);
    });

    await this.cacheManager.set(cacheKey, farms, {ttl: 60 * 30});

    console.log(`${this.getName()} updated`);

    return farms;
  }

  async getAddressFarms(address) {
    const cacheKey = `getAddressFarms-v1-${this.getName()}-${address}`;
    const cache = await this.cacheManager.get(cacheKey);
    if (cache) {
      return cache;
    }

    let calls = Object.values(await this.getFarms()).map(farm => {
      const contract = new Web3EthContract(QtokenAbi, farm.raw.address);

      return {
        id: farm.id,
        balanceOf: contract.methods.balanceOf(address),
        borrowBalanceOf: contract.methods.borrowBalanceStored(address),
      };
    });

    const result = (await Utils.multiCall(calls, this.getChain()))
      .filter(c => c.balanceOf > 0 || c.borrowBalanceOf > 0)
      .map(c => c.id);

    await this.cacheManager.set(cacheKey, result, {ttl: 60 * 5});

    return result;
  }

  async getYields(address) {
    const addressFarms = await this.getAddressFarms(address);
    if (addressFarms.length === 0) {
      return [];
    }

    return await this.getYieldsInner(address, addressFarms);
  }

  async getYieldsInner(address, farmIds) {
    if (farmIds.length === 0) {
      return [];
    }

    const farms = await this.getFarms();

    const callsPromises = await Utils.multiCall(farmIds.map(id => {
      const farm = farms.find(f => f.id === id);
      const contract = new Web3EthContract(QtokenAbi, farm.raw.address);

      return {
        id: farm.id,
        balanceOf: contract.methods.balanceOf(address),
        borrowBalanceOf: contract.methods.borrowBalanceStored(address),
      };
    }), this.getChain());

    const result = (await Utils.multiCall(callsPromises, this.getChain()))
      .filter(c => c.balanceOf > 0 || c.borrowBalanceOf > 0)

    const results = [];

    result.forEach(call => {
      const farm = farms.find(f => f.id === call.id);

      if (call.balanceOf > 0) {
        const result = {
          farm: farm
        };

        const exchangeRate = farm.raw.exchangeRate ? farm.raw.exchangeRate / 1e18 : 1;

        result.deposit = {
          symbol: '?',
          amount: (call.balanceOf / (10 ** this.tokenCollector.getDecimals(farm.extra.transactionToken))) * exchangeRate, // value in borrowToken token
        };

        const price = this.priceOracle.getAddressPrice(farm.extra.transactionToken);
        if (price) {
          result.deposit.usd = result.deposit.amount * price;
        }

        const isDust = 'usd' in result.deposit && result.deposit.usd < 0.02;
        if (!isDust) {
          results.push(Object.freeze(result));
        }
      }

      if (call.borrowBalanceOf > 0) {
        const result = {
          farm: farm
        };

        result.deposit = {
          symbol: '?',
          amount: call.borrowBalanceOf / (10 ** this.tokenCollector.getDecimals(farm.extra.transactionToken)) * -1, // value in borrowToken token
        };

        const price = this.priceOracle.getAddressPrice(farm.extra.transactionToken); // bnb or busd
        if (price) {
          result.deposit.usd = result.deposit.amount * price;
        }

        const isDust = 'usd' in result.deposit && Math.abs(result.deposit.usd) < 0.02;
        if (!isDust) {
          results.push(Object.freeze(result));
        }
      }
    })

    return results;
  }

  getName() {
    return 'venus';
  }

  getChain() {
    return 'bsc';
  }
}
