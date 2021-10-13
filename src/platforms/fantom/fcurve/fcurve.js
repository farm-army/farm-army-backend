"use strict";

const crypto = require('crypto');
const BigNumber = require("bignumber.js");
const Web3EthContract = require("web3-eth-contract");
const Utils = require("../../../utils");

const GAUGE_ABI = require('./abi/gauge.json');
const LP_TOKEN_ABI = require('./abi/lp_token.json');

module.exports = class fcurve {
  constructor(cacheManager, priceOracle, tokenCollector) {
    this.cacheManager = cacheManager;
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector;
  }

  async getRawFarms() {
    return [
      {
        name: '2pool',
        symbol: 'dai-usdc',
        token: '0x27e611fd27b276acbd5ffd632e5eaebec9761e40',
        gauge: '0x8866414733F22295b7563f9C5299715D2D76CAf4',
        rewardsTokens: [
          '0x1e4f97b9f9f913c46f1632781732927b9019c68b'
        ]
      },
      {
        name: 'fUSDT',
        symbol: 'fusdt',
        token: '0x92d5ebf3593a92888c25c0abef126583d4b5312e',
        gauge: '0x06e3C4da96fd076b97b7ca3Ae23527314b6140dF',
        rewardsTokens: [
          '0x1e4f97b9f9f913c46f1632781732927b9019c68b'
        ]
      },
      {
        name: 'WBTC/renBTC',
        symbol: 'btc',
        token: '0x5B5CFE992AdAC0C9D48E05854B2d91C73a003858',
        gauge: '0xBdFF0C27dd073C119ebcb1299a68A6A92aE607F0',
        rewardsTokens: [
          '0x1e4f97b9f9f913c46f1632781732927b9019c68b'
        ]
      },
      {
        name: 'TriCrypto',
        symbol: 'fusdt-btc-eth',
        token: '0x58e57cA18B7A47112b877E31929798Cd3D703b0f',
        gauge: '0x3a1659Ddcf2339Be3aeA159cA010979FB49155FF',
        rewardsTokens: [
          '0x1e4f97b9f9f913c46f1632781732927b9019c68b'
        ]
      }
    ];
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

    const calls = [];

    rawFarms.forEach(farm => {
      const token = new Web3EthContract(LP_TOKEN_ABI, farm.token);

      calls.push({
        token: farm.token.toLowerCase(),
        virtualPrice: token.methods.get_virtual_price(),
      });
    });

    const callsResult = await Utils.multiCallIndexBy('token', calls, this.getChain());

    const farms = [];

    rawFarms.forEach(farm => {
      let id = crypto.createHash('md5')
        .update(farm.gauge.toLowerCase())
        .digest('hex');

      const item = {
        id: `${this.getName()}_${id}`,
        name: farm.name,
        token: farm.symbol,
        provider: this.getName(),
        has_details: true,
        raw: Object.freeze(farm),
        extra: {}
      };

      item.extra.transactionAddress = farm.gauge;
      item.extra.transactionToken = farm.token;

      let info = callsResult[farm.token.toLowerCase()];
      if (info && info.virtualPrice) {
        item.extra.virtualPrice = info.virtualPrice / 1e18;
      }

      if (farm.rewardsTokens) {
        farm.rewardsTokens.forEach(rewardsToken => {
          const rewardToken = this.tokenCollector.getTokenByAddress(rewardsToken);
          if (rewardToken) {
            if (!item.earn) {
              item.earn = [];
            }

            if (!item.earns) {
              item.earns = [];
            }

            item.earn.push(rewardToken);
            item.earns.push(rewardToken.symbol);
          }
        });
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

    const tokenCalls = pools.map(farm => {
      const token = new Web3EthContract(GAUGE_ABI, farm.raw.gauge);

      return {
        id: farm.id,
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

    const tokenCalls = addressFarms.map(id => {
      const farm = farms.find(f => f.id === id);

      const token = new Web3EthContract(GAUGE_ABI, farm.raw.gauge);

      return {
        id: farm.id,
        balanceOf: token.methods.balanceOf(address),
        rewards: token.methods.claimable_reward_write(address, farm.earn[0].address),
      };
    });

    const calls = await Utils.multiCall(tokenCalls, this.getChain());

    const results = [];
    calls.forEach(call => {
      if (!new BigNumber(call.balanceOf).isGreaterThan(0)) {
        return
      }

      const farm = farms.find(f => f.id === call.id);

      const result = {
        farm: farm
      };

      let depositDecimals = farm.extra.transactionToken ? this.tokenCollector.getDecimals(farm.extra.transactionToken) : 18;
      result.deposit = {
        symbol: "?",
        amount: call.balanceOf / (10 ** depositDecimals)
      };

      if (farm.extra.transactionToken) {
        let price = this.priceOracle.findPrice(farm.extra.transactionToken);

        if (!price && farm.extra.virtualPrice) {
          price = farm.extra.virtualPrice;
        }

        if (price) {
          result.deposit.usd = result.deposit.amount * price;
        }
      }

      if (new BigNumber(call.rewards).isGreaterThan(0) && farm.earn[0]) {
        const reward = {
          symbol: farm.earn[0].symbol,
          amount: call.rewards / (10 ** farm.earn[0].decimals)
        };

        const price = this.priceOracle.findPrice(farm.earn[0].address);
        if (price) {
          reward.usd = reward.amount * price;
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
    return 'fcurve';
  }

  getChain() {
    return 'fantom';
  }
}