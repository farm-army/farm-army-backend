const _ = require("lodash");

const BigNumber = require("bignumber.js");
const Utils = require("../../utils");
const Web3EthContract = require("web3-eth-contract");

const UniswapRouter = require("../../abi/uniswap_router.json");
const erc20ABI = require("../../platforms/bsc/pancake/abi/erc20.json");
const lpAbi = require("../../abi/lpAbi.json");

const fetch = require("node-fetch");


// https://api.coingecko.com/api/v3/simple/token_price/polygon-pos?contract_addresses=0xD6DF932A45C0f255f85145f286eA0b292B21C90B,0x385Eeac5cB85A38A9a07A70c73e0a3271CfB54A7,0xc3FdbadC7c795EF1D6Ba111e06fF8F16A20Ea539,0x9a71012B13CA4d3D0Cdc72A177DF3ef03b0E76A3,0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39,0x8505b9d2254A7Ae468c0E9dd10Ccea3A837aef5c,0x172370d5Cd63279eFa6d502DAB29171933a610AF,0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063,0x85955046DF4668e1DD369D2DE9f3AEB98DD2A369,0x2a93172c8DCCbfBC60a39d56183B7279a2F647b4,0xC8A94a3d3D2dabC3C1CaffFFDcA6A7543c3e3e65,0x5FFD62D3C3eE2E81C00A7b9079FB248e7dF024A8,0xa3Fa99A148fA48D14Ed51d610c367C61876997F1,0xF501dd45a1198C2E1b5aEF5314A68B9006D842E0,0x282d8efCe846A88B159800bd4130ad77443Fa1A1,0x263534a4Fe3cb249dF46810718B7B612a30ebbff,0x580A84C73811E1839F75d86d75d88cCa0c241fF4,0x831753DD7087CaC61aB5644b308642cc1c33Dc13,0x0b3F868E0BE5597D5DB7fEB59E1CADBb0fdDa50a,0x50B728D8D964fd00C2d0AAD81718b71311feF68a,0xdF7837DE1F2Fa4631D716CF2502f8b230F1dcc32,0xc2132D05D31c914a87C6611C10748AEb04B58e8F,0x5fe2B58c013d7601147DcdD68C143A77499f5531,0x3066818837c5e6eD6601bd5a91B0762877A6B731,0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174,0xb33EaAd8d922B1083446DC23f610c2567fB5180f,0x87ff96aba480f1813aF5c780387d8De7cf7D8261,0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6,0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619,0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270,0xDBf31dF14B66535aF65AaC99C32e9eA844e14501,0xDA537104D6A5edd53c6fBba9A898708E465260b6,0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE&vs_currencies=usd


