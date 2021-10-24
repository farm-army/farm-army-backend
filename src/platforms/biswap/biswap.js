"use strict";

const MasterChefAbi = require('./abi/masterchef.json');
const PancakePlatformFork = require("../common").PancakePlatformFork;
const Utils = require("../../utils");
const walk = require("acorn-walk");
const acorn = require("acorn");
const Web3EthContract = require("web3-eth-contract");
const POOLCHEF_ABI = require("./abi/poolchef.json");

module.exports = class biswap extends PancakePlatformFork {
  static MASTER_ADDRESS = "0xDbc1A13490deeF9c3C12b44FE77b503c1B061739"

  constructor(cache, priceOracle, tokenCollector, farmCollector, cacheManager) {
    super(cache, priceOracle);

    this.cache = cache;
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector;
    this.farmCollector = farmCollector;
    this.cacheManager = cacheManager;
  }

  async getFetchedFarms() {
    const cacheKey = `biswap-v2-master-farms`

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

  async getRawPools() {
    const cacheKey = `biswap-v2-getRawPools`
    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    const files = await Utils.getJavascriptFiles('https://biswap.org/');

    const pools = [];
    Object.values(files).forEach(body => {
      walk.simple(acorn.parse(body, {ecmaVersion: 2020}), {
        ArrayExpression(node) {
          if (node.elements[0] && node.elements[0].properties) {
            const keys = node.elements[0].properties.map(p => (p.key && p.key.name) ? p.key.name.toLowerCase() : '');

            if (keys.includes('contractaddress') && (keys.includes('sousid') || keys.includes('stakingtoken') || keys.includes('stakingtokenname'))) {
              node.elements.forEach(element => {
                if (!element.properties) {
                  return;
                }

                const contractAddressNode = element.properties.find(p => p.key && p.key.name.toLowerCase() === 'contractaddress');
                if (contractAddressNode && contractAddressNode.value && contractAddressNode.value.type === 'ObjectExpression' && contractAddressNode.value.properties) {
                  const contractAddressChain = contractAddressNode.value.properties.find(p => p.key && p.key.value && p.key.value.toString() === '56' && p.value && p.value.value && p.value.value.toString().startsWith('0x'));
                  if (contractAddressChain) {
                    pools.push({
                      contractAddress: contractAddressChain.value.value.toString()
                    });
                  }
                }
              })
            }
          }
        }
      })
    })

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
        biswap: web3EthContract.methods.biswap(),
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

      const rewardToken = line.rewardToken;
      const rewardTokenSymbol = this.tokenCollector.getSymbolByAddress(line.rewardToken);

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

  getName() {
    return 'biswap';
  }

  getFarmLink(farm) {
    if (farm.id.includes('_sous_')) {
      return 'https://biswap.org/pools?ref=f5b2fb48d67b5e8e9f01';
    }

    return 'https://biswap.org/farms?ref=f5b2fb48d67b5e8e9f01';
  }

  getFarmEarns(farm) {
    return farm.id.startsWith(`${this.getName()}_farm_`)
      ? farm.raw.earns ? farm.raw.earns.map(i => i.symbol.toLowerCase()) : []
      : undefined;
  }

  getPendingRewardContractMethod() {
    return 'pendingBSW';
  }

  getSousAbi() {
    return POOLCHEF_ABI;
  }

  getMasterChefAbi() {
    return MasterChefAbi;
  }

  getMasterChefAddress() {
    return biswap.MASTER_ADDRESS;
  }

  async onFarmsBuild(farms) {
    farms.forEach(farm => {
      if (farm.id.includes('_farm_')) {
        farm.main_platform = 'biswap';
        farm.platform = 'biswap';
      }
    });
  }
};
