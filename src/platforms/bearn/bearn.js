"use strict";

const fs = require("fs");
const path = require("path");
const Web3EthContract = require("web3-eth-contract");
const BigNumber = require("bignumber.js");
const request = require("async-request");
const Utils = require("../../utils");

module.exports = class bearn {
  constructor(cache, priceOracle) {
    this.cache = cache;
    this.priceOracle = priceOracle;
  }

  static MASTER_ABI = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "abi/masterchef.json"), "utf8")
  )
  static MASTER_ADDRESS =  "0xb390b07fcf76678089cb12d8e615d5fe494b01fb"

  async getLbAddresses() {
    return this.getRawPools()
      .filter(farm => farm.lpTokens && farm.lpTokens.length === 2)
      .map(farm => farm.lpAddress);
  }

  getRawPools() {
    // https://api.bdollar.fi/api/bvault/get-vaults
    return JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "farms/farms.json"), "utf8")
    ).vaults;
  }

  async getAddressFarms(address) {
    const cacheItem = this.cache.get(`getAddressFarms-bearn-${address}`);
    if (cacheItem) {
      return cacheItem;
    }

    const vaultCalls = (await this.getFarms()).map(farm => {
      const vault = new Web3EthContract(
        bearn.MASTER_ABI,
        bearn.MASTER_ADDRESS
      );
      return {
        userInfo: vault.methods.userInfo(farm.raw.pid, address),
        stakedWantTokens: vault.methods.stakedWantTokens(farm.raw.pid, address),
        id: farm.id.toString()
      };
    });

    const farmCalls = await Utils.multiCall(vaultCalls);

    const result = farmCalls
      .filter(
        v =>
          new BigNumber(v.userInfo[0] || 0).isGreaterThan(Utils.DUST_FILTER) ||
          new BigNumber(v.stakedWantTokens || 0).isGreaterThan(
            Utils.DUST_FILTER
          )
      )
      .map(v => v.id);

    this.cache.put(`getAddressFarms-bearn-${address}`, result, { ttl: 300 * 1000 });

    return result;
  }

  async getFarms(refresh = false) {
    const cacheKey = "getFarms-bearn";

    if (!refresh) {
      const cacheItem = this.cache.get(cacheKey);
      if (cacheItem) {
        return cacheItem;
      }
    }

    const text = await request("https://api.bdollar.fi/api/bvault/get-vaults");
    const response = JSON.parse(text.body);

    const data = {};
    Object.values(response.data.vaultInfos).forEach(v => {
      data[v.pid] = v;
    });

    const rawPools = this.getRawPools();

    const result = rawPools.map(farm => {
      const item = {
        id: `bearn_${farm.pid}`,
        name: farm.symbol,
        token: farm.symbol,
        provider: "bearn",
        raw: Object.freeze(farm),
        link: "https://bvaults.fi/",
        has_details: true,
        extra: {}
      };

      if (farm.lpTokens && farm.lpTokens.length === 2) {
        item.extra.lpAddress = farm.lpAddress;
      }

      if (farm.earnTokens) {
        item.earns = farm.earnTokens.map(i => i.toLowerCase());
      }

      if (farm.lpTokens && farm.lpTokens.length) {
        item.name = farm.lpTokens.map(i => i.symbol.toUpperCase()).join("-");
        item.token = farm.lpTokens.map(i => i.symbol.toLowerCase()).join("-");
      }

      item.extra.transactionToken = farm.lpAddress;
      item.extra.transactionAddress = bearn.MASTER_ADDRESS;

      if (data[farm.pid] && data[farm.pid].apy) {
        item.yield = {
          apy: data[farm.pid].apy
        };
      }

      if (data[farm.pid] && data[farm.pid].tvl) {
        item.tvl = {
          usd: data[farm.pid].tvl
        };
      }

      if (farm.platform) {
        item.platform = farm.platform.toLowerCase();
      }

      return Object.freeze(item);
    });

    this.cache.put(cacheKey, result, { ttl: 1000 * 60 * 30 });

    console.log("bearn updated");

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

      const vault = new Web3EthContract(bearn.MASTER_ABI, bearn.MASTER_ADDRESS);

      return {
        userInfo: vault.methods.userInfo(farm.raw.pid, address),
        pendingReward0: vault.methods.pendingReward(farm.raw.pid, 0, address),
        pendingReward1: vault.methods.pendingReward(farm.raw.pid, 1, address),
        pendingReward2: vault.methods.pendingReward(farm.raw.pid, 2, address),
        stakedWantTokens: vault.methods.stakedWantTokens(farm.raw.pid, address),
        id: farm.id.toString()
      };
    });

    const calls = await Utils.multiCall(vaultCalls);

    const resultFarms = calls
      .filter(v => new BigNumber(v.userInfo[0] || 0).isGreaterThan(0))
      .map(call => {
        const farm = farms.find(f => f.id === call.id);

        const amount = call.stakedWantTokens;
        // let rewards = call.pendingCake || 0;

        const result = {};

        result.deposit = {
          symbol: "?",
          amount: amount / 1e18
        };

        const price = this.priceOracle.getAddressPrice(farm.raw.lpAddress);

        if (price) {
          result.deposit.usd = (amount / 1e18) * price;
        }

        const earns = ["bfi", "bdo", "mdg"];
        const rewards = [];
        [call.pendingReward0, call.pendingReward1, call.pendingReward2].forEach(
          (value, index) => {
            if (value > 0 && earns[index]) {
              const reward = {
                symbol: earns[index],
                amount: value / 1e18
              };

              let priceReward = this.priceOracle.findPrice(earns[index]);
              if (priceReward) {
                reward.usd = reward.amount * priceReward;
              }

              rewards.push(reward);
            }
          }
        );

        if (rewards.length > 0) {
          result.rewards = rewards;
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

    const yieldDetails = Utils.findYieldForDetails(result);
    if (yieldDetails) {
      result.yield = yieldDetails;
    }

    return result;
  }
};
