"use strict";

const fs = require("fs");
const path = require("path");
const Web3EthContract = require("web3-eth-contract");
const BigNumber = require("bignumber.js");
const Utils = require("../../utils");

module.exports = class kebap {
  constructor(cache, priceOracle) {
    this.cache = cache;
    this.priceOracle = priceOracle;
  }

  static MASTER_ABI = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "abi/masterchef.json"), "utf8")
  )

  static MASTER_ADDRESS = "0x76FCeffFcf5325c6156cA89639b17464ea833ECd"

  async getLbAddresses() {
    return this.getRawPools()
      .filter(f => f.lpAddresses && f.lpAddresses[56])
      .map(farm => farm.lpAddresses[56]);
  }

  getRawPools() {
    return JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "farms/farms.json"), "utf8")
    );
  }

  async getAddressFarms(address) {
    const cacheItem = this.cache.get(`getAddressFarms-kebab-${address}`);
    if (cacheItem) {
      return cacheItem;
    }

    const vaultCalls = (await this.getFarms())
      .filter(f => f.raw.lpAddresses && f.raw.lpAddresses[56])
      .map(farm => {
        const vault = new Web3EthContract(kebap.MASTER_ABI, kebap.MASTER_ADDRESS);

        return {
          poolUserInfoMap: vault.methods.userInfo(farm.raw.pid, address),
          pendingCake: vault.methods.pendingCake(farm.raw.pid, address),
          id: farm.id.toString()
        };
      });

    const farmCalls = await Utils.multiCall(vaultCalls);

    const result = farmCalls
      .filter(
        v =>
          new BigNumber(v.poolUserInfoMap[0] || 0).isGreaterThan(0) ||
          new BigNumber(v.poolUserInfoMap[1] || 0).isGreaterThan(0) ||
          new BigNumber(v.pendingCake || 0).isGreaterThan(0)
      )
      .map(v => v.id);

    this.cache.put(`getAddressFarms-kebab-${address}`, result, { ttl: 300 * 1000 });

    return result;
  }

  async getFarms(refresh = false) {
    const cacheKey = "getFarms-kebab";

    if (!refresh) {
      const cacheItem = this.cache.get(cacheKey);
      if (cacheItem) {
        return cacheItem;
      }
    }

    const rawPools = this.getRawPools().filter(i => i.ended !== true);

    // TVL USD
    const farmTvls = {};
    (
      await Utils.multiCall(
        rawPools.map(farm => {
          return {
            // totalSupply: new web3.eth.Contract(Utils.erc20ABI, farm.lpAddresses[56]).methods.totalSupply(),
            lpAddress: farm.lpAddresses[56]
          };
        })
      )
    ).forEach(call => {
      farmTvls[call.lpAddress] = call.totalSupply;
    });

    const result = rawPools.map(farm => {
      const symbol = `${farm.tokenSymbol}-${farm.quoteTokenSymbol}`.toLowerCase();

      const item = {
        id: `kebab_${farm.pid}`,
        name: symbol.toUpperCase(),
        token: symbol,
        provider: "kebab",
        raw: Object.freeze(farm),
        link: "https://kebabfinance.com/#/farms",
        has_details: true,
        extra: {}
      };

      if (farm.lpAddresses && farm.lpAddresses[56]) {
        item.extra.lpAddress = farm.lpAddresses[56];
      }

      if (farm.tokenSymbol) {
        item.earns = ["kebab"];
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

    this.cache.put(cacheKey, result, { ttl: 1000 * 60 * 30 });

    console.log("kebab updated");

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
    if (addresses.length === 0) {
      return [];
    }

    const farms = await this.getFarms();

    const vaultCalls = addresses.map(id => {
      const farm = farms.find(f => f.id === id);

      const vault = new Web3EthContract(kebap.MASTER_ABI, kebap.MASTER_ADDRESS);

      return {
        poolUserInfoMap: vault.methods.userInfo(farm.raw.pid, address),
        pendingCake: vault.methods.pendingCake(farm.raw.pid, address),
        id: farm.id.toString()
      };
    });

    const calls = await Utils.multiCall(vaultCalls);

    const resultFarms = calls
      .filter(
        v =>
          new BigNumber(v.poolUserInfoMap[0] || 0).isGreaterThan(0) ||
          new BigNumber(v.poolUserInfoMap[1] || 0).isGreaterThan(0)
      )
      .map(call => {
        const farm = farms.find(f => f.id === call.id);

        const amount = call.poolUserInfoMap[0] || 0;
        const rewards = call.pendingCake || 0;

        const result = {};

        result.deposit = {
          symbol: "?",
          amount: amount / 1e18
        };

        let price;
        if (farm.raw.lpAddresses && farm.raw.lpAddresses[56]) {
          price = this.priceOracle.findPrice(farm.raw.lpAddresses[56]);
        }

        if (!price) {
          price = this.priceOracle.findPrice(`kebab_-${farm.token}`);
        }

        if (price) {
          result.deposit.usd = (amount / 1e18) * price;
        }

        if (rewards > 0 && farm.raw.tokenSymbol) {
          const reward = {
            symbol: farm.raw.tokenSymbol.toLowerCase(),
            amount: rewards / 1e18
          };

          const priceReward = this.priceOracle.findPrice(farm.raw.tokenSymbol.toLowerCase());

          if (priceReward) {
            reward.usd = reward.amount * priceReward;
          }

          result.rewards = [reward];
        }

        result.farm = farm;

        return result;
      });

    return resultFarms;
  }

  async getTransactions(address, id) {
    const farm = (await this.getFarms()).find(f => f.id === id);
    if (!farm) {
      return {};
    }

    return Utils.getTransactions(kebap.MASTER_ADDRESS, farm.extra.lpAddress, address);
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