module.exports = class PolygonPriceOracle {
  constructor(tokenCollector, lpTokenCollector, priceCollector, cacheManager, priceFetcher) {
    this.tokenCollector = tokenCollector;
    this.lpTokenCollector = lpTokenCollector;
    this.priceCollector = priceCollector;
    this.cacheManager = cacheManager;
    this.priceFetcher = priceFetcher;

    this.ignoreLp = [];
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

  async updateTokensSushiSwap() {
    const foo = await Utils.request('POST', "https://api.thegraph.com/subgraphs/name/sushiswap/matic-exchange", {
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
      "mode": "cors"
    });

    let result = {}
    try {
      result = JSON.parse(foo);
    } catch (e) {
      console.log('error sushiswap/matic-exchange', e.methods)
    }

    (result?.data?.tokens || []).forEach(t => {
      this.tokenCollector.add({
        symbol: t.symbol,
        address: t.id,
        decimals: parseInt(t.decimals),
      })
    });

    this.tokenCollector.save();
  }

  async updateTokensQuickswap() {
    const foo = await Utils.request("POST", "https://api.thegraph.com/subgraphs/name/sameepsi/quickswap06", {
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
        "mode": "cors"
      });

    let result = {}
    try {
      result = JSON.parse(foo);
    } catch (e) {
      console.log('error sameepsi/quickswap06', e.methods)
    }

    result.data.tokens.forEach(t => {
      this.tokenCollector.add({
        symbol: t.symbol,
        address: t.id,
        decimals: parseInt(t.decimals),
      })
    });

    this.tokenCollector.save();
  }

  async updatePrice(address, price) {
    if (!address.startsWith('0x')) {
      console.log("polygon: Invalid updatePrice:", address, price);
      return;
    }

    this.priceCollector.add(address, price);
  }

  async updateTokens() {
    (await Promise.allSettled([
      this.tokenMaps(),
      this.updateTokensQuickswap(),
      this.updateTokensSushiSwap(),
    ])).forEach(p => {
      if (p.status !== 'fulfilled') {
        console.error('polygon updateTokens error', p.reason)
      }
    });

    const bPrices = (await Promise.allSettled([
      this.updateCoinGeckoPrices(),
    ]))

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
    const usdcPrice = this.priceCollector.getPrice('0x2791bca1f2de4661ed88a30c99a7a9449aa84174');

    const results = await Promise.allSettled([
      this.updateViaRouter(nativePrice, usdcPrice),
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

    const tokens = await this.priceFetcher.getCoinGeckoTokens();

    const matches = {};

    const known = {
      'impermax': '0x60bB3D364B765C497C8cE50AE0Ae3f0882c5bD05',
      'binancecoin': '0x3BA4c387f786bFEE076A58914F5Bd38d668B42c3',
      'bzx-protocol': '0x54cFe73f2c7d0c4b62Ab869B473F5512Dc0944D2',
    };

    tokens.forEach(token => {
      if (token['platforms'] && token['platforms']['polygon-pos'] && token['platforms']['polygon-pos'].startsWith('0x')) {
        matches[token['id']] = token['platforms']['polygon-pos'];
      } else if (known[token['id']]) {
        matches[token['id']] = known[token['id']];
      }
    })

    await this.cacheManager.set(cacheKey, matches, {ttl: 60 * 60})

    return matches
  }

  async updateCoinGeckoPrices() {
    const tokens = await this.getCoinGeckoTokens();

    const matches = [];

    for (let chunk of _.chunk(Object.keys(tokens), 75)) {
      const prices = await this.priceFetcher.requestCoingeckoThrottled(`https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(chunk.join(','))}&vs_currencies=usd`);

      for (const [key, value] of Object.entries(prices || [])) {
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

  async onFetchDone() {
    const cache = await this.cacheManager.get('ignore-tokens-missing-reserves-v1');
    if (cache) {
      return;
    }

    await this.cacheManager.set('ignore-tokens-missing-reserves-v1', _.uniq(this.ignoreLp), {ttl: 60 * 60});

    this.ignoreLp = [];
  }

  async fetch(lpAddress) {
    const ignoreLp = _.clone((await this.cacheManager.get('ignore-tokens-missing-reserves-v1')) || []);

    const v = lpAddress
      .filter(address => !ignoreLp.includes(address.toLowerCase()))
      .map(address => {
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

    const vaultCalls = await Utils.multiCall(v, 'polygon');

    const ercs = {};

    const managedLp = {};

    const tokenAddressSymbol = {};

    vaultCalls.forEach(call => {
      if (call.token0) {
        const token = this.tokenCollector.getTokenByAddress(call.token0.toLowerCase());
        if (token) {
          tokenAddressSymbol[call.token0.toLowerCase()] = {
            symbol: token.symbol,
            decimals: token.decimals
          }
        }
      }

      if (call.token1) {
        const token = this.tokenCollector.getTokenByAddress(call.token1.toLowerCase());
        if (token) {
          tokenAddressSymbol[call.token1.toLowerCase()] = {
            symbol: token.symbol,
            decimals: token.decimals
          }
        }
      }
    });

    vaultCalls.forEach(v => {
      if (!v.getReserves) {
        console.log("polygon: Missing reserve:", v._address);

        if (!this.ignoreLp.includes(v._address.toLowerCase())) {
          this.ignoreLp.push(v._address.toLowerCase());
        }

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

      if (v.token0 && !(ercs[v.token0.toLowerCase()] || tokenAddressSymbol[v.token0.toLowerCase()])) {
        const vault = new Web3EthContract(erc20ABI, v.token0);
        ercs[v.token0.toLowerCase()] = {
          symbol: vault.methods.symbol(),
          decimals: vault.methods.decimals(),
          _token: v.token0
        };
      }

      if (v.token1 && !(ercs[v.token1.toLowerCase()] || tokenAddressSymbol[v.token1.toLowerCase()])) {
        const vault = new Web3EthContract(erc20ABI, v.token1);
        ercs[v.token1.toLowerCase()] = {
          symbol: vault.methods.symbol(),
          decimals: vault.methods.decimals(),
          _token: v.token1
        };
      }
    });

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

      let token0Price = this.priceCollector.getPrice(c.token0, token0.symbol);
      let token1Price = this.priceCollector.getPrice(c.token1, token1.symbol);

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
        if (token0Price && !token1Price) {
          const reserveUsd = (c.reserve0 / (10 ** token0.decimals)) * token0Price;
          token1Price = reserveUsd / (c.reserve1 / (10 ** token1.decimals));

          if (Utils.isDevMode()) {
            console.log("polygon: Missing price 'token1' guessed:", token0.symbol.toLowerCase(), token0Price, token1.symbol.toLowerCase(), token1Price);
          }
        } else if (token1Price && !token0Price) {
          const reserveUsd = (c.reserve1 / (10 ** token1.decimals)) * token1Price;
          token0Price = reserveUsd / (c.reserve0 / (10 ** token0.decimals));

          if (Utils.isDevMode()) {
            console.log("polygon: Missing price 'token0' guessed:", token0.symbol.toLowerCase(), token0Price, token1.symbol.toLowerCase(), token1Price);
          }
        }
      }

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
    this.tokenCollector.save();
  }

  async tokenMaps() {
    const tokens = {};

    const response = await Utils.requestJsonGet('https://api.1inch.exchange/v3.0/137/tokens');

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

  async updateViaRouter(nativePrice, usdcPrice) {
    if (!nativePrice) {
      throw Error('Invalid native price')
    }

    const pricesTarget = {
      '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270': nativePrice,
      '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174': usdcPrice,
    };

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
        router: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff', // quickswap
        address: '0x2ed945Dc703D85c80225d95ABDe41cdeE14e1992',
        symbol: 'sage',
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
      {
        router: '0x9055682e58c74fc8ddbfc55ad2428ab1f96098fc', // cafeswap
        address: '0xb5106A3277718eCaD2F20aB6b86Ce0Fee7A21F09',
        symbol: 'pbrew',
        decimals: 18,
      },
      {
        router: '0x9055682e58c74fc8ddbfc55ad2428ab1f96098fc', // cafeswap
        address: '0xb01371072fdcb9b4433b855e16a682b461f94ab3',
        symbol: 'mocha',
        decimals: 18,
      },
      {
        router: '0x3a1D87f206D12415f5b0A33E786967680AAb4f6d', // waultswap
        address: '0xb8ab048D6744a276b2772dC81e406a4b769A5c3D',
        source: {
          address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
          decimals: 6
        }, // usdc
        symbol: 'wusd',
        decimals: 18,
      },
    ];

    const calls = tokens.map(t => {
      const contract = new Web3EthContract(UniswapRouter, t.router);

      const sourceAddress = t?.source?.address || '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270';
      const sourceDecimals = t?.source?.decimals || 18;

      return {
        decimals: t.decimals.toString(),
        symbol: t.symbol,
        address: t.address,
        sourceAddress: sourceAddress,
        amountsOut: contract.methods.getAmountsOut(new BigNumber(10 ** sourceDecimals), [sourceAddress, t.address]),
      };
    })

    const vaultCalls = await Utils.multiCall(calls, 'polygon');

    const prices = [];

    vaultCalls.forEach(call => {
      if (!call.amountsOut || !call.amountsOut[1] || !pricesTarget[call.sourceAddress]) {
        return;
      }

      const inNative = call.amountsOut[1] / (10 ** call.decimals);
      const usdPrice = pricesTarget[call.sourceAddress] / inNative;

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
