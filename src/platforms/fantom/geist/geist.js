"use strict";

const crypto = require('crypto');
const BigNumber = require("bignumber.js");
const Web3EthContract = require("web3-eth-contract");
const Utils = require("../../../utils");

const GEIST_ABI = require('./abi/geist.json');

const A_TOKEN_ABI = require('./abi/a_token.json');
const B_TOKEN_ABI = require('./abi/b_token.json');

const _ = require("lodash");
const _uniqueId = require("lodash/uniqueId");

module.exports = class geist {
  constructor(cacheManager, priceOracle, tokenCollector) {
    this.cacheManager = cacheManager;
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector;
  }

  async getRawFarms() {
    let cacheKey = `getRawFarms-v1-${this.getName()}`;
    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    const reservesList = await Utils.multiCall([{
      reservesList: new Web3EthContract(GEIST_ABI, '0x9fad24f572045c7869117160a571b2e50b10d068').methods.getReservesList(),
    }], this.getChain());

    const callsA = reservesList[0].reservesList.map(token => {
      return {
        reference: token,
        contractAddress: '0x9fad24f572045c7869117160a571b2e50b10d068',
        abi: GEIST_ABI,
        calls: [
          {
            reference: "reserveData",
            method: "getReserveData",
            parameters: [token]
          },
        ]
      }
    })

    const reservesListTokenData = await Utils.multiCallRpc(callsA, this.getChain());

    const tokenCalls = [];

    reservesListTokenData.forEach(i => {
      const contract = new Web3EthContract(B_TOKEN_ABI, i.reserveData.aTokenAddress);

      tokenCalls.push({
        token: i.id,
        type: 'supply',
        totalSupply: contract.methods.totalSupply(),
        decimals: contract.methods.decimals(),
      });

      const contract2 = new Web3EthContract(B_TOKEN_ABI, i.reserveData.variableDebtTokenAddress);

      tokenCalls.push({
        token: i.id,
        type: 'borrow',
        totalSupply: contract2.methods.totalSupply(),
        decimals: contract2.methods.decimals(),
      });
    });

    const details = await Utils.multiCall(tokenCalls, this.getChain());

    const tokens = reservesListTokenData.map(p => {
      const itemA = details.find(i => i.token === p.id && i.type === 'supply');
      const itemB = details.find(i => i.token === p.id && i.type === 'borrow');

      return {
        supply: itemA,
        borrow: itemB,
        token: p.id,
        aTokenAddress: p.reserveData.aTokenAddress,
        variableDebtTokenAddress: p.reserveData.variableDebtTokenAddress,
        currentStableBorrowRate: p.reserveData.currentStableBorrowRate.toString(),
        currentVariableBorrowRate: p.reserveData.currentVariableBorrowRate.toString(),
      };
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
        .update(farm.token)
        .digest('hex');

      const symbol = this.tokenCollector.getSymbolByAddress(farm.token);

      const item = {
        id: `${this.getName()}_${id}`,
        name: (symbol || 'unknown').toUpperCase(),
        token: symbol || 'unknown',
        provider: this.getName(),
        has_details: false,
        raw: Object.freeze(farm),
        extra: {},
        chain: this.getChain(),
        earns: ['geist'],
        flags: ['lend', 'borrow'],
      };

      if (farm?.supply?.totalSupply) {
        item.tvl = {
          amount: farm.supply.totalSupply / (10 ** farm.supply.decimals),
        };

        const addressPrice = this.priceOracle.getAddressPrice(farm.token);
        if (addressPrice) {
          item.tvl.usd = item.tvl.amount * addressPrice;
        }
      }

      item.extra.transactionToken = farm.token;
      //item.extra.transactionAddress = farm.gauge;

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

    const poolAPromise = [];
    const poolBPromise = [];

    pools.forEach(farm => {
      poolAPromise.push({
        id: farm.id,
        balanceOf: new Web3EthContract(A_TOKEN_ABI, farm.raw.aTokenAddress).methods.balanceOf(address),
      });

      poolBPromise.push({
        id: farm.id,
        balanceOf: new Web3EthContract(B_TOKEN_ABI, farm.raw.variableDebtTokenAddress).methods.balanceOf(address),
      });
    });

    const [poolA, poolB] = await Promise.all([
      Utils.multiCall(poolAPromise, this.getChain()),
      Utils.multiCall(poolBPromise, this.getChain()),
    ]);

    const result = _.uniq([...poolA, ...poolB]
      .filter(v => new BigNumber(v.balanceOf).isGreaterThan(0))
      .map(v => v.id));

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

    const poolAPromise = [];
    const poolBPromise = [];

    addressFarms.forEach(farmId => {
      const farm = farms.find(f => f.id === farmId);

      poolAPromise.push({
        id: farm.id,
        type: 'supply',
        balanceOf: new Web3EthContract(A_TOKEN_ABI, farm.raw.aTokenAddress).methods.balanceOf(address),
        decimals: farm.raw.supply.decimals,
      });

      poolBPromise.push({
        id: farm.id,
        type: 'borrow',
        balanceOf: new Web3EthContract(B_TOKEN_ABI, farm.raw.variableDebtTokenAddress).methods.balanceOf(address),
        decimals: farm.raw.borrow.decimals,
      });
    });

    const [poolA, poolB] = await Promise.all([
      Utils.multiCall(poolAPromise, this.getChain()),
      Utils.multiCall(poolBPromise, this.getChain()),
    ]);

    const results = [];
    [...poolA, ...poolB].forEach(call => {
      if (!new BigNumber(call.balanceOf).isGreaterThan(0)) {
        return
      }

      const farm = farms.find(f => f.id === call.id);

      const result = {
        farm: farm
      };

      result.deposit = {
        symbol: "?",
        amount: call.balanceOf / (10 ** call.decimals)
      };

      if (call.type === 'borrow') {
        result.deposit.amount *= -1;
      }

      if (farm.extra.transactionToken) {
        const price = this.priceOracle.findPrice(farm.extra.transactionToken);

        if (price) {
          result.deposit.usd = result.deposit.amount * price;
        }
      }

      if (result?.deposit?.usd && Math.abs(result.deposit.usd) < 0.01) {
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

    const [yieldFarms] = await Promise.all([
      this.getYieldsInner(address, [farm.id]),
    ]);

    const result = {};

    if (yieldFarms[0]) {
      result.farm = yieldFarms[0];
    }

    return result;
  }

  getName() {
    return 'geist';
  }

  getChain() {
    return 'fantom';
  }
}