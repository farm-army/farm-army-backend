"use strict";

const _ = require("lodash");
const Utils = require("../../utils");
const Web3EthContract = require("web3-eth-contract");

const DASHBOARD_ABI = require('./abi/dashboard.json');
const PRICECALC_ABI = require('./abi/pricecalc.json');
const Farms = require('./farms.json');

const DASHBOARD_ADDRESS = '0x5666FCA30Ea32B7b9aCab96cfB81bDD3ae287A80';
const PRICECALC_ADDRESS = '0x63F9a843c1faBEFd10fF2A603c1777b6c5E6D225';

module.exports = class merlin {
  constructor(cache, priceOracle, tokenCollector) {
    this.cache = cache;
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector
  }

  async getLbAddresses() {
    return [];
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
    }]);

    return (calls && calls.poolsOf && calls.poolsOf.poolsOf ? calls.poolsOf.poolsOf : [])
      .filter(p => p.balance.gt(0))
  }

  async getAddressFarms(address) {
    const cacheItem = this.cache.get(`getAddressFarms-merlin-${address}`);
    if (cacheItem) {
      return cacheItem;
    }

    const farms = await this.getFarms();

    const poolsOf = await this.getBalancedAddressPoolInfo(
      address,
      farms.filter(farm => farm.raw.address).map(farm => farm.raw.address)
    )

    this.cache.put(`getAddressFarms-all-merlin-${address}`, poolsOf, {
      ttl: 60 * 1000
    });

    const result = poolsOf
      .filter(p => p.balance.gt(0))
      .map(p =>
        farms.find(f => f.raw.address.toLowerCase() === p.pool.toLowerCase()).id
      )

    this.cache.put(`getAddressFarms-merlin-${address}`, result, {
      ttl: 300 * 1000
    });

    return result;
  }

  async getFarms(refresh = false) {
    const cacheKey = "getFarms-merlin";

    if (!refresh) {
      const cacheItem = this.cache.get(cacheKey);
      if (cacheItem) {
        return cacheItem;
      }
    }

    const response = _.cloneDeep(Farms);

    const [prices, overall] = await Promise.all([
      this.getTokenPrices(response),
      this.getOverall(response),
    ]);

    const farms = [];

    for (const key of Object.keys(response)) {
      const farm = response[key];

      if (farm.closed === true) {
        continue;
      }

      let tokenSymbol = farm.lpSymbol.toLowerCase()
        .replace(/\s+v\d+$/, '')
        .replace(/\s+\w*lp$/, '')
        .replace('boost', '')
        .replace('flip', '')
        .replace('cake maximizer', '')
        .replace('maximizer', '')
        .replace('flip', '')
        .replace('v2', '')
        .replace(/\s/g, '')
        .trim();

      const items = {
        id: `merlin_${farm.id}`,
        name: tokenSymbol.toUpperCase(),
        token: tokenSymbol,
        raw: Object.freeze({
          address: farm.vaultAddress[56]
        }),
        provider: "merlin",
        link: `https://www.merlinlab.com/farm`,
        has_details: true,
        extra: {}
      };

      if (farm.stakingToken.address[56]) {
        items.extra.transactionToken = farm.stakingToken.address[56];
      }

      // lpAddress
      if (tokenSymbol.match(/([\w]{0,4})-([\w]{0,4})\s*/g)) {
        items.extra.lpAddress = items.extra.transactionToken;
      }

      if (farm.vaultAddress[56]) {
        items.extra.transactionAddress = farm.vaultAddress[56];
      }

      if (prices[key]) {
        items.extra.tokenPrice = prices[key];
      }

      let infoPool = overall[farm.vaultAddress[56].toLowerCase()];
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


      if (farm.earns) {
        farm.earns.forEach(earn => {
          if (earn.amountPropNameInInfo && earn.amountPropNameInInfo.toLowerCase() === 'pbase') {
            return;
          }

          if (!items.earns) {
            items.earns = [];
          }

          items.earns.push(earn.token.symbol.toLowerCase());
        });
      }

      farms.push(Object.freeze(items));
    }

    this.cache.put(cacheKey, farms, { ttl: 1000 * 60 * 30 });

    console.log("merlin updated");

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
        address
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

    let poolsOfCalls = this.cache.get(`getAddressFarms-all-merlin-${address}`);
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

        let price = this.priceOracle.getAddressPrice(farm.extra.transactionToken);
        if (price) {
          result.deposit.usd = result.deposit.amount * price;
        }
      }

      // dust
      if (result.deposit && result.deposit.usd && result.deposit.usd < 0.01) {
        continue;
      }

      let pendingUSD
      let pendingBNB
      let pendingMERL
      let pendingCAKE

      // ???
      let poolsOfElement = poolsOf[farm.raw.address.toLowerCase()];

      if (poolsOfElement) {
        const { pMERL, pBASE } = poolsOfElement;

        pendingMERL = pMERL;

        if (farm.raw.type === 'flipToCake') {
          pendingCAKE = pBASE;
        }
      }

      if (pendingUSD || pendingBNB || pendingMERL || pendingCAKE) {
        result.rewards = [];

        if (pendingMERL && pendingMERL.gt(0)) {
          const item = {
            symbol: "merl",
            amount: pendingMERL.toString() / 1e18
          };

          const merlPrice = this.priceOracle.findPrice("0xDA360309C59CB8C434b28A91b823344a96444278")
          if (merlPrice) {
            item.usd = item.amount * merlPrice;
          }

          result.rewards.push(item);
        }

        if (pendingBNB && pendingBNB.gt(0)) {
          const item = {
            symbol: "bnb",
            amount: pendingBNB.toString() / 1e18
          };

          const bnbPrice = this.priceOracle.findPrice("bnb");
          if (bnbPrice) {
            item.usd = item.amount * bnbPrice;
          }

          result.rewards.push(item);
        }

        if (pendingCAKE && pendingCAKE.gt(0)) {
          const item = {
            symbol: "cake",
            amount: pendingCAKE.toString() / 1e18
          };

          const cakePrice = this.priceOracle.findPrice("cake")
          if (cakePrice) {
            item.usd = item.amount * cakePrice;
          }

          result.rewards.push(item);
        }
      }

      results.push(result);
    }

    return results;
  }

  async getTokenPrices(farms) {
    const token = new Web3EthContract(PRICECALC_ABI, PRICECALC_ADDRESS);

    const tokenCalls = [];
    farms.forEach(farm => {
      tokenCalls.push({
        valueOfAsset: token.methods.valueOfAsset(farm.stakingToken.address[56], (1e18).toString()),
        id: farm.vaultAddress[56]
      });
    })

    const calls = await Utils.multiCall(tokenCalls);

    const tokenPrices = {};

    calls.forEach(c => {
      if (c.valueOfAsset[1]) {
        tokenPrices[c.id] = c.valueOfAsset[1];
      }
    });

    return tokenPrices;
  }

  async getApy(farms) {
    let vaults = Object.values(farms).filter(farm => farm.vaultAddress[56]).map(farm => farm.vaultAddress[56]);

    const token = new Web3EthContract(DASHBOARD_ABI, DASHBOARD_ADDRESS);

    const tokenCalls = vaults.map(vault => ({
      apyOfPool: token.methods.apyOfPool(vault, '365'),
      pool: vault
    }));

    return Utils.multiCall(tokenCalls)
  }

  async getOverall(farms) {
    let vaults = Object.values(farms).filter(farm => farm.vaultAddress[56]).map(farm => farm.vaultAddress[56]);

    const tvl = Utils.multiCallRpcIndex([{
      reference: 'poolsOf',
      contractAddress: DASHBOARD_ADDRESS,
      abi: DASHBOARD_ABI,
      calls: [
        {
          reference: "poolsOf",
          method: "poolsOf",
          parameters: ['0x0000000000000000000000000000000000000000', vaults]
        }
      ]
    }]);

    const [calls, apy] = await Promise.all([
      tvl,
      this.getApy(farms)
    ]);

    const poolsOf = {};
    if (calls.poolsOf && calls.poolsOf.poolsOf) {
      calls.poolsOf.poolsOf.forEach(p => {
        poolsOf[p.pool.toLowerCase()] = {
          tvl: p.tvl.toString() / 1e18
        };
      })
    }

    apy.forEach(c => {
      let pool = c.pool.toLowerCase();
      if (!poolsOf[pool]) {
        poolsOf[pool] = {};
      }

      poolsOf[pool].apy = (c.apyOfPool[0] / 1e16) + (c.apyOfPool[1] / 1e16);
    })

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
