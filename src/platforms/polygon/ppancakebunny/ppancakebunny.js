"use strict";

const _ = require("lodash");
const Utils = require("../../../utils");
const Web3EthContract = require("web3-eth-contract");

const DASHBOARD_ADDRESS = "0xFA71FD547A6654b80c47DC0CE16EA46cECf93C02";
const PRICE_CALCULATOR_ADDRESS = "0xE3B11c3Bd6d90CfeBBb4FB9d59486B0381D38021";

const DASHBOARD_ABI = require(`./abi/dashboard.json`);
const PRICE_CALCULATOR_ABI = require(`./abi/price_calculator.json`);

const Farms = require('./farms.json');

module.exports = class ppancakebunny {
  constructor(cache, priceOracle, tokenCollector) {
    this.cache = cache;
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector
  }

  async getLbAddresses() {
    const response = _.cloneDeep(Farms);

    const lpAddresses = [];
    for (const key of Object.keys(response)) {
      const farm = response[key];

      // lpAddress
      if (farm.token && key.match(/([\w]{0,4})-([\w]{0,4})\s*/g)) {
        lpAddresses.push(farm.token);
      }
    }

    return _.uniq(lpAddresses);
  }

  async getBalancedAddressPoolInfo(address, pools) {
    const calls = await Utils.multiCallRpcIndex([{
      reference: 'poolsOf',
      contractAddress: DASHBOARD_ADDRESS,
      abi: DASHBOARD_ABI,
      calls: [
        {
          reference: "poolsOf",
          method: "poolsOf",
          parameters: [address, pools]
        }
      ]
    }], 'polygon');

    return (calls && calls.poolsOf && calls.poolsOf.poolsOf ? calls.poolsOf.poolsOf : [])
      .filter(p => p.balance.gt(0))
  }

  async getAddressFarms(address) {
    const cacheItem = this.cache.get(`getAddressFarms-ppancakebunny-${address}`);
    if (cacheItem) {
      return cacheItem;
    }

    const farms = await this.getFarms();

    const poolsOf = await this.getBalancedAddressPoolInfo(
      address,
      farms.filter(farm => farm.raw.address).map(farm => farm.raw.address)
    )

    this.cache.put(`getAddressFarms-all-ppancakebunny-${address}`, poolsOf, {
      ttl: 60 * 1000
    });

    const result = poolsOf
      .filter(p => p.balance.gt(0))
      .map(p =>
        farms.find(f => f.raw.address.toLowerCase() === p.pool.toLowerCase()).id
      )

    this.cache.put(`getAddressFarms-ppancakebunny-${address}`, result, {
      ttl: 300 * 1000
    });

    return result;
  }

  async getFarms(refresh = false) {
    const cacheKey = "getFarms-ppancakebunny";

    if (!refresh) {
      const cacheItem = this.cache.get(cacheKey);
      if (cacheItem) {
        return cacheItem;
      }
    }

    const response = _.cloneDeep(Farms);

    const [prices, overall] = await Promise.all([
      this.getTokenPrices(),
      this.getOverall()
    ]);

    const farms = [];

    for (const key of Object.keys(response)) {
      const farm = response[key];

      if (farm.closed === true) {
        continue;
      }

      farm.id = key;

      let tokenSymbol = key.toLowerCase()
        .trim()
        .replace('boost', '')
        .replace('flip', '')
        .replace('cake maximizer', '')
        .replace('maximizer', '')
        .replace('flip', '')
        .replace('v2', '')
        .replace(/\s+\w*lp$/, '')
        .replace(/\s/g, '')
        .trim();

      if (farm.token) {
        const lpSymbol = this.tokenCollector.getSymbolByAddress(farm.token);
        if (lpSymbol) {
          tokenSymbol = lpSymbol;
        }
      }

      const items = {
        id: `ppancakebunny_${key.toLowerCase().replace(/\s/g, '-')}`,
        name: key,
        token: tokenSymbol,
        raw: Object.freeze(farm),
        provider: "ppancakebunny",
        link: `https://polygon.pancakebunny.finance/farm/${encodeURI(key)}`,
        has_details: true,
        extra: {}
      };

      if (farm.swap) {
        items.platform = farm.swap;
      }

      // lpAddress
      if (key.match(/([\w]{0,4})-([\w]{0,4})\s*/g)) {
        items.extra.lpAddress = farm.token;
      }

      if (farm.address) {
        items.extra.transactionAddress = farm.address;
      }

      if (farm.token) {
        items.extra.transactionToken = farm.token;
      }

      if (prices[key]) {
        items.extra.tokenPrice = prices[key];
      }

      const notes = [];
      if (farm.summary) {
        notes.push(farm.summary);
      }

      if (farm.description) {
        notes.push(farm.description);
      }

      const finalNotes = _.uniq(
        notes
          .map(b => b.replace(/<\/?[^>]+(>|$)/g, "").trim())
          .filter(b => b.length > 0)
      );

      if (finalNotes.length > 0) {
        items.notes = finalNotes;
      }

      let infoPool = overall[farm.address.toLowerCase()];
      if (infoPool) {

        if (infoPool.tvl > 0) {
          items.tvl = {
            usd: infoPool.tvl
          };
        }

        if (infoPool.apy > 0) {
          items.yield = {
            apy: infoPool.apy
          };
        }
      }

      if (farm.earn) {
        const earn = farm.earn.toLowerCase().replace(/ /g, '');
        earn.split("+").filter(e => e.match(/^[\w]{1,10}$/g)).forEach(e => {
          const token = e.trim();
          if (!items.earns) {
            items.earns = [];
          }

          items.earns.push(token);
        });
      }

      farms.push(Object.freeze(items));
    }

    this.cache.put(cacheKey, farms, { ttl: 1000 * 60 * 30 });

    console.log("ppancakebunny updated");

    return farms;
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
        'polygon'
      );
    }

    return [];
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

    let poolsOfCalls = this.cache.get(`getAddressFarms-all-ppancakebunny-${address}`);
    if (!poolsOfCalls) {
      const poolsOfAddresses = addressFarms
        .map(farmId => farms.find(f => f.id === farmId))
        .map(farm => farm.raw.address);

      poolsOfCalls = await this.getBalancedAddressPoolInfo(address, poolsOfAddresses);
    }

    const poolsOf = {};
    if (poolsOfCalls) {
      poolsOfCalls.forEach(p => {
        poolsOf[p.pool.toLowerCase()] = p;
      })
    }

    const results = [];

    for (const id of addressFarms) {
      const farm = farms.find(f => f.id === id);

      const result = {};

      result.farm = farm;

      let balance

      if (poolsOf[farm.raw.address.toLowerCase()]) {
        balance = poolsOf[farm.raw.address.toLowerCase()].balance.toString();
      }

      if (balance) {
        result.deposit = {
          symbol: "?",
          amount: balance / 1e18
        };

        let price = (farm.extra && farm.extra.tokenPrice) ? farm.extra.tokenPrice : undefined;

        if (!price && farm.raw.token) {
          price = this.priceOracle.getAddressPrice(farm.raw.token);
        }

        if (price) {
          result.deposit.usd = (result.deposit.amount * price) / (10 ** this.tokenCollector.getDecimals(farm.raw.token));
        }
      }

      // dust
      if (result.deposit && result.deposit.usd && result.deposit.usd < 0.01) {
        continue;
      }

      let pendingBUNNY;

      // ???
      let poolsOfElement = poolsOf[farm.raw.address.toLowerCase()];

      if (poolsOfElement) {
        const { pBUNNY, pBASE } = poolsOfElement;

        pendingBUNNY = pBUNNY;
      }

      if ( pendingBUNNY) {
        result.rewards = [];

        if (pendingBUNNY && pendingBUNNY.gt(0)) {
          const item = {
            symbol: "polybunny",
            amount: pendingBUNNY.toString() / 1e18
          };

          const bunnyPrice = this.priceOracle.findPrice("0x4c16f69302ccb511c5fac682c7626b9ef0dc126a")
          if (bunnyPrice) {
            item.usd = item.amount * bunnyPrice;
          }

          result.rewards.push(item);
        }
      }

      results.push(result);
    }

    return results;
  }

  async getTokenPrices() {
    const farms = _.cloneDeep(Farms);

    const token = new Web3EthContract(PRICE_CALCULATOR_ABI, PRICE_CALCULATOR_ADDRESS);

    const tokenCalls = [];
    for (const key of Object.keys(farms)) {
      const farm = farms[key];

      tokenCalls.push({
        valueOfAsset: token.methods.valueOfAsset(farm.token, (1e18).toString()),
        id: key
      });
    }

    const calls = await Utils.multiCall(tokenCalls, 'polygon');

    const tokenPrices = {};

    calls.forEach(c => {
      if (c.valueOfAsset[1]) {
        tokenPrices[c.id] = c.valueOfAsset[1];
      }
    });

    return tokenPrices;
  }

  async getOverall() {
    const calls = await Utils.multiCallRpcIndex([{
      reference: 'poolsOf',
      contractAddress: DASHBOARD_ADDRESS,
      abi: DASHBOARD_ABI,
      calls: [
        {
          reference: "poolsOf",
          method: "poolsOf",
          parameters: ['0x0000000000000000000000000000000000000000', Object.values(Farms).slice().filter(farm => farm.address).map(farm => farm.address)]
        }
      ]
    }], 'polygon');

    const poolsOf = {};
    if (calls.poolsOf && calls.poolsOf.poolsOf) {
      calls.poolsOf.poolsOf.forEach(p => {
        poolsOf[p.pool.toLowerCase()] = {
          tvl: p.tvl.toString() / 1e18
        };
      })
    }

    const response = await Utils.requestJsonGet('https://us-central1-bunny-polygon.cloudfunctions.net/api-bunnyData/api-bunnyData');

    for (const [pool, value] of Object.entries(response.apy || {})) {
      if (!poolsOf[pool.toLowerCase()]) {
        poolsOf[pool.toLowerCase()] = {};
      }

      poolsOf[pool.toLowerCase()].apy = parseFloat(value.apy);
    }

    return poolsOf
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
};
