"use strict";

const fs = require("fs");
const path = require("path");
const Web3EthContract = require("web3-eth-contract");
const BigNumber = require("bignumber.js");
const Utils = require("../../../utils");

module.exports = class valuedefi {
  constructor(cacheManager, priceOracle) {
    this.cacheManager = cacheManager;
    this.priceOracle = priceOracle;
  }

  static MASTER_ABI = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "abi/masterchef.json"), "utf8")
  )
  static VSAFE_ABI = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "abi/vsafe.json"), "utf8")
  )
  static COUNCIL_ABI = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "abi/council.json"), "utf8")
  )

  static MASTER_ADDRESS = "0xd56339F80586c08B7a4E3a68678d16D37237Bd96"

  async getLbAddresses() {
    const result1 = (await this.getRawPools())
      .filter(
        farm => farm.poolTokens && farm.poolTokens.length === 2 && farm.lpToken
      )
      .map(farm => farm.lpToken);

    const result2 = (await this.getCouncilVerified())
      .filter(
        farm =>
          farm.poolTokens &&
          farm.poolTokens.length === 2 &&
          farm.stakeToken &&
          farm.stakeToken.address
      )
      .map(farm => farm.stakeToken.address);

    return [...result1, ...result2];
  }

  async getRawPools() {
    try {
      const json = await Utils.requestJsonGet("https://api.vswap.fi/api/farm/pool-info");
      return json.data;
    } catch (e) {
      console.log('error: https://api.vswap.fi/api/farm/pool-info')
      return []
    }
  }

  async getCouncilVerified() {
    const json = await Utils.requestJsonGet("https://api.vswap.fi/api/faas/get-stats?whitelistedBy=ALL");

    return (json.data || []).filter(
      v => v.verifiedBy && v.verifiedBy.length > 0
    );
  }

  async getRawVSafe() {
    const content = await Utils.requestJsonGet("https://api-vfarm.vswap.fi/api/farming-scan/get-farming-scans?farming_name=vsafe");
    return content.data || [];
  }

  async getAddressFarms(address) {
    const cacheKey = `getAddressFarms-valuedefi-${address}`;

    const cache = await this.cacheManager.get(cacheKey);
    if (cache) {
      return cache;
    }

    const vaultCalls = (await this.getFarms())
      .filter(farm => farm.extra.type === "pool")
      .map(farm => {
        const vault = new Web3EthContract(valuedefi.MASTER_ABI, valuedefi.MASTER_ADDRESS);

        return {
          userInfo: vault.methods.userInfo(farm.raw.pid, address),
          id: farm.id.toString()
        };
      });

    const vsafeCalls = (await this.getFarms())
      .filter(farm => farm.extra.type === "vsafe")
      .map(farm => {
        const vault = new Web3EthContract(valuedefi.VSAFE_ABI, farm.raw.farmingContractAddress);

        return {
          balanceOf: vault.methods.balanceOf(address),
          id: farm.id.toString()
        };
      });

    const councilCalls = (await this.getFarms())
      .filter(farm => farm.extra.type === "council")
      .map(farm => {
        const vault = new Web3EthContract(valuedefi.COUNCIL_ABI, farm.raw.contractAddress);

        return {
          userInfo: vault.methods.getUserInfo(0, address),
          id: farm.id.toString()
        };
      });

    const [farmCalls, vSafes, councils] = await Promise.all([
      Utils.multiCall(vaultCalls),
      Utils.multiCall(vsafeCalls),
      Utils.multiCall(councilCalls)
    ]);

    const result1 = farmCalls
      .filter(v => new BigNumber(v.userInfo[0] || 0).isGreaterThan(Utils.DUST_FILTER))
      .map(v => v.id);

    const result2 = vSafes
      .filter(v => new BigNumber(v.balanceOf || 0).isGreaterThan(Utils.DUST_FILTER))
      .map(v => v.id);

    const result3 = councils
      .filter(v => new BigNumber(v.userInfo[0] || 0).isGreaterThan(Utils.DUST_FILTER))
      .map(v => v.id);

    const result = [...result1, ...result2, ...result3];

    await this.cacheManager.set(cacheKey, result, {ttl: 60 * 5});

    return result;
  }

  async getFarms(refresh = false) {
    const cacheKey = "getFarms-valuedefi";

    if (!refresh) {
      const cache = await this.cacheManager.get(cacheKey);
      if (cache) {
        return cache;
      }
    }

    const [rawPools, vSafe, councilVerified] = await Promise.all([
      this.getRawPools(),
      this.getRawVSafe(),
      this.getCouncilVerified()
    ]);

    const result1 = rawPools.map(farm => {
      let name = "?";
      if (farm.poolTokens) {
        name = farm.poolTokens.map(p => p.symbol).join("-");
      }

      const item = {
        id: `valuedefi_pool_${farm.pid}`,
        name: name,
        token: name.toLowerCase(),
        provider: "valuedefi",
        raw: Object.freeze(farm),
        link: "https://bsc.valuedefi.io/#/vfarm",
        has_details: true,
        extra: {
          type: "pool"
        },
        chain: 'bsc',
      };

      if (farm.lpToken) {
        item.extra.lpAddress = farm.lpToken;
        item.extra.transactionToken = item.extra.lpAddress;
      }

      if (farm.rewardTokens) {
        item.earns = farm.rewardTokens.map(t => t.symbol.toLowerCase());
      }

      item.extra.transactionAddress = valuedefi.MASTER_ADDRESS;

      if (farm.totalSupply) {
        item.tvl = {
          amount: farm.totalSupply
        };

        if (farm.totalSupplyUSD) {
          item.tvl.usd = farm.totalSupplyUSD;
        }
      }

      if (farm.roi && farm.roi.apy) {
        item.yield = {
          apy: farm.roi.apy
        };
      }

      return Object.freeze(item);
    });

    const result2 = vSafe.map(farm => {
      const item = {
        id: `valuedefi_vsafe_${farm.id}`,
        name: farm.wantTokenName,
        provider: "valuedefi",
        raw: Object.freeze(farm),
        link:
          farm.farmOptions && farm.farmOptions.link
            ? farm.farmOptions.link
            : "https://bsc.valuedefi.io/#/vsafe",
        has_details: true,
        extra: {
          type: "vsafe"
        },
        chain: 'bsc',
      };

      if (farm.wantTokenSymbol) {
        item.token = farm.wantTokenSymbol;
      }

      if (farm.farmOptions && farm.farmOptions.strategies) {
        const platforms = farm.farmOptions.strategies
          .filter(o => o.farmingName)
          .map(o => o.farmingName.toLowerCase());
        if (platforms.length > 0) {
          item.platform = platforms.join(", ");
        }
      }

      if (farm.wantTokenAddress && farm.farmingContractAddress) {
        item.extra.transactionAddress = farm.farmingContractAddress;
        item.extra.transactionToken = farm.wantTokenAddress;

        // item.extra.lpAddress = farm.lpToken;
      }

      if (farm.tvl) {
        item.tvl = {
          usd: farm.tvl
        };
      }

      if (farm.apy) {
        item.yield = {
          apy: farm.apy
        };
      }

      return Object.freeze(item);
    });

    const result3 = councilVerified.map(farm => {
      let token = farm.stakeToken.name;
      if (farm.poolTokens) {
        token = farm.poolTokens.map(p => p.symbol).join("-");
      }

      const item = {
        id: `valuedefi_council_${farm.contractAddress}`,
        name: farm.stakeToken.name,
        token: token,
        provider: "valuedefi",
        raw: Object.freeze(farm),
        link: "https://bsc.valuedefi.io/#/vfarm",
        has_details: true,
        extra: {
          type: "council"
        },
        chain: 'bsc',
      };

      if (farm.poolTokens && farm.poolTokens.length === 2) {
        item.extra.lpAddress = farm.stakeToken.address;
      }

      if (farm.stakeToken.address) {
        item.extra.transactionAddress = farm.contractAddress;
        item.extra.transactionToken = farm.stakeToken.address;
      }

      if (farm.rewardTokens) {
        item.earns = farm.rewardTokens.map(t => t.symbol.toLowerCase());
      }

      if (farm.totalStaked && farm.stakeToken.price) {
        item.tvl = {
          usd: farm.totalStaked * farm.stakeToken.price
        };
      }

      if (farm.roi && farm.roi.apy) {
        item.yield = {
          apy: farm.roi.apy
        };
      }

      return Object.freeze(item);
    });

    const result = [...result1, ...result2, ...result3];

    await this.cacheManager.set(cacheKey, result, {ttl: 60 * 30});

    console.log("valuedefi updated");

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

    const vaultCalls = addresses
      .filter(a => a.includes("pool"))
      .map(id => {
        const farm = farms.find(f => f.id === id);

        const vault = new Web3EthContract(valuedefi.MASTER_ABI, valuedefi.MASTER_ADDRESS);

        return {
          userInfo: vault.methods.userInfo(farm.raw.pid, address),
          pendingReward: vault.methods.pendingReward(farm.raw.pid, address),
          id: farm.id.toString()
        };
      });

    const vsafeCalls = addresses
      .filter(a => a.includes("vsafe"))
      .map(id => {
        const farm = farms.find(f => f.id === id);

        const vault = new Web3EthContract(valuedefi.VSAFE_ABI, farm.raw.farmingContractAddress);

        return {
          balanceOf: vault.methods.balanceOf(address),
          pricePerFullShare: vault.methods.getPricePerFullShare(),
          id: farm.id.toString()
        };
      });

    const councilCalls = addresses
      .filter(a => a.includes("council"))
      .map(id => {
        const farm = farms.find(f => f.id === id);

        const vault = new Web3EthContract(valuedefi.COUNCIL_ABI, farm.raw.contractAddress);

        return {
          userInfo: vault.methods.getUserInfo(0, address),
          pendingReward: vault.methods.pendingReward(0, address),
          id: farm.id.toString()
        };
      });

    const [calls, vsafes, councils] = await Promise.all([
      Utils.multiCall(vaultCalls),
      Utils.multiCall(vsafeCalls),
      Utils.multiCall(councilCalls)
    ]);

    const resultFarms1 = calls
      .filter(v => new BigNumber(v.userInfo[0] || 0).isGreaterThan(0))
      .map(call => {
        const farm = farms.find(f => f.id === call.id);

        const amount = call.userInfo[0] || 0;
        const rewards = call.pendingReward || 0;

        const result = {};

        result.deposit = {
          symbol: "?",
          amount: amount / 1e18
        };

        let price;
        if (farm.raw.lpPrice) {
          price = farm.raw.lpPrice;
        }

        if (!price && farm.extra && farm.extra.transactionToken) {
          price = this.priceOracle.getAddressPrice(farm.extra.transactionToken);
        }

        if (price) {
          result.deposit.usd = result.deposit.amount * price;
        }

        if (rewards > 0 && farm.earns && farm.earns[0]) {
          const reward = {
            symbol: farm.earns[0],
            amount: rewards / 1e18
          };

          const priceReward = this.priceOracle.getAddressPrice(
            "0x4f0ed527e8A95ecAA132Af214dFd41F30b361600"
          );
          if (priceReward) {
            reward.usd = reward.amount * priceReward;
          }

          result.rewards = [reward];
        }

        result.farm = farm;

        return result;
      });

    const resultFarms2 = vsafes
      .filter(v => new BigNumber(v.balanceOf || 0).isGreaterThan(0))
      .map(call => {
        const farm = farms.find(f => f.id === call.id);

        const amount = call.balanceOf;

        const result = {};

        result.deposit = {
          symbol: "?",
          amount: (amount * (call.pricePerFullShare || 1)) / 1e18 / 1e18
        };

        let price = this.priceOracle.findPrice(farm.raw.wantTokenAddress);
        if (!price && farm.raw.wantTokenSymbol) {
          price = this.priceOracle.findPrice(farm.raw.wantTokenSymbol.toLowerCase());
        }

        if (price) {
          result.deposit.usd = result.deposit.amount * price;
        }

        result.farm = farm;

        return result;
      });

    const resultFarms3 = councils
      .filter(v => new BigNumber(v.userInfo[0] || 0).isGreaterThan(0))
      .map(call => {
        const farm = farms.find(f => f.id === call.id);

        const amount = call.userInfo[0] || 0;
        const rewards = call.pendingReward || 0;

        const result = {};

        result.deposit = {
          symbol: "?",
          amount: amount / 1e18
        };

        let price;
        if (farm.raw.stakeToken && farm.raw.stakeToken.price) {
          price = farm.raw.stakeToken.price;
        }

        if (!price && farm.extra && farm.extra.transactionToken) {
          price = this.priceOracle.getAddressPrice(farm.extra.transactionToken);
        }

        if (price) {
          result.deposit.usd = result.deposit.amount * price;
        }

        if (rewards > 0 && farm.earns && farm.earns[0]) {
          const reward = {
            symbol: farm.earns[0],
            amount: rewards / 1e18
          };

          if (
            farm.raw.rewardTokens &&
            farm.raw.rewardTokens[0] &&
            farm.raw.rewardTokens[0].address
          ) {
            const priceReward = this.priceOracle.getAddressPrice(
              farm.raw.rewardTokens[0].address
            );
            if (priceReward) {
              reward.usd = reward.amount * priceReward;
            }
          }

          result.rewards = [reward];
        }

        result.farm = farm;

        return result;
      });

    return [...resultFarms1, ...resultFarms2, ...resultFarms3];
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

    if (farm.extra.type === "vsafe") {
      const yieldDetails = Utils.findYieldForDetails(result);
      if (yieldDetails) {
        result.yield = yieldDetails;
      }
    }

    return result;
  }

  getName() {
    return 'valuedefi';
  }
};
