"use strict";

const MasterChefAbi = require('./abi/masterchef.json');
const Utils = require("../../../utils");
const Web3EthContract = require("web3-eth-contract");
const POOLCHEF_ABI = require("./abi/poolchef.json");
const PancakePlatformFork = require("../../common").PancakePlatformFork;
const _ = require("lodash");

module.exports = class pjetswap extends PancakePlatformFork {
  static MASTER_ADDRESS = "0x4e22399070aD5aD7f7BEb7d3A7b543e8EcBf1d85"

  constructor(cache, priceOracle, tokenCollector, farmCollector, cacheManager) {
    super(cache, priceOracle);

    this.cache = cache;
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector;
    this.farmCollector = farmCollector;
    this.cacheManager = cacheManager;
    this.masterAbi = {};
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

  getRawFarms() {
    return this.getFetchedFarms();
  }

  async getRawPools() {
    const cacheKey = `${this.getName()}-v2-getRawPools`
    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    const pools = await Utils.getPoolsFromJavascript('https://polygon.jetswap.finance');

    const blockNumber = await Utils.getWeb3(this.getChain()).eth.getBlockNumber();

    const calls = pools.map(pool => {
      let web3EthContract = new Web3EthContract(POOLCHEF_ABI, pool.contractAddress);
      return {
        contractAddress: pool.contractAddress,
        bonusEndBlock: web3EthContract.methods.bonusEndBlock(),
        rewardToken: web3EthContract.methods.rewardToken(),
        poolInfo: web3EthContract.methods.poolInfo(0),
        //stakedToken: web3EthContract.methods.stakedToken(),
        //syrup: web3EthContract.methods.syrup(),
        // biswap: web3EthContract.methods.biswap(),
        rewardPerBlock: web3EthContract.methods.rewardPerBlock(),
        multiplier: web3EthContract.methods.getMultiplier(blockNumber, blockNumber + 1),
      };
    });

    let newVar = await Utils.multiCall(calls, this.getChain());

    const finalPools = [];

    newVar.forEach(line => {
      if (!line.rewardToken || !line.poolInfo || !line.poolInfo[0]) {
        return;
      }

      if (line.bonusEndBlock && line.bonusEndBlock < blockNumber) {
        return;
      }

      const rewardToken = line.rewardToken;
      const rewardTokenSymbol = this.tokenCollector.getSymbolByAddress(line.rewardToken);

      const lpToken = line.poolInfo[0];
      const lpTokenSymbol = this.tokenCollector.getSymbolByAddress(lpToken);

      const raw = line;
      raw.contractAddress = line.contractAddress; // needed for compatibility

      const item = {
        sousId: line.contractAddress,
        stakingToken: {
          symbol: lpTokenSymbol ? lpTokenSymbol.toLowerCase() : 'unknown',
          address: lpToken,
        },
        earningToken: {
          symbol: rewardTokenSymbol,
          address: rewardToken,
        },
        contractAddress: line.contractAddress,
        raw: raw,
      }

      finalPools.push(Object.freeze(item));
    });

    await this.cacheManager.set(cacheKey, finalPools, {ttl: 60 * 30})

    return finalPools;
  }

  getName() {
    return 'pjetswap';
  }

  getChain() {
    return 'polygon';
  }

  getFarmLink(farm) {
    return (farm.isTokenOnly === true || farm.id.includes('_sous_'))
      ? 'https://polygon.jetswap.finance/pools'
      : 'https://polygon.jetswap.finance/farms';
  }

  getFarmEarns(farm) {
    return farm.id.startsWith(`${this.getName()}_farm_`)
      ? farm.raw.earns ? farm.raw.earns.map(i => i.symbol.toLowerCase()) : []
      : undefined;
  }

  getPendingRewardContractMethod() {
    return 'pendingCake';
  }

  getSousAbi() {
    return POOLCHEF_ABI;
  }

  async getMasterChefAbi() {
    return MasterChefAbi;
  }

  getMasterChefAddress() {
    return pjetswap.MASTER_ADDRESS;
  }

  async onFarmsBuild(farms) {
    farms.forEach(farm => {
      if (farm.id.includes('_farm_')) {
        farm.main_platform = 'jetswap';
        farm.platform = 'jetswap';
      }
    });
  }
};
