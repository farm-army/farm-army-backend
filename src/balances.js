"use strict";

const ABI = require("./platforms/beefy/abi/abi");
const utils = require("./utils");
const Web3EthContract = require("web3-eth-contract");

module.exports = class Balances {
  constructor(cache, priceOracle) {
    this.cache = cache;
    this.priceOracle = priceOracle;
  }

  async getBalances(address) {
    const cacheKey = `balances-address-${address}`;

    const cacheItem = this.cache.get(cacheKey);
    if (cacheItem) {
      return JSON.parse(JSON.stringify(cacheItem));
    }

    const pools = [
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
    ];

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

    this.cache.put(cacheKey, balances, { ttl: 300 * 1000 });

    return balances;
  }
};
