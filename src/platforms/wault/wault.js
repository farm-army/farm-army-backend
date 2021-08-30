"use strict";

const MasterChefFarmsAbi = require('./abi/0x22fB2663C7ca71Adc2cc99481C77Aaf21E152e2D.json');
const PoolAbi = require('./abi/pool.json');
const PancakePlatformFork = require("../common").PancakePlatformFork;
const Utils = require("../../utils");
const Web3EthContract = require("web3-eth-contract");

module.exports = class wault extends PancakePlatformFork {
  /// static MASTER_ADDRESS = "0x52a2B3BEAfA46BA51A4792793a7447396D09423f" // old ones?
  static MASTER_ADDRESS = "0x22fB2663C7ca71Adc2cc99481C77Aaf21E152e2D" // more usable

  constructor(cache, priceOracle, tokenCollector, farmCollector, cacheManager) {
    super(cache, priceOracle);

    this.cache = cache;
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector;
    this.farmCollector = farmCollector;
    this.cacheManager = cacheManager;
  }

  async getRawPools() {
    const cacheKey = `${this.getName()}-v2-getRawPools`
    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    let response
    try {
      response = await Utils.requestGet('https://api.wault.finance/wpoolsData.js');
    } catch (e) {
      await this.cacheManager.set(cacheKey, [], {ttl: 60 * 30})
      return [];
    }

    let poolsMatch = response.match(/^.*\s*\w+?\s*=\s*(.*)/);
    if (!poolsMatch || !poolsMatch[1]) {
      await this.cacheManager.set(cacheKey, [], {ttl: 60 * 30})
      return [];
    }

    const blockNumber = await Utils.getWeb3(this.getChain()).eth.getBlockNumber();

    const pools = JSON.parse(poolsMatch[1]).filter(pool => pool.contractAddress && pool.apy > 0 && blockNumber >= pool.startBlock);

    const calls = pools.map(pool => {
      let web3EthContract = new Web3EthContract(PoolAbi, pool.contractAddress);
      return {
        contractAddress: pool.contractAddress,
        earned: pool.earned,
        rewardToken: web3EthContract.methods.rewardToken(),
        poolInfo: web3EthContract.methods.pool(),
        rewardPerBlock: web3EthContract.methods.rewardPerBlock(),
      };
    });

    let newVar = await Utils.multiCall(calls, this.getChain());

    const finalPools = [];

    newVar.forEach(line => {
      if (!line.rewardToken || !line.poolInfo || !line.poolInfo[0] || line.rewardPerBlock <= 1) {
        return;
      }

      const rewardToken = line.rewardToken;

      let rewardTokenSymbol = this.tokenCollector.getSymbolByAddress(line.rewardToken);
      if (!rewardTokenSymbol && line.earned) {
        rewardTokenSymbol = line.earned.toLowerCase();
      }

      const lpToken = line.poolInfo[0];
      const lpTokenSymbol = this.tokenCollector.getSymbolByAddress(lpToken);

      const raw = line;
      raw.contractAddress = line.contractAddress; // needed for compatibility

      const item = {
        sousId: line.contractAddress,
        stakingToken: {
          symbol: lpTokenSymbol ? lpTokenSymbol.toLowerCase() : '?',
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

  async getFarmInfo() {
    const cacheKey = `wault-v1-pool-info`

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    let response
    try {
      response = await Utils.requestGet('https://api.wault.finance/farmsData2.js');
    } catch (e) {
      return {}
    }

    let poolsMatch = response.match(/^.*\s*\w+?\s*=\s*(.*)/);
    if (!poolsMatch || !poolsMatch[1]) {
      return {}
    }

    const pools = {};
    JSON.parse(poolsMatch[1]).filter(pool => pool.poolId).forEach(pool => {
      pools[pool.poolId.toString()] = pool
    });

    await this.cacheManager.set(cacheKey, pools, {ttl: 60 * 15})

    return pools;
  }

  async onFarmsBuild(farms) {
    const poolInfos = await this.getFarmInfo();

    farms.forEach(farm => {
      if (farm.id.includes('_farm_') && farm.raw.pid) {
        farm.main_platform = 'wault';
        farm.platform = 'wault';

        let poolInfo = poolInfos[farm.raw.pid.toString()];
        if (poolInfo && poolInfo.apy) {
          farm.yield = {
            apy: poolInfo.apy
          };
        }
      }
    });
  }

  async getFetchedFarms() {
    const cacheKey = `wault-v1-master-farms`

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    const foo = (await this.farmCollector.fetchForMasterChef(this.getMasterChefAddress())).filter(f => f.isFinished !== true);

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


  getName() {
    return 'wault';
  }

  getFarmLink() {
    return 'https://app.wault.finance/#farm';
  }

  getFarmEarns(farm) {
    return farm.id.startsWith(`${this.getName()}_farm_`)
      ? farm.raw.earns ? farm.raw.earns.map(i => i.symbol.toLowerCase()) : []
      : undefined;
  }

  getPendingRewardContractMethod() {
    return 'pendingWex';
  }

  getSousAbi() {
    return PoolAbi;
  }

  getMasterChefAbi() {
    return MasterChefFarmsAbi;
  }

  getMasterChefAddress() {
    return wault.MASTER_ADDRESS;
  }
};
