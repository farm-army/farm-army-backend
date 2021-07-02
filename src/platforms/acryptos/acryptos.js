"use strict";

const fs = require("fs");
const path = require("path");
const _ = require("lodash");
const Web3EthContract = require("web3-eth-contract");

const vaultAbi = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "./abi/vault.json"), "utf8")
);
const masterAbi = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "./abi/master.json"), "utf8")
);
const masterV2Abi = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "./abi/masterV2.json"), "utf8")
);
const tokenV2Abi = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "./abi/tokenV2.json"), "utf8")
);
const stableAbi = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "./abi/stable.json"), "utf8")
);
const minterAbi = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "./abi/minter.json"), "utf8")
);

const BigNumber = require("bignumber.js");
const Utils = require("../../utils");

module.exports = class acryptos {
  constructor(cache, priceOracle) {
    this.cache = cache;
    this.priceOracle = priceOracle;
  }

  static STATIC_TOKENS = {
    ACS4VAI: "0xeb7dc7b3bff60a450eff31edf1330355361ea5ad",
    ACS4UST: "0xd3debe4a971e4492d0d61ab145468a5b2c23301b",
    ACS4QUSD: "0x49440376254290b3264183807a16450457f02b28",
    ACS4USD: "0x83d69ef5c9837e21e2389d47d791714f5771f29b"
  }

  getRawPools() {
    return JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "farms/farms.json"), "utf8")
    );
  }

  async getAddressFarms(address) {
    const cacheKey = `getAddressFarms-acryptos-${address}`;

    const cacheItem = this.cache.get(cacheKey);
    if (cacheItem) {
      return cacheItem;
    }

    const pools = await this.getFarms();

    // unstaked
    const callsUnstakedPromises = Utils.multiCall(
      pools
        .filter(f => f.raw.vault && f.raw.vault.address)
        .map(farm => {
          const token = new Web3EthContract(vaultAbi, farm.raw.vault.address);
          return {
            id: farm.id,
            balanceOf: token.methods.balanceOf(address)
          };
        })
    );

    // stakes
    const stakedPromises = Utils.multiCall(
      pools
        .filter(f => f.raw.farm && f.raw.farm.master && f.raw.farm.pid)
        .map(farm => {
          const token = new Web3EthContract(masterAbi, farm.raw.farm.master);
          return {
            id: farm.id.toString(),
            userInfo: token.methods.userInfo(farm.raw.farm.pid, address)
          };
        })
    );

    // v2
    const v2Promises = Utils.multiCall(
      pools
        .filter(
          f =>
            f.raw.farm &&
            f.raw.farm.master &&
            !f.raw.farm.pid &&
            f.raw.farm.token
        )
        .map(farm => {
          const token = new Web3EthContract(masterV2Abi, farm.raw.farm.master);
          return {
            id: farm.id.toString(),
            userInfo: token.methods.userInfo(farm.raw.farm.token, address)
          };
        })
    );

    const [callsUnstaked, staked, v2] = await Promise.all([
      callsUnstakedPromises,
      stakedPromises,
      v2Promises
    ]);

    const result = callsUnstaked
      .filter(v => new BigNumber(v.balanceOf).isGreaterThan(0))
      .map(v => v.id);

    const result2 = staked
      .filter(v =>
        new BigNumber((v.userInfo && v.userInfo[0]) || 0).isGreaterThan(0)
      )
      .map(v => v.id);

    const result3 = v2
      .filter(v =>
        new BigNumber((v.userInfo && v.userInfo[0]) || 0).isGreaterThan(0)
      )
      .map(v => v.id);

    const all = _.uniq([...result, ...result2, ...result3]);

    this.cache.put(cacheKey, all, { ttl: 300 * 1000 });

    return all;
  }

  async getStableFarmsPrices() {
    const foo = await Utils.multiCall(
      this
        .getRawPools()
        .filter(
          farm =>
            farm.farm &&
            farm.farm.master === "0x96c8390BA28eB083A784280227C37b853bc408B7"
        )
        .map(farm => {
          return {
            poolInfo: new Web3EthContract(
              masterAbi,
              farm.farm.master
            ).methods.poolInfo(farm.farm.pid),
            pid: farm.farm.pid.toString()
          };
        })
    );

    const minterFinds = foo.map(call => {
      return {
        minter: new Web3EthContract(
          stableAbi,
          call.poolInfo[0]
        ).methods.minter(),
        pid: call.pid.toString()
      };
    });

    const minters = (await Utils.multiCall(minterFinds)).filter(c => c.minter);

    return Utils.multiCallIndexBy(
      "pid",
      minters.map(call => {
        return {
          virtualPrice: new Web3EthContract(
            minterAbi,
            call.minter
          ).methods.get_virtual_price(),
          pid: call.pid.toString()
        };
      })
    );
  }

  async getFarmsV2Prices(pools) {
    const v2TokenPricesPromise = pools
      .filter(
        farm =>
          farm.farm && farm.farm.master && !farm.farm.pid && farm.farm.token
      )
      .map(farm => {
        const token = new Web3EthContract(tokenV2Abi, farm.farm.token);
        return {
          token: farm.farm.token,
          pricePerFullShare: token.methods.getPricePerFullShare()
        };
      });

    return Utils.multiCallIndexBy("token", v2TokenPricesPromise);
  }

  async getFarms(refresh = false) {
    const cacheKey = "getFarms-acryptos";

    if (!refresh) {
      const cacheItem = this.cache.get(cacheKey);
      if (cacheItem) {
        return cacheItem;
      }
    }

    const pools = this.getRawPools();

    const vaultCallsPromise = Utils.multiCall(
      pools
        .filter(f => f.vault && f.vault.address)
        .map(farm => {
          return {
            totalSupply: new Web3EthContract(
              vaultAbi,
              farm.vault.address
            ).methods.totalSupply(),
            lpAddress: farm.vault.token
          };
        })
    );

    const [vaultCalls, fooCalls, v2TokenPrices] = await Promise.all([
      vaultCallsPromise,
      this.getStableFarmsPrices(),
      this.getFarmsV2Prices(pools)
    ]);

    const farmTvls = {};
    vaultCalls.forEach(call => {
      farmTvls[call.lpAddress] = call.totalSupply;
    });

    const result = this.getRawPools().map((i, index) => {
      let token;

      if (i.vault && i.vault.tokenSymbol) {
        token = i.vault.tokenSymbol;
      } else if (i.farm && i.farm.tokenSymbol) {
        token = i.farm.tokenSymbol;
      }

      const item = {
        id: `acryptos_${index}`,
        name: token,
        token: token.toLowerCase().replace(/(acs\d+)/, ""),
        provider: "acryptos",
        raw: Object.freeze(i),
        link: "https://app.acryptos.com/",
        has_details: true,
        extra: {},
        earns: []
      };

      const tags = i.tags || [];
      if (tags.includes("acs")) {
        item.earns.push("acs");
      } else if (tags.includes("acsi")) {
        item.earns.push("acsi");
      }

      if (i.tags && (i.tags.includes("pancake") || i.tags.includes("pancakeV2"))) {
        item.platform = "pancake";
      } else if (i.tags && i.tags.includes("mdex")) {
        item.platform = "venus";
      } else if (i.tags && i.tags.includes("venus")) {
        item.platform = "venus";
      } else if (i.tags && i.tags.includes("swipeswap")) {
        item.platform = "swipe";
      }

      if (i.vault && i.vault.token && farmTvls[i.vault.token]) {
        item.tvl = {
          amount: farmTvls[i.vault.token] / 1e18
        };

        const addressPrice = this.priceOracle.getAddressPrice(i.vault.token);
        if (addressPrice) {
          item.tvl.usd = item.tvl.amount * addressPrice;
        }
      }

      if (
        i.vault &&
        i.vault.tokenSymbol &&
        i.vault.tokenSymbol.includes("-") &&
        i.vault.token &&
        i.vault.address
      ) {
        // lpAddress
        item.extra.lpAddress = i.vault.token;
        item.extra.transactionToken = i.vault.token;
        item.extra.transactionAddress = i.vault.address;
      } else if (
        i.vault &&
        i.vault.tokenSymbol &&
        i.vault.token &&
        i.vault.address
      ) {
        // single
        item.extra.transactionToken = i.vault.token;
        item.extra.transactionAddress = i.vault.address;
      }

      if (
        i.farm &&
        i.farm.master &&
        i.farm.tokenSymbol &&
        acryptos.STATIC_TOKENS[i.farm.tokenSymbol]
      ) {
        item.extra.transactionToken =
          acryptos.STATIC_TOKENS[i.farm.tokenSymbol];
        item.extra.transactionAddress = i.farm.master;
      }

      if (
        i.farm &&
        i.farm.pid &&
        fooCalls[i.farm.pid] &&
        fooCalls[i.farm.pid].virtualPrice
      ) {
        item.extra.virtualPrice = fooCalls[i.farm.pid].virtualPrice / 1e18;
      }

      if (
        i.farm &&
        i.farm.token &&
        v2TokenPrices[i.farm.token].pricePerFullShare &&
        new BigNumber(
          v2TokenPrices[i.farm.token].pricePerFullShare
        ).isGreaterThan(0)
      ) {
        item.extra.pricePerFullShare =
          v2TokenPrices[i.farm.token].pricePerFullShare / 1e18;
      }

      return Object.freeze(item);
    });

    this.cache.put(cacheKey, result, { ttl: 1000 * 60 * 30 });

    console.log("acryptos updated");

    return result;
  }

  async getYields(address) {
    const addressFarms = await this.getAddressFarms(address);
    if (addressFarms.length === 0) {
      return [];
    }

    return await this.getYieldsInner(address, addressFarms);
  }

  async getYieldsInner(address, addressFarms) {
    if (addressFarms.length === 0) {
      return [];
    }

    const farms = await this.getFarms();

    const unstakedPromises = Utils.multiCallIndexBy(
      "id",
      addressFarms
        .filter(s => {
          const farm = farms.filter(f => f.id === s)[0];
          return farm.raw.vault && farm.raw.vault.address;
        })
        .map(a => {
          const farm = farms.filter(f => f.id === a)[0];

          const token = new Web3EthContract(vaultAbi, farm.raw.vault.address);
          return {
            id: farm.id,
            balanceOf: token.methods.balanceOf(address),
            pricePerFullShare: token.methods.getPricePerFullShare()
          };
        })
    );

    const stakedPromises = Utils.multiCallIndexBy(
      "id",
      addressFarms
        .filter(farmId => {
          const farm = farms.find(f => f.id === farmId);
          return farm.raw.farm && farm.raw.farm.master && farm.raw.farm.pid;
        })
        .map(farmId => {
          const farm = farms.filter(f => f.id === farmId)[0];

          const token = new Web3EthContract(masterAbi, farm.raw.farm.master);
          return {
            id: farm.id.toString(),
            pendingSushi: token.methods.pendingSushi(
              farm.raw.farm.pid,
              address
            ),
            userInfo: token.methods.userInfo(farm.raw.farm.pid, address)
          };
        })
    );

    const v2CallsPromises = Utils.multiCallIndexBy(
      "id",
      addressFarms
        .filter(farmId => {
          const farm = farms.find(f => f.id === farmId);
          return (
            farm.raw.farm &&
            farm.raw.farm.master &&
            !farm.raw.farm.pid &&
            farm.raw.farm.token
          );
        })
        .map(farmId => {
          const farm = farms.find(f => f.id === farmId);

          const token = new Web3EthContract(masterV2Abi, farm.raw.farm.master);
          return {
            id: farm.id.toString(),
            userInfo: token.methods.userInfo(farm.raw.farm.token, address),
            pendingSushi: token.methods.pendingSushi(
              farm.raw.farm.token,
              address
            )
          };
        })
    );

    const [unstaked, staked, v2Calls] = await Promise.all([
      unstakedPromises,
      stakedPromises,
      v2CallsPromises
    ]);

    return farms
      .filter(f => addressFarms.includes(f.id))
      .map(farm => {
        const result = {};

        result.farm = farm;

        const unStakedCall = unstaked[farm.id] || {};
        const stakedCall = staked[farm.id] || {};

        let amount = new BigNumber(0);
        if (stakedCall.userInfo && stakedCall.userInfo[0]) {
          amount = amount.plus(new BigNumber(stakedCall.userInfo[0]));
        }

        if (unStakedCall.balanceOf) {
          amount = amount.plus(new BigNumber(unStakedCall.balanceOf));
        }

        if (amount.isGreaterThan(0)) {
          let { pricePerFullShare } = unStakedCall;
          if (!pricePerFullShare) {
            pricePerFullShare = 1e18;
          }

          result.deposit = {
            symbol: "?",
            amount: (amount.toNumber() * pricePerFullShare) / 1e18 / 1e18
          };

          if (farm.raw.vault) {
            let price = this.priceOracle.findPrice(farm.raw.vault.token);

            if (!price && farm.raw.vault.tokenSymbol) {
              price = this.priceOracle.findPrice(farm.raw.vault.tokenSymbol.toLowerCase());
            }

            if (price) {
              result.deposit.usd = result.deposit.amount * price;
            }
          } else if (farm.extra && farm.extra.virtualPrice) {
            result.deposit.usd =
              result.deposit.amount * farm.extra.virtualPrice;
          }
        }

        // V2
        if (
          farm.extra.pricePerFullShare &&
          v2Calls[farm.id] &&
          v2Calls[farm.id].userInfo
        ) {
          const [amount, weight, rewardDebt, rewardCredit] = Object.values(
            v2Calls[farm.id].userInfo
          );

          if (amount > 0) {
            result.deposit = {
              symbol: "?",
              amount: (amount / 1e18) * farm.extra.pricePerFullShare
            };

            const price = this.priceOracle.getAddressPrice(farm.raw.vault.token);
            if (price) {
              result.deposit.usd = result.deposit.amount * price;
            }
          }
        }

        let pendingSushi;
        if (
          stakedCall.pendingSushi &&
          new BigNumber(stakedCall.pendingSushi).isGreaterThan(0)
        ) {
          pendingSushi = stakedCall.pendingSushi;
        }

        // V2
        if (
          farm.extra.pricePerFullShare &&
          v2Calls[farm.id] &&
          v2Calls[farm.id].pendingSushi &&
          new BigNumber(v2Calls[farm.id].pendingSushi).isGreaterThan(0)
        ) {
          pendingSushi = v2Calls[farm.id].pendingSushi;
        }

        if (pendingSushi && new BigNumber(pendingSushi).isGreaterThan(0)) {
          let reward = {};

          reward = {
            amount: pendingSushi / 1e18,
            symbol: "?"
          };

          const tags = farm.raw.tags || [];

          let tokenEarn;
          if (tags.includes("acs")) {
            tokenEarn = "acs";
          } else if (tags.includes("acsi")) {
            tokenEarn = "acsi";
          }

          reward.symbol = tokenEarn;

          if (tokenEarn) {
            const price = this.priceOracle.findPrice(tokenEarn);
            if (price) {
              reward.usd = reward.amount * price;
            }
          }

          result.rewards = [reward];
        }

        return result;
      });
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
