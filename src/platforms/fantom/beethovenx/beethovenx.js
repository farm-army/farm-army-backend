"use strict";

const BigNumber = require("bignumber.js");
const Web3EthContract = require("web3-eth-contract");
const Utils = require("../../../utils");
const FACTORY_ABI = require("./abi/factory.json");
const VAULT_ABI = require("./abi/vault.json");
const MASTERCHEF_ABI = require("./abi/masterchef.json");
const ERC20_ABI = require("../../../abi/erc20.json");
const _ = require("lodash");

module.exports = class beethovenx {
  constructor(cacheManager, priceOracle, tokenCollector, farmCollector) {
    this.cacheManager = cacheManager;
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector;
    this.farmCollector = farmCollector;
  }

  async getLbAddresses() {
    return (await this.getFarms())
      .filter(f => f.extra && f.extra.lpAddress)
      .map(f => f.extra.lpAddress);
  }

  async getRawFarms() {
    const cacheKey = `${this.getName()}-v2-raw-farms`

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    const content = await Utils.request('POST', "https://graph.beethovenx.io/subgraphs/name/beethovenx", {
      "headers": {
        "accept": "application/json, text/plain, */*",
        "accept-language": "en-US,en;q=0.9",
        "content-type": "application/json",
        "sec-ch-ua": "\";Not A Brand\";v=\"99\", \"Chromium\";v=\"94\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"Linux\"",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site"
      },
      "referrer": "https://app.beethovenx.io/",
      "referrerPolicy": "strict-origin-when-cross-origin",
      "body": "{\"query\":\"query { pools (first: 1000, orderBy: \\\"totalLiquidity\\\", orderDirection: \\\"desc\\\", where: {totalShares_gt: 0.01, id_not_in: [\\\"0x03b3cc19e4087fd3d63167a604ef8063b095ba16000100000000000000000006\\\"], poolType_not: \\\"Element\\\", id_in: [\\\"0x03c6b3f09d2504606936b1a4decefad204687890000200000000000000000015\\\", \\\"0xd41bf724b6e31311db582c5388af6b316e812fe4000200000000000000000003\\\", \\\"0xcdf68a4d525ba2e90fe959c74330430a5a6b8226000200000000000000000008\\\", \\\"0xa07de66aef84e2c01d88a48d57d1463377ee602b000200000000000000000002\\\", \\\"0x22b30b00e6796daf710fbe5cafbfc9cdd1377f2a000200000000000000000001\\\", \\\"0xd47d2791d3b46f9452709fa41855a045304d6f9d000100000000000000000004\\\", \\\"0x6fdc8415b654b0f60475944a0b9421dc36ee1363000100000000000000000000\\\", \\\"0xf0e2c47d4c9fbbbc2f2e19acdaa3c773a3ecd22100010000000000000000000a\\\", \\\"0x72c0eb973dc95e2d185563f58fc26626cc2e8034000100000000000000000011\\\", \\\"0xd163415bd34ef06f57c58d2aed5a5478afb464cc00000000000000000000000e\\\", \\\"0xa1585005433ae9a72223c6c306261b2f4b38e31c00010000000000000000000c\\\", \\\"0x51c5875ee17f1af4ddca0ce0df8dcad0b115b191000100000000000000000012\\\", \\\"0xfebe0c9fddec3ce393d96a6d5b3c8c90cdef6b11000100000000000000000016\\\", \\\"0x6a9ad1bb2371234aa94601296c1116abbce61b90000100000000000000000017\\\", \\\"0xae1c69eae0f1342425ea3fdb51e9f11223c7ad5b00010000000000000000000b\\\", \\\"0x443804efc861616b920bc30d49282ae72276b5df000000000000000000000010\\\"]}, block: {number: 18598740}) { id name poolType swapFee tokensList totalLiquidity totalSwapVolume totalSwapFee totalShares owner factory amp swapEnabled tokens { address balance weight priceRate } } }\"}",
      "method": "POST",
      "mode": "cors"
    });

    const pools = content ? JSON.parse(content)?.data?.pools : [];

    await this.cacheManager.set(cacheKey, pools, {ttl: 60 * 30});

    return pools;
  }

  async getFarms(refresh = false) {
    const cacheKey = `getFarms-v2-${this.getName()}`;

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

    const foo = (await this.farmCollector.fetchForMasterChef('0x8166994d9ebBe5829EC86Bd81258149B87faCfd3', this.getChain())).filter(f => f.isFinished !== true);

    const farms = [];

    rawFarms.forEach(farm => {
      if (!calls[farm.id.toLowerCase()]?.pool || !calls[farm.id.toLowerCase()]?.pool[0]) {
        return;
      }

      const tokenNames = farm.tokens.map(token => this.tokenCollector.getSymbolByAddress(token.address) || '?');

      let weights = [];
      for (const token of farm.tokens) {
        if (!token.weight) {
          weights = [];
          break;
        }

        weights.push(`${Math.round(token.weight * 100)}%`);
      }

      const masterChef = foo.find(pool => pool.lpAddress.toLowerCase() === calls[farm.id.toLowerCase()]?.pool[0].toLowerCase());

      const item = {
        id: `${this.getName()}_${farm.id}`,
        name: tokenNames.join('-').toUpperCase(),
        token: tokenNames.join('-').toLowerCase(),
        provider: this.getName(),
        has_details: false,
        raw: Object.freeze(_.merge(farm, {
          vault: newVar[farm.id.toLowerCase()]?.vault,
          pool: calls[farm.id.toLowerCase()]?.pool[0],
          pid: masterChef?.pid,
        })),
        link: `https://app.beethovenx.io/#/pool/${encodeURI(farm.id)}`,
        extra: {},
        notes: [],
        chain: 'fantom',
      };

      if (masterChef?.pid) {
        item.earns = ['beets'];

        item.earn = [
          {
            address: '0xf24bcf4d1e507740041c9cfd2dddb29585adce1e',
            symbol: 'beets',
            decimals: 18,
          }
        ]
      }

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

    const tokenCalls = pools.filter(myPool => myPool.raw.pid).map(myPool => {
      const token = new Web3EthContract(MASTERCHEF_ABI, '0x8166994d9ebBe5829EC86Bd81258149B87faCfd3');

      return {
        id: myPool.id.toLowerCase(),
        userInfo: token.methods.userInfo(myPool.raw.pid, address),
      };
    });

    const calls = await Utils.multiCall(tokenCalls, this.getChain());

    const result = calls
      .filter(v => v.userInfo[0] && new BigNumber(v.userInfo[0]).isGreaterThan(Utils.DUST_FILTER))
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

      const token = new Web3EthContract(MASTERCHEF_ABI, '0x8166994d9ebBe5829EC86Bd81258149B87faCfd3');

      return {
        id: farm.id.toLowerCase(),
        userInfo: token.methods.userInfo(farm.raw.pid, address),
        pendingReward: token.methods.pendingBeets(farm.raw.pid, address),
      };
    }), this.getChain())).filter(v => v.userInfo[0] && new BigNumber(v.userInfo[0]).isGreaterThan(Utils.DUST_FILTER));

    const results = [];
    calls.forEach(call => {
      const farm = farms.find(f => f.id === call.id);

      const result = {
        farm: farm
      };

      let depositDecimals = farm.extra.transactionToken ? this.tokenCollector.getDecimals(farm.extra.transactionToken) : 18;
      result.deposit = {
        symbol: "?",
        amount: call.userInfo[0] / (10 ** depositDecimals)
      };

      if (farm.extra.tokenPrice) {
        result.deposit.usd = result.deposit.amount * farm.extra.tokenPrice;
      }

      const rewards = call.pendingReward || 0;
      if (rewards > 0) {
        const reward = {
          symbol: 'beets',
          amount: rewards / (10 ** this.tokenCollector.getDecimals('0xf24bcf4d1e507740041c9cfd2dddb29585adce1e'))
        };

        const priceReward = this.priceOracle.getAddressPrice('0xf24bcf4d1e507740041c9cfd2dddb29585adce1e');
        if (priceReward) {
          reward.usd = reward.amount * priceReward;
        }

        result.rewards = [reward];
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
    return 'beethovenx';
  }

  getChain() {
    return 'fantom';
  }
}
