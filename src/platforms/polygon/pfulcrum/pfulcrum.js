"use strict";

const crypto = require('crypto');
const BigNumber = require("bignumber.js");
const Web3EthContract = require("web3-eth-contract");
const Utils = require("../../../utils");

const _ = require("lodash");
const FULCRUM_TOKEN_ABI = require("./abi/fulcrum_abi.json");
const FULCRUM_HELPER_ABI = require("./abi/helper_abi.json");

module.exports = class pfulcrum  {
  constructor(cacheManager, priceOracle, tokenCollector) {
    this.cacheManager = cacheManager;
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector;
  }

  async getRawFarms() {
    let cacheKey = `getRawFarms-v6-${this.getName()}`;
    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    const result = await Utils.requestJsonGetRetry('https://api.bzx.network/v1/lending-info?networks=polygon');

    const details = await Utils.multiCallIndexBy('address', (result?.data?.polygon || []).map(result => {
      const contract = new Web3EthContract(FULCRUM_TOKEN_ABI, result.address);

      return {
        address: result.address.toLowerCase(),
        loanTokenAddress: contract.methods.loanTokenAddress(),
        totalSupply: contract.methods.totalSupply(),
        decimals: contract.methods.decimals(),
        initialPrice: contract.methods.initialPrice(),
      };
    }), this.getChain());

    let tokens = (result?.data?.polygon || []).map(r => {
      let item = r;

      if (details[r.address.toLowerCase()]) {
        item = _.merge(item, details[r.address.toLowerCase()]);
      }

      return item;
    });

    const details2Promises = await Utils.multiCallIndexBy('address', (tokens || []).map(result => ({
      address: result.address.toLowerCase(),
      loanTokenAddressBalanceOf: new Web3EthContract(FULCRUM_TOKEN_ABI, result.loanTokenAddress).methods.balanceOf(result.address),
    })), this.getChain());

    const details3Promises = await Utils.multiCallIndexBy('address', (tokens || []).map(farm => ({
      address: farm.address.toLowerCase(),
      tokenPrice: new Web3EthContract(FULCRUM_HELPER_ABI, '0xcc0fd6aa1f92e18d103a7294238fdf558008725a').methods.tokenPrice([farm.address]),
    })), this.getChain());

    const [details2, details3] = await Promise.all([details2Promises, details3Promises]);

    tokens = (result?.data?.polygon || []).map(r => {
      let item = r;

      if (details2[r.address.toLowerCase()]) {
        item = _.merge(item, details2[r.address.toLowerCase()]);
      }

      if (details3[r.address.toLowerCase()] && details3[r.address.toLowerCase()]?.tokenPrice && details3[r.address.toLowerCase()]?.tokenPrice[0]) {
        item.tokenPrice = details3[r.address.toLowerCase()]?.tokenPrice[0];
      }

      return item;
    });

    await this.cacheManager.set(cacheKey, tokens, {ttl: 60 * 60});

    return tokens;
  }

  async getFarms(refresh = false) {
    let cacheKey = `getFarms-${this.getName()}`;

    if (!refresh) {
      const cache = await this.cacheManager.get(cacheKey)
      if (cache) {
        return cache;
      }
    }

    const rawFarms = await this.getRawFarms();

    const farms = [];

    rawFarms.forEach(farm => {
      let id = crypto.createHash('md5')
        .update(farm.address)
        .digest('hex');

      let symbol = this.tokenCollector.getSymbolByAddress(farm.loanTokenAddress);
      if (!symbol) {
        symbol = farm.tokenName;
      }

      const item = {
        id: `${this.getName()}_${id}`,
        name: (symbol || 'unknown').toUpperCase(),
        token: symbol || 'unknown',
        provider: this.getName(),
        has_details: true,
        raw: Object.freeze(farm),
        extra: {},
        chain: this.getChain(),
        flags: ['lend'],
        link: 'https://polygon.fulcrum.trade/lend',
      };

      item.extra.transactionToken = farm.loanTokenAddress;
      item.extra.transactionAddress = farm.address;

      const balanceOf = farm.loanTokenAddressBalanceOf;
      if (balanceOf) {
        item.tvl = {
          amount: balanceOf / (10 ** this.tokenCollector.getDecimals(item.extra.transactionToken)),
        };

        const addressPrice = this.priceOracle.getAddressPrice(item.extra.transactionToken);
        if (addressPrice) {
          item.tvl.usd = item.tvl.amount * addressPrice;
        }
      }

      if (farm.supplyInterestRate && farm.supplyInterestRate > 0.01) {
        item.yield = {
          apy: Utils.compoundCommon(farm.supplyInterestRate / 100) * 100
        };
      }

      farms.push(Object.freeze(item));
    });

    await this.cacheManager.set(cacheKey, farms, {ttl: 60 * 30});

    console.log(`${this.getName()} updated`);

    return farms;
  }

  async getAddressFarms(address) {
    let cacheKey = `getAddressFarms-${this.getName()}-${address}`;

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    const pools = await this.getFarms();

    const results = await Utils.multiCall(pools.map(farm => ({
      id: farm.id,
      balanceOf: new Web3EthContract(FULCRUM_TOKEN_ABI, farm.raw.address).methods.balanceOf(address),
    })), this.getChain());

    const result = results
      .filter(v => new BigNumber(v.balanceOf).isGreaterThan(0))
      .map(v => v.id);

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

  async getYieldsInner(address, addressFarms) {
    if (addressFarms.length === 0) {
      return [];
    }

    const farms = await this.getFarms();

    const pools = await Utils.multiCall(farms.map(farm => ({
      id: farm.id,
      balanceOf: new Web3EthContract(FULCRUM_TOKEN_ABI, farm.raw.address).methods.balanceOf(address),
    })), this.getChain());

    const results = [];

    pools.forEach(call => {
      if (!new BigNumber(call.balanceOf).isGreaterThan(0)) {
        return
      }

      const farm = farms.find(f => f.id === call.id);

      const result = {
        farm: farm
      };

      const tokenPrice = farm.raw.tokenPrice ? farm.raw.tokenPrice / 1e18 : 1;

      result.deposit = {
        symbol: "?",
        amount: (call.balanceOf / (10 ** farm.raw.decimals)) * tokenPrice
      };

      const price = this.priceOracle.findPrice(farm.extra.transactionToken);

      if (price) {
        result.deposit.usd = result.deposit.amount * price;
      }

      if (result?.deposit?.usd < 0.01) {
        return;
      }

      results.push(result);
    });

    return results;
  }

  async getDetails(address, id) {
    const farm = (await this.getFarms()).find(f => f.id === id);
    if (!farm) {
      return {};
    }

    const [yieldFarms, transactions] = await Promise.all([
      this.getYieldsInner(address, [farm.id]),
      this.getTransactions(address, id)
    ]);

    const result = {};

    if (yieldFarms[0]) {
      result.farm = yieldFarms[0];
    }

    if (transactions && transactions.length > 0) {
      result.transactions = transactions;
    }

    const yieldDetails = Utils.findYieldForDetails(result);
    if (yieldDetails) {
      result.yield = yieldDetails;
    }

    return result;
  }

  async getTransactions(address, id) {
    const farm = (await this.getFarms()).find(f => f.id === id);
    if (!farm) {
      return {};
    }

    if (farm.extra.transactionAddress && farm.extra.transactionToken) {
      return Utils.getTransactions(
        farm.extra.transactionAddress,
        farm.extra.transactionToken,
        address,
        this.getChain()
      );
    }

    return {}
  }

  getName() {
    return 'pfulcrum';
  }

  getChain() {
    return 'polygon';
  }
}