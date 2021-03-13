"use strict";

const fs = require("fs");
const path = require("path");
const Web3EthContract = require("web3-eth-contract");
const BigNumber = require("bignumber.js");
const Utils = require("../../utils");

module.exports = class hyperjump {
  constructor(cache, priceOracle) {
    this.cache = cache;
    this.priceOracle = priceOracle;
  }

  static MASTER_ABI = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "abi/masterchef.json"), "utf8")
  )

  static SOUS_ABI = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "abi/souschef.json"), "utf8")
  )

  static MASTER_ADDRESS = "0x4F1818Ff649498a2441aE1AD29ccF55a8E1C6250"

  async getLbAddresses() {
    return this.getRawFarms()
      .filter(f => f.lpAddresses && f.lpAddresses[56])
      .map(farm => farm.lpAddresses[56]);
  }

  getRawFarms() {
    return JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "farms/farms.json"), "utf8")
    ).filter(i => i.ended !== true);
  }

  getRawPools() {
    return JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "farms/pools.json"), "utf8")
    ).filter(p => p.isFinished !== true);
  }

  async getAddressFarms(address) {
    const cacheItem = this.cache.get(`getAddressFarms-hyperjump-${address}`);
    if (cacheItem) {
      return cacheItem;
    }

    let farmings = await this.getFarms();

    const vaultCalls = farmings
      .filter(p => p.id.startsWith('hyperjump_farm_'))
      .filter(f => f.raw.lpAddresses && f.raw.lpAddresses[56])
      .map(farm => {
        const vault = new Web3EthContract(hyperjump.MASTER_ABI, hyperjump.MASTER_ADDRESS);
        return {
          userInfo: vault.methods.userInfo(farm.raw.pid, address),
          pendingReward: vault.methods.pendingAlloy(farm.raw.pid, address),
          id: farm.id.toString()
        };
      });

    const poolCalls = farmings
      .filter(p => p.id.startsWith('hyperjump_sous_'))
      .map(farm => {
        const contract = new Web3EthContract(hyperjump.SOUS_ABI, farm.raw.contractAddress[56]);
        return {
          userInfo: contract.methods.userInfo(address),
          pendingReward: contract.methods.pendingReward(address),
          id: farm.id.toString()
        };
      });

    const [farms, pools] = await Promise.all([
      Utils.multiCall(vaultCalls),
      Utils.multiCall(poolCalls)
    ]);

    const result = [...farms, ...pools]
      .filter(
        v =>
          new BigNumber(v.userInfo && v.userInfo[0] || 0).isGreaterThan(0) ||
          new BigNumber(v.userInfo && v.userInfo[1] || 0).isGreaterThan(0) ||
          new BigNumber(v.pendingReward || 0).isGreaterThan(0)
      )
      .map(v => v.id);

    this.cache.put(`getAddressFarms-hyperjump-${address}`, result, { ttl: 300 * 1000 });

    return result;
  }

  async getFarms(refresh = false) {
    const cacheKey = "getFarms-hyperjump";

    if (!refresh) {
      const cacheItem = this.cache.get(cacheKey);
      if (cacheItem) {
        return cacheItem;
      }
    }

    const farms = this.getRawFarms().map(farm => {
      const item = {
        id: `hyperjump_farm_${farm.pid}`,
        name: farm.lpSymbol,
        provider: "hyperjump",
        raw: Object.freeze(farm),
        link: "https://farm.hyperjump.fi/farms",
        has_details: true,
        extra: {}
      };

      if (farm.isTokenOnly !== true) {
        item.extra.lpAddress = farm.lpAddresses[56];
        item.extra.transactionToken = farm.lpAddresses[56];
      } else {
        item.extra.transactionToken = farm.tokenAddresses[56];
      }

      if (farm.tokenSymbol) {
        item.earns = ["alloy"];
      }

      item.extra.transactionAddress = hyperjump.MASTER_ADDRESS;

      return Object.freeze(item);
    });

    const souses = this.getRawPools().map(farm => {
      const item = {
        id: `hyperjump_sous_${farm.sousId}`,
        name: `${farm.tokenName} Pool`,
        token: farm.stakingTokenName.toLowerCase(),
        provider: "hyperjump",
        raw: Object.freeze(farm),
        link: "https://farm.hyperjump.fi/pools",
        has_details: true,
        extra: {}
      };

      item.earns = [farm.tokenName.toLowerCase()];
      item.extra.transactionAddress = farm.contractAddress[56];
      item.extra.transactionToken = farm.stakingTokenAddress[56];

      return Object.freeze(item);
    });

    const result = [...farms, ...souses]

    this.cache.put(cacheKey, result, { ttl: 1000 * 60 * 30 });

    console.log("hyperjump updated");

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

    const farmCalls = addresses
      .filter(address => address.startsWith('hyperjump_farm_'))
      .map(id => {
        const farm = farms.find(f => f.id === id);
        const contract = new Web3EthContract(hyperjump.MASTER_ABI, hyperjump.MASTER_ADDRESS);

        return {
          userInfo: contract.methods.userInfo(farm.raw.pid, address),
          pendingReward: contract.methods.pendingAlloy(farm.raw.pid, address),
          id: farm.id.toString()
        };
      });

    const sousCalls = addresses
      .filter(address => address.startsWith('hyperjump_sous_'))
      .map(id => {
        const farm = farms.find(f => f.id === id);
        const contract = new Web3EthContract(hyperjump.SOUS_ABI, farm.raw.contractAddress[56]);

        return {
          userInfo: contract.methods.userInfo(address),
          pendingReward: contract.methods.pendingReward(address),
          id: farm.id.toString()
        };
      });

    const [farmResults, sousResults] = await Promise.all([
      Utils.multiCall(farmCalls),
      Utils.multiCall(sousCalls),
    ]);

    const resultFarms = [...farmResults, ...sousResults].map(call => {
      const farm = farms.find(f => f.id === call.id);

      const amount = call.userInfo[0] || 0;
      const rewards = call.pendingReward || 0;

      const result = {};

      result.deposit = {
        symbol: "?",
        amount: amount / 1e18
      };

      let price;
      if (farm.extra && farm.extra.transactionToken) {
        price = this.priceOracle.getAddressPrice(farm.extra.transactionToken);
      }

      if (price) {
        result.deposit.usd = result.deposit.amount * price;
      }

      if (rewards > 0) {
        const reward = {
          symbol: farm.earns[0] ? farm.earns[0] : '?',
          amount: rewards / 1e18
        };

        if (farm.earns[0]) {
          const priceReward = this.priceOracle.findPrice(farm.earns[0]);
          if (priceReward) {
            reward.usd = reward.amount * priceReward;
          }
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
