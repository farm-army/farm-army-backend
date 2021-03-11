"use strict";

const ethers = require("ethers");
const _ = require("lodash");
const fs = require("fs");
const path = require("path");
const BigNumber = require("bignumber.js");
const Web3EthContract = require("web3-eth-contract");

const Utils = require("../../services").Utils;

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
  constructor(cache, priceOracle) {
    this.cache = cache;
    this.priceOracle = priceOracle;
  }

  getLbAddresses() {
    return this.getRawFarms()
        .filter(c => c.lpAddresses && c.lpAddresses[56])
        .map(c => c.lpAddresses[56]);
  }

  getRawFarms() {
    return JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "farms/farms.json"), "utf8")
    );
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

    const vaultCalls = this.getRawFarms().map(farm => {
      const vault = new Web3EthContract(erc20ABI, farm.lpAddresses["56"]);
      return {
        allowance: vault.methods.allowance(address, masterChefAddress),
        pid: `pancake_farm_${farm.pid}`
      };
    });

    const poolCallsContract = this.getRawPools()
      .filter(p => p.stakingTokenAddress && p.contractAddress["56"])
      .map(pool => {
        const contract = new Web3EthContract(
          erc20ABI,
          pool.stakingTokenAddress
        );
        return {
          allowance: contract.methods.allowance(
            address,
            pool.contractAddress["56"]
          ),
          sousId: `pancake_pool_${pool.sousId}`
        };
      });

    const [farmCalls, poolCalls] = await Promise.all([
      Utils.multiCall(vaultCalls),
      Utils.multiCall(poolCallsContract)
    ]);

    const farmIds = farmCalls
      .filter(v => new BigNumber(v.allowance).isGreaterThan(0))
      .map(v => v.pid);

    const poolIds = poolCalls
      .filter(v => new BigNumber(v.allowance).isGreaterThan(0))
      .map(v => v.sousId);

    const result = [...farmIds, ...poolIds];

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

    const farms = this.getRawFarms();

    const farmTvls = {};
    (
      await Utils.multiCall(
        this.getRawFarms().map(farm => {
          return {
            totalSupply: new Web3EthContract(
              erc20ABI,
              farm.lpAddresses[56]
            ).methods.totalSupply(),
            lpAddress: farm.lpAddresses[56]
          };
        })
      )
    ).forEach(call => {
      farmTvls[call.lpAddress] = call.totalSupply;
    });

    const resultFarms = farms.map(farm => {
      const symbol = `${farm.tokenSymbol}-${farm.quoteTokenSymbol}`.toLowerCase();

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

      if (farm.lpAddresses && farm.lpAddresses[56]) {
        item.extra.lpAddress = farm.lpAddresses[56];
        item.extra.transactionToken = farm.lpAddresses[56];
        item.extra.transactionAddress = masterChefAddress;
      }

      const apy = Utils.getApy(`cake-${symbol}`);
      if (apy) {
        item.yield = {
          apy: apy * 100
        };
      }

      if (farmTvls[farm.lpAddresses[56]]) {
        item.tvl = {
          amount: farmTvls[farm.lpAddresses[56]] / 1e18
        };

        const addressPrice = this.priceOracle.getAddressPrice(farm.lpAddresses[56]);
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
          const vault = new Web3EthContract(erc20ABI, pool.stakingTokenAddress);
          return {
            sousId: pool.sousId.toString(),
            token: pool.stakingTokenAddress,
            balance: vault.methods.balanceOf(pool.contractAddress[56])
          };
        })
    );

    const resultPools = rawPools.map(pool => {
      const item = {
        id: `pancake_pool_${pool.sousId}`,
        name: `${pool.tokenName} Pool`,
        token: pool.tokenName.toLowerCase(),
        platform: "pancake",
        raw: Object.freeze(pool),
        provider: "pancake",
        earns: [pool.tokenName.toLowerCase()],
        link: "https://pancakeswap.finance/pools",
        has_details: true,
        extra: {}
      };

      if (pool.contractAddress && pool.contractAddress[56]) {
        item.extra.transactionToken = pool.stakingTokenAddress;
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

      const vault = new Web3EthContract(
        sousChefABI,
        farm.raw.contractAddress["56"]
      );

      return {
        userInfo: vault.methods.userInfo(address),
        pendingReward: vault.methods.pendingReward(address),
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

        const symbol = `${farm.raw.tokenSymbol}-${farm.raw.quoteTokenSymbol}`.toLowerCase();

        const result = {};
        result.deposit = {
          symbol: symbol,
          amount: ethers.utils.formatUnits(call.userInfo[0].toString(), 18)
        };

        let price;
        if (farm.raw.lpAddresses && farm.raw.lpAddresses["56"]) {
          price = this.priceOracle.getAddressPrice(farm.raw.lpAddresses["56"]);
        }

        if (!price) {
          price = this.priceOracle.findPrice(`cake-${symbol}`);
        }

        if (price) {
          result.deposit.usd = (call.userInfo[0] / 1e18) * price;
        }

        if (new BigNumber(call.pendingCake).isGreaterThan(0)) {
          const reward = {
            symbol: "cake",
            amount: ethers.utils.formatUnits(call.pendingCake, 18)
          };

          const price = this.priceOracle.findPrice("cake");
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
          symbol: farm.raw.stakingTokenName.toLowerCase(),
          amount: ethers.utils.formatUnits(call.userInfo[0].toString(), 18)
        };

        const price = this.priceOracle.findPrice(farm.raw.stakingTokenName.toLowerCase());
        if (price) {
          result.deposit.usd = (call.userInfo[0] / 1e18) * price;
        }

        if (new BigNumber(call.pendingReward).isGreaterThan(0)) {
          const reward = {
            symbol: farm.raw.tokenName.toLowerCase(),
            amount: call.pendingReward / 1e18
          };

          const price = this.priceOracle.findPrice(farm.raw.tokenName.toLowerCase());
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
};
