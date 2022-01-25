"use strict";

const Web3EthContract = require("web3-eth-contract");
const BigNumber = require("bignumber.js");

const Utils = require("../../../utils");
const ERC721 = require("./abi/erc721.json");
const _ = require("lodash");

module.exports = class uniswap {
  static ERC_721_ADDRESS = "0xc36442b4a4522e871399cd717abdd847ab11fe88"

  constructor(cacheManager, priceOracle, tokenCollector) {
    this.cacheManager = cacheManager;
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector;
  }

  async getLpPools() {
    const cacheKey = `getPoolsFarms-v2-${this.getName()}`;

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    const response = await Utils.request('POST', 'https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-v3-polygon', {
      "headers": {
        "accept": "*/*",
        "accept-language": "en-US,en;q=0.9",
        "content-type": "application/json",
        "sec-ch-ua": "\"Chromium\";v=\"97\", \" Not;A Brand\";v=\"99\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"Linux\"",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "Referer": "https://info.uniswap.org/",
        "Referrer-Policy": "strict-origin-when-cross-origin"
      },
      "body": "{\"operationName\":\"pools\",\"variables\":{},\"query\":\"query pools {\\n  pools(\\n    where: {}\\n    orderBy: totalValueLockedUSD\\n    orderDirection: desc\\n    subgraphError: allow\\n  ) {\\n    id\\n    feeTier\\n    liquidity\\n    sqrtPrice\\n    tick\\n    token0 {\\n      id\\n      symbol\\n      name\\n      decimals\\n      derivedETH\\n      __typename\\n    }\\n    token1 {\\n      id\\n      symbol\\n      name\\n      decimals\\n      derivedETH\\n      __typename\\n    }\\n    token0Price\\n    token1Price\\n    volumeUSD\\n    txCount\\n    totalValueLockedToken0\\n    totalValueLockedToken1\\n    totalValueLockedUSD\\n    __typename\\n  }\\n}\\n\"}",
    });

    let json = {};
    try {
      json = JSON.parse(response);
    } catch (e) {
      console.log('uniswap pool error', e.message);
    }

    const result = (json?.data.pools || []).filter(i => i?.totalValueLockedUSD > 500000);

    await this.cacheManager.set(cacheKey, result, {ttl: 60 * 60 * 5});

    return result;
  }

  async getFarms(refresh = false) {
    const cacheKey = `getFarms-v2-${this.getName()}`;

    if (!refresh) {
      const cache = await this.cacheManager.get(cacheKey)
      if (cache) {
        return cache;
      }
    }

    const result = [];

    (await this.getLpPools()).forEach(pool => {
      let name = (pool?.token0?.symbol?.toLowerCase() || 'unknown') + '-' + (pool?.token1?.symbol?.toLowerCase() || 'unknown');

      const item = {
        id: `${this.getName()}_${pool.id.toLowerCase()}`,
        name: name.toUpperCase(),
        token: name.toLowerCase(),
        provider: this.getName(),
        has_details: false,
        raw: Object.freeze({
          id: pool.id,
          feeTier: pool.feeTier,
          liquidity: pool.liquidity,
          sqrtPrice: pool.sqrtPrice,
          tick: pool.tick,
        }),
        extra: {
          transactionToken: pool.id,
        },
        chain: this.getChain(),
      };

      item.link = `https://app.uniswap.org/#/add/${pool?.token0?.id}/${pool?.token1?.id}/${pool?.feeTier}`

      if (pool.feeTier) {
        item.name += ` ${(pool.feeTier / 10000).toFixed(2)}%`
      }

      if (pool?.totalValueLockedUSD) {
        item.tvl = {
          usd: parseFloat(pool.totalValueLockedUSD).toFixed(8),
        };
      }

      result.push(Object.freeze(item));
    });

    await this.cacheManager.set(cacheKey, result, {ttl: 60 * 30});

    console.log(`${this.getName()} updated`);

    return result;
  }

  async getAddressFarms(address) {
    const cacheKey = `getAddressFarms-${this.getName()}-${address}`;

    const cache = await this.cacheManager.get(cacheKey);
    if (cache) {
      return cache;
    }

    const contract = new Web3EthContract(ERC721, uniswap.ERC_721_ADDRESS);

    const nftTokens = await Utils.multiCall([{
      balance: contract.methods.balanceOf(address),
    }], this.getChain());

    const positionIds = [];

    if (nftTokens && nftTokens[0] && nftTokens[0].balance > 0) {


      const newVar = {};

      [...Array(parseInt(nftTokens[0].balance)).keys()].map(index => {
        newVar['tokenOfOwnerByIndex' + index] = contract.methods.tokenOfOwnerByIndex(address, index);
      })

      const i = await Utils.multiCall([newVar], this.getChain());

      const x = await Utils.multiCall(Object.values(i[0]).map(position => ({
        index: position.toString(),
        positions: contract.methods.positions(position),
      })), this.getChain());

      x.forEach(position => {
        const value = Utils.convertToNamedAbiOutput(ERC721, 'positions', position.positions);

        if (value.liquidity > 0) {
          positionIds.push(position.index);
        }
      })
    }

    await this.cacheManager.set(cacheKey, positionIds, {ttl: 60 * 5});

    return positionIds;
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

    const contract = new Web3EthContract(ERC721, uniswap.ERC_721_ADDRESS);

    const x = (await Utils.multiCall(addressFarms.map(position => ({
      index: position.toString(),
      positions: contract.methods.positions(position),
    })), this.getChain())).map(position => ({
      index: parseInt(position.index),
      positions: Utils.convertToNamedAbiOutput(ERC721, 'positions', position.positions),
    }));

    const results = [];
    x.forEach(call => {
      if (!new BigNumber(call.positions.liquidity).isGreaterThan(0)) {
        return;
      }

      const result = {};


      let token0 = 'unknown'
      if (call.positions.token0) {
        const s = this.tokenCollector.getSymbolByAddress(call.positions.token0);
        if (s) {
          token0 = s;
        }
      }

      let token1 = 'unknown'
      if (call.positions.token0) {
        const s = this.tokenCollector.getSymbolByAddress(call.positions.token1);
        if (s) {
          token1 = s;
        }
      }

      result.farm = {
        id: `${this.getName()}_position_${call.index}`,
        name: `${token0}-${token1}`.toUpperCase(),
        token: `${token0}-${token1}`.toLowerCase(),
        provider: this.getName(),
        has_details: false,
        raw: Object.freeze(call.positions),
        extra: {},
        chain: this.getChain(),
      };

      if (new BigNumber(call.positions.liquidity).isGreaterThan(0)) {
        result.deposit = {
          symbol: result.farm.symbol,
          amount: call.positions.liquidity / 1e18
        };
      }

      results.push(Object.freeze(result));
    });

    return results;
  }

  getName() {
    return 'uniswap';
  }

  getChain() {
    return 'polygon';
  }
};
