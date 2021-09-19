"use strict";

const BigNumber = require("bignumber.js");
const Web3EthContract = require("web3-eth-contract");
const Utils = require("../../../utils");
const FACTORY_ABI = require("./abi/factory.json");
const VAULT_ABI = require("./abi/vault.json");
const ERC20_ABI = require("../../../abi/erc20.json");
const _ = require("lodash");

module.exports = class balancer {
  constructor(cacheManager, priceOracle, tokenCollector) {
    this.cacheManager = cacheManager;
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector;
  }

  async getLbAddresses() {
    return (await this.getFarms())
      .filter(f => f.extra && f.extra.lpAddress)
      .map(f => f.extra.lpAddress);
  }

  async getRawFarms() {
    const cacheKey = `${this.getName()}-v1-raw-farms`

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    const content = await Utils.request('POST', "https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-polygon-v2", {
      "headers": {
        "accept": "application/json, text/plain, */*",
        "accept-language": "en-US,en;q=0.9,de;q=0.8",
        "content-type": "application/x-www-form-urlencoded",
        "sec-ch-ua": "\"Chromium\";v=\"92\", \" Not A;Brand\";v=\"99\", \"Google Chrome\";v=\"92\"",
        "sec-ch-ua-mobile": "?1",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site"
      },
      "referrer": "https://polygon.balancer.fi/",
      "referrerPolicy": "strict-origin-when-cross-origin",
      "body": "{\"query\":\"query { pools (first: 50, orderBy: \\\"totalLiquidity\\\", orderDirection: \\\"desc\\\", where: {totalShares_gt: 0.01, id_not_in: [\\\"\\\"], poolType_not: \\\"Element\\\", tokensList_contains: []}, skip: 0) { id poolType swapFee tokensList totalLiquidity totalSwapVolume totalSwapFee totalShares owner factory amp tokens { address balance weight priceRate } } }\"}",
      "mode": "cors"
    });

    const pools = content ? JSON.parse(content)?.data?.pools : [];

    await this.cacheManager.set(cacheKey, pools, {ttl: 60 * 30});

    return pools;
  }

  async getFarms(refresh = false) {
    const cacheKey = `getFarms-${this.getName()}`;

    if (!refresh) {
      const cache = await this.cacheManager.get(cacheKey)
      if (cache) {
        return cache;
      }
    }

    const rawFarms = await this.getRawFarms();

    const tokenCalls = rawFarms.map(pool => {
      const token = new Web3EthContract(FACTORY_ABI, pool.factory);

      return {
        id: pool.id.toLowerCase(),
        vault: token.methods.getVault(),
      };
    });

    const newVar = await Utils.multiCallIndexBy('id', tokenCalls, this.getChain());
    const pools = Object.values(newVar).map(pool => {
      const contract = new Web3EthContract(VAULT_ABI, pool.vault);

      return {
        id: pool.id.toLowerCase(),
        pool: contract.methods.getPool(pool.id),
      };
    });

    const calls = await Utils.multiCallIndexBy('id', pools, this.getChain());


    const farms = [];

    rawFarms.forEach(farm => {
      const tokenNames = farm.tokens.map(token => this.tokenCollector.getSymbolByAddress(token.address) || '?');

      let weights = [];
      for (const token of farm.tokens) {
        if (!token.weight) {
          weights = [];
          break;
        }

        weights.push(`${Math.round(token.weight * 100)}%`);
      }

      const item = {
        id: `${this.getName()}_${farm.id}`,
        name: tokenNames.join('-').toUpperCase(),
        token: tokenNames.join('-').toLowerCase(),
        provider: this.getName(),
        has_details: false,
        raw: Object.freeze(_.merge(farm, {
          vault: newVar[farm.id.toLowerCase()]?.vault,
          pool: calls[farm.id.toLowerCase()]?.pool[0],
        })),
        link: `https://polygon.balancer.fi/#/pool/${encodeURI(farm.id)}`,
        extra: {},
        notes: [],
      };

      if (weights.length > 0) {
        item.notes.push(`Weight: ${weights.join(' ')}`);
      }

      item.tvl = {
        amount: parseFloat(farm.totalShares),
      };

      let tvlUsd = 0;
      for (const token of farm.tokens) {
        const price = this.priceOracle.findPrice(token.address);
        if (!price) {
          tvlUsd = 0;
          break;
        }

        tvlUsd += token.balance * price;
      }

      if (tvlUsd > 0) {
        item.tvl.usd = tvlUsd;
      }

      if (item.tvl.amount && item.tvl.usd) {
        item.extra.tokenPrice = item.tvl.usd / item.tvl.amount;
      }

      if (calls[farm.id.toLowerCase()]?.pool) {
        item.extra.transactionToken = calls[farm.id.toLowerCase()].pool[0];
      }

      farms.push(Object.freeze(item));
    })

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

    const tokenCalls = pools.map(myPool => {
      const token = new Web3EthContract(ERC20_ABI, myPool.extra.transactionToken);

      return {
        id: myPool.id.toLowerCase(),
        balanceOf: token.methods.balanceOf(address),
      };
    });

    const calls = await Utils.multiCall(tokenCalls, this.getChain());

    const result = calls
      .filter(v => new BigNumber(v.balanceOf).isGreaterThan(Utils.DUST_FILTER))
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

    const calls = (await Utils.multiCall(addressFarms.map(id => {
      const farm = farms.find(f => f.id === id);

      const contract = new Web3EthContract(ERC20_ABI, farm.extra.transactionToken);

      return {
        id: farm.id,
        balanceOf: contract.methods.balanceOf(address),
      };
    }), this.getChain())).filter(v => new BigNumber(v.balanceOf).isGreaterThan(Utils.DUST_FILTER));

    const results = [];
    calls.forEach(call => {
      const farm = farms.find(f => f.id === call.id);

      const result = {
        farm: farm
      };

      let depositDecimals = farm.extra.transactionToken ? this.tokenCollector.getDecimals(farm.extra.transactionToken) : 18;
      result.deposit = {
        symbol: "?",
        amount: call.balanceOf / (10 ** depositDecimals)
      };

      if (farm.extra.tokenPrice) {
        result.deposit.usd = result.deposit.amount * farm.extra.tokenPrice;
      }

      results.push(result);
    });

    return results;
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

    return result;
  }

  getName() {
    return 'balancer';
  }

  getChain() {
    return 'polygon';
  }
}
