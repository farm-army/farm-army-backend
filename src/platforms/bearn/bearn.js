"use strict";

const fs = require("fs");
const path = require("path");
const Web3EthContract = require("web3-eth-contract");
const BigNumber = require("bignumber.js");
const request = require("async-request");
const Utils = require("../../utils");

const POOLCHEF_ABI = require('./abi/poolchef.json')

module.exports = class bearn {
  constructor(cache, priceOracle) {
    this.cache = cache;
    this.priceOracle = priceOracle;
  }

  static MASTER_ABI = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "abi/masterchef.json"), "utf8")
  )
  static MASTER_ADDRESS =  "0xb390b07fcf76678089cb12d8e615d5fe494b01fb"
  static POOLS_MASTER_ADDRESS = "0x3d695c1607a085773547e07dEf1aD3CE3f518Edb"

  async getLbAddresses() {
    return this.getRawVaults()
      .filter(farm => farm.lpTokens && farm.lpTokens.length === 2)
      .map(farm => farm.lpAddress);
  }

  getRawVaults() {
    // https://api.bdollar.fi/api/bvault/get-vaults
    return JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "farms/farms.json"), "utf8")
    ).vaults;
  }

  getRawPools() {
    return JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "farms/farms.json"), "utf8")
    ).pools;
  }

  async getAddressFarms(address) {
    const cacheItem = this.cache.get(`getAddressFarms-bearn-${address}`);
    if (cacheItem) {
      return cacheItem;
    }

    let farms = await this.getFarms();

    const vaultCalls = farms
      .filter(farm => farm.id.startsWith('bearn_vault_'))
      .map(farm => {
        const vault = new Web3EthContract(bearn.MASTER_ABI, bearn.MASTER_ADDRESS);

        return {
          userInfo: vault.methods.userInfo(farm.raw.pid, address),
          stakedWantTokens: vault.methods.stakedWantTokens(farm.raw.pid, address),
          id: farm.id.toString()
        };
      });

    const poolCalls = farms
      .filter(farm => farm.id.startsWith('bearn_pool_'))
      .map(farm => {
        const vault = new Web3EthContract(POOLCHEF_ABI, bearn.POOLS_MASTER_ADDRESS);

        return {
          userInfo: vault.methods.userInfo(farm.raw.pid, address),
          id: farm.id.toString()
        };
      });

    const [vaults, pools] = await Promise.all([
      Utils.multiCall(vaultCalls),
      Utils.multiCall(poolCalls),
    ]);

    const result = [...vaults, ...pools]
      .filter(
        v =>
          new BigNumber(v.userInfo[0] || 0).isGreaterThan(Utils.DUST_FILTER) ||
          new BigNumber(v.stakedWantTokens || 0).isGreaterThan(Utils.DUST_FILTER)
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

    const [responseVaults, responsePools] = await Promise.all([
      request("https://api.bdollar.fi/api/bvault/get-vaults"),
      request("https://api.bearn.fi/v1/general/pools"),
    ])

    const vaultsInfo = {};
    Object.values(JSON.parse(responseVaults.body).data.vaultInfos).forEach(v => {
      vaultsInfo[v.pid] = v;
    });

    const poolsInfo = {};
    Object.values(JSON.parse(responsePools.body).data.pools.bsc).forEach(v => {
      poolsInfo[v.pid] = v;
    });

    const farms = this.getRawVaults().map(farm => {
      const item = {
        id: `bearn_vault_${farm.pid}`,
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

      if (vaultsInfo[farm.pid] && vaultsInfo[farm.pid].apy) {
        item.yield = {
          apy: vaultsInfo[farm.pid].apy
        };
      }

      if (vaultsInfo[farm.pid] && vaultsInfo[farm.pid].tvl) {
        item.tvl = {
          usd: vaultsInfo[farm.pid].tvl
        };
      }

      if (farm.platform) {
        item.platform = farm.platform.toLowerCase();
      }

      return Object.freeze(item);
    });

    const pools = this.getRawPools().map(farm => {
      const item = {
        id: `bearn_pool_${farm.id.toLowerCase()}_${farm.pid}`,
        name: farm.name,
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

      item.earns = ['bfi'];

      if (farm.lpTokens && farm.lpTokens.length) {
        item.name = farm.lpTokens.map(i => i.symbol.toUpperCase()).join("-");
        item.token = farm.lpTokens.map(i => i.symbol.toLowerCase()).join("-");
      }

      item.extra.transactionToken = farm.lpAddress;
      item.extra.transactionAddress = bearn.POOLS_MASTER_ADDRESS;

      if (poolsInfo[farm.pid] && poolsInfo[farm.pid].APY) {
        item.yield = {
          apy: poolsInfo[farm.pid].APY
        };
      }

      if (poolsInfo[farm.pid] && poolsInfo[farm.pid].TVL) {
        item.tvl = {
          usd: poolsInfo[farm.pid].TVL
        };
      }

      return Object.freeze(item);
    });

    const result = [...farms, ...pools]

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
      const contract = new Web3EthContract(bearn.MASTER_ABI, bearn.MASTER_ADDRESS);

      return {
        userInfo: contract.methods.userInfo(farm.raw.pid, address),
        pendingReward0: contract.methods.pendingReward(farm.raw.pid, 0, address),
        pendingReward1: contract.methods.pendingReward(farm.raw.pid, 1, address),
        pendingReward2: contract.methods.pendingReward(farm.raw.pid, 2, address),
        stakedWantTokens: contract.methods.stakedWantTokens(farm.raw.pid, address),
        id: farm.id.toString()
      };
    });

    const poolCalls = addresses.map(id => {
      const farm = farms.find(f => f.id === id);
      const contract = new Web3EthContract(POOLCHEF_ABI, bearn.POOLS_MASTER_ADDRESS);

      return {
        userInfo: contract.methods.userInfo(farm.raw.pid, address),
        pendingReward0: contract.methods.pendingBearn(farm.raw.pid, address),
        id: farm.id.toString()
      };
    });

    const [vaults, pools] = await Promise.all([
      Utils.multiCall(vaultCalls),
      Utils.multiCall(poolCalls),
    ]);

    const resultFarms = [...vaults, ...pools]
      .filter(v => new BigNumber(v.userInfo[0] || 0).isGreaterThan(0))
      .map(call => {
        const farm = farms.find(f => f.id === call.id);

        let amount = call.stakedWantTokens;
        if (!amount && call.userInfo[0]) {
          amount = call.userInfo[0];
        }

        const result = {};

        result.deposit = {
          symbol: "?",
          amount: amount / 1e18
        };

        const price = this.priceOracle.getAddressPrice(farm.raw.lpAddress);

        if (price) {
          result.deposit.usd = result.deposit.amount * price;
        }

        const earns = {
          bfi: call.pendingReward0,
          bdo: call.pendingReward1,
          mdg: call.pendingReward2,
        };

        const rewards = [];

        for (const [tokenName, amount] of Object.entries(earns)) {
          if (!amount || amount <= 0) {
            continue;
          }

          const reward = {
            symbol: tokenName,
            amount: amount / 1e18
          };

          let priceReward = this.priceOracle.findPrice(tokenName);
          if (priceReward) {
            reward.usd = reward.amount * priceReward;
          }

          rewards.push(reward);
        }

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
