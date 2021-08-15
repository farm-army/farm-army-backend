"use strict";

const MasterChefAbi = require('./abi/masterchef.json');
const StrategyAbi = require('./abi/strategy.json');
const Web3EthContract = require("web3-eth-contract");
const Utils = require("../../../utils");
const PancakePlatformFork = require("../../common").PancakePlatformFork;

module.exports = class honeyfarm extends PancakePlatformFork {
  static MASTER_ADDRESS = "0xc3D910c9D2bB024931a44Cf127B6231aC1F04de3"

  constructor(cache, priceOracle, tokenCollector, farmCollector, cacheManager) {
    super(cache, priceOracle);

    this.cache = cache;
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector;
    this.farmCollector = farmCollector;
    this.cacheManager = cacheManager;
  }

  async getFetchedFarms() {
    const cacheKey = `${this.getName()}-v1-master-farms`

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    const foo = (await this.farmCollector.fetchForMasterChef(this.getMasterChefAddress(), this.getChain())).filter(f => f.isFinished !== true);

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

  async farmInfo() {
    const foo = await this.getFetchedFarms();

    const callsPromise = [];

    foo.forEach(i => {
      if (i.raw.poolInfoNormalized && i.raw.poolInfoNormalized.strategy) {
        // wantLockedTotal

        const contract = new Web3EthContract(StrategyAbi, i.raw.poolInfoNormalized.strategy);
        callsPromise.push({
          id: i.pid.toString(),
          balance: contract.methods.wantLockedTotal(),
        });
      }
    });

    return Utils.multiCall(callsPromise, this.getChain());
  }

  getRawFarms() {
    return this.getFetchedFarms();
  }

  getRawPools() {
    return [];
  }

  getName() {
    return 'honeyfarm';
  }

  getChain() {
    return 'bsc';
  }

  getFarmLink(farm) {
    return 'https://honeyfarm.finance/farms?ref=MHg4OThlOTk2ODFDMjk0NzliODYzMDQyOTJiMDMwNzFDODBBNTc5NDhG';
  }

  getFarmEarns(farm) {
    return farm.id.startsWith(`${this.getName()}_farm_`)
      ? farm.raw.earns ? farm.raw.earns.map(i => i.symbol.toLowerCase()) : []
      : undefined;
  }

  getPendingRewardContractMethod() {
    return 'pendingEarnings';
  }

  getSousAbi() {
    return {};
  }

  async getMasterChefAbi() {
    return MasterChefAbi;
  }

  getMasterChefAddress() {
    return honeyfarm.MASTER_ADDRESS;
  }
};
