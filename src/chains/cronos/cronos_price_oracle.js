const _ = require("lodash");

const BigNumber = require("bignumber.js");
const request = require("async-request");
const Utils = require("../../utils");
const Web3EthContract = require("web3-eth-contract");

const UniswapRouter = require("../../abi/uniswap_router.json");
const UniswapRouterWithFee = require("../../abi/uniswap_router_with_fee.json");
const erc20ABI = require("../../platforms/bsc/pancake/abi/erc20.json");
const lpAbi = require("../../abi/lpAbi.json");

module.exports = class CronosPriceOracle {
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
      console.log("cronos: Invalid updatePrice:", address, price);
      return;
    }

    this.priceCollector.add(address, price);
  }

  async updateTokens() {
    await Promise.allSettled([
      this.tokenMaps(),
    ])

    let nativePrice = this.priceCollector.getPrice('0x5C7F8A570d578ED84E63fdFA7b1eE72dEae1AE23');

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

    nativePrice = this.priceCollector.getPrice('0x5C7F8A570d578ED84E63fdFA7b1eE72dEae1AE23');

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
    const cacheKey = `coingecko-cronos-v9-token-addresses`

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    const tokens = await this.priceFetcher.getCoinGeckoTokens();

    const matches = {};

    const known = {
      'crypto-com-chain': ['0x5C7F8A570d578ED84E63fdFA7b1eE72dEae1AE23'],
      'ethereum': ['0xe44Fd7fCb2b1581822D0c862B68222998a0c299a'],
      'usd-coin': ['0xc21223249CA28397B4B6541dfFaEcC539BfF0c59'],
      'tether': ['0x66e428c3f67a68878562e79a0234c1f83c208770'],
      'bitcoin': ['0x062E66477Faf219F25D27dCED647BF57C3107d52'],
      'dai': ['0xF2001B145b43032AAF5Ee2884e456CCd805F677D'],
      'magic-internet-money': ['0x2BC472832Eb20C65F82d6A869db845aB0C0099ba'],
      'mimatic': ['0x1c965D8E53fb1a448789e2B0FA5abc3EB2c36993'],
      'matic-network': ['0xad79AC3c5a5c15C6B9194F5568e451b3fc3C2B40'],
      'binance-usd': ['0x6aB6d61428fde76768D7b45D8BFeec19c6eF91A8'],
      'avalanche-2': ['0x765277EebeCA2e31912C9946eAe1021199B39C61'],
      'binancecoin': ['0xfA9343C3897324496A05fC75abeD6bAC29f8A40f'],
      'fantom': ['0xB44a9B6905aF7c801311e8F4E76932ee959c663C'],
    };

    tokens.forEach(token => {
      if (token['platforms'] && token['platforms']['cronos'] && token['platforms']['cronos'].startsWith('0x')) {
        if (!matches[token['id']]) {
          matches[token['id']] = [];
        }

        matches[token['id']].push(token['platforms']['cronos']);
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
    }), 'cronos');

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

    console.log("cronos: lp address update", lpAddress.length, v.length);

    const vaultCalls = await Utils.multiCall(v, 'cronos');

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
        console.log("cronos: Missing reserve:", v._address);

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

    const vaultCalls2 = await Utils.multiCall(Object.values(ercs), 'cronos');

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
        console.log("cronos: Missing price:", token0.symbol.toLowerCase(), token0Price, token1.symbol.toLowerCase(), token1Price);

        return;
      }

      let x0 = reserve0.toNumber() / (10 ** token0.decimals);
      let x1 = reserve1.toNumber() / (10 ** token1.decimals);

      let x0p = x0 * token0Price
      let x1p = x1 * token1Price

      const number = (x0p + x1p) / c.totalSupply * (10 ** c.decimals);
      if (number <= 0) {
        console.log("cronos: Missing lp price:", token0.symbol.toLowerCase(), token1.symbol.toLowerCase());

        return;
      }

      this.priceCollector.add(c.address, number)
    });

    this.lpTokenCollector.save();
    this.priceCollector.save();
    this.tokenCollector.save();
  }

  async tokenMaps() {
    const cacheKey = 'cronos-tokenlist'
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
      throw Error('cronos: Invalid native price')
    }

    const tokens = [
      {
        router: '0x145863Eb42Cf62847A6Ca784e6416C1682b1b2Ae', // vvs
        address: '0x2d03bece6747adc00e1a131bba1469c15fd11e03',
        symbol: 'vvs',
        decimals: 18,
      },
      {
        router: '0xcd7d16fB918511BF7269eC4f48d61D79Fb26f918', // cronaswap
        address: '0xadbd1231fb360047525BEdF962581F3eee7b49fe',
        symbol: 'crona',
        decimals: 18,
      },
      {
        router: '0xeC0A7a0C2439E8Cb67b992b12ecd020Ea943c7Be', // crodex
        address: '0xe243CCab9E66E6cF1215376980811ddf1eb7F689',
        symbol: 'crx',
        decimals: 18,
      },
    ];

    const calls = tokens.map(t => {
      const contract = new Web3EthContract(UniswapRouter, t.router);
      return {
        decimals: t.decimals.toString(),
        symbol: t.symbol,
        address: t.address,
        amountsOut: contract.methods.getAmountsOut(new BigNumber(1e18), ['0x5C7F8A570d578ED84E63fdFA7b1eE72dEae1AE23', t.address]),
      };
    })

    const vaultCalls = await Utils.multiCall(calls, 'cronos');

    const prices = [];

    vaultCalls.forEach(call => {
      if (!call?.amountsOut || !call.amountsOut[1]) {
        return;
      }

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
