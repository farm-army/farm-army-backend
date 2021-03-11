const _ = require("lodash");
const fs = require("fs");
const path = require("path");

const Web3 = require("web3");
const BigNumber = require("bignumber.js");
const request = require("async-request");
const Utils = require("./utils");

const erc20ABI = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "platforms/pancake/abi/erc20.json"), "utf8")
);
const lpAbi = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "lpAbi.json"), "utf8")
);

const pricesAddress = {};
const pricesLpAddressMap = {};
const allPrices = {};
const fetch = require("node-fetch");

const myManagedLp = [];

//   const tokenPairContract = await new web3.eth.Contract(ERC20, lpToken.address);
//   const token0Contract = await new web3.eth.Contract(ERC20, lpToken.lp0.address);
//   const token1Contract = await new web3.eth.Contract(ERC20, lpToken.lp1.address);
//
//   let [totalSupply, reserve0, reserve1, token0Price, token1Price] = await Promise.all([
//     tokenPairContract.methods.totalSupply().call(),
//     token0Contract.methods.balanceOf(lpToken.address).call(),
//     token1Contract.methods.balanceOf(lpToken.address).call(),
//     fetchPrice({ oracle: lpToken.lp0.oracle, id: lpToken.lp0.oracleId }),
//     fetchPrice({ oracle: lpToken.lp1.oracle, id: lpToken.lp1.oracleId }),
//   ]);
//
//   reserve0 = new BigNumber(reserve0);
//   reserve1 = new BigNumber(reserve1);
//
//   const token0StakedInUsd = reserve0.div(lpToken.lp0.decimals).times(token0Price);
//   const token1StakedInUsd = reserve1.div(lpToken.lp1.decimals).times(token1Price);
//
//   const totalStakedInUsd = token0StakedInUsd.plus(token1StakedInUsd);
//   const lpTokenPrice = totalStakedInUsd.dividedBy(totalSupply).times(lpToken.decimals);
//
//   return Number(lpTokenPrice);

const tokenMaps = {
  "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c": "bnb",
  "0xf952fc3ca7325cc27d15885d37117676d25bfda6": "egg",
  "0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82": "cake",
  "0x250632378E573c6Be1AC2f97Fcdf00515d0Aa91B": "beth",
  "0xc1edcc306e6faab9da629efca48670be4678779d": "mdg"
};

