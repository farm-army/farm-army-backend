"use strict";

const fs = require("fs");
const path = require("path");
const Web3EthContract = require("web3-eth-contract");
const BigNumber = require("bignumber.js");
const request = require("async-request");
const Utils = require("../../utils");

module.exports = class bdollar {
  constructor(cache, priceOracle) {
    this.cache = cache;
    this.priceOracle = priceOracle;
  }

  static MASTER_ABI = JSON.parse(
    fs.readFileSync(
      path.resolve(
        __dirname,
        "abi/0x948dB1713D4392EC04C86189070557C5A8566766.json"
      ),
      "utf8"
    )
  )

  static MASTER_ADDRESS = "0x948dB1713D4392EC04C86189070557C5A8566766"

  static TOKENS = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "farms/tokens.json"), "utf8")
  )

  getRawPools() {
    // https://api.bdollar.fi/api/bvault/get-vaults
    return Object.values(
      JSON.parse(
        fs.readFileSync(path.resolve(__dirname, "farms/farms.json"), "utf8")
      )
    ).filter(f => f.type === "share");
  }

  async getAddressFarms(address) {
    const cacheItem = this.cache.get(`getAddressFarms-bdollar-${address}`);
    if (cacheItem) {
      return cacheItem;
    }

    const vaultCalls = (await this.getFarms()).map(farm => {
      const vault = new Web3EthContract(bdollar.MASTER_ABI, bdollar.MASTER_ADDRESS);

      return {
        userInfo: vault.methods.userInfo(farm.raw.pid, address),
        id: farm.id.toString()
      };
    });

    const farmCalls = await Utils.multiCall(vaultCalls);

    const result = farmCalls
      .filter(v =>
        new BigNumber(v.userInfo[0] || 0).isGreaterThan(Utils.DUST_FILTER)
      )
      .map(v => v.id);

    this.cache.put(`getAddressFarms-bdollar-${address}`, result, {
      ttl: 300 * 1000
    });

    return result;
  }

  async getFarms(refresh = false) {
    const cacheKey = "getFarms-bdollar";

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
      const name = farm.name
        .toLowerCase()
        .replace("pancake", "")
        .replace("/", "-")
        .trim();

      const item = {
        id: `bdollar_share_${farm.pid}`,
        name: name.toUpperCase(),
        token: name.toUpperCase(),
        provider: "bdollar",
        raw: Object.freeze(farm),
        link: "https://bdollar.fi/shares",
        has_details: true,
        extra: {}
      };

      if (bdollar.TOKENS[farm.depositTokenName]) {
        item.extra.lpAddress = bdollar.TOKENS[farm.depositTokenName][0];
        item.extra.transactionToken = item.extra.lpAddress;
      }

      if (farm.earnTokenName) {
        item.earns = [farm.earnTokenName.toLowerCase()];
      }

      item.extra.transactionAddress = bdollar.MASTER_ADDRESS;

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

      return Object.freeze(item);
    });

    this.cache.put(cacheKey, result, { ttl: 1000 * 60 * 30 });

    console.log("bdollar updated");

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

      const vault = new Web3EthContract(bdollar.MASTER_ABI, bdollar.MASTER_ADDRESS);

      return {
        userInfo: vault.methods.userInfo(farm.raw.pid, address),
        pendingShare: vault.methods.pendingShare(farm.raw.pid, address),
        id: farm.id.toString()
      };
    });

    const calls = await Utils.multiCall(vaultCalls);

    const resultFarms = calls
      .filter(v => new BigNumber(v.userInfo[0] || 0).isGreaterThan(0))
      .map(call => {
        const farm = farms.find(f => f.id === call.id);

        const amount = call.userInfo[0];

        const result = {};

        result.deposit = {
          symbol: "?",
          amount: amount / 1e18
        };

        const price = this.priceOracle.findPrice(farm.extra.lpAddress);
        if (price) {
          result.deposit.usd = result.deposit.amount * price;
        }

        if (call.pendingShare > 0 && farm.earns[0]) {
          const reward = {
            symbol: farm.earns[0],
            amount: call.pendingShare / 1e18
          };

          const priceReward = this.priceOracle.findPrice(farm.earns[0]);
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
