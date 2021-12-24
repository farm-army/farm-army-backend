"use strict";

const _ = require("lodash");
const Utils = require("../../../utils");
const Web3EthContract = require("web3-eth-contract");

const BALANCES_ADDRESS = "0xb3c96d3c3d643c2318e4cdd0a9a48af53131f5f4";
const ASSET_ADDRESS = "0xe375a12a556e954ccd48c0e0d3943f160d45ac2e";

const BALANCES_ABI = require('./abi/balances.json');
const ASSET_ABI = require('./abi/asset.json');

const acorn = require("acorn")
const walk = require("acorn-walk");

module.exports = class pancakebunny {
  constructor(cacheManager, priceOracle, tokenCollector) {
    this.cacheManager = cacheManager;
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector
  }

  async getLbAddresses() {
    const response = _.cloneDeep(await this.getFarmsViaHtml());

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
      contractAddress: BALANCES_ADDRESS,
      abi: BALANCES_ABI,
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
      .map(i => Utils.convertRcpResultObject(i))
  }

  async getAddressFarms(address) {
    const cacheKey = `getAddressFarms-v3-pancakebunny-${address}`;
    const cache = await this.cacheManager.get(cacheKey);
    if (cache) {
      return cache;
    }

    const farms = await this.getFarms();

    const poolsOf = await this.getBalancedAddressPoolInfo(address, farms.filter(farm => farm.raw.address).map(farm => farm.raw.address))

    await this.cacheManager.set(`getAddressFarms-all-pancakebunny-v2-${address}`, poolsOf, {ttl: 60 * 5});

    const result = poolsOf
      .filter(p => p.balance > 0)
      .map(p =>
        farms.find(f => f.raw.address.toLowerCase() === p.pool.toLowerCase()).id
      )

    await this.cacheManager.set(cacheKey, result, {ttl: 60 * 5});

    return result;
  }

  async getFarms(refresh = false) {
    const cacheKey = "getFarms-v4-pancakebunny";

    if (!refresh) {
      const cache = await this.cacheManager.get(cacheKey);
      if (cache) {
        return cache;
      }
    }

    const response = _.cloneDeep(await this.getFarmsViaHtml());

    const [prices, overall] = await Promise.all([
      this.getTokenPrices(response),
      this.getOverall(response)
    ]);

    const farms = [];

    for (const key of Object.keys(response)) {
      const farm = response[key];

      if (farm.closed === true) {
        continue;
      }

      farm.id = key;

      let tokenSymbol = key.toLowerCase()
        .replace('boost', '')
        .replace('flip', '')
        .replace('cake maximizer', '')
        .replace('maximizer', '')
        .replace('flip', '')
        .replace('v2', '')
        .replace(/\s/g, '')
        .trim();

      if (farm.token) {
        const lpSymbol = this.tokenCollector.getSymbolByAddress(farm.token);
        if (lpSymbol) {
          tokenSymbol = lpSymbol;
        }
      }

      const items = {
        id: `pancakebunny_${key.toLowerCase().replace(/\s/g, '-')}`,
        name: key,
        token: tokenSymbol,
        raw: Object.freeze(farm),
        provider: "pancakebunny",
        link: `https://pancakebunny.finance/farm/${encodeURI(key)}`,
        has_details: true,
        extra: {},
        chain: 'bsc',
        compound: true,
      };

      if ((farm.exchange && farm.exchange.toLowerCase().includes('pancakeswap')) || (farm.type && farm.type.toLowerCase().includes('cakestake'))) {
        items.platform = 'pancake';
      } else if (farm.type && farm.type.toLowerCase().includes('venus')) {
        items.platform = 'venus';
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
        earn.split("+").filter(e => e.match(/^[\w-]{1,6}$/g)).forEach(e => {
          const token = e.trim();
          if (!items.earns) {
            items.earns = [];
          }

          items.earns.push(token);
        });
      }

      farms.push(Object.freeze(items));
    }

    await this.cacheManager.set(cacheKey, farms, {ttl: 60 * 30});

    console.log("pancakebunny updated");

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

    let poolsOfCalls = await this.cacheManager.get(`getAddressFarms-all-pancakebunny-v3-${address}`);
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
          result.deposit.usd = (result.deposit.amount * price) / 1e18;
        }
      }

      // dust
      if (result.deposit && result.deposit.usd && result.deposit.usd < 0.01) {
        continue;
      }

      let pendingUSD
      let pendingBNB
      let pendingBUNNY
      let pendingCAKE

      // ???
      let poolsOfElement = poolsOf[farm.raw.address.toLowerCase()];

      if (poolsOfElement) {
        const { pBUNNY, pBASE } = poolsOfElement;

        pendingBUNNY = pBUNNY;

        if (farm.raw.type === 'flipToCake') {
          pendingCAKE = pBASE;
        }
      }

      if (pendingUSD || pendingBNB || pendingBUNNY || pendingCAKE) {
        result.rewards = [];

        if (pendingBUNNY && pendingBUNNY > 0) {
          const item = {
            symbol: "bunny",
            amount: pendingBUNNY / 1e18
          };

          const bunnyPrice = this.priceOracle.findPrice("bunny")
          if (bunnyPrice) {
            item.usd = item.amount * bunnyPrice;
          }

          result.rewards.push(item);
        }

        if (pendingBNB && pendingBNB > 0) {
          const item = {
            symbol: "bnb",
            amount: pendingBNB / 1e18
          };

          const bnbPrice = this.priceOracle.findPrice("bnb");
          if (bnbPrice) {
            item.usd = item.amount * bnbPrice;
          }

          result.rewards.push(item);
        }

        if (pendingCAKE && pendingCAKE > 0) {
          const item = {
            symbol: "cake",
            amount: pendingCAKE / 1e18
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
    const token = new Web3EthContract(ASSET_ABI, ASSET_ADDRESS);

    const tokenCalls = [];
    for (const key of Object.keys(farms)) {
      const farm = farms[key];

      tokenCalls.push({
        valueOfAsset: token.methods.valueOfAsset(farm.token, (1e18).toString()),
        id: key
      });
    }

    const calls = await Utils.multiCall(tokenCalls);

    const tokenPrices = {};

    calls.forEach(c => {
      if (c.valueOfAsset && c.valueOfAsset[1]) {
        tokenPrices[c.id] = c.valueOfAsset[1];
      }
    });

    return tokenPrices;
  }

  async getOverall(farms) {
    const addresses = Object.values(farms)
      .slice()
      .filter(farm => farm.address && farm.address.toLowerCase() !== '0xf84E3809971798Bd372aecdC03aE977759A619aB'.toLowerCase()) // filter compensate pool: breaks all
      .map(farm => farm.address);

    const calls = await Utils.multiCallRpcIndex([{
      reference: 'poolsOf',
      contractAddress: BALANCES_ADDRESS,
      abi: BALANCES_ABI,
      calls: [
        {
          reference: "poolsOf",
          method: "poolsOf",
          parameters: ['0x0000000000000000000000000000000000000000', addresses]
        }
      ]
    }]);

    const poolsOf = {};
    if (calls.poolsOf && calls.poolsOf.poolsOf) {
      calls.poolsOf.poolsOf.forEach(p => {
        poolsOf[p.pool.toLowerCase()] = {
          tvl: p.tvl.toString() / 1e18
        };
      })
    }

    const response = await Utils.requestJsonGet('https://firestore.googleapis.com/v1/projects/pancakebunny-finance/databases/(default)/documents/apy_data?pageSize=100');

    response.documents.forEach(v => {
      const pool = v.fields.pool.stringValue;
      const apy = v.fields.apy.stringValue;

      if (!poolsOf[pool.toLowerCase()]) {
        poolsOf[pool.toLowerCase()] = {};
      }

      poolsOf[pool.toLowerCase()].apy = parseFloat(apy);
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

  async getFarmsViaHtml() {
    const cacheKey = "getFarmsViaHtml-v4-pancakebunny";
    const cache = await this.cacheManager.get(cacheKey);
    if (cache) {
      return cache;
    }

    const javascriptFiles = await Utils.getJavascriptFiles("https://pancakebunny.finance/pool");

    let rawFarms = {};

    Object.values(javascriptFiles).forEach(body => {
      walk.simple(acorn.parse(body, {ecmaVersion: 'latest'}), {
        Literal(node) {
          if (node.value && node.value.toString().startsWith('{') && (node.value.toString().toLowerCase().includes('type') && node.value.toString().toLowerCase().includes('address') && node.value.toString().toLowerCase().includes('earn'))) {
            let items = {};

            try {
              items = JSON.parse(node.value);
            } catch (e) {
              console.log('invalid farm json')
            }

            for (const [key, value] of Object.entries(items)) {
              // multiplexer; abi not supported
              if (value.address && value.type !== 'multiplexer') {
                rawFarms[key] = value;
              }
            }
          }
        }
      })
    });

    const farms = {};
    for (const [key, value] of Object.entries(rawFarms)) {
      if (value.address && value.address.toLowerCase() !== '0xf84E3809971798Bd372aecdC03aE977759A619aB'.toLowerCase()) {
        farms[key] = Object.freeze(value);
      }
    }

    await this.cacheManager.set(cacheKey, farms, {ttl: 60 * 30});

    return Object.freeze(farms);
  }

  getName() {
    return 'pancakebunny';
  }
};
