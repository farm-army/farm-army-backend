"use strict";

const _ = require("lodash");
const Web3EthContract = require("web3-eth-contract");
const BigNumber = require("bignumber.js");
const Utils = require("../../utils");

const FARMS = require('./farms/farms.json');

const fetch = require("node-fetch");
const AbortController = require("abort-controller")
const ibBNBAbi = require('./abi/ibBNBAbi.json');

module.exports = class alpha {
  constructor(cache, priceOracle, farmPlatformResolver) {
    this.cache = cache;
    this.priceOracle = priceOracle;
    this.farmPlatformResolver = farmPlatformResolver;
  }

  async getAddressFarms(address) {
    const cacheKey = `getAddressFarms-alpha-${address}`;

    const cacheItem = this.cache.get(cacheKey);
    if (cacheItem) {
      return cacheItem;
    }

    const farms = await this.getFarms();

    const all = [];

    const positions = await this.getAddressPositions(address);
    positions.forEach(p => {
      const farm = farms.find(f => f.raw.goblinAddress.toLowerCase() === p.goblin.toLowerCase());

      if (farm) {
        all.push(farm.id)
      }
    })

    this.cache.put(cacheKey, all, { ttl: 300 * 1000 });

    return all;
  }

  async getAddressPositions(address) {
    const cacheKey = `getAddressPositions-alpha-${address}`;

    const cacheItem = this.cache.get(cacheKey);
    if (cacheItem) {
      return cacheItem;
    }

    const controller = new AbortController()
    setTimeout(() => controller.abort(), 7600)

    const opts = {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: "{\"operationName\":\"useTheGraphUserPosition\",\"variables\":{\"where\":{\"owner\":\"" + address + "\",\"id_gt\":\"\"},\"first\":1000},\"query\":\"query useTheGraphUserPosition($first: Int, $where: Position_filter) {\\n  positions(where: $where, first: $first) {\\n    id\\n    owner\\n    goblin\\n    debtShare\\n    __typename\\n  }\\n}\\n\"}",
      signal: controller.signal
    };

    let json = undefined
    try {
      const foo = await fetch("https://api.thegraph.com/subgraphs/name/hermioneeth/alpha-homora-bank-bsc", opts);
      json = await foo.json();
    } catch (e) {
      console.log('alpha timeout: ', address, e.message)
      this.cache.put(cacheKey, [], { ttl: 30 * 1000 });

      return []
    }

    const positions = [];
    if (json.data && json.data.positions) {
      json.data.positions.forEach(p => {
        positions.push(p)
      })
    } else {
      console.log('alpha error: ', address)
      this.cache.put(cacheKey, positions, { ttl: 30 * 1000 });
      return []
    }

    this.cache.put(cacheKey, positions, { ttl: 300 * 1000 });

    return positions;
  }

  async getFarms(refresh = false) {
    const cacheKey = "getFarms-alpha";

    if (!refresh) {
      const cacheItem = this.cache.get(cacheKey);
      if (cacheItem) {
        return cacheItem;
      }
    }

    const farms = [];

    FARMS.forEach(farm => {
      const item = {
        id: `alpha_lp_${farm.id}`,
        name: farm.name.replace('/', '-'),
        token: farm.name.replace('/', '-').toLowerCase(),
        platform: farm.exchange.name.toLowerCase(),
        raw: Object.freeze(farm),
        provider: "alpha",
        has_details: true,
        link: 'https://homora-bsc.alphafinance.io/farm',
        extra: {},
        earns: ['cake', 'alpha']
      };

      if (farm.leverages && farm.leverages.length > 1) {
        item.notes = [`Leverage: ${Math.min(...farm.leverages)} - ${Math.max(...farm.leverages)}`]
      }

      if (farm.lpTokenAddress) {
        item.extra.lpAddress = farm.lpTokenAddress;

        const platform = this.farmPlatformResolver.findMainPlatformNameForTokenAddress(farm.lpTokenAddress);
        if (platform) {
          item.platform = platform;
        }
      }

      farms.push(item);
    })

    this.cache.put(cacheKey, farms, { ttl: 1000 * 60 * 30 });

    console.log("alpha updated");

    return farms;
  }

  async getYields(address) {
    const addressFarms = await this.getAddressFarms(address);
    if (addressFarms.length === 0) {
      return [];
    }

    return await this.getYieldsInner(address, addressFarms);
  }

  async getYieldsInner(address, farmIds) {
    if (farmIds.length === 0) {
      return [];
    }

    const farms = await this.getFarms();

    let positions = await this.getAddressPositions(address)

    const positionCalls = [];
    positions.forEach(position => {
      const farm = farms.find(f => f.raw.goblinAddress.toLowerCase() === position.goblin.toLowerCase());

      const contract = new Web3EthContract(ibBNBAbi, '0x3bb5f6285c312fc7e1877244103036ebbeda193d');

      positionCalls.push({
        id: farm.id,
        positionInfo: contract.methods.positionInfo(position.id),
      });
    })

    const positionResults = await Utils.multiCall(positionCalls);

    const stakes = positionResults
      .filter(v =>
        v.positionInfo && new BigNumber(v.positionInfo[0] || 0).isGreaterThan(0)
      )
      .map(call => {
        const farm = farms.find(f => f.id === call.id);

        const result = {};

        // positions
        // positionInfo[0] => position
        // positionInfo[1] => debit
        if (call.positionInfo) {
          const positionValue = call.positionInfo[0] || 0;
          if (positionValue > 0) {
            result.deposit = {
              symbol: "?",
              amount: (positionValue - (call.positionInfo[1] || 0)) / 1e18, // amount of bnb; remove debit
            };

            if (farm.raw.lpTokenAddress) {
              const price = this.priceOracle.getAddressPrice('0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c'); // BNB only for now
              if (price) {
                result.deposit.usd = result.deposit.amount * price;

                // reverse lp amount based on the usd price
                if (farm.raw.lpTokenAddress) {
                  let lpPrice = this.priceOracle.findPrice(farm.raw.lpTokenAddress);
                  if (lpPrice) {
                    result.deposit.amount = result.deposit.usd / lpPrice
                  }
                }
              }
            }
          }
        }

        result.farm = farm;

        return result;
      });

    return stakes;
  }

  async getTransactions(address, id) {
    return [];
  }

  async getDetails(address, id) {
    const farm = (await this.getFarms()).find(f => f.id === id);
    if (!farm) {
      return {};
    }

    const [yieldFarms, transactions] = await Promise.all([
      this.getYieldsInner(address, [farm.id]),
    ]);

    const result = {};

    let lpTokens = [];
    if (yieldFarms[0]) {
      result.farm = yieldFarms[0];
      lpTokens = this.priceOracle.getLpSplits(farm, yieldFarms[0]);
    }

    if (lpTokens && lpTokens.length > 0) {
      result.lpTokens = lpTokens;
    }

    return result;
  }
};