module.exports = class PriceOracle {
  constructor(services) {
    this.services = services;
  }

  async update() {
    for (const chunk of _.chunk(myManagedLp, 75)) {
      await this.fetch(chunk);
    }
  }

  addLps(addresses) {
    addresses.forEach(a => {
      const a1 = a.toLowerCase();

      if (!myManagedLp.includes(a)) {
        myManagedLp.push(a1);
      }
    });
  }

  async cronInterval() {
    const lps = (await Promise.all(this.services.getPlatforms().getFunctionAwaits('getLbAddresses'))).flat()
    await this.updateTokens();

    await Promise.all(
      _.chunk(_.uniq(lps), 75).map(chunk => {
        return this.fetch(chunk);
      })
    );

    this.addLps(lps);
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
      if (addressOrToken.startsWith("0x")) {
        return this.getAddressPrice(addressOrToken);
      }

      let tokenLowerCase = addressOrToken.toLowerCase();
      if (allPrices[tokenLowerCase]) {
        return allPrices[tokenLowerCase];
      }

      // flip token0 and token1
      if (tokenLowerCase.includes('-') && tokenLowerCase.split('-').length === 2) {
        const [t0, t1] = tokenLowerCase.split("-");
        return allPrices[`${t1}-${t0}`] || undefined;
      }
    }

    return undefined;
  }

  getAddressPrice(address) {
    if (
      tokenMaps[address.toLowerCase()] &&
      allPrices[tokenMaps[address.toLowerCase()]]
    ) {
      return allPrices[tokenMaps[address.toLowerCase()]];
    }

    if (tokenMaps[address] && allPrices[tokenMaps[address]]) {
      return allPrices[tokenMaps[address]];
    }

    return pricesAddress[address.toLowerCase()] || undefined;
  }

  getAllPrices() {
    return allPrices;
  }

  getAllAddressPrices() {
    return pricesAddress;
  }

  getAllLpAddressInfo() {
    return pricesLpAddressMap;
  }

  getAddressSymbolMap() {
    return tokenMaps;
  }

  getLpToken0Token1SplitAmount(address, amount) {
    if (!pricesLpAddressMap[address.toLowerCase()]) {
      return;
    }

    return pricesLpAddressMap[address.toLowerCase()].map(i => {
      return {
        address: i.address,
        symbol: i.symbol,
        amount: i.amount * amount
      };
    });
  }

  async jsonRequest(url) {
    const pancakeResponse = await request(url);
    return JSON.parse(pancakeResponse.body);
  }

  async updateTokens() {
    await this.tokenMaps();

    // most useful
    const pancakeTokens = await this.jsonRequest("https://api.pancakeswap.finance/api/v1/price");
    for (const [key, value] of Object.entries(pancakeTokens.prices)) {
      allPrices[key.toLowerCase()] = value;
    }

    // extra some important one
    const coingeckoTokens = await this.jsonRequest("https://api.coingecko.com/api/v3/simple/price?ids=julswap,burger-swap,pancakeswap-token,auto,bunny,bakerytoken,kebab-token,bearn-fi&vs_currencies=usd");
    for (const [key, value] of Object.entries(coingeckoTokens)) {
      if (!value.usd) {
        continue;
      }

      if (key.toLowerCase() === "bearn-fi") {
        allPrices.bfi = value.usd;
      } else if (key.toLowerCase() === "auto") {
        allPrices[key.toLowerCase()] = value.usd;
      } else if (key.toLowerCase() === "pancakeswap-token") {
        allPrices.cake = value.usd;
      } else if (key.toLowerCase() === "julswap") {
        allPrices.jul = value.usd;
      } else if (key.toLowerCase() === "bearn-fi") {
        allPrices.bfi = value.usd;
      } else if (key.toLowerCase() === "auto") {
        allPrices.auto = value.usd;
      } else if (key.toLowerCase() === "bakerytoken") {
        allPrices.bake = value.usd;
      } else if (key.toLowerCase() === "burger-swap") {
        allPrices.burger = value.usd;
      } else if (key.toLowerCase() === "kebab-token") {
        allPrices.kebab = value.usd;
      }
    }

    // some remapping
    if (allPrices.eth) {
      allPrices.beth = allPrices.eth;
    }

    if (allPrices.wbnb) {
      allPrices.bnb = allPrices.wbnb;
    }

    // basically for lp prices; as fallback
    const urls = Object.values({
      bakery: "https://api.beefy.finance/bakery/price",
      bakeryLp: "https://api.beefy.finance/bakery/lps",
      bdollarLp: "https://api.beefy.finance/bdollar/lps",
      jetfuelLp: "https://api.beefy.finance/jetfuel/lps",
      kebabLp: "https://api.beefy.finance/kebab/lps",
      monsterLp: "https://api.beefy.finance/monster/lps",
      narwhalLp: "https://api.beefy.finance/narwhal/lps",
      nyanswopLp: "https://api.beefy.finance/nyanswop/lps",
      pancakeLp: "https://api.beefy.finance/pancake/lps",
      thugsLp: "https://api.beefy.finance/thugs/lps",
      spongeLp: "https://api.beefy.finance/sponge/lps",
      ramenLp: "https://api.beefy.finance/ramen/lps",
      boltLp: "https://api.beefy.finance/bolt/lps",
      cafeLp: "https://api.beefy.finance/cafe/lps"
    });

    for (const url of urls) {
      let response;

      try {
        response = await this.jsonRequest(url);
      } catch (e) {
        console.error(`skip price url: ${url}`, e.message);
        continue;
      }

      for (const [key, value] of Object.entries(response)) {
        allPrices[key.toLowerCase()] = value;
      }
    }

    await Promise.all([
      this.updateTokensVswap(),
      this.updateTokensBakery()
    ]);
  }

  async fetch(lpAddress) {
    const web3 = new Web3("https://bsc-dataseed.binance.org/");

    const v = lpAddress.map(address => {
      const vault = new web3.eth.Contract(lpAbi, address);
      return {
        totalSupply: vault.methods.totalSupply(),
        token0: vault.methods.token0(),
        token1: vault.methods.token1(),
        getReserves: vault.methods.getReserves(),
        decimals: vault.methods.decimals(),
        _address: address
      };
    });

    console.log("lp address update", lpAddress.length);

    const vaultCalls = await Utils.multiCall(v);

    const ercs = {};

    const managedLp = {};

    vaultCalls.forEach(v => {
      if (!v.getReserves) {
        console.log("Missing reserve:", v._address);
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
        const vault = new web3.eth.Contract(erc20ABI, v.token0);
        ercs[v.token0] = {
          symbol: vault.methods.symbol(),
          decimals: vault.methods.decimals(),
          _token: v.token0
        };
      }

      if (!ercs[v.token1]) {
        const vault = new web3.eth.Contract(erc20ABI, v.token1);
        ercs[v.token1] = {
          symbol: vault.methods.symbol(),
          decimals: vault.methods.decimals(),
          _token: v.token1
        };
      }
    });

    const tokenAddressSymbol = {};

    const vaultCalls2 = await Utils.multiCall(Object.values(ercs));

    vaultCalls2.forEach(v => {
      tokenAddressSymbol[v._token.toLowerCase()] = {
        symbol: v.symbol,
        decimals: v.decimals
      };
    });

    Object.values(managedLp).forEach(c => {
      const reserve0 = new BigNumber(c.reserve0);
      const reserve1 = new BigNumber(c.reserve1);

      const token0 = tokenAddressSymbol[c.token0.toLowerCase()];
      const token1 = tokenAddressSymbol[c.token1.toLowerCase()];

      const token0Price = allPrices[token0.symbol.toLowerCase()];
      const token1Price = allPrices[token1.symbol.toLowerCase()];

      pricesLpAddressMap[c.address.toLowerCase()] = [
        {
          address: c.token0.toLowerCase(),
          symbol: token0.symbol.toLowerCase(),
          amount:
            (c.reserve0 * 10 ** (c.decimals - token0.decimals)) / c.totalSupply
        },
        {
          address: c.token1.toLowerCase(),
          symbol: token1.symbol.toLowerCase(),
          amount:
            (c.reserve1 * 10 ** (c.decimals - token1.decimals)) / c.totalSupply
        }
      ];

      if (!token0Price || !token1Price) {
        console.log(
          "Missing price:",
          token0.symbol.toLowerCase(),
          token0Price,
          token1.symbol.toLowerCase(),
          token1Price
        );
        return;
      }

      // TODO: decimals must be equal; eg see "10 ** (c.decimals - token0.decimals))"

      const token0StakedInUsd = reserve0
        .div(token0.decimals)
        .times(token0Price);
      const token1StakedInUsd = reserve1
        .div(token1.decimals)
        .times(token1Price);

      const totalStakedInUsd = token0StakedInUsd.plus(token1StakedInUsd);
      const lpTokenPrice = totalStakedInUsd
        .dividedBy(c.totalSupply)
        .times(c.decimals);

      const number = Number(lpTokenPrice);
      if (number <= 0) {
        console.log(
          "Missing lp price:",
          token0.symbol.toLowerCase(),
          token1.symbol.toLowerCase()
        );
        return;
      }

      pricesAddress[c.address.toLowerCase()] = number;
    });
  }

  async tokenMaps() {
    const foo = await fetch(
      "https://api.bscgraph.org/subgraphs/name/cakeswap",
      {
        credentials: "omit",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:85.0) Gecko/20100101 Firefox/85.0",
          Accept: "application/json",
          "Accept-Language": "en-US,en;q=0.5",
          "Content-Type": "application/json"
        },
        body:
          '{"query":"{\\n  tokens(first: 100, orderBy: tradeVolumeUSD, orderDirection: desc) {\\n    id,\\n    symbol,\\n    \\n  }\\n}\\n","variables":null,"operationName":null}',
        method: "POST",
        mode: "cors"
      }
    );

    const result = await foo.json();

    const tokens = {};
    result.data.tokens.forEach(t => {
      const symbol = t.symbol.toLowerCase();
      tokens[t.id.toLowerCase()] = symbol;

      tokenMaps[t.id.toLowerCase()] = symbol;
    });

    return tokens;
  }

  async updateTokensVswap() {
    const foo = await fetch(
      "https://api.bscgraph.org/subgraphs/name/vswap/exchange-pair",
      {
        headers: {
          accept: "*/*",
          "accept-language": "en-US,en;q=0.9",
          "content-type": "application/json",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "cross-site"
        },
        body:
          '{"operationName":"tokens","variables":{},"query":"fragment TokenFields on Token {\\n  id\\n  name\\n  symbol\\n  tradeVolume\\n  tradeVolumeUSD\\n  totalLiquidity\\n  txCount\\n  priceUSD\\n  __typename\\n}\\n\\nquery tokens {\\n  tokens(first: 200, orderBy: tradeVolumeUSD, orderDirection: desc) {\\n    ...TokenFields\\n    __typename\\n  }\\n}\\n"}',
        method: "POST",
        mode: "cors"
      }
    );

    const result = await foo.json();

    const tokens = {};
    result.data.tokens.forEach(t => {
      const symbol = t.symbol.toLowerCase();
      tokens[t.id.toLowerCase()] = symbol;

      tokenMaps[t.id.toLowerCase()] = symbol;

      if (t.priceUSD && !pricesAddress[t.id.toLowerCase()]) {
        pricesAddress[t.id.toLowerCase()] = t.priceUSD;
      }

      if (t.priceUSD && !allPrices[t.symbol.toLowerCase()]) {
        allPrices[t.symbol.toLowerCase()] = t.priceUSD;
      }
    });

    return tokens;
  }

  async updateTokensBakery() {
    const foo = await fetch(
      "https://api.bscgraph.org/subgraphs/name/bakeryswap",
      {
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
          '{"query":"{\\n  tokens(where: {tradeVolumeUSD_gt: 0}, first: 100, orderBy: tradeVolumeUSD, orderDirection: desc) {\\n    symbol\\n    id\\n    tokenDayData(first: 1, orderBy: date, orderDirection: desc) {\\n      priceUSD\\n      date\\n    }\\n    tradeVolumeUSD\\n  }\\n}\\n","variables":null,"operationName":null}',
        method: "POST",
        mode: "cors",
        credentials: "omit"
      }
    );

    const result = await foo.json();

    const tokens = {};
    result.data.tokens.forEach(t => {
      const symbol = t.symbol.toLowerCase();
      tokens[t.id.toLowerCase()] = symbol;

      tokenMaps[t.id.toLowerCase()] = symbol;

      if (t.tokenDayData && t.tokenDayData[0] && t.tokenDayData[0].priceUSD) {
        const { priceUSD } = t.tokenDayData[0];

        if (!pricesAddress[t.id.toLowerCase()]) {
          pricesAddress[t.id.toLowerCase()] = priceUSD;
        }

        if (!allPrices[t.symbol.toLowerCase()]) {
          allPrices[t.symbol.toLowerCase()] = priceUSD;
        }
      }
    });

    return tokens;
  }

  getLpSplits(farm, yieldFarm) {
    let isLpSplitFarm = farm.extra
        && farm.extra.lpAddress
        && yieldFarm.deposit
        && yieldFarm.deposit.amount;

    if (isLpSplitFarm) {
      const lpSplitAddressPrices = this.getLpToken0Token1SplitAmount(
          farm.extra.lpAddress,
          yieldFarm.deposit.amount
      );

      if (lpSplitAddressPrices) {
        return lpSplitAddressPrices.map(i => {
          return {
            symbol: i.symbol,
            amount: i.amount
          };
        });
      }
    }

    return [];
  }
};
