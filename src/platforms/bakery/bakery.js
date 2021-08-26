"use strict";

const fs = require("fs");
const path = require("path");
const Web3EthContract = require("web3-eth-contract");
const BigNumber = require("bignumber.js");
const Utils = require("../../utils");

module.exports = class bakery {
  constructor(cache, priceOracle) {
    this.cache = cache;
    this.priceOracle = priceOracle;
  }

  static MASTER_ABI = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "abi/master.json"), "utf8")
  )

  // https://bscscan.com/address/0x6a8DbBfbB5a57d07D14E63E757FB80B4a7494f81#readContract
  static MASTER_ADDRESS = '0x20eC291bB8459b6145317E7126532CE7EcE5056f'

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
    const cacheItem = this.cache.get(`getAddressFarms-bakery-${address}`);
    if (cacheItem) {
      return cacheItem;
    }

    const vaultCalls = (await this.getFarms())
      .filter(f => f.raw.lpAddresses && f.raw.lpAddresses[56])
      .map(farm => {
        const vault = new Web3EthContract(
          bakery.MASTER_ABI,
          bakery.MASTER_ADDRESS
        );
        return {
          poolUserInfoMap: vault.methods.poolUserInfoMap(
            farm.raw.lpAddresses[56],
            address
          ),
          pendingBake: vault.methods.pendingBake(
            farm.raw.lpAddresses[56],
            address
          ),
          id: farm.id.toString()
        };
      });

    const farmCalls = await Utils.multiCall(vaultCalls);

    const result = farmCalls
      .filter(
        v =>
          new BigNumber(v.poolUserInfoMap[0] || 0).isGreaterThan(0) ||
          new BigNumber(v.poolUserInfoMap[1] || 0).isGreaterThan(0) ||
          new BigNumber(v.pendingBake || 0).isGreaterThan(0)
      )
      .map(v => v.id);

    this.cache.put(`getAddressFarms-bakery-${address}`, result, { ttl: 300 * 1000 });

    return result;
  }

  async getFarms(refresh = false) {
    const cacheKey = "getFarms-bakery";

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
            totalSupply: new Web3EthContract(
              Utils.erc20ABI,
              farm.lpAddresses[56]
            ).methods.totalSupply(),
            lpAddress: farm.lpAddresses[56]
          };
        })
      )
    ).forEach(call => {
      farmTvls[call.lpAddress] = call.totalSupply;
    });

    const result = rawPools.map(farm => {
      const item = {
        id: `bakery_${farm.pid}`,
        name: farm.symbol,
        token: farm.symbol.toLowerCase().replace(/(\s+blp)/, ""),
        provider: "bakery",
        raw: Object.freeze(farm),
        link: "https://www.bakeryswap.org/",
        has_details: true,
        extra: {}
      };

      if (farm.lpAddresses && farm.lpAddresses[56]) {
        item.extra.lpAddress = farm.lpAddresses[56];

        item.extra.transactionToken = item.extra.lpAddress
      }

      item.extra.transactionAddress = bakery.MASTER_ADDRESS

      if (farm.tokenSymbol) {
        item.earns = ["bake"];
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

    console.log("bakery updated");

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

      const vault = new Web3EthContract(bakery.MASTER_ABI, bakery.MASTER_ADDRESS);

      return {
        poolUserInfoMap: vault.methods.poolUserInfoMap(
          farm.raw.lpAddresses[56],
          address
        ),
        pendingBake: vault.methods.pendingBake(
          farm.raw.lpAddresses[56],
          address
        ),
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
        const rewards = call.pendingBake || 0;

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
          price = this.priceOracle.findPrice(`bake-${farm.token}`);
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


    if (farm.extra.transactionAddress && farm.extra.transactionToken) {
      return Utils.getTransactions(
        farm.extra.transactionAddress,
        farm.extra.transactionToken,
        address
      );
    }

    return {};
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
