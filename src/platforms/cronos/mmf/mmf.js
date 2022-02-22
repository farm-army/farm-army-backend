"use strict";

const MasterChefAbi = require('./abi/masterchef.json');
const Utils = require("../../../utils");
const Web3EthContract = require("web3-eth-contract");
const POOLCHEF_ABI = require("./abi/sousChef.json");
const AstParser = require("../../../utils/ast_parser");
const PancakePlatformFork = require("../../common").PancakePlatformFork;

module.exports = class mmf extends PancakePlatformFork {
  static MASTER_ADDRESS = "0x6bE34986Fdd1A91e4634eb6b9F8017439b7b5EDc"

  constructor(cache, priceOracle, tokenCollector, liquidityTokenCollector, farmCollector, cacheManager) {
    super(cache, priceOracle, tokenCollector, liquidityTokenCollector);

    this.cache = cache;
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector;
    this.farmCollector = farmCollector;
    this.cacheManager = cacheManager;
    this.masterAbi = {};
  }

  async getFetchedFarms() {
    const cacheKey = `${this.getName()}-v3-master-farms`

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    const foo = (await this.farmCollector.fetchForMasterChef(this.getMasterChefAddress(), this.getChain(), {
      abi: MasterChefAbi,
    }));

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

    const rows = [];
    Object.values(await Utils.getJavascriptFiles('https://mm.finance/pools')).forEach(f => {
      rows.push(...AstParser.createJsonFromObjectExpression(f, keys => keys.includes('contractAddress') && keys.includes('sousId')));
    });

    const pools = rows
      .filter(r => r?.contractAddress[25] && r?.sousId.toString() !== '0')
      .map(r => ({
        'contractAddress': r?.contractAddress[25],
      }));

    const blockNumber = await Utils.getWeb3(this.getChain()).eth.getBlockNumber();

    const calls = pools.map(pool => {
      let web3EthContract = new Web3EthContract(POOLCHEF_ABI, pool.contractAddress);
      return {
        contractAddress: pool.contractAddress,
        bonusEndBlock: web3EthContract.methods.bonusEndBlock(),
        rewardToken: web3EthContract.methods.rewardToken(),
        rewardPerBlock: web3EthContract.methods.rewardPerBlock(),
        multiplier: web3EthContract.methods.getMultiplier(blockNumber, blockNumber + 1),
      };
    });

    let newVar = await Utils.multiCall(calls, this.getChain());

    const finalPools = [];

    newVar.forEach(line => {
      if (!line.rewardToken) {
        return;
      }

      const rewardToken = line.rewardToken;
      let rewardTokenSymbol = this.tokenCollector.getSymbolByAddress(line.rewardToken);
      if (!rewardTokenSymbol) {
        rewardTokenSymbol = this.liquidityTokenCollector.getSymbolNames(line.rewardToken);
      }

      const lpToken = '0x97749c9b61f878a880dfe312d2594ae07aed7656';
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

  getName() {
    return 'mmf';
  }

  getChain() {
    return 'cronos';
  }

  getFarmLink(farm) {
    if (farm.id.includes('_sous_')) {
      return 'https://mm.finance/pools?ref=MHg4OThlOTk2ODFDMjk0NzliODYzMDQyOTJiMDMwNzFDODBBNTc5NDhG';
    }

    return 'https://mm.finance/farms?ref=MHg4OThlOTk2ODFDMjk0NzliODYzMDQyOTJiMDMwNzFDODBBNTc5NDhG';
  }

  getFarmEarns(farm) {
    return farm.id.startsWith(`${this.getName()}_farm_`)
      ? farm.raw.earns ? farm.raw.earns.map(i => i.symbol.toLowerCase()) : []
      : undefined;
  }

  getPendingRewardContractMethod() {
    return 'pendingMeerkat';
  }

  getSousAbi() {
    return POOLCHEF_ABI;
  }

  async getMasterChefAbi() {
    return MasterChefAbi;
  }

  getMasterChefAddress() {
    return mmf.MASTER_ADDRESS;
  }

  async onFarmsBuild(farms) {
    farms.forEach(farm => {
      farm.main_platform = 'mmf';
      farm.platform = 'mmf';
    });
  }
};
