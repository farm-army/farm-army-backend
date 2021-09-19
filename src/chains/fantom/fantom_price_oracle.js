const _ = require("lodash");

const BigNumber = require("bignumber.js");
const request = require("async-request");
const Utils = require("../../utils");
const Web3EthContract = require("web3-eth-contract");

const UniswapRouter = require("../../abi/uniswap_router.json");
const erc20ABI = require("../../platforms/pancake/abi/erc20.json");
const lpAbi = require("../../lpAbi.json");

module.exports = class FantomPriceOracle {
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
    const foo = await Utils.request('POST', "https://api.thegraph.com/subgraphs/name/sushiswap/fantom-exchange", {
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

    const result = JSON.parse(foo);

    result.data.tokens.forEach(t => {
      this.tokenCollector.add({
        symbol: t.symbol,
        address: t.id,
        decimals: parseInt(t.decimals),
      })
    });

    this.tokenCollector.save();
  }

  async updateTokensSpiritswap(ftmPrice) {
    const foo = await Utils.request("https://api.thegraph.com/subgraphs/name/layer3org/spiritswap-analytics", {
      "headers": {
        "accept": "*/*",
        "accept-language": "en-US,en;q=0.9",
        "content-type": "application/json",
        "sec-ch-ua": "\" Not A;Brand\";v=\"99\", \"Chromium\";v=\"92\"",
        "sec-ch-ua-mobile": "?0",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site"
      },
      "referrer": "https://info.spiritswap.finance/",
      "referrerPolicy": "strict-origin-when-cross-origin",
      "body": "{\"operationName\":\"tokens\",\"variables\":{},\"query\":\"fragment TokenFields on Token {\\n  id\\n  name\\n  symbol\\n decimals\\n derivedFTM\\n  tradeVolume\\n  tradeVolumeUSD\\n  untrackedVolumeUSD\\n  totalLiquidity\\n  txCount\\n  __typename\\n}\\n\\nquery tokens {\\n  tokens(first: 100, orderBy: tradeVolumeUSD, orderDirection: desc) {\\n    ...TokenFields\\n    __typename\\n  }\\n}\\n\"}",
      "method": "POST",
      "mode": "cors",
      "credentials": "omit"
    });

    const result = JSON.parse(foo);

    const prices = [];

    result.data.tokens.forEach((t, index) => {
      this.tokenCollector.add({
        symbol: t.symbol,
        address: t.id,
        decimals: parseInt(t.decimals),
      })

      if (index < 50 && t.derivedFTM && ftmPrice && t.derivedFTM > 0) {
        prices.push({
          address: t.id,
          symbol: t.symbol.toLowerCase(),
          price: t.derivedFTM * ftmPrice,
          source: 'spiritswap',
        });
      }
    });

    this.tokenCollector.save();

    return prices;
  }

  async updateTokens() {
    (await Promise.allSettled([
      this.tokenMaps(),
      this.updateTokensSushiSwap(),
    ])).forEach(p => {
      if (p.status !== 'fulfilled') {
        console.error('fantom updateTokens error', p.reason)
      }
    });

    let nativePrice = this.priceCollector.getPrice('0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83');

    const bPrices = await Promise.allSettled([
      this.updateTokensSpiritswap(nativePrice),
      this.updateCoinGeckoPrices(),
    ]);

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

    nativePrice = this.priceCollector.getPrice('0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83');

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
    const cacheKey = `coingekko-fantom-v2-token-addresses`

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    const tokens = await Utils.requestJsonGet('https://api.coingecko.com/api/v3/coins/list?include_platform=true', 50);

    const matches = {};

    const known = {
      'binance-usd': '0xc931f61b1534eb21d8c11b24f3f5ab2471d4ab50',
      'dai': '0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e',
      'tether': '0x049d68029688eabf473097a2fc38ef61633a3c7a',
    };

    (tokens || []).forEach(token => {
      if (token['platforms'] && token['platforms']['fantom'] && token['platforms']['fantom'].startsWith('0x')) {
        matches[token['id']] = token['platforms']['fantom'];
      } else if(known[token['id']]) {
        matches[token['id']] = known[token['id']];
      }
    })

    await this.cacheManager.set(cacheKey, matches, {ttl: 60 * 60})

    return matches
  }

  async updateCoinGeckoPrices() {
    const tokens = await this.getCoinGeckoTokens();

    const matches = [];

    const tokensRaw = await Utils.multiCall(_.uniq(Object.values(tokens)).map(address => {
      const web3EthContract = new Web3EthContract(erc20ABI, address);

      return {
        address: address,
        symbol: web3EthContract.methods.symbol(),
        decimals: web3EthContract.methods.decimals(),
      }
    }), 'fantom');

    tokensRaw.forEach(token => {
      if (!token.decimals && parseInt(token.decimals) > 0) {
        return;
      }

      this.tokenCollector.add({
        address: token.address.toLowerCase(),
        symbol: token.symbol.toLowerCase(),
        decimals: parseInt(token.decimals),
      })
    });

    this.tokenCollector.save();

    for (let chunk of _.chunk(Object.keys(tokens), 50)) {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const prices = await Utils.requestJsonGet(`https://api.coingecko.com/api/v3/simple/price?ids=${chunk.join(',')}&vs_currencies=usd`, 50);

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

    console.log("fantom: lp address update", lpAddress.length);

    const vaultCalls = await Utils.multiCall(v, 'fantom');

    const ercs = {};

    const managedLp = {};

    vaultCalls.forEach(v => {
      if (!v.getReserves) {
        console.log("fantom: Missing reserve:", v._address);
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

    const vaultCalls2 = await Utils.multiCall(Object.values(ercs), 'fantom');

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
        console.log("fantom: Missing price:", token0.symbol.toLowerCase(), token0Price, token1.symbol.toLowerCase(), token1Price);

        return;
      }

      let x0 = reserve0.toNumber() / (10 ** token0.decimals);
      let x1 = reserve1.toNumber() / (10 ** token1.decimals);

      let x0p = x0 * token0Price
      let x1p = x1 * token1Price

      const number = (x0p + x1p) / c.totalSupply * (10 ** c.decimals);
      if (number <= 0) {
        console.log("fantom: Missing lp price:", token0.symbol.toLowerCase(), token1.symbol.toLowerCase());

        return;
      }

      this.priceCollector.add(c.address, number)
    });

    this.lpTokenCollector.save();
    this.priceCollector.save();
  }

  async tokenMaps() {
    return [];
  }

  async updateViaRouter(nativePrice) {
    if (!nativePrice) {
      throw Error('fantom: Invalid native price')
    }

    const tokens = [
      {
        router: '0xf491e7b69e4244ad4002bc14e878a34207e38c29', // spookyswap
        address: '0x841FAD6EAe12c286d1Fd18d1d525DFfA75C7EFFE',
        symbol: 'boo',
        decimals: 18,
      },
      {
        router: '0x16327e3fbdaca3bcf7e38f5af2599d2ddc33ae52', // spiritswap
        address: '0x5cc61a78f164885776aa610fb0fe1257df78e59b',
        symbol: 'spirit',
        decimals: 18,
      },
      {
        router: '0x53c153a0df7e050bbefbb70ee9632061f12795fb', // hyperjump
        address: '0x0575f8738efda7f512e3654f277c77e80c7d2725',
        symbol: 'ori',
        decimals: 18,
      },
    ];

    const calls = tokens.map(t => {
      const contract = new Web3EthContract(UniswapRouter, t.router);
      return {
        decimals: t.decimals.toString(),
        symbol: t.symbol,
        address: t.address,
        amountsOut: contract.methods.getAmountsOut(new BigNumber(1e18), ['0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83', t.address]),
      };
    })

    const vaultCalls = await Utils.multiCall(calls, 'fantom');

    const prices = [];

    vaultCalls.forEach(call => {
      const inNative = call.amountsOut[1] / 10 ** call.decimals;
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
