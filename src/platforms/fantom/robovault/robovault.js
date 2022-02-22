"use strict";

const BigNumber = require("bignumber.js");
const Web3EthContract = require("web3-eth-contract");
const Utils = require("../../../utils");

const VAULT_ABI = require('./abi/vault.json');
const AstParser = require("../../../utils/ast_parser");

module.exports = class robovault {
  constructor(cacheManager, priceOracle, tokenCollector) {
    this.cacheManager = cacheManager;
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector;
  }

  async getLbAddresses() {
    return [];
  }

  async getRawFarms() {
    const cacheKey = `${this.getName()}-v3-raw-farms`

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    const files = await Utils.getJavascriptFiles('https://www.robo-vault.com/');

    const rows = [];
    Object.values(files).forEach(f => {
      rows.push(...AstParser.createJsonFromObjectExpression(f, keys => keys.includes('earnContractAddress')));
    });

    const response = (await Utils.requestJsonGetRetry('https://api.robo-vault.com/vault')) || [];

    const result = rows.map(row => {
      const info = response.find(r => r.addr.toLowerCase() === row.earnContractAddress.toLowerCase());

      if (info?.apy) {
        row.apy = info.apy;
      }

      if (info?.tvl) {
        row.tvl = info.tvl;
      }

      if (info?.tvlUsd) {
        row.tvlUsd = info.tvlUsd;
      }

      return row;
    })

    await this.cacheManager.set(cacheKey, result, {ttl: 60 * 30});

    return result;
  }

  async getAddressFarms(address) {
    let cacheKey = `getAddressFarms-${this.getName()}-${address}`;

    const cache = await this.cacheManager.get(cacheKey);
    if (cache) {
      return cache;
    }

    const pools = await this.getFarms();

    const tokenCalls = pools.map(myPool => {
      const token = new Web3EthContract(VAULT_ABI, myPool.raw.earnContractAddress);

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

    const pools = await this.getRawFarms();

    const vaultCalls = pools.map(pool => {
      const vault = new Web3EthContract(VAULT_ABI, pool.earnContractAddress);

      return {
        id: pool.id,
        pricePerShare: vault.methods.pricePerShare(),
        decimals: vault.methods.decimals(),
      };
    });

    const [vault] = await Promise.all([
      Utils.multiCallIndexBy("id", vaultCalls, this.getChain()),
    ]);

    const farms = [];
    pools.forEach(farm => {
      const name = farm.name
        .replace(/\//g, '-')
        .replace(/\s+\w*lp$/i, '')
        .replace(/\s+\w*lp$/i, '')
        .replace(/(\s+\(.*\))/i, '')
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

        provider: this.getName(),
        has_details: true,
        raw: Object.freeze(farm),
        extra: {},
        chain: this.getChain(),
        compound: true,
      };

      if (farm.platform) {
        item.platform = farm.platform.replaceAll(' ', '').split('+').join(',');
      }

      const vaultElement = vault[farm.id];

      if (vaultElement.pricePerShare) {
        item.extra.pricePerFullShare = vaultElement.pricePerShare / (10 ** (vaultElement.decimals || 18));
        item.extra.pricePerFullShareToken = farm.earnContractAddress;
      }

      item.extra.transactionAddress = farm.earnContractAddress;
      item.extra.transactionToken = farm.tokenAddress;

      if (farm.assets && farm.assets.length > 1) {
        item.extra.lpAddress = vaultElement.transactionToken
      }

      if (farm.tvl || farm.tvlUsd) {
        item.tvl = {};
      }

      if (farm.tvl) {
        item.tvl.amount = farm.tvl;
      }

      if (farm.tvlUsd) {
        item.tvl.usd = farm.tvlUsd;
      }

      if (farm.apy) {
        item.yield = {
          apy: farm.apy * 100
        };
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
      const farm = farms.find(f => f.id === a);

      const token = new Web3EthContract(VAULT_ABI, farm.raw.earnContractAddress);

      return {
        id: farm.id,
        balanceOf: token.methods.balanceOf(address)
      };
    });

    const [calls] = await Promise.all([
      Utils.multiCall(tokenCalls, this.getChain()),
    ]);

    return calls.map(call => {
      const farm = farms.find(f => f.id === call.id);

      const amount = call.balanceOf * (farm.extra.pricePerFullShare || 1);

      const result = {};
      result.farm = farm;

      let decimals = farm.raw.tokenAddress ? this.tokenCollector.getDecimals(farm.raw.tokenAddress) : 18;

      result.deposit = {
        symbol: "?",
        amount: amount  / (10 ** decimals)
      };

      if (farm.extra.transactionToken) {
        const price = this.priceOracle.findPrice(farm.extra.transactionToken);
        if (price) {
          result.deposit.usd = result.deposit.amount * price;
        }
      }

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
    return 'robovault';
  }

  getChain() {
    return 'fantom';
  }
};
