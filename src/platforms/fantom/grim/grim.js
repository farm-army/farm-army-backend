"use strict";

const BigNumber = require("bignumber.js");
const Web3EthContract = require("web3-eth-contract");
const Utils = require("../../../utils");

const VAULT_ABI = require('./abi/vault.json');
const AstParser = require("../../../utils/ast_parser");

module.exports = class grim {
  constructor(cacheManager, priceOracle, tokenCollector) {
    this.cacheManager = cacheManager;
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector;
  }

  async getLbAddresses() {
    return (await this.getRawFarms())
      .filter(
        farm => farm.tokenAddress && farm.assets && farm.assets.length === 2
      )
      .map(farm => farm.tokenAddress);
  }

  async getLpPrices() {
    const cacheKey = `grim-lp-v1-prices`;

    const cache = await this.cacheManager.get(cacheKey);
    if (cache) {
      return cache;
    }

    const prices = await Utils.requestJsonGet('https://api.grim.finance/lps');

    await this.cacheManager.set(cacheKey, prices, {ttl: 60 * 15});

    return prices;
  }

  async getRawFarms() {
    const cacheKey = `getAddressFarms-js-${this.getName()}`;

    const cache = await this.cacheManager.get(cacheKey);
    if (cache) {
      return cache;
    }

    const files = await Utils.getJavascriptFiles('https://app.grim.finance/');

    const pools = [];
    Object.values(files).forEach(f => {
      pools.push(...AstParser.createJsonFromObjectExpression(f, keys => keys.includes('earnContractAddress') && keys.includes('id') && keys.includes('earnedTokenAddress')));
    });

    await this.cacheManager.set(cacheKey, pools, {ttl: 60 * 30});

    return pools;
  }

  async getAddressFarms(address) {
    let cacheKey = `getAddressFarms-${this.getName()}-${address}`;

    const cache = await this.cacheManager.get(cacheKey);
    if (cache) {
      return cache;
    }

    const pools = await this.getFarms();

    const tokenCalls = pools.map(myPool => {
      const token = new Web3EthContract(VAULT_ABI, myPool.raw.earnedTokenAddress);

      return {
        id: myPool.id,
        balanceOf: token.methods.balanceOf(address)
      };
    });

    const calls = await Utils.multiCall(tokenCalls, this.getChain());

    const result = calls
      .filter(v => new BigNumber(v.balanceOf).isGreaterThan(0))
      .map(v => v.id);

    await this.cacheManager.set(cacheKey, result, {ttl: 60 * 5});

    return result;
  }

  async getFarms(refresh = false) {
    let cacheKey = `getFarms-${this.getName()}`;

    if (!refresh) {
      const cache = await this.cacheManager.get(cacheKey);
      if (cache) {
        return cache;
      }
    }

    let apys = {};
    try {
      apys = await Utils.requestJsonGet("https://api.grim.finance/apy");
    } catch (e) {
      console.error("https://api.grim.finance/apy", e.message);
    }

    const pools = await this.getRawFarms();

    const vaultCalls = pools.map(pool => {
      const vault = new Web3EthContract(VAULT_ABI, pool.earnedTokenAddress);

      return {
        id: pool.id,
        tokenAddress: pool.tokenAddress ? pool.tokenAddress : "",
        pricePerFullShare: vault.methods.getPricePerFullShare(),
        tvl: vault.methods.balance()
      };
    });

    const [vault, lpPrices] = await Promise.all([
      Utils.multiCallIndexBy("id", vaultCalls, this.getChain()),
      this.getLpPrices(),
    ]);

    const farms = [];
    pools.forEach(farm => {
      const name = farm.name
        .replace(/\//g, '-')
        .replace(/\s+\w*lp$/i, '')
        .trim();

      let token = farm.token.replace(/\//g, '-')
        .replace(/\s+\w*lp$/i, '')
        .trim()
        .toLowerCase();

      if (farm.assets && farm.assets.length > 0) {
        token = farm.assets.map(a => a.toLowerCase()).join('-')
      }

      const item = {
        id: `${this.getName()}_${farm.id}`,
        name: name,
        token: token,
        platform: farm.platform,
        provider: this.getName(),
        has_details: !!(farm.earnedTokenAddress && farm.tokenAddress),
        raw: Object.freeze(farm),
        extra: {},
        chain: this.getChain(),
        compound: true,
      };

      const vaultElement = vault[farm.id];
      if (vaultElement.pricePerFullShare) {
        item.extra.pricePerFullShare = vaultElement.pricePerFullShare / 1e18;
      }

      if (vaultElement.tokenAddress) {
        item.extra.lpAddress = vaultElement.tokenAddress;
      }

      if (farm.earnedTokenAddress) {
        item.extra.transactionAddress = farm.earnedTokenAddress;
        item.extra.pricePerFullShareToken = farm.earnedTokenAddress;
      }

      if (vaultElement.tokenAddress) {
        item.extra.transactionToken = vaultElement.tokenAddress

        item.tvl = {
          amount: vaultElement.tvl / (10 ** this.tokenCollector.getDecimals(vaultElement.tokenAddress))
        };

        let price = this.priceOracle.findPrice(vaultElement.tokenAddress, farm.oracleId.toLowerCase());
        if (!price && lpPrices[farm.id]) {
          price = lpPrices[farm.id];
        }

        if (price) {
          item.tvl.usd = item.tvl.amount * price;
        }
      }

      if (apys && apys[farm.id]) {
        item.yield = {
          apy: apys[farm.id] * 100
        };
      }

      if (farm.depositsPaused === true) {
        if (!item.flags) {
          item.flags = [];
        }

        item.flags.push('deprecated');
      }

      farms.push(Object.freeze(item));
    });

    await this.cacheManager.set(cacheKey, farms, {ttl: 60 * 30});

    console.log(`${this.getName()} updated`);

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
    if (addressFarms.length === 0) {
      return [];
    }

    const farms = await this.getFarms();

    const tokenCalls = addressFarms.map(a => {
      const farm = farms.filter(f => f.id === a)[0];

      const token = new Web3EthContract(VAULT_ABI, farm.raw.earnedTokenAddress);

      return {
        id: farm.id,
        balanceOf: token.methods.balanceOf(address)
      };
    });

    const [calls, lpPrices] = await Promise.all([
      Utils.multiCall(tokenCalls, this.getChain()),
      this.getLpPrices(),
    ]);

    return calls.map(call => {
      const farm = farms.find(f => f.id === call.id);

      const amount = call.balanceOf * farm.extra.pricePerFullShare;

      const result = {};
      result.farm = farm;

      let decimals = farm.raw.tokenAddress ? this.tokenCollector.getDecimals(farm.raw.tokenAddress) : 18;

      result.deposit = {
        symbol: "?",
        amount: amount  / (10 ** decimals)
      };

      if (farm.raw.tokenAddress) {
        const price = this.priceOracle.findPrice(farm.raw.tokenAddress);
        if (price) {
          result.deposit.usd = result.deposit.amount * price;
        }
      }

      if (!result.deposit.usd && lpPrices[farm.raw.oracleId]) {
        result.deposit.usd = result.deposit.amount * lpPrices[farm.raw.oracleId];
      }

      result.rewards = [];

      return result;
    });
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

    return {};
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

    let lpTokens = [];
    if (yieldFarms[0]) {
      result.farm = yieldFarms[0];
      lpTokens = this.priceOracle.getLpSplits(farm, yieldFarms[0]);
    }

    if (transactions && transactions.length > 0) {
      result.transactions = transactions;
    }

    if (lpTokens && lpTokens.length > 0) {
      result.lpTokens = lpTokens;
    }

    const yieldDetails = Utils.findYieldForDetails(result);
    if (yieldDetails) {
      result.yield = yieldDetails;
    }

    return result;
  }

  getName() {
    return 'grim';
  }

  getChain() {
    return 'fantom';
  }
};
