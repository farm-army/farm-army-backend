"use strict";

const MasterChefAbi = require('./abi/masterchef_compound.json');
const PancakePlatformFork = require("../../common").PancakePlatformFork;
const Web3EthContract = require("web3-eth-contract");
const BigNumber = require("bignumber.js");

const Utils = require("../../../utils");

module.exports = class polycat_compound extends PancakePlatformFork {
  static MASTER_ADDRESS = "0xBdA1f897E851c7EF22CD490D2Cf2DAce4645A904"

  constructor(cache, priceOracle, tokenCollector, farmCollector, cacheManager, farmPlatformResolver) {
    super(cache, priceOracle);

    this.cache = cache;
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector;
    this.farmCollector = farmCollector;
    this.cacheManager = cacheManager;
    this.farmPlatformResolver = farmPlatformResolver;
  }

  async getFarms(refresh = false) {
    const cacheKey = `getFarms-${this.getName()}`;

    if (!refresh) {
      const cacheItem = this.cache.get(cacheKey);
      if (cacheItem) {
        return cacheItem;
      }
    }

    const farms = (await this.getRawFarms()).map(farm => {
      const item = {
        id: `${this.getName()}_farm_${farm.pid}`,
        name: farm.lpSymbol,
        provider: 'polycat',
        raw: Object.freeze(farm),
        has_details: true,
        link: 'https://polycat.finance/vaults?ref=0k898r99681P29479o86304292o03071P80N57948S',
        extra: {},
        chain: this.getChain(),
        compound: true,
      };

      if (farm.isTokenOnly !== true) {
        item.extra.lpAddress = this.getAddress(farm.lpAddresses);
        item.extra.transactionToken = this.getAddress(farm.lpAddresses);
      } else {
        item.extra.transactionToken = this.getAddress(farm.tokenAddresses);
      }

      const farmEarns = this.getFarmEarns(item);
      if (farmEarns && farmEarns.length > 0) {
        item.earns = farmEarns;
      }

      item.extra.transactionAddress = this.getMasterChefAddress();

      const platform = this.farmPlatformResolver.findMainPlatformNameForTokenAddress(item.extra.transactionToken);
      if (platform) {
        item.platform = platform;
      }

      return Object.freeze(item);
    });

    const result = [...farms]

    this.cache.put(cacheKey, result, {ttl: 1000 * 60 * 30});

    console.log(`${this.getName()} updated`);

    return result;
  }

  async getFetchedFarms() {
    const cacheKey = `${this.getName()}-v3-master-farms`

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    const foo = (await this.farmCollector.fetchForMasterChef(polycat_compound.MASTER_ADDRESS, this.getChain())).filter(f => f.isFinished !== true);

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
        stakedWantTokens: contract.methods.stakedWantTokens(farm.raw.pid, address)
      };
    });

    const calls = await Utils.multiCall(tokenCalls, this.getChain());

    const results = [];
    calls.forEach(call => {
      const farm = farms.find(f => f.id === call.id);

      const result = {};
      result.farm = farm;

      if (new BigNumber(call.stakedWantTokens).isGreaterThan(0)) {

        let depositDecimals = farm.extra.transactionToken ? this.tokenCollector.getDecimals(farm.extra.transactionToken) : 18;
        result.deposit = {
          symbol: "?",
          amount: call.stakedWantTokens / (10 ** depositDecimals)
        };

        const price = this.priceOracle.getAddressPrice(this.getAddress(farm.raw.lpAddresses));
        if (price) {
          result.deposit.usd = result.deposit.amount * price;

          // dust
          if (result.deposit.usd < 0.01) {
            return;
          }
        }
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
    return 'polycat_compound';
  }

  getFarmLink() {
    return undefined;
  }

  getFarmEarns(farm) {
    return undefined;
  }

  getPendingRewardContractMethod() {
    return undefined;
  }

  getSousAbi() {
    return [];
  }

  getMasterChefAbi() {
    return MasterChefAbi;
  }

  getMasterChefAddress() {
    return polycat_compound.MASTER_ADDRESS;
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

  getChain() {
    return 'polygon';
  }
};
