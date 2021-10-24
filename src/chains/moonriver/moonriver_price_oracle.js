const _ = require("lodash");

const BigNumber = require("bignumber.js");
const request = require("async-request");
const Utils = require("../../utils");
const Web3EthContract = require("web3-eth-contract");

const UniswapRouter = require("../../abi/uniswap_router.json");
const UniswapRouterWithFee = require("../../abi/uniswap_router_with_fee.json");
const erc20ABI = require("../../platforms/pancake/abi/erc20.json");
const lpAbi = require("../../lpAbi.json");

module.exports = class MoonriverPriceOracle {
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

  async jsonRequest(url) {
    const pancakeResponse = await request(url);
    return JSON.parse(pancakeResponse.body);
  }

  async updatePrice(address, price) {
    if (!address.startsWith('0x')) {
      console.log("moonriver: Invalid updatePrice:", address, price);
      return;
    }

    this.priceCollector.add(address, price);
  }

  async updateTokens() {
    await Promise.allSettled([
      this.tokenMaps(),
    ])

    let nativePrice = this.priceCollector.getPrice('0x98878B06940aE243284CA214f92Bb71a2b032B8A');

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

    nativePrice = this.priceCollector.getPrice('0x98878B06940aE243284CA214f92Bb71a2b032B8A');

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
    await this.priceCollector.save();
  }

  async getCoinGeckoTokens() {
    const cacheKey = `coingecko-moonriver-v6-token-addresses`

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
     // return cache;
    }

    const tokens = await this.priceFetcher.getCoinGeckoTokens();

    const matches = {};

    const known = {};

    tokens.forEach(token => {
      if (token['platforms'] && token['platforms']['moonriver'] && token['platforms']['moonriver'].startsWith('0x')) {
        if (!matches[token['id']]) {
          matches[token['id']] = [];
        }

        matches[token['id']].push(token['platforms']['moonriver']);
      }

      if(known[token['id']]) {
        if (!matches[token['id']]) {
          matches[token['id']] = [];
        }

        matches[token['id']].push(...known[token['id']]);
      }
    });

    for (const [key, value] of Object.entries(matches)) {
      matches[key] = _.uniqWith(value, (a, b) => a.toLowerCase() === b.toLowerCase());
    }

    await this.cacheManager.set(cacheKey, matches, {ttl: 60 * 60})

    return matches
  }

  async updateCoinGeckoPrices() {
    const tokens = await this.getCoinGeckoTokens();

    const matches = [];

    const addresses = _.uniqWith(Object.values(tokens).flat(), (a, b) => a.toLowerCase() === b.toLowerCase());

    const tokensRaw = await Utils.multiCall(addresses.map(address => {
      const web3EthContract = new Web3EthContract(erc20ABI, address);

      return {
        address: address,
        symbol: web3EthContract.methods.symbol(),
        decimals: web3EthContract.methods.decimals(),
      };
    }), 'moonriver');

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

    for (let chunk of _.chunk(Object.keys(tokens), 100)) {
      const prices = await this.priceFetcher.requestCoingeckoThrottled(`https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(chunk.join(','))}&vs_currencies=usd`);

      for (const [key, value] of Object.entries(prices || [])) {
        if (tokens[key] && value.usd && value.usd > 0.0000001 && value.usd < 10000000) {
          tokens[key].forEach(address => {
            const item = {
              address: address.toLowerCase(),
              price: value.usd,
              source: 'coingecko',
            };

            const symbol = this.tokenCollector.getSymbolByAddress(address.toLowerCase());
            if (symbol) {
              item.symbol = symbol;
            }

            matches.push(item);
          })
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

    console.log("moonriver: lp address update", lpAddress.length, v.length);

    const vaultCalls = await Utils.multiCall(v, 'moonriver');

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
        console.log("moonriver: Missing reserve:", v._address);

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

    const vaultCalls2 = await Utils.multiCall(Object.values(ercs), 'moonriver');

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
        console.log("moonriver: Missing price:", token0.symbol.toLowerCase(), token0Price, token1.symbol.toLowerCase(), token1Price);

        return;
      }

      let x0 = reserve0.toNumber() / (10 ** token0.decimals);
      let x1 = reserve1.toNumber() / (10 ** token1.decimals);

      let x0p = x0 * token0Price
      let x1p = x1 * token1Price

      const number = (x0p + x1p) / c.totalSupply * (10 ** c.decimals);
      if (number <= 0) {
        console.log("moonriver: Missing lp price:", token0.symbol.toLowerCase(), token1.symbol.toLowerCase());

        return;
      }

      this.priceCollector.add(c.address, number)
    });

    this.lpTokenCollector.save();
    this.priceCollector.save();
    this.tokenCollector.save();
  }

  async tokenMaps() {
    const cacheKey = 'moonriver-tokenlist'
    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return [];
    }

    const tokenLists = await Promise.allSettled([]);

    tokenLists.forEach(tokenListPromise => {
      (tokenListPromise?.value?.tokens || []).forEach(token => {
        if (!token.address || !token.symbol || !token.decimals || parseInt(token.chainId) !== 42220) {
          return;
        }

        this.tokenCollector.add({
          address: token.address.toLowerCase(),
          symbol: token.symbol.toLowerCase(),
          decimals: parseInt(token.decimals),
        })
      })
    });

    await this.cacheManager.set(cacheKey, 'cached', {ttl: 60 * 60 * 3})

    return [];
  }

  async updateViaRouter(nativePrice) {
    if (!nativePrice) {
      throw Error('moonriver: Invalid native price')
    }

    const pricesTarget = {
      '0x98878B06940aE243284CA214f92Bb71a2b032B8A': nativePrice,
      '0x9A92B5EBf1F6F6f7d93696FCD44e5Cf75035A756': this.priceCollector.getPrice('0x9A92B5EBf1F6F6f7d93696FCD44e5Cf75035A756'),
    };

    const tokens = [
      {
        router: '0xAA30eF758139ae4a7f798112902Bf6d65612045f', // solar
        address: '0x6bD193Ee6D2104F14F94E2cA6efefae561A4334B',
        symbol: 'solar',
        decimals: 18,
      },
      {
        router: '0xAA30eF758139ae4a7f798112902Bf6d65612045f', // solar
        address: '0xbD90A6125a84E5C512129D622a75CDDE176aDE5E',
        symbol: 'rib',
        decimals: 18,
      },
      {
        router: '0x2d4e873f9Ab279da9f1bb2c532d4F06f67755b77', // huckleberry
        address: '0x9A92B5EBf1F6F6f7d93696FCD44e5Cf75035A756',
        symbol: 'finn',
        decimals: 18,
      },
      {
        router: '0x2d4e873f9Ab279da9f1bb2c532d4F06f67755b77', // huckleberry
        address: '0x78F811A431D248c1EDcF6d95ec8551879B2897C3',
        symbol: 'btc',
        decimals: 8,
      },
      {
        router: '0x2d4e873f9Ab279da9f1bb2c532d4F06f67755b77', // huckleberry
        address: '0x576fDe3f61B7c97e381c94e7A03DBc2e08Af1111',
        symbol: 'eth',
        decimals: 18,
      },
      {
        router: '0x2d4e873f9Ab279da9f1bb2c532d4F06f67755b77', // huckleberry
        address: '0x748134b5f553f2bcbd78c6826de99a70274bdeb3',
        symbol: 'usdc',
        decimals: 6,
        source: {
          address: '0x9A92B5EBf1F6F6f7d93696FCD44e5Cf75035A756',
          decimals: 18
        }, // finn
      },
      {
        router: '0x2d4e873f9Ab279da9f1bb2c532d4F06f67755b77', // huckleberry
        address: '0x9D5bc9B873AeD984e2B6A64d4792249D68BbA2Fe',
        symbol: 'xrp',
        decimals: 6,
        source: {
          address: '0x9A92B5EBf1F6F6f7d93696FCD44e5Cf75035A756',
          decimals: 18
        }, // finn
      },
      {
        router: '0x2d4e873f9Ab279da9f1bb2c532d4F06f67755b77', // huckleberry
        address: '0x15b9ca9659f5dff2b7d35a98dd0790a3cbb3d445',
        symbol: 'dot',
        decimals: 10,
        source: {
          address: '0x9A92B5EBf1F6F6f7d93696FCD44e5Cf75035A756',
          decimals: 18
        }, // finn
      },
      {
        router: '0x2d4e873f9Ab279da9f1bb2c532d4F06f67755b77', // huckleberry
        address: '0xe936caa7f6d9f5c9e907111fcaf7c351c184cda7',
        symbol: 'usdt',
        decimals: 6,
      },
      {
        router: '0x2d4e873f9Ab279da9f1bb2c532d4F06f67755b77', // huckleberry
        address: '0x41562ae242d194247389152aCAa7a9397136b09F',
        symbol: 'wan',
        decimals: 18,
      },
      {
        router: '0x120999312896F36047fBcC44AD197b7347F499d6', // moonfarm
        address: '0xb497c3e9d27ba6b1fea9f1b941d8c79e66cfc9d6',
        symbol: 'moon',
        decimals: 18,
      },
    ];

    const calls = tokens.map(t => {
      const abi = t.router === '0xAA30eF758139ae4a7f798112902Bf6d65612045f'
        ? UniswapRouterWithFee
        : UniswapRouter;

      const sourceAddress = t?.source?.address || '0x98878B06940aE243284CA214f92Bb71a2b032B8A';
      const sourceDecimals = t?.source?.decimals || 18;

      const contract = new Web3EthContract(abi, t.router);
      return {
        decimals: t.decimals.toString(),
        symbol: t.symbol,
        address: t.address,
        sourceAddress: sourceAddress,
        amountsOut: t.router === '0xAA30eF758139ae4a7f798112902Bf6d65612045f'
          ? contract.methods.getAmountsOut(new BigNumber(10 ** sourceDecimals), [sourceAddress, t.address], 0)
          : contract.methods.getAmountsOut(new BigNumber(10 ** sourceDecimals), [sourceAddress, t.address])
      };
    })

    const vaultCalls = await Utils.multiCall(calls, 'moonriver');

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
