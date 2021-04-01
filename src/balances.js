"use strict";

const ABI = require("./platforms/beefy/abi/abi");
const utils = require("./utils");
const Web3EthContract = require("web3-eth-contract");
const _ = require("lodash");

module.exports = class Balances {
  constructor(cache, priceOracle) {
    this.cache = cache;
    this.priceOracle = priceOracle;
  }

  async getAllLpTokenBalances(address) {
    const cacheKey = `allLpTokenBalances-address-${address}`;

    const cacheItem = this.cache.get(cacheKey);
    if (cacheItem) {
      return cacheItem;
    }

    const tokenMap = this.priceOracle.getAllLpAddressInfo();

    const balancesCalls = Object.keys(tokenMap).map(key => {
      const vault = new Web3EthContract(ABI.erc20ABI, key);
      return {
        contract: key,
        balance: vault.methods.balanceOf(address),
      };
    });

    const balances = [];
    (await utils.multiCall(balancesCalls))
      .filter(c => c.balance > utils.DUST_FILTER)
      .forEach(c => {
        const item = {
          token: c.contract,
          symbol: tokenMap[c.contract].map(i => i.symbol).join('-'),
          amount: c.balance / 1e18
        };

        const price = this.priceOracle.findPrice(c.contract);
        if (price) {
          item.usd = item.amount * price;
        }

        if (item.usd && item.usd < 0.006) {
          return;
        }

        balances.push(item)
      });

    this.cache.put(cacheKey, balances, { ttl: 300 * 1000 });
    return balances;
  }

  async getAllTokenBalances(address) {
    const cacheKey = `allTokenBalances-address-${address}`;

    const cacheItem = this.cache.get(cacheKey);
    if (cacheItem) {
      return cacheItem;
    }

    const tokenMap = this.priceOracle.getAddressSymbolMap();

    const tokenAddress = (await this.getPlatformTokens()).map(p => p.contract.toLowerCase());

    const balancesCalls = _.uniq([...Object.keys(tokenMap).map(t => t.toLowerCase()), ...tokenAddress]).map(key => {
      const vault = new Web3EthContract(ABI.erc20ABI, key);
      return {
        contract: key,
        balance: vault.methods.balanceOf(address),
      };
    });

    const balances = [];

    let [bnbBalance, allBalances] = await Promise.all([
      utils.getWeb3().eth.getBalance(address),
      utils.multiCall(balancesCalls),
    ]);

    if (bnbBalance > 0) {
      const bnbPrice = this.priceOracle.findPrice('bnb');

      let item = {
        token: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
        symbol: 'bnb',
        amount: bnbBalance / 1e18
      };

      if (bnbPrice) {
        item.usd = item.amount * bnbPrice
      }

      balances.push(item);
    }

    allBalances.filter(c => c.balance > 0).forEach(b => {
      const item = {
        token: b.contract,
        amount: b.balance / 1e18,
      };

      const price = this.priceOracle.findPrice(b.contract)
      if (price) {
        item.usd = item.amount * price;
      }

      if (item.usd && item.usd < 0.006) {
        return;
      }

      if (tokenMap[b.contract.toLowerCase()]) {
        item.symbol = tokenMap[b.contract.toLowerCase()];
      }

      balances.push(item);
    });

    this.cache.put(cacheKey, balances, { ttl: 300 * 1000 });
    return balances;
  }

  async getPlatformTokens() {
    return [
      {
        token: "auto",
        contract: "0xa184088a740c695e156f91f5cc086a06bb78b827"
      },
      {
        token: "cake",
        contract: "0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82"
      },
      {
        token: "bunny",
        contract: "0xc9849e6fdb743d08faee3e34dd2d1bc69ea11a51"
      },
      {
        token: "bifi",
        contract: "0xca3f508b8e4dd382ee878a314789373d80a5190a"
      },
      {
        token: "bake",
        contract: "0xe02df9e3e622debdd69fb838bb799e3f168902c5"
      },
      {
        token: "fuel",
        contract: "0x2090c8295769791ab7a3cf1cc6e0aa19f35e441a"
      },
      {
        token: "acs",
        contract: "0x4197c6ef3879a08cd51e5560da5064b773aa1d29"
      },
      {
        token: "acsi",
        contract: "0x5b17b4d5e4009b5c43e3e3d63a5229f794cba389"
      },
      {
        token: "egg",
        contract: "0xf952fc3ca7325cc27d15885d37117676d25bfda6"
      },
      {
        token: "kebab",
        contract: "0x7979f6c54eba05e18ded44c4f986f49a5de551c2"
      },
      {
        token: "bfi",
        contract: "0x81859801b01764d4f0fa5e64729f5a6c3b91435b"
      },
      {
        token: "bdo",
        contract: "0x190b589cf9Fb8DDEabBFeae36a813FFb2A702454"
      },
      {
        token: "sbdo",
        contract: "0x0d9319565be7f53CeFE84Ad201Be3f40feAE2740"
      },
      {
        token: "vbswap",
        contract: "0x4f0ed527e8A95ecAA132Af214dFd41F30b361600"
      },
      {
        token: "salt",
        contract: "0x2849b1aE7E04A3D9Bc288673A92477CF63F28aF4"
      },
      {
        token: "alloy",
        contract: "0x5ef5994fa33ff4eb6c82d51ee1dc145c546065bd"
      },
      {
        token: "hypr",
        contract: "0x03d6bd3d48f956d783456695698c407a46ecd54d"
      },
      {
        token: "banana",
        contract: "0x603c7f932ed1fc6575303d8fb018fdcbb0f39a95"
      },
      {
        token: "slime",
        contract: "0x4fcfa6cc8914ab455b5b33df916d90bfe70b6ab1"
      },
      {
        token: "juld",
        contract: "0x5A41F637C3f7553dBa6dDC2D3cA92641096577ea"
      },
      {
        token: "space",
        contract: "0x0abd3E3502c15ec252f90F64341cbA74a24fba06"
      },
      {
        token: "blzd",
        contract: "0x57067A6BD75c0E95a6A5f158455926e43E79BeB0"
      },
      {
        token: "polaris",
        contract: "0x3a5325f0e5ee4da06a285e988f052d4e45aa64b4"
      },
    ];
  }
  async getBalances(address) {
    const cacheKey = `balances-address-${address}`;

    const cacheItem = this.cache.get(cacheKey);
    if (cacheItem) {
      return cacheItem;
    }

    const pools = await this.getPlatformTokens()

    const vaultCalls = pools.map(pool => {
      const vault = new Web3EthContract(ABI.erc20ABI, pool.contract);
      return {
        token: pool.token,
        contract: pool.contract,
        balance: vault.methods.balanceOf(address)
      };
    });

    const balances = await utils.multiCall(vaultCalls);

    for (const balance of balances) {
      let price = this.priceOracle.findPrice(balance.contract.toLowerCase(), balance.token);

      if (price) {
        balance.usd = (balance.balance / 1e18) * price;
      }

      balance.balance /= 1e18;
    }

    const b = Object.freeze(balances);

    this.cache.put(cacheKey, b, { ttl: 300 * 1000 });

    return b;
  }
};
