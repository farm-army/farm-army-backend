const _ = require("lodash");
const fs = require("fs");
const path = require("path");

const BigNumber = require("bignumber.js");
const Utils = require("./utils");
const Web3EthContract = require("web3-eth-contract");

const FulcrumLendingTokenAbi = require("./abi/fulcrum_lending_tokens.json");
const UniswapRouter = require("./abi/uniswap_router.json");

const erc20ABI = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "platforms/pancake/abi/erc20.json"), "utf8")
);
const lpAbi = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "lpAbi.json"), "utf8")
);

const fetch = require("node-fetch");

module.exports = class PriceOracle {
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

  async updatePrice(address, price) {
    if (!address.startsWith('0x')) {
      console.log("bsc: Invalid updatePrice:", address, price);
      return;
    }

    this.priceCollector.add(address, price);
  }

  async updateTokens() {
    await this.tokenMaps();

    const bPrices = await Promise.allSettled([
      this.getCoingeckoPrices(),
      this.getBeefyPrices(),
      this.updateFulcrumTokens(),
      this.updateCoinGeckoPrices(),
    ])

    const addresses = [];

    bPrices.filter(p => p.status === 'fulfilled').forEach(p => {
      p.value.forEach(item => {
        if (item.address) {
          this.priceCollector.add(item.address, item.price);
          addresses.push(item.address.toLowerCase())

        } else if(item.symbol) {
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

    let bnbPrice = this.priceCollector.getPrice('bnb');

    const results = await Promise.allSettled([
      this.updateViaRouter(bnbPrice),
      this.updateTokensVswap(),
      this.updateTokensBakery(),
      this.inchPricesAsBnb(bnbPrice),
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
    const cacheKey = `coingekko-v1-token-addresses`

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    const tokens = await this.priceFetcher.getCoinGeckoTokens();

    const matches = {};

    (tokens || []).forEach(token => {
      if (token['platforms'] && token['platforms']['binance-smart-chain'] && token['platforms']['binance-smart-chain'].startsWith('0x')) {
        matches[token['id']] = token['platforms']['binance-smart-chain'];
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
        if(tokens[key] && value.usd && value.usd > 0.0000001 && value.usd < 10000000) {
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

  async getBeefyPrices() {
    const results = await Promise.allSettled([
      Utils.requestJsonGet('https://api.beefy.finance/prices'),
      Utils.requestJsonGet('https://api.beefy.finance/lps'),
    ]);

    const prices = [];

    results.filter(p => p.status === 'fulfilled').forEach(p => {
      for (const [symbol, price] of Object.entries(p.value)) {
        if (symbol.toLowerCase() === 'btcst' || price > 500000 || price < 0.00000001) {
          continue;
        }

        prices.push({
          symbol: symbol.toLowerCase(),
          source: 'beefy',
          price: price
        });
      }
    })

    return prices;
  }

  async getCoingeckoPrices() {
    // extra some important one
    const maps = {
      'bearn-fi': 'bfi',
      'auto': 'auto',
      'pancakeswap-token': 'cake',
      'julswap': 'jul',
      'bakerytoken': 'bake',
      'burger-swap': 'burger',
      'kebab-token': 'kebab',
      'goose-finance': 'egg',
      'binancecoin': 'bnb',
    };

    const coingeckoTokens = await this.priceFetcher.requestCoingeckoThrottled(`https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(Object.keys(maps).join(','))}&vs_currencies=usd`);

    const prices = [];

    for (const [key, value] of Object.entries(coingeckoTokens)) {
      if (!value.usd) {
        continue;
      }

      if (maps[key.toLowerCase()]) {
        prices.push({
          symbol: maps[key.toLowerCase()],
          source: 'coingecko',
          price: value.usd
        });
      }
    }

    return prices;
  }

  async onFetchDone() {
    const cache = await this.cacheManager.get('ignore-tokens-missing-reserves-v2');
    if (cache) {
      return;
    }

    await this.cacheManager.set('ignore-tokens-missing-reserves-v2', _.uniq(this.ignoreLp), {ttl: 60 * 60});

    this.ignoreLp = [];
  }

  async fetch(lpAddress) {
    const ignoreLp = _.clone((await this.cacheManager.get('ignore-tokens-missing-reserves-v2')) || []);

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

    console.log("bsc: lp address update", lpAddress.length, v.length);

    const vaultCalls = await Utils.multiCall(v);

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
        console.log("bsc: Missing reserve:", v._address);

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

    const vaultCalls2 = await Utils.multiCall(Object.values(ercs));

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
        console.log("bsc: Missing price:", token0.symbol.toLowerCase(), token0Price, token1.symbol.toLowerCase(), token1Price);

        return;
      }

      let x0 = reserve0.toNumber() / (10 ** token0.decimals);
      let x1 = reserve1.toNumber() / (10 ** token1.decimals);

      let x0p = x0 * token0Price
      let x1p = x1 * token1Price

      const number = (x0p + x1p) / c.totalSupply * (10 ** c.decimals);
      if (number <= 0) {
        console.log("bsc: Missing lp price:", token0.symbol.toLowerCase(), token1.symbol.toLowerCase());

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

    Object.values(await Utils.requestJsonGet('https://tokens.1inch.exchange/v1.1/chain-56')).forEach(t => {
      if (t.symbol && t.address && t.decimals && !this.isBlocked(t)) {
        tokens[t.address.toLowerCase()] = t.symbol.toLowerCase();

        this.tokenCollector.add({
          symbol: t.symbol,
          address: t.address,
          decimals: parseInt(t.decimals),
        })
      }
    })

    const foo = await Utils.request("POST", "https://api.bscgraph.org/subgraphs/name/cakeswap", {
      credentials: "omit",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:85.0) Gecko/20100101 Firefox/85.0",
        Accept: "application/json",
        "Accept-Language": "en-US,en;q=0.5",
        "Content-Type": "application/json"
      },
      body:
        '{"query":"{\\n  tokens(first: 100, orderBy: tradeVolumeUSD, orderDirection: desc) {\\n    id,\\n    symbol, decimals,\\n    \\n  }\\n}\\n","variables":null,"operationName":null}',

      mode: "cors"
    });

    let result
    try {
      result = JSON.parse(foo);
    } catch (e) {
      console.error('cakeswap price fetch error', e.message)
      return [];
    }

    if (!result.data || !result.data.tokens) {
      console.error('cakeswap price fetch error')
      return [];
    }

    result.data.tokens.forEach(t => {
      tokens[t.id.toLowerCase()] = t.symbol.toLowerCase();

      this.tokenCollector.add({
        symbol: t.symbol,
        address: t.id,
        decimals: parseInt(t.decimals),
      })
    });

    return tokens;
  }

  isBlocked(t) {
    return (t.symbol.startsWith('cr') && t.name.startsWith('Cream'))
      || (t.symbol.startsWith('v') && t.name.startsWith('Venus'))
  }

  async inchPricesAsBnb(bnbPrice) {
    if (!bnbPrice) {
      return [];
    }

    let [tokens, pricesMap] = await Promise.all([
      Utils.requestJsonGet('https://tokens.1inch.exchange/v1.1/chain-56'),
      Utils.requestJsonGet('https://token-prices.1inch.exchange/v1.1/56'),
    ]);

    const prices = [];

    for (const [key, value] of Object.entries(pricesMap)) {
      let tokenInfo = tokens[key];

      if (tokenInfo && tokenInfo.decimals && tokenInfo.symbol && !['bnb', 'wbnb'].includes(tokenInfo.symbol.toLowerCase())) {
        if (this.isBlocked(tokenInfo)) {
          continue;
        }

        const price = (value / 10 ** 18) * bnbPrice;

        if (price > 1000000 || price < 0.0000000001) {
          // skipping invalid prices
          // console.log('1inch price issues:', tokens[key].symbol.toLowerCase(), price)
          continue
        }

        prices.push({
          address: key,
          symbol: tokenInfo.symbol.toLowerCase(),
          price: price,
          source: '1inch',
        });
      }
    }

    return prices;
  }

  async updateTokensVswap() {
    const foo = await Utils.request("POST", "https://api.bscgraph.org/subgraphs/name/vswap/exchange-pair", {
      headers: {
        accept: "*/*",
        "accept-language": "en-US,en;q=0.9",
        "content-type": "application/json",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site"
      },
      body: '{"operationName":"tokens","variables":{},"query":"fragment TokenFields on Token {\\n  id\\n  name\\n  symbol\\n  decimals\\n  tradeVolume\\n  tradeVolumeUSD\\n  totalLiquidity\\n  txCount\\n  priceUSD\\n  __typename\\n}\\n\\nquery tokens {\\n  tokens(first: 200, orderBy: tradeVolumeUSD, orderDirection: desc) {\\n    ...TokenFields\\n    __typename\\n  }\\n}\\n"}',
      mode: "cors"
    });

    let result
    try {
      result = JSON.parse(foo);
    } catch (e) {
      console.error('vswap price fetch error', e.message)
      return [];
    }

    const prices = [];
    result.data.tokens.forEach(t => {
      this.tokenCollector.add({
        symbol: t.symbol,
        address: t.id,
        decimals: parseInt(t.decimals),
      })

      // invalid
      if (t.symbol.toLowerCase() === 'seeds') {
        return;
      }

      if (t.priceUSD) {
        prices.push({
          address: t.id,
          symbol: t.symbol.toLowerCase(),
          price: t.priceUSD,
          source: 'vswap',
        });
      }
    });

    return prices;
  }

  async updateViaRouter(bnbPrice) {
    if (!bnbPrice) {
      throw Error('Invalid bnb price')
    }

    const tokens = [
      {
        router: '0x3a6d8cA21D1CF76F653A67577FA0D27453350dD8', // biswap
        address: '0x965f527d9159dce6288a2219db51fc6eef120dd1', // bsw
        symbol: 'bsw',
        decimals: 18,
      },
      {
        router: '0x34DBe8E5faefaBF5018c16822e4d86F02d57Ec27', // coinswap
        address: '0x3bc5798416c1122BcFd7cb0e055d50061F23850d',
        symbol: 'css',
        decimals: 18,
      },
      {
        router: '0x10ED43C718714eb63d5aA57B78B54704E256024E', // pancakeswap v2
        address: '0xc3EAE9b061Aa0e1B9BD3436080Dc57D2d63FEdc1',
        symbol: 'bear',
        decimals: 18,
      },
      {
        router: '0x10ED43C718714eb63d5aA57B78B54704E256024E', // pancakeswap v2
        address: '0x1A8d7AC01d21991BF5249A3657C97b2B6d919222',
        symbol: 'bee',
        decimals: 18,
      },
      {
        router: '0x10ED43C718714eb63d5aA57B78B54704E256024E', // pancakeswap v2
        address: '0x17B7163cf1Dbd286E262ddc68b553D899B93f526',
        symbol: 'qbt',
        decimals: 18,
      },
      {
        router: '0xB0EeB0632bAB15F120735e5838908378936bd484', // autoshark
        address: '0x1b219Aca875f8C74c33CFF9fF98f3a9b62fCbff5',
        symbol: 'fins',
        decimals: 18,
      }
    ];

    const calls = tokens.map(t => {
      const contract = new Web3EthContract(UniswapRouter, t.router);
      return {
        decimals: t.decimals.toString(),
        symbol: t.symbol,
        address: t.address,
        amountsOut: contract.methods.getAmountsOut(new BigNumber(1e18), ['0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c', t.address]),
      };
    })

    const vaultCalls = await Utils.multiCall(calls);

    const prices = [];

    vaultCalls.forEach(call => {
      const inBnb = call.amountsOut[1] / 10 ** call.decimals;
      const usdPrice = bnbPrice / inBnb;

      prices.push({
        address: call.address,
        symbol: call.symbol.toLowerCase(),
        price: usdPrice,
        source: 'router',
      });
    });

    return prices;
  }

  async updateFulcrumTokens() {
    const foo = await Utils.requestJsonGet('https://api.bzx.network/v1/lending-info?networks=bsc');

    const v = foo.data.bsc.map(token => {
      const vault = new Web3EthContract(FulcrumLendingTokenAbi, token.address);
      return {
        token: token.address,
        symbol: vault.methods.symbol(),
        tokenPrice: vault.methods.tokenPrice(),
        loanTokenAddress: vault.methods.loanTokenAddress(),
      };
    });

    const vaultCalls = await Utils.multiCallIndexBy('token', v);

    const prices = [];
    foo.data.bsc.forEach(token => {
      let vaultCall = vaultCalls[token.address];
      if (!vaultCall || !vaultCall.tokenPrice || !vaultCall.loanTokenAddress) {
        return;
      }

      this.tokenCollector.add({
        symbol: vaultCall.symbol,
        address: vaultCall.token,
        decimals: 18,
      })

      const loanTokenPrice = this.priceCollector.getPrice(vaultCall.loanTokenAddress);
      if (loanTokenPrice) {
        prices.push({
          address: vaultCall.token,
          symbol: vaultCall.symbol,
          price: loanTokenPrice * (vaultCall.tokenPrice / 1e18),
          source: 'fulcrum',
        });
      }
    })

    return prices;
  }

  async updateTokensBakery() {
    const foo = await Utils.request("POST", "https://api.bscgraph.org/subgraphs/name/bakeryswap", {
      headers: {
        accept: "application/json",
        "accept-language": "en-US,en;q=0.9",
        "content-type": "application/json",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin"
      },
      referrer:
        "https://api.bscgraph.org/subgraphs/name/bakeryswap/graphql?query=%7B%0A%20%20tokens(where%3A%20%7BtradeVolumeUSD_gt%3A%200%7D%2C%20first%3A%20100%2C%20orderBy%3A%20tradeVolumeUSD%2C%20orderDirection%3A%20desc)%20%7B%0A%20%20%20%20symbol%0A%20%20%20%20id%0A%20%20%20%20tokenDayData(first%3A%201%2C%20orderBy%3A%20date%2C%20orderDirection%3A%20desc)%20%7B%0A%20%20%20%20%20%20priceUSD%0A%20%20%20%20%20%20date%0A%20%20%20%20%7D%0A%20%20%20%20tradeVolumeUSD%0A%20%20%7D%0A%7D%0A",
      referrerPolicy: "strict-origin-when-cross-origin",
      body:
        '{"query":"{\\n  tokens(where: {tradeVolumeUSD_gt: 0}, first: 100, orderBy: tradeVolumeUSD, orderDirection: desc) {\\n    symbol\\n  decimals\\n    id\\n    tokenDayData(first: 1, orderBy: date, orderDirection: desc) {\\n      priceUSD\\n      date\\n    }\\n    tradeVolumeUSD\\n  }\\n}\\n","variables":null,"operationName":null}',
      mode: "cors",
      credentials: "omit"
    });

    let result
    try {
      result = JSON.parse(foo);
    } catch (e) {
      console.error('bakeryswap price fetch error', e.message)
      return [];
    }

    const prices = [];
    result.data.tokens.forEach(t => {
      this.tokenCollector.add({
        symbol: t.symbol,
        address: t.id,
        decimals: parseInt(t.decimals),
      })

      if (t.tokenDayData && t.tokenDayData[0] && t.tokenDayData[0].priceUSD) {
        const { priceUSD } = t.tokenDayData[0];

        if (priceUSD) {
          prices.push({
            address: t.id,
            symbol: t.symbol.toLowerCase(),
            price: priceUSD,
            source: 'bakery',
          });
        }
      }
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
