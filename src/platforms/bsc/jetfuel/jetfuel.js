"use strict";

const _ = require("lodash");
const fs = require("fs");
const path = require("path");
const BigNumber = require("bignumber.js");
const Utils = require("../../../utils");
const Web3EthContract = require("web3-eth-contract");
const utils = require("../../../utils");

const flueMasterChef = "0x86f4bc1ebf2c209d12d3587b7085aea5707d4b56";

const vaultAbi = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "abi/vault.json"), "utf8")
);
const flueMasterChefAbi = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "abi/masterChef.json"), "utf8")
);

module.exports = class jetfuel {
  constructor(cacheManager, priceOracle) {
    this.cacheManager = cacheManager;
    this.priceOracle = priceOracle;
  }

  getRawFuels(...types) {
    return JSON.parse(fs.readFileSync(path.resolve(__dirname, "farms/fuels.json"), "utf8"))
      .filter(p => p.disabled !== true)
      .filter(p => types.includes(p.asset.type));
  }

  async getLbAddresses() {
    const addresses = this.getRawFuels("lp")
      .filter(farm => farm.asset.address)
      .map(farm => farm.asset.address);

    return _.uniq(addresses);
  }

  async getAddressFarms(address) {
    const cacheKey = `getAddressFarms-jetfuel-${address}`;

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    const farms = this.getRawFuels("lp", "single");

    const vaultCalls = farms.map(farm => {
      const vault = new Web3EthContract(vaultAbi, farm.vaultAsset.address);
      return {
        balanceOf: vault.methods.balanceOf(address),
        id: `jetfuel_vault_${farm.id.toString()}`
      };
    });

    const fuelCalls = farms
      .filter(farm => farm.asset && farm.asset.inFuel === true)
      .map(farm => {
        const vault = new Web3EthContract(flueMasterChefAbi, flueMasterChef);
        return {
          userInfo: vault.methods.userInfo(farm.id, address),
          id: `jetfuel_fuel_${farm.id.toString()}`
        };
      });

    const [vaultResults, fuelResults] = await Promise.all([
      utils.multiCall(vaultCalls),
      utils.multiCall(fuelCalls)
    ]);

    const result1 = vaultResults
      .filter(v => new BigNumber(v.balanceOf).isGreaterThan(Utils.DUST_FILTER))
      .map(v => v.id);

    const result2 = fuelResults
      .filter(
        v =>
          v.userInfo[0] &&
          new BigNumber(v.userInfo[0]).isGreaterThan(Utils.DUST_FILTER)
      )
      .map(v => v.id);

    const result = [...result1, ...result2];

    await this.cacheManager.set(cacheKey, result, {ttl: 60 * 5});

    return result;
  }

  async getFarms(refresh = false) {
    const cacheKey = "getFarms-jetfuel";

    if (!refresh) {
      const cache = await this.cacheManager.get(cacheKey)
      if (cache) {
        return cache;
      }
    }

    const tvls = await Utils.multiCallIndexBy(
      "address",
      this.getRawFuels("lp").map(item => {
        const vault = new Web3EthContract(vaultAbi, item.vaultAsset.address);
        return {
          pricePerFullShare: vault.methods.getPricePerFullShare(),
          totalSupply: vault.methods.totalSupply(),
          lpAddress: vault.methods.token(),
          address: item.vaultAsset.address
        };
      })
    );

    const resultFarms = this.getRawFuels("lp", "single").map(i => {
      let token = i.vaultAsset.symbol;

      token = token.toLowerCase().replace("-cake-vault", "");
      token = token.toLowerCase().replace("-cake-v2-vault", "");
      token = token
        .toLowerCase()
        .replace("-CAKE-NON-FUEL-VAULT".toLowerCase(), "");
      token = token.toLowerCase().replace("-VENUS-VAULT".toLowerCase(), "");
      token = token.toLowerCase().replace("-BSCX-FARM-VAULT".toLowerCase(), "");
      token = token.toLowerCase().replace("-SS-VAULT".toLowerCase(), "");
      token = token.toLowerCase().replace("-V2-VAULT".toLowerCase(), "");
      token = token.toLowerCase().replace("-VENUS-V2-VAULT".toLowerCase(), "");

      const item = {
        id: `jetfuel_vault_${i.id}`,
        name: i.asset.label,
        token: token,
        provider: "jetfuel",
        raw: Object.freeze(i),
        has_details: true,
        extra: {},
        compound: true,
        chain: 'bsc',
      };

      if (i.asset.provider && i.asset.provider.value) {
        item.platform = i.asset.provider.value;
      }

      item.link = `https://jetfuel.finance/vaults/${i.route}`;

      const lpAddress = i.vaultAsset.address;

      if (i.asset && i.asset.type === "lp") {
        item.extra.lpAddress = i.asset.address;
      }

      item.extra.transactionToken = i.asset.address;
      item.extra.transactionAddress = i.vaultAsset.address;

      if (tvls[lpAddress] && tvls[lpAddress].totalSupply) {
        item.tvl = {
          amount:
            (tvls[lpAddress].totalSupply * tvls[lpAddress].pricePerFullShare) /
            1e18
        };

        if (tvls[lpAddress].lpAddress) {
          const price = this.priceOracle.getAddressPrice(tvls[lpAddress].lpAddress);
          if (price) {
            item.tvl.usd = (item.tvl.amount / 1e18) * price;
          }
        }
      }

      return Object.freeze(item);
    });

    const fuelVaults = this
      .getRawFuels("lp")
      .filter(farm => farm.asset && farm.asset.inFuel === true)
      .map(i => {
        let token = i.vaultAsset.symbol;

        token = token.toLowerCase().replace("-cake-vault", "");
        token = token.toLowerCase().replace("-cake-v2-vault", "");
        token = token
          .toLowerCase()
          .replace("-CAKE-NON-FUEL-VAULT".toLowerCase(), "");
        token = token.toLowerCase().replace("-VENUS-VAULT".toLowerCase(), "");
        token = token
          .toLowerCase()
          .replace("-BSCX-FARM-VAULT".toLowerCase(), "");
        token = token.toLowerCase().replace("-SS-VAULT".toLowerCase(), "");
        token = token.toLowerCase().replace("-V2-VAULT".toLowerCase(), "");
        token = token
          .toLowerCase()
          .replace("-VENUS-V2-VAULT".toLowerCase(), "");

        const item = {
          id: `jetfuel_fuel_${i.id}`,
          name: i.asset.label,
          token: token,
          provider: "jetfuel",
          raw: Object.freeze(i),
          platform: i.asset.provider.value,
          has_details: true,
          earns: ["fuel"],
          link: `https://jetfuel.finance/fuels/${i.route}`,
          extra: {},
          chain: 'bsc',
        };

        // ony lp
        if (i.asset && i.asset.type === "lp" && i.asset.address) {
          item.extra.lpAddress = i.asset.address;
        }

        item.extra.transactionToken = i.asset.address;
        item.extra.transactionAddress = flueMasterChef;

        return Object.freeze(item);
      });

    const result = [...resultFarms, ...fuelVaults];

    await this.cacheManager.set(cacheKey, result, {ttl: 60 * 30});

    console.log("jetfuel updated");

    return result;
  }

  async getYields(address) {
    const addressFarms = await this.getAddressFarms(address);
    if (addressFarms.length === 0) {
      return [];
    }

    return await this.getYieldsInner(address, addressFarms);
  }

  async getYieldsInner(address, addressVaults) {
    if (addressVaults.length === 0) {
      return [];
    }

    const farms = await this.getFarms();

    const vaultCalls = addressVaults
      .filter(id => id.startsWith("jetfuel_vault_"))
      .map(id => {
        const farm = farms.find(f => f.id.toString() === id.toString());

        const vault = new Web3EthContract(
          vaultAbi,
          farm.raw.vaultAsset.address
        );
        return {
          balanceOf: vault.methods.balanceOf(address),
          getPricePerFullShare: vault.methods.getPricePerFullShare(),
          token: vault.methods.token(),
          id: farm.id.toString()
        };
      });

    const fuelCalls = addressVaults
      .filter(id => id.startsWith("jetfuel_fuel_"))
      .map(id => {
        const farm = farms.find(f => f.id.toString() === id.toString());

        const vault = new Web3EthContract(flueMasterChefAbi, flueMasterChef);
        return {
          userInfo: vault.methods.userInfo(farm.raw.id.toString(), address),
          pendingFuel: vault.methods.pendingFuel(
            farm.raw.id.toString(),
            address
          ),
          id: farm.id.toString()
        };
      });

    const [calls, fuels] = await Promise.all([
      utils.multiCall(vaultCalls),
      utils.multiCall(fuelCalls)
    ]);

    const resultFarms = calls
      .filter(c => c.balanceOf && new BigNumber(c.balanceOf).isGreaterThan(0))
      .map(call => {
        const farm = farms.find(f => f.id === call.id);

        const result = {};
        const total = (call.balanceOf * call.getPricePerFullShare) / 1e18;

        result.deposit = {
          symbol: "?",
          amount: total / 1e18
        };

        if (call.token) {
          const price = this.priceOracle.getAddressPrice(call.token);
          if (price) {
            result.deposit.usd = (total / 1e18) * price;
          }
        }

        result.farm = farm;

        return result;
      });

    const resultFuels = fuels
      .filter(
        c =>
          c.userInfo &&
          c.userInfo[0] &&
          new BigNumber(c.userInfo[0]).isGreaterThan(0)
      )
      .map(call => {
        const farm = farms.find(f => f.id === call.id);

        const result = {};
        result.farm = farm;

        const total = call.userInfo[0];

        result.deposit = {
          symbol: "?",
          amount: total / 1e18
        };

        if (farm.raw.asset && farm.raw.asset.address) {
          const price = this.priceOracle.getAddressPrice(farm.raw.asset.address);
          if (price) {
            result.deposit.usd = result.deposit.amount * price;
          }
        }

        if (call.pendingFuel > 0) {
          const reward = {
            symbol: "fuel",
            amount: call.pendingFuel / 1e18
          };

          const priceReward = this.priceOracle.findPrice("fuel");
          if (priceReward) {
            reward.usd = reward.amount * priceReward;
          }

          result.rewards = [reward];
        }

        return result;
      });

    return [...resultFarms, ...resultFuels];
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
