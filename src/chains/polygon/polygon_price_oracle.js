const _ = require("lodash");

const BigNumber = require("bignumber.js");
const request = require("async-request");
const Utils = require("../../utils");
const Web3EthContract = require("web3-eth-contract");

const UniswapRouter = require("../../abi/uniswap_router.json");
const erc20ABI = require("../../platforms/pancake/abi/erc20.json");
const lpAbi = require("../../lpAbi.json");

const fetch = require("node-fetch");

module.exports = class PolygonPriceOracle {
  constructor(tokenCollector, lpTokenCollector, priceCollector, cacheManager) {
    this.tokenCollector = tokenCollector;
    this.lpTokenCollector = lpTokenCollector;
    this.priceCollector = priceCollector;
    this.cacheManager = cacheManager;
  }

  /**
   * - 0x01212fdf
   * - btc
   * - btc-ltc or ltc-btc
   * - cake-btc-ltc (just fallback)
   *
   * @param addressOrTokens
   * @returns {*}
   */
  findPrice(...addressOrTokens) {
    for (let addressOrToken of addressOrTokens) {
      const price = this.priceCollector.getPrice(addressOrToken)
      if (price) {
        return price;
      }

      // flip token0 and token1
      if (!addressOrToken.startsWith('0x') && addressOrToken.includes('-') && addressOrToken.split('-').length === 2) {
        const [t0, t1] = addressOrToken.split("-");

        const price = this.priceCollector.getPrice(`${t1.toLowerCase()}-${t0.toLowerCase()}`)
        if (price) {
          return price;
        }
      }
    }

    return undefined;
  }

  getAddressPrice(address) {
    return this.priceCollector.getPrice(address)
  }

  getAllPrices() {
    return this.priceCollector.getSymbolMap();
  }

  async jsonRequest(url) {
    const pancakeResponse = await request(url);
    return JSON.parse(pancakeResponse.body);
  }

  async updateTokensSushiSwap() {
    const foo = await fetch("https://api.thegraph.com/subgraphs/name/sushiswap/matic-exchange", {
      "credentials": "omit",
      "headers": {
        "User-Agent": "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:90.0) Gecko/20100101 Firefox/90.0",
        "Accept": "*/*",
        "Accept-Language": "de-DE,de;q=0.7,chrome://global/locale/intl.properties;q=0.3",
        "content-type": "application/json",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "cross-site"
      },
      "referrer": "https://analytics-polygon.sushi.com/",
      "body": "{\"operationName\":\"tokens\",\"variables\":{},\"query\":\"fragment TokenFields on Token {\\n  id\\n  name\\n  symbol\\n  derivedETH\\n  volumeUSD\\n decimals\\n  __typename\\n}\\n\\nquery tokens {\\n  tokens(first: 100, orderBy: volumeUSD, orderDirection: desc) {\\n    ...TokenFields\\n    __typename\\n  }\\n}\\n\"}",
      "method": "POST",
      "mode": "cors"
    });

    const result = await foo.json();

    result.data.tokens.forEach(t => {
      this.tokenCollector.add({
        symbol: t.symbol,
        address: t.id,
        decimals: parseInt(t.decimals),
      })
    });

    this.tokenCollector.save();
  }

  async updateTokensQuickswap() {
    const foo = await fetch("https://api.thegraph.com/subgraphs/name/sameepsi/quickswap06", {
        "credentials": "omit",
        "headers": {
          "User-Agent": "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:90.0) Gecko/20100101 Firefox/90.0",
          "Accept": "*/*",
          "Accept-Language": "de-DE,de;q=0.7,chrome://global/locale/intl.properties;q=0.3",
          "content-type": "application/json",
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "cross-site"
        },
        "referrer": "https://info.quickswap.exchange/",
        "body": "{\"operationName\":\"tokens\",\"variables\":{},\"query\":\"fragment TokenFields on Token {\\n  id\\n  name\\n  symbol\\n  derivedETH\\n  tradeVolume\\n  tradeVolumeUSD\\n  untrackedVolumeUSD\\n decimals\\n  totalLiquidity\\n  __typename\\n}\\n\\nquery tokens {\\n  tokens(first: 200, orderBy: tradeVolumeUSD, orderDirection: desc) {\\n    ...TokenFields\\n    __typename\\n  }\\n}\\n\"}",
        "method": "POST",
        "mode": "cors"
      });

    const result = await foo.json();

    result.data.tokens.forEach(t => {
      this.tokenCollector.add({
        symbol: t.symbol,
        address: t.id,
        decimals: parseInt(t.decimals),
      })
    });

    this.tokenCollector.save();
  }


  async updateTokens() {
    await Promise.allSettled([
      this.tokenMaps(),
      this.updateTokensQuickswap(),
      this.updateTokensSushiSwap(),
    ])

    const bPrices = await Promise.allSettled([
      this.updateCoinGeckoPrices(),
    ])

    const addresses = [];

    bPrices.filter(p => p.status === 'fulfilled').forEach(p => {
      p.value.forEach(item => {
        if (item.address) {
          this.priceCollector.add(item.address, item.price);
          addresses.push(item.address.toLowerCase())

        } else if (item.symbol) {
          // symbol resolve
          const address = this.tokenCollector.getAddressBySymbol(item.symbol);
          if (address) {
            this.priceCollector.add(address, item.price)
            addresses.push(address.toLowerCase())
          }
        }

        if (item.symbol) {
          this.priceCollector.addForSymbol(item.symbol, item.price)
        }
      })
    })

    this.priceCollector.save();

    let nativePrice = this.priceCollector.getPrice('0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270');

    const results = await Promise.allSettled([
      this.updateViaRouter(nativePrice),
    ]);

    results.filter(p => p.status === 'fulfilled').forEach(p => {
      p.value.forEach(item => {
        if (item.address && !addresses.includes(item.address.toLowerCase())) {
          this.priceCollector.add(item.address, item.price);
          this.priceCollector.addForSymbol(item.symbol, item.price);
        }
      })
    })

    await this.tokenCollector.save();
  }

  async getCoinGeckoTokens() {
    const cacheKey = `coingekko-polygon-v1-token-addresses`

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    const tokens = await this.jsonRequest('https://api.coingecko.com/api/v3/coins/list?include_platform=true');

    const matches = {};

    tokens.forEach(token => {
      if (token['platforms'] && token['platforms']['polygon-pos'] && token['platforms']['polygon-pos'].startsWith('0x')) {
        matches[token['id']] = token['platforms']['polygon-pos'];
      }
    })

    await this.cacheManager.set(cacheKey, matches, {ttl: 60 * 60})

    return matches
  }

  async updateCoinGeckoPrices() {
    const tokens = await this.getCoinGeckoTokens();

    const matches = [];

    for (let chunk of _.chunk(Object.keys(tokens), 100)) {
      const prices = await this.jsonRequest(`https://api.coingecko.com/api/v3/simple/price?ids=${chunk.join(',')}&vs_currencies=usd`);

      for (const [key, value] of Object.entries(prices)) {
        if (tokens[key] && value.usd && value.usd > 0.0000001 && value.usd < 10000000) {
          let item = {
            address: tokens[key].toLowerCase(),
            price: value.usd,
            source: 'coingecko',
          };

          const symbol = this.tokenCollector.getSymbolByAddress(tokens[key].toLowerCase());
          if (symbol) {
            item.symbol = symbol;
          }

          matches.push(item);
        }
      }
    }

    return matches
  }

  async fetch(lpAddress) {
    const v = lpAddress.map(address => {
      const vault = new Web3EthContract(lpAbi, address);
      return {
        totalSupply: vault.methods.totalSupply(),
        token0: vault.methods.token0(),
        token1: vault.methods.token1(),
        getReserves: vault.methods.getReserves(),
        decimals: vault.methods.decimals(),
        _address: address
      };
    });

    console.log("polygon: lp address update", lpAddress.length);

    const vaultCalls = await Utils.multiCall(v, 'polygon');

    const ercs = {};

    const managedLp = {};

    vaultCalls.forEach(v => {
      if (!v.getReserves) {
        console.log("polygon: Missing reserve:", v._address);
        return;
      }

      managedLp[v._address.toLowerCase()] = {
        address: v._address,
        totalSupply: v.totalSupply,
        reserve0: v.getReserves["0"],
        reserve1: v.getReserves["1"],
        token0: v.token0,
        token1: v.token1,
        decimals: v.decimals,
        raw: v
      };

      if (!ercs[v.token0]) {
        const vault = new Web3EthContract(erc20ABI, v.token0);
        ercs[v.token0] = {
          symbol: vault.methods.symbol(),
          decimals: vault.methods.decimals(),
          _token: v.token0
        };
      }

      if (!ercs[v.token1]) {
        const vault = new Web3EthContract(erc20ABI, v.token1);
        ercs[v.token1] = {
          symbol: vault.methods.symbol(),
          decimals: vault.methods.decimals(),
          _token: v.token1
        };
      }
    });

    const tokenAddressSymbol = {};

    const vaultCalls2 = await Utils.multiCall(Object.values(ercs), 'polygon');

    vaultCalls2.forEach(v => {
      tokenAddressSymbol[v._token.toLowerCase()] = {
        symbol: v.symbol,
        decimals: v.decimals
      };

      this.tokenCollector.add({
        address: v._token,
        symbol: v.symbol.toLowerCase(),
        decimals: v.decimals,
      })
    });

    Object.values(managedLp).forEach(c => {
      const reserve0 = new BigNumber(c.reserve0);
      const reserve1 = new BigNumber(c.reserve1);

      const token0 = tokenAddressSymbol[c.token0.toLowerCase()];
      const token1 = tokenAddressSymbol[c.token1.toLowerCase()];

      const token0Price = this.priceCollector.getPrice(c.token0, token0.symbol);
      const token1Price = this.priceCollector.getPrice(c.token1, token1.symbol);

      const pricesLpAddress = Object.freeze([
        {
          address: c.token0.toLowerCase(),
          symbol: token0.symbol.toLowerCase(),
          amount: (c.reserve0 * 10 ** (c.decimals - token0.decimals)) / c.totalSupply
        },
        {
          address: c.token1.toLowerCase(),
          symbol: token1.symbol.toLowerCase(),
          amount: (c.reserve1 * 10 ** (c.decimals - token1.decimals)) / c.totalSupply
        }
      ]);

      this.lpTokenCollector.add(c.address, pricesLpAddress);

      if (!token0Price || !token1Price) {
        console.log("polygon: Missing price:", token0.symbol.toLowerCase(), token0Price, token1.symbol.toLowerCase(), token1Price);

        return;
      }

      let x0 = reserve0.toNumber() / (10 ** token0.decimals);
      let x1 = reserve1.toNumber() / (10 ** token1.decimals);

      let x0p = x0 * token0Price
      let x1p = x1 * token1Price

      const number = (x0p + x1p) / c.totalSupply * (10 ** c.decimals);
      if (number <= 0) {
        console.log("polygon: Missing lp price:", token0.symbol.toLowerCase(), token1.symbol.toLowerCase());

        return;
      }

      this.priceCollector.add(c.address, number)
    });

    this.lpTokenCollector.save();
    this.priceCollector.save();
  }

  async tokenMaps() {
    const tokens = {};

    let response = await this.jsonRequest('https://api.1inch.exchange/v3.0/137/tokens');

    Object.values(response.tokens).forEach(t => {
      if (t.symbol && t.address && t.decimals) {
        const symbol = t.symbol.toLowerCase();
        tokens[t.address.toLowerCase()] = symbol;

        this.tokenCollector.add({
          symbol: t.symbol,
          address: t.address,
          decimals: parseInt(t.decimals),
        })
      }
    })

    return tokens;
  }

  async updateViaRouter(nativePrice) {
    if (!nativePrice) {
      throw Error('Invalid native price')
    }

    const tokens = [
      {
        router: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff', // quickswap
        address: '0x5f1657896B38c4761dbc5484473c7A7C845910b6',
        symbol: 'pswamp',
        decimals: 18,
      },
      {
        router: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff', // quickswap
        address: '0xb82A20B4522680951F11c94c54B8800c1C237693',
        symbol: 'honor',
        decimals: 18,
      },
      {
        router: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff', // quickswap
        address: '0x7f426f6dc648e50464a0392e60e1bb465a67e9cf',
        symbol: 'pauto',
        decimals: 18,
      },
      {
        router: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff', // quickswap
        address: '0xacd7b3d9c10e97d0efa418903c0c7669e702e4c0',
        symbol: 'ele',
        decimals: 18,
      },
      {
        router: '0x5C6EC38fb0e2609672BDf628B1fD605A523E5923', // jetswap
        address: '0x845E76A8691423fbc4ECb8Dd77556Cb61c09eE25',
        symbol: 'pwings',
        decimals: 18,
      },
      {
        router: '0xC0788A3aD43d79aa53B09c2EaCc313A787d1d607', // apeswap
        address: '0x76bF0C28e604CC3fE9967c83b3C3F31c213cfE64',
        symbol: 'crystl',
        decimals: 18,
      },
      {
        router: '0xC0788A3aD43d79aa53B09c2EaCc313A787d1d607', // apeswap
        address: '0x5d47baba0d66083c52009271faf3f50dcc01023c',
        symbol: 'banana',
        decimals: 18,
      },
      {
        router: '0x94930a328162957FF1dd48900aF67B5439336cBD', // polycat
        address: '0xbc5b59ea1b6f8da8258615ee38d40e999ec5d74f',
        symbol: 'paw',
        decimals: 18,
      },
    ];

    const calls = tokens.map(t => {
      const contract = new Web3EthContract(UniswapRouter, t.router);
      return {
        decimals: t.decimals.toString(),
        symbol: t.symbol,
        address: t.address,
        amountsOut: contract.methods.getAmountsOut(new BigNumber(1e18), ['0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', t.address]),
      };
    })

    const vaultCalls = await Utils.multiCall(calls, 'polygon');

    const prices = [];

    vaultCalls.forEach(call => {
      const inNative = call.amountsOut[1] / (10 ** call.decimals);
      const usdPrice = nativePrice / inNative;

      prices.push({
        address: call.address,
        symbol: call.symbol.toLowerCase(),
        price: usdPrice,
        source: 'router',
      });
    });

    return prices;
  }

  getLpSplits(farm, yieldFarm) {
    let isLpSplitFarm = farm.extra
      && farm.extra.lpAddress
      && yieldFarm.deposit
      && yieldFarm.deposit.amount;

    if (isLpSplitFarm) {
      const lpSplitAddressPrices = this.lpTokenCollector.get(farm.extra.lpAddress);

      if (lpSplitAddressPrices && lpSplitAddressPrices.tokens) {
        return lpSplitAddressPrices.tokens.map(i => {
          return {
            symbol: i.symbol,
            amount: i.amount * yieldFarm.deposit.amount
          };
        });
      }
    }

    return [];
  }
};
