"use strict";

const ethers = require("ethers");
const _ = require("lodash");
const fs = require("fs");
const path = require("path");
const BigNumber = require("bignumber.js");
const Web3EthContract = require("web3-eth-contract");

const Utils = require("../../utils");

const masterChefAddress = "0x73feaa1eE314F8c655E354234017bE2193C9E24E";

const erc20ABI = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "abi/erc20.json"), "utf8")
);
const masterchefABI = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "abi/masterchef.json"), "utf8")
);
const sousChefABI = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "abi/sousChef.json"), "utf8")
);

module.exports = class pancake {
  constructor(cache, priceOracle, tokenCollector, farmCollector, cacheManager) {
    this.cache = cache;
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector;
    this.farmCollector = farmCollector;
    this.cacheManager = cacheManager;
  }

  getLbAddresses() {
    return this.getRawFarms()
        .filter(c => c.lpAddresses && this.getAddress(c.lpAddresses))
        .map(c => this.getAddress(c.lpAddresses));
  }

  async getFetchedFarms() {
    const cacheKey = `pancake-v1-master-farms`

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    const foo = (await this.farmCollector.fetchForMasterChef(masterChefAddress)).filter(f => f.isFinished !== true);

    const reformat = foo.map(f => {
      f.lpAddresses = f.lpAddress

      return f
    })

    await this.cacheManager.set(cacheKey, reformat, {ttl: 60 * 30})

    return reformat;
  }

  getRawFarms() {
    return JSON.parse(fs.readFileSync(path.resolve(__dirname, "farms/farms.json"), "utf8"));
  }

  getRawPools() {
    return JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "farms/pools.json"), "utf8")
    ).filter(p => p.isFinished !== true);
  }

  async getAddressFarms(address) {
    const cacheItem = this.cache.get(`getAddressFarms-pancake-${address}`);
    if (cacheItem) {
      return cacheItem;
    }

    const vaultCalls = (await this.getFetchedFarms()).map(farm => {
      const contract = new Web3EthContract(masterchefABI, masterChefAddress);
      return {
        userInfo: contract.methods.userInfo(farm.pid, address),
        id: `pancake_farm_${farm.pid}`
      };
    });

    const poolCallsContract = this.getRawPools()
      .filter(pool => pool.stakingToken && pool.stakingToken.address[56] && pool.stakingToken.address[56])
      .map(farm => {
        const contract = new Web3EthContract(sousChefABI, farm.contractAddress["56"]);

        return {
          userInfo: contract.methods.userInfo(address),
          id: `pancake_pool_${farm.sousId}`
        };
      });

    const [farmCalls, poolCalls] = await Promise.all([
      Utils.multiCall(vaultCalls),
      Utils.multiCall(poolCallsContract)
    ]);

    const result = [...farmCalls, ...poolCalls]
      .filter(v => v.userInfo && new BigNumber(v.userInfo[0] || 0).isGreaterThan(0))
      .map(v => v.id);

    this.cache.put(`getAddressFarms-pancake-${address}`, result, {
      ttl: 300 * 1000
    });

    return result;
  }

  async getFarms(refresh = false) {
    const cacheKey = "getFarms-pancake";

    if (!refresh) {
      const cacheItem = this.cache.get(cacheKey);
      if (cacheItem) {
        return cacheItem;
      }
    }

    const farms = await this.getFetchedFarms();

    const farmTvls = {};
    (await Utils.multiCall((await this.getFetchedFarms()).map(farm => {
      let lpAddresses = this.getAddress(farm.lpAddresses);
      return {
          totalSupply: new Web3EthContract(erc20ABI, lpAddresses).methods.totalSupply(),
          lpAddress: lpAddresses
        };
      })
    )).forEach(call => {
      farmTvls[call.lpAddress] = call.totalSupply;
    });

    const resultFarms = farms.map(farm => {
      const symbol = `${farm.lpSymbol}`.toLowerCase();

      const item = {
        id: `pancake_farm_${farm.pid}`,
        name: farm.lpSymbol,
        token: symbol,
        platform: "pancake",
        raw: Object.freeze(farm),
        provider: "pancake",
        earnings: ["cake"],
        link: "https://pancakeswap.finance/farms",
        has_details: true,
        extra: {}
      };

      let lpAddress = this.getAddress(farm.lpAddresses);
      if (lpAddress) {
        item.extra.lpAddress = lpAddress;
        item.extra.transactionToken = lpAddress;
        item.extra.transactionAddress = masterChefAddress;
      }

      const apy = Utils.getApy(`cake-${symbol}`);
      if (apy) {
        item.yield = {
          apy: apy * 100
        };
      }

      if (lpAddress && farmTvls[lpAddress]) {
        item.tvl = {
          amount: farmTvls[lpAddress] / 1e18
        };

        const addressPrice = this.priceOracle.getAddressPrice(lpAddress);
        if (addressPrice) {
          item.tvl.usd = item.tvl.amount * addressPrice;
        }
      }

      return Object.freeze(item);
    });

    const rawPools = this.getRawPools();

    const tvlPools = await Utils.multiCallIndexBy(
      "sousId",
      rawPools
        .filter(pool => pool.contractAddress && pool.contractAddress[56])
        .map(pool => {
          const vault = new Web3EthContract(erc20ABI, pool.stakingToken.address[56]);
          return {
            sousId: pool.sousId.toString(),
            token: pool.stakingToken.address[56],
            balance: vault.methods.balanceOf(pool.contractAddress[56])
          };
        })
    );

    const resultPools = rawPools.map(pool => {
      const item = {
        id: `pancake_pool_${pool.sousId}`,
        name: `${pool.earningToken.symbol} Pool`,
        token: pool.earningToken.symbol.toLowerCase(),
        platform: "pancake",
        raw: Object.freeze(pool),
        provider: "pancake",
        earns: [pool.earningToken.symbol.toLowerCase()],
        link: "https://pancakeswap.finance/pools",
        has_details: true,
        extra: {}
      };

      if (pool.contractAddress && pool.contractAddress[56]) {
        item.extra.transactionToken = pool.stakingToken.address[56];
        item.extra.transactionAddress = pool.contractAddress[56];
      }

      const tvl = tvlPools[pool.sousId.toString()];
      if (tvl && tvl.balance) {
        item.tvl = {
          amount: tvl.balance / 1e18
        };

        const addressPrice = this.priceOracle.getAddressPrice(tvl.token);
        if (addressPrice) {
          item.tvl.usd = item.tvl.amount * addressPrice;
        }
      }

      return Object.freeze(item);
    });

    const result = [...resultFarms, ...resultPools];

    this.cache.put(cacheKey, result, { ttl: 300 * 1000 });

    return result;
  }

  async getYields(address) {
    const addressFarms = await this.getAddressFarms(address);
    if (addressFarms.length === 0) {
      return [];
    }

    return await this.getYieldsInner(address, addressFarms);
  }

  async getYieldsInner(address, addresses) {
    const addressFarms = addresses.filter(address =>
      address.startsWith("pancake_farm_")
    );
    const addressPools = addresses.filter(address =>
      address.startsWith("pancake_pool_")
    );

    if (addressFarms.length === 0 && addressPools.length === 0) {
      return [];
    }

    const farms = await this.getFarms();

    const vaultCalls = addressFarms.map(id => {
      const farm = farms.find(f => f.id === id);

      const vault = new Web3EthContract(masterchefABI, masterChefAddress);
      return {
        userInfo: vault.methods.userInfo(farm.raw.pid, address),
        pendingCake: vault.methods.pendingCake(farm.raw.pid, address),
        id: id
      };
    });

    const vaultCalls2 = addressPools.map(id => {
      const farm = farms.find(f => f.id === id);

      const contract = new Web3EthContract(sousChefABI, farm.raw.contractAddress["56"]);

      return {
        userInfo: contract.methods.userInfo(address),
        pendingReward: contract.methods.pendingReward(address),
        id: id
      };
    });

    const [calls, calls2] = await Promise.all([
      Utils.multiCall(vaultCalls),
      Utils.multiCall(vaultCalls2)
    ]);

    const resultFarms = calls
      .filter(
        c =>
          c.userInfo &&
          c.userInfo[0] &&
          new BigNumber(c.userInfo[0]).isGreaterThan(0)
      )
      .map(call => {
        const farm = farms.find(f => f.id === call.id);

        const result = {};
        result.deposit = {
          symbol: farm.symbol,
          amount: ethers.utils.formatUnits(call.userInfo[0].toString(), 18)
        };

        let price;
        if (this.getAddress(farm.raw.lpAddresses)) {
          price = this.priceOracle.getAddressPrice(this.getAddress(farm.raw.lpAddresses));
        }

        if (!price) {
          price = this.priceOracle.findPrice(`cake-${farm.token.toLowerCase()}`);
        }

        if (price) {
          result.deposit.usd = (call.userInfo[0] / 1e18) * price;
        }

        if (new BigNumber(call.pendingCake).isGreaterThan(0)) {
          const reward = {
            symbol: "cake",
            amount: ethers.utils.formatUnits(call.pendingCake, 18)
          };

          const price = this.priceOracle.findPrice(reward.symbol);
          if (price) {
            reward.usd = (call.pendingCake / 1e18) * price;
          }

          result.rewards = [reward];
        }

        result.farm = farm;

        return result;
      });

    const resultPools = calls2
      .filter(
        c =>
          c.userInfo &&
          c.userInfo[0] &&
          (new BigNumber(c.userInfo[0]).isGreaterThan(0) ||
            new BigNumber(c.pendingReward).isGreaterThan(0))
      )
      .map(call => {
        const farm = farms.find(f => f.id === call.id);

        const result = {};
        result.deposit = {
          symbol: farm.raw.stakingToken.symbol.toLowerCase(),
          amount: ethers.utils.formatUnits(call.userInfo[0].toString(), 18)
        };

        const price = this.priceOracle.findPrice(result.deposit.symbol);
        if (price) {
          result.deposit.usd = (call.userInfo[0] / 1e18) * price;
        }

        if (new BigNumber(call.pendingReward).isGreaterThan(0)) {
          const reward = {
            symbol: farm.raw.earningToken.symbol.toLowerCase(),
            amount: call.pendingReward / 1e18
          };

          const price = this.priceOracle.findPrice(reward.symbol);
          if (price) {
            reward.usd = reward.amount * price;
          }

          result.rewards = [reward];
        }

        result.farm = farm;

        return result;
      });

    return [...resultFarms, ...resultPools];
  }

  async getTransactions(address, id) {
    const farm = (await this.getFarms()).find(f => f.id === id);
    if (!farm) {
      return {};
    }

    if (farm.extra.transactionAddress && farm.extra.transactionToken) {
      return Utils.getTransactions(
        farm.extra.transactionAddress,
        farm.extra.transactionToken,
        address
      );
    }

    return [];
  }

  async getDetails(address, id) {
    const farm = (await this.getFarms()).find(f => f.id === id);
    if (!farm) {
      return {};
    }

    const [yieldFarms, transactions] = await Promise.all([
      this.getYieldsInner(address, [farm.id]),
      this.getTransactions(address, id)
    ]);

    const result = {};

    let lpTokens = [];
    if (yieldFarms[0]) {
      result.farm = yieldFarms[0];
      lpTokens = this.priceOracle.getLpSplits(farm, yieldFarms[0]);
    }

    if (transactions && transactions.length > 0) {
      result.transactions = transactions;
    }

    if (lpTokens && lpTokens.length > 0) {
      result.lpTokens = lpTokens;
    }

    return result;
  }

  getAddress(address) {
    if (typeof address === 'string' && address.startsWith('0x')) {
      return address;
    }

    if (address[56]) {
      return address[56];
    }

    return undefined;
  }
};
