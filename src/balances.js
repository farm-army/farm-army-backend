"use strict";

const ERC20_ABI = require("./abi/erc20.json");
const utils = require("./utils");
const Web3EthContract = require("web3-eth-contract");
const _ = require("lodash");

module.exports = class Balances {
  constructor(cacheManager, priceOracle, tokenCollector, lpTokenCollector, chain) {
    this.cacheManager = cacheManager;
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector;
    this.lpTokenCollector = lpTokenCollector;
    this.chain = chain;
  }

  async getAllLpTokenBalances(address) {
    const cacheKey = `allLpTokenBalances-address-${this.chain}-${address}`;

    const cacheItem = await this.cacheManager.get(cacheKey);
    if (cacheItem) {
      return cacheItem;
    }

    const tokenMap = {};

    this.lpTokenCollector.all().forEach(i => {
      if (i.tokens.length === 2) {
        tokenMap[i.address] = i.tokens;
      }
    });

    const balancesCalls = Object.keys(tokenMap).map(key => {
      const vault = new Web3EthContract(ERC20_ABI, key);
      return {
        contract: key,
        balance: vault.methods.balanceOf(address),
      };
    });

    const balances = [];
    (await utils.multiCall(balancesCalls, this.chain))
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

    await this.cacheManager.set(cacheKey, balances, {ttl: 60 * 5})

    return balances;
  }

  async getAllTokenBalances(address) {
    const cacheKey = `allTokenBalances-address-${this.chain}-${address}`;

    const cacheItem = await this.cacheManager.get(cacheKey);
    if (cacheItem) {
      return cacheItem;
    }

    const tokenMap = this.tokenCollector.allAsAddressMap();

    const tokenAddress = (await this.getPlatformTokens()).map(p => p.contract.toLowerCase());

    const balancesCalls = _.uniq([...Object.keys(tokenMap).map(t => t.toLowerCase()), ...tokenAddress]).map(key => {
      const vault = new Web3EthContract(ERC20_ABI, key);
      return {
        contract: key,
        balance: vault.methods.balanceOf(address),
      };
    });

    const balances = [];

    let [nativeBalance, allBalances] = await Promise.all([
      utils.getWeb3(this.chain).eth.getBalance(address),
      utils.multiCall(balancesCalls, this.chain),
    ]);

    if (nativeBalance > 0) {
      let nativePrice
      let item = undefined;

      if (this.chain === 'bsc') {
        item = {
          token: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
          symbol: 'bnb',
          amount: nativeBalance / 1e18
        };

        nativePrice = this.priceOracle.findPrice('0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c');
      } else if(this.chain === 'polygon') {
        item = {
          token: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
          symbol: 'matic',
          amount: nativeBalance / 1e18
        };

        nativePrice = this.priceOracle.findPrice('0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270');
      } else if(this.chain === 'fantom') {
        item = {
          token: '0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83',
          symbol: 'ftm',
          amount: nativeBalance / 1e18
        };

        nativePrice = this.priceOracle.findPrice('0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83');
      } else if(this.chain === 'kcc') {
        item = {
          token: '0x4446fc4eb47f2f6586f9faab68b3498f86c07521',
          symbol: 'kcs',
          amount: nativeBalance / 1e18
        };

        nativePrice = this.priceOracle.findPrice('0x4446fc4eb47f2f6586f9faab68b3498f86c07521');
      } else if(this.chain === 'harmony') {
        item = {
          token: '0xcf664087a5bb0237a0bad6742852ec6c8d69a27a',
          symbol: 'one',
          amount: nativeBalance / 1e18
        };

        nativePrice = this.priceOracle.findPrice('0xcf664087a5bb0237a0bad6742852ec6c8d69a27a');
      } else if (this.chain === 'celo') {
        /*
        wrapped token is equal with base token
        item = {
          token: '0x471ece3750da237f93b8e339c536989b8978a438',
          symbol: 'celo',
          amount: nativeBalance / 1e18
        };

        nativePrice = this.priceOracle.findPrice('0x471ece3750da237f93b8e339c536989b8978a438');
        */
      } else {
        throw new Error('invalid chain');
      }

      if (item) {
        if (nativePrice) {
          item.usd = item.amount * nativePrice
        }

        balances.push(item);
      }
    }

    allBalances.filter(c => c.balance > 0).forEach(b => {
      const item = {
        token: b.contract,
        amount: b.balance / (10 ** this.tokenCollector.getDecimals(b.contract)),
      };

      const price = this.priceOracle.findPrice(b.contract)
      if (price) {
        item.usd = item.amount * price;
      }

      if (item.usd && item.usd < 0.006) {
        return;
      }

      if (tokenMap[b.contract.toLowerCase()]) {
        item.symbol = tokenMap[b.contract.toLowerCase()].symbol;
      }

      balances.push(item);
    });

    await this.cacheManager.set(cacheKey, balances, {ttl: 60 * 5});

    return balances;
  }

  async getPlatformTokens() {
    if (this.chain === 'bsc') {
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
          contract: "0x23b06097f8fe2dd9d3df094d3ee8319daa8756c1"
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
          token: "xblzd",
          contract: "0x9a946c3Cb16c08334b69aE249690C236Ebd5583E"
        },
        {
          token: "bbdo",
          contract: "0x9586b02B09bd68A7cD4aa9167a61B78F43092063"
        },
        {
          token: "bpdot",
          contract: "0x557b3aB377bbD68DFC6dADEFafA3CC4e4B6677c6"
        },
        {
          token: "polaris",
          contract: "0x3a5325f0e5ee4da06a285e988f052d4e45aa64b4"
        },
        {
          token: "alpaca",
          contract: "0x8F0528cE5eF7B51152A59745bEfDD91D97091d2F"
        },
        {
          token: "alpha",
          contract: "0xa1faa113cbE53436Df28FF0aEe54275c13B40975"
        },
        {
          token: "mdx",
          contract: "0x9c65ab58d8d978db963e63f2bfb7121627e3a739"
        },
        {
          token: "ccake",
          contract: "0xc7091aa18598b87588e37501b6ce865263cd67ce"
        },
        {
          token: "swamp",
          contract: "0xc5A49b4CBe004b6FD55B30Ba1dE6AC360FF9765d"
        },
        {
          token: "bboo",
          contract: "0x51f015e3dEA234039fB536C358781118f36f1745"
        },
        {
          "token": "brew",
          "contract": "0x790Be81C3cA0e53974bE2688cDb954732C9862e1"
        },
        {
          "token": "belt",
          "contract": "0xE0e514c71282b6f4e823703a39374Cf58dc3eA4f"
        },
        {
          "token": "panther",
          "contract": "0x1f546aD641B56b86fD9dCEAc473d1C7a357276B7"
        },
        {
          "token": "wings",
          "contract": "0x0487b824c8261462F88940f97053E65bDb498446"
        },
        {
          "token": "warden",
          "contract": "0x0fEAdcC3824E7F3c12f40E324a60c23cA51627fc"
        },
        {
          "token": "bsw",
          "contract": "0x965F527D9159dCe6288a2219DB51fc6Eef120dD1"
        },
        {
          "token": "gen",
          "contract": "0xB0F2939A1c0e43683E5954c9Fe142F7df9F8D967"
        },
        {
          "token": "ele",
          "contract": "0xAcD7B3D9c10e97d0efA418903C0c7669E702E4C0"
        },
        {
          "token": "css",
          "contract": "0x3bc5798416c1122BcFd7cb0e055d50061F23850d",
        },
        {
          "token": "merl",
          "contract": "0xDA360309C59CB8C434b28A91b823344a96444278",
        },
        {
          "token": "genx",
          "contract": "0x9AA18A4E73E1016918fA360Eed950D9580C9551d",
        },
      ];
    }

    return [];
  }

  async getBalancesFormFetched(wallet) {
    const pools = await this.getPlatformTokens();

    const tokenAddresses = pools.map(p => p.contract.toLowerCase());

    const tokens = [];

    wallet.forEach(w => {
      if (tokenAddresses.includes(w.token.toLowerCase())) {
        let item = {
          balance: w.amount,
          token: w.symbol,
          contract: w.token
        };

        if (w.usd) {
          item.usd = w.usd;
        }

        tokens.push(item);
      }
    })

    return tokens;
  }
};
