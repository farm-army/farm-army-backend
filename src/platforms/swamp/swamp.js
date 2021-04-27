"use strict";

const PancakePlatformFork = require("../common").PancakePlatformFork;
const MasterChefAbi = require('./abi/masterchef.json');
const Web3EthContract = require("web3-eth-contract");
const BigNumber = require("bignumber.js");
const Utils = require("../../utils");

module.exports = class swamp extends PancakePlatformFork {
  static MASTER_ADDRESS = "0x33adbf5f1ec364a4ea3a5ca8f310b597b8afdee3"

  constructor(cache, priceOracle, tokenCollector, farmCollector, cacheManager) {
    super(cache, priceOracle);

    this.cache = cache;
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector;
    this.farmCollector = farmCollector;
    this.cacheManager = cacheManager;
  }

  async getFetchedFarms() {
    const cacheKey = `swamp-v3-master-farms`

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    const foo = (await this.farmCollector.fetchForMasterChef(swamp.MASTER_ADDRESS)).filter(f => f.isFinished !== true);

    const reformat = foo.map(f => {
      f.lpAddresses = f.lpAddress

      if (f.isTokenOnly === true) {
        f.tokenAddresses = f.lpAddress
      }

      return f
    })

    await this.cacheManager.set(cacheKey, reformat, {ttl: 60 * 30})

    return reformat;
  }
  async getYieldsInner(address, addressFarms) {
    if (addressFarms.length === 0) {
      return [];
    }

    const farms = await this.getFarms();

    const tokenCalls = addressFarms.map(id => {
      const farm = farms.find(f => f.id === id);

      const contract = new Web3EthContract(this.getMasterChefAbi(), this.getMasterChefAddress());
      return {
        id: farm.id,
        pendingNATIVE: contract.methods.pendingNATIVE(farm.raw.pid, address),
        stakedWantTokens: contract.methods.stakedWantTokens(farm.raw.pid, address)
      };
    });

    const calls = await Utils.multiCall(tokenCalls);

    const results = [];
    calls.forEach(call => {
      const farm = farms.find(f => f.id === call.id);

      const result = {};
      result.farm = farm;

      if (new BigNumber(call.pendingNATIVE).isGreaterThan(0)) {
        const reward = {
          symbol: "swamp",
          amount: call.pendingNATIVE / 1e18
        };

        const swampPrice = this.priceOracle.findPrice("swamp");
        if (swampPrice) {
          reward.usd = reward.amount * swampPrice;
        }

        result.rewards = [reward];
      }

      if (new BigNumber(call.stakedWantTokens).isGreaterThan(0)) {
        const deposit = {
          symbol: "?",
          amount: call.stakedWantTokens / 1e18
        };

        const price = this.priceOracle.getAddressPrice(this.getAddress(farm.raw.lpAddresses));
        if (price) {
          deposit.usd = deposit.amount * price;

          // dust
          if (deposit.usd < 0.01) {
            return;
          }
        }

        result.deposit = deposit;
      }

      results.push(result);
    });

    return results;
  }
  
  async getRawFarms() {
    return this.getFetchedFarms();
  }

  getRawPools() {
    return [];
  }

  getName() {
    return 'swamp';
  }

  getFarmLink() {
    return 'https://swamp.finance/app/';
  }

  getFarmEarns(farm) {
    return farm.id.startsWith(`${this.getName()}_farm_`)
      ? ['swamp']
      : undefined;

  }

  getPendingRewardContractMethod() {
    return 'pendingNATIVE';
  }

  getSousAbi() {
    return [];
  }

  getMasterChefAbi() {
    return MasterChefAbi;
  }

  getMasterChefAddress() {
    return swamp.MASTER_ADDRESS;
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
