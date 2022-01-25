const _ = require("lodash");

const BigNumber = require("bignumber.js");
const request = require("async-request");
const Utils = require("../../utils");
const Web3EthContract = require("web3-eth-contract");

const UniswapRouter = require("../../abi/uniswap_router.json");
const erc20ABI = require("../../platforms/bsc/pancake/abi/erc20.json");
const lpAbi = require("../../abi/lpAbi.json");

module.exports = class KccPriceOracle {
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
      console.log("kcc: Invalid updatePrice:", address, price);
      return;
    }

    this.priceCollector.add(address, price);
  }

  async updateTokens() {
    await Promise.allSettled([
      this.tokenMaps(),
    ])

    let nativePrice = this.priceCollector.getPrice('0x4446fc4eb47f2f6586f9faab68b3498f86c07521');

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

    nativePrice = this.priceCollector.getPrice('0x4446fc4eb47f2f6586f9faab68b3498f86c07521');

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
    const cacheKey = `coingekko-kcc-v1-token-addresses`

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    const tokens = await this.priceFetcher.getCoinGeckoTokens();

    const matches = {};

    tokens.forEach(token => {
      if (token['platforms'] && token['platforms']['kucoin-community-chain'] && token['platforms']['kucoin-community-chain'].startsWith('0x')) {
        matches[token['id']] = token['platforms']['kucoin-community-chain'];
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
    }), 'kcc');

    tokensRaw.forEach(token => {
      if (!token.symbol || !token.decimals || parseInt(token.decimals) <= 0) {
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

    const vaultCalls = await Utils.multiCall(v, 'kcc');

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
        console.log("kcc: Missing reserve:", v._address);

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

    const vaultCalls2 = await Utils.multiCall(Object.values(ercs), 'kcc');

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
            console.log("kcc: Missing price 'token1' guessed:", token0.symbol.toLowerCase(), token0Price, token1.symbol.toLowerCase(), token1Price);
          }
        } else if (token1Price && !token0Price) {
          const reserveUsd = (c.reserve1 / (10 ** token1.decimals)) * token1Price;
          token0Price = reserveUsd / (c.reserve0 / (10 ** token0.decimals));

          if (Utils.isDevMode()) {
            console.log("kcc: Missing price 'token0' guessed:", token0.symbol.toLowerCase(), token0Price, token1.symbol.toLowerCase(), token1Price);
          }
        }
      }

      if (!token0Price || !token1Price) {
        console.log("kcc: Missing price:", token0.symbol.toLowerCase(), token0Price, token1.symbol.toLowerCase(), token1Price);

        return;
      }

      let x0 = reserve0.toNumber() / (10 ** token0.decimals);
      let x1 = reserve1.toNumber() / (10 ** token1.decimals);

      let x0p = x0 * token0Price
      let x1p = x1 * token1Price

      const number = (x0p + x1p) / c.totalSupply * (10 ** c.decimals);
      if (number <= 0) {
        console.log("kcc: Missing lp price:", token0.symbol.toLowerCase(), token1.symbol.toLowerCase());

        return;
      }

      this.priceCollector.add(c.address, number)
    });

    this.lpTokenCollector.save();
    this.priceCollector.save();
    this.tokenCollector.save();
  }

  async tokenMaps() {
    return [];
  }

  async updateViaRouter(nativePrice) {
    if (!nativePrice) {
      throw Error('kcc: Invalid native price')
    }

    const tokens = [
      {
        router: '0xA58350d6dEE8441aa42754346860E3545cc83cdA', // kuswap
        address: '0x0039f574ee5cc39bdd162e9a88e3eb1f111baf48',
        symbol: 'usdt',
        decimals: 18,
      },
      {
        router: '0xA58350d6dEE8441aa42754346860E3545cc83cdA', // kuswap
        address: '0x980a5afef3d17ad98635f6c5aebcbaeded3c3430',
        symbol: 'usdc',
        decimals: 18,
      },
      {
        router: '0xA58350d6dEE8441aa42754346860E3545cc83cdA', // kuswap
        address: '0xe3f5a90f9cb311505cd691a46596599aa1a0ad7d',
        symbol: 'busd',
        decimals: 18,
      },
      {
        router: '0xA58350d6dEE8441aa42754346860E3545cc83cdA', // kuswap
        address: '0xc9baa8cfdde8e328787e29b4b078abf2dadc2055',
        symbol: 'dai',
        decimals: 18,
      },
      {
        router: '0xA58350d6dEE8441aa42754346860E3545cc83cdA', // kuswap
        address: '0xf55af137a98607f7ed2efefa4cd2dfe70e4253b1',
        symbol: 'eth',
        decimals: 18,
      },
      {
        router: '0xA58350d6dEE8441aa42754346860E3545cc83cdA', // kuswap
        address: '0x218c3c3d49d0e7b37aff0d8bb079de36ae61a4c0',
        symbol: 'btc',
        decimals: 8,
      },
      {
        router: '0xA58350d6dEE8441aa42754346860E3545cc83cdA', // kuswap
        address: '0x639a647fbe20b6c8ac19e48e2de44ea792c62c5c',
        symbol: 'bnb',
        decimals: 18,
      },
      {
        router: '0xA58350d6dEE8441aa42754346860E3545cc83cdA', // kuswap
        address: '0x516f50028780b60e2fe08efa853124438f9e46a7',
        symbol: 'kafe',
        decimals: 18,
      },
      {
        router: '0x6074e20633d2d8fbdf82119867a81581cabe06dd', // kudex
        address: '0xbd451b952de19f2c7ba2c8c516b0740484e953b2',
        symbol: 'kud',
        decimals: 18,
      },
      {
        router: '0xF742609f4cafEEf624816E309D770222aA8a55CC', // boneswap
        address: '0x6c1b568a1d7fb33de6707238803f8821e9472539',
        symbol: 'bone',
        decimals: 18,
      },
      {
        router: '0x8c8067ed3bC19ACcE28C1953bfC18DC85A2127F7', // MojitoSwap
        address: '0x2ca48b4eea5a731c2b54e7c3944dbdb87c0cfb6f',
        symbol: 'mjt',
        decimals: 18,
      },
    ];

    const calls = tokens.map(t => {
      const contract = new Web3EthContract(UniswapRouter, t.router);
      return {
        decimals: t.decimals.toString(),
        symbol: t.symbol,
        address: t.address,
        amountsOut: contract.methods.getAmountsOut(new BigNumber(1e18), ['0x4446fc4eb47f2f6586f9faab68b3498f86c07521', t.address]),
      };
    })

    const vaultCalls = await Utils.multiCall(calls, 'kcc');

    const prices = [];

    vaultCalls.forEach(call => {
      const inNative = call.amountsOut[1] / 10 ** call.decimals;
      const usdPrice = nativePrice / inNative * 1.01; // 0.1 % fee

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
