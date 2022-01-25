const Web3EthContract = require("web3-eth-contract");
const LP_TOKEN_ABI = require("../abi/curve_lp_token.json");
const NERVE_LP_TOKEN_ABI = require("../abi/nerve/lp_abi.json");
const NERVE_ERC20_TOKEN_ABI = require("../abi/nerve/erc20_abi.json");

const Utils = require("../utils");

module.exports = {
  async getPoolPrices(addresses, chain, priceOracle, tokenCollector) {
    const tokens = addresses.map(address => {
      const token = new Web3EthContract(LP_TOKEN_ABI, address);

      return {
        lpToken: address,
        totalSupply: token.methods.totalSupply(),
        decimals: token.methods.decimals(),
        minter: token.methods.minter(),
        token0: token.methods.coins(0),
        token1: token.methods.coins(1),
        token2: token.methods.coins(2),
        token3: token.methods.coins(3),
        token4: token.methods.coins(4),
        token5: token.methods.coins(5),
      }
    });

    const result = await Utils.multiCall(tokens, chain);

    const ts = [];

    const minters = [];

    result.forEach(r => {
      if (r.token0) {
        ts.push({
          address: r.lpToken,
          decimals: r.decimals,
          totalSupply: r.totalSupply,
          owner: r.lpToken,
          tokens: [r.token0, r.token1, r.token2, r.token3, r.token4, r.token5].filter(i => i),
        });
      } else if (r.minter) {
        const token = new Web3EthContract(LP_TOKEN_ABI, r.minter);

        minters.push({
          lpToken: r.lpToken,
          decimals: r.decimals,
          totalSupply: r.totalSupply,
          owner: r.minter,
          token0: token.methods.coins(0),
          token1: token.methods.coins(1),
          token2: token.methods.coins(2),
          token3: token.methods.coins(3),
          token4: token.methods.coins(4),
          token5: token.methods.coins(5),
        });
      }
    });

    const mi = await Utils.multiCall(minters, chain);
    mi.forEach(r => {
      if (r.token0) {
        ts.push({
          address: r.lpToken,
          decimals: r.decimals,
          totalSupply: r.totalSupply,
          owner: r.owner,
          tokens: [r.token0, r.token1, r.token2, r.token3, r.token4, r.token5].filter(i => i),
        });
      }
    });

    const calls = [];

    ts.map(t => {
      t.tokens.forEach((address, index) => {
        calls.push({
          address: t.address,
          decimals: t.decimals,
          totalSupply: t.totalSupply,
          token: address,
          index: index.toString(),
          balanceOf: new Web3EthContract(LP_TOKEN_ABI, address).methods.balanceOf(t.owner),
        });
      });
    })

    const resultaaa = await Utils.multiCall(calls, chain);

    const fin = {};

    resultaaa.forEach(r => {
      if (!fin[r.address]) {
        fin[r.address] = {
          address: r.address,
          decimals: r.decimals,
          totalSupply: r.totalSupply,
          tokens: [],
        };
      }

      fin[r.address].tokens.push({
        balance: r.balanceOf,
        address: r.token,
        index: r.index,
      });
    });

    const prices = {};

    Object.values(fin).forEach(g => {
      let tvlUsd = 0;
      for (const token of g.tokens) {
        const price = priceOracle.findPrice(token.address);
        if (!price) {
          tvlUsd = 0;
          break;
        }

        const decimals = tokenCollector.getDecimals(token.address);
        tvlUsd += (token.balance / (10 ** decimals)) * price;
      }

      if (tvlUsd > 0) {
        prices[g.address.toLowerCase()] = tvlUsd / g.totalSupply * (10 ** g.decimals);
      }
    });

    if (!prices['0x0fa949783947Bf6c1b171DB13AEACBB488845B3f'.toLowerCase()]) {
      prices['0x0fa949783947Bf6c1b171DB13AEACBB488845B3f'.toLowerCase()] = 1;
    }

    return prices;
  },

  async nerveSynapse(addresses, chain, priceOracle, tokenCollector) {
    const erc20Tokens = await Utils.multiCall(addresses.map(address => {
      const token = new Web3EthContract(NERVE_ERC20_TOKEN_ABI, address);

      return {
        lpToken: address,
        totalSupply: token.methods.totalSupply(),
        decimals: token.methods.decimals(),
        minter: token.methods.owner(),
      }
    }), chain);

    const tokens = erc20Tokens.map(erc20Token => {
      const token = new Web3EthContract(NERVE_LP_TOKEN_ABI, erc20Token.minter);

      return {
        lpToken: erc20Token.lpToken,
        totalSupply: erc20Token.totalSupply,
        decimals: erc20Token.decimals,
        owner: erc20Token.minter,
        token0: token.methods.getToken(0),
        token1: token.methods.getToken(1),
        token2: token.methods.getToken(2),
        token3: token.methods.getToken(3),
        token4: token.methods.getToken(4),
        token5: token.methods.getToken(5),
      }
    });

    const result = await Utils.multiCall(tokens, chain);

    const ts = [];

    result.forEach(r => {
      ts.push({
        address: r.lpToken,
        decimals: r.decimals,
        totalSupply: r.totalSupply,
        owner: r.owner,
        tokens: [r.token0, r.token1, r.token2, r.token3, r.token4, r.token5].filter(i => i),
      });
    });

    const calls = [];

    ts.map(t => {
      t.tokens.forEach((address, index) => {
        const web3EthContract = new Web3EthContract(LP_TOKEN_ABI, address);
        calls.push({
          address: t.address,
          decimals: t.decimals,
          totalSupply: t.totalSupply,
          token: address,
          index: index.toString(),
          balanceOf: web3EthContract.methods.balanceOf(t.owner),
          symbol: web3EthContract.methods.symbol(),
        });
      });
    })

    const resultaaa = await Utils.multiCall(calls, chain);

    const fin = {};

    resultaaa.forEach(r => {
      if (!fin[r.address.toLowerCase()]) {
        fin[r.address.toLowerCase()] = {
          address: r.address,
          decimals: r.decimals,
          totalSupply: r.totalSupply,
          tokens: [],
        };
      }

      fin[r.address.toLowerCase()].tokens.push({
        balance: r.balanceOf,
        address: r.token,
        index: r.index,
        symbol: r.symbol,
      });
    });

    const prices = {};

    Object.values(fin).forEach(g => {
      let tvlUsd = 0;
      for (const token of g.tokens) {
        let price = priceOracle.findPrice(token.address);

        if (token.symbol.toLowerCase() === 'nusd') {
          price = 1;
        }

        if (!price) {
          tvlUsd = 0;
          break;
        }

        const decimals = tokenCollector.getDecimals(token.address);
        tvlUsd += (token.balance / (10 ** decimals)) * price;
      }

      if (tvlUsd > 0) {
        prices[g.address.toLowerCase()] = tvlUsd / g.totalSupply * (10 ** g.decimals);

        priceOracle.updatePrice(g.address.toLowerCase(), prices[g.address.toLowerCase()]);
      }
    });

    return fin;
  },

  async getPoolPricesViaHttp(chain, priceOracle, lpTokenCollector) {
    const result = await Utils.requestJsonGet('https://api.curve.fi/api/getFactoryV2Pools-' + chain);

    (result?.data?.poolData || []).forEach(item => {
      if (!item.totalSupply || !item.usdTotal || !item.address) {
        return;
      }

      const totalSupply = item.totalSupply / 1e18;
      const usdTotal = item.usdTotal;

      const price = usdTotal / totalSupply;

      priceOracle.updatePrice(item.address.toLowerCase(), price);

      if (item.coins) {
        const tokens = item.coins.map(c => {
          return {
            address: c.address.toLowerCase(),
            symbol: c.symbol.toLowerCase().replaceAll('+', '-'),
            amount: (c.poolBalance / (10 ** c.decimals)) / totalSupply
          };
        });

        lpTokenCollector.add(item.address.toLowerCase(), tokens);
      }
    });
  },
}
