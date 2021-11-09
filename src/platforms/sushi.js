"use strict";

const MasterChefAbi = require('../abi/sushi/masterchef.json');
const Web3EthContract = require("web3-eth-contract");
const Utils = require("../utils");
const RewarderApi = require("../abi/sushi/rewarder.json");
const PancakePlatformFork = require("./common").PancakePlatformFork;
const _ = require("lodash");

module.exports = class sushi extends PancakePlatformFork {
  constructor(cache, priceOracle, tokenCollector, farmCollector, cacheManager) {
    super(cache, priceOracle);

    this.cache = cache;
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector;
    this.farmCollector = farmCollector;
    this.cacheManager = cacheManager;
  }

  async getRawFarms() {
    const cacheKey = `${this.getName()}-v4-master-farms`

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    const foo = (await this.farmCollector.fetchForMasterChef(this.getMasterChefAddress(), this.getChain(), {
      abi: MasterChefAbi,
    })).filter(f => f.isFinished !== true);

    let reformat = foo.map(f => {
      f.lpAddresses = f.lpAddress

      if (f.isTokenOnly === true) {
        f.tokenAddresses = f.lpAddress
      }

      return f
    });

    const ids = foo.map(i => parseInt(i.pid));

    let never = await this.getMasterChefAbi();
    const rewarders = await Utils.multiCallIndexBy('pid', ids.map(id => ({
      pid: id.toString(),
      rewarder: new Web3EthContract(never, this.getMasterChefAddress()).methods.rewarder(id),
    })), this.getChain());

    reformat = reformat.map(i => {
      if (rewarders[i.pid.toString()]?.rewarder) {
        i.rewarder = rewarders[i.pid.toString()].rewarder;
      }

      return i;
    })

    await this.cacheManager.set(cacheKey, reformat, {ttl: 60 * 30})

    return reformat;
  }

  async getYieldsInner(address, addresses) {
    const result = await super.getYieldsInner(address, addresses);

    const farmCalls = result
      .filter(f => f.farm.raw.rewarder)
      .map(f => {
        const farm = f.farm;
        const contract = new Web3EthContract(RewarderApi, farm.raw.rewarder);

        return {
          id: farm.raw.pid.toString(),
          pendingTokens0: contract.methods.pendingTokens(farm.raw.pid, address, 0),
        };
      });

    const additionalRewards = await Utils.multiCallIndexBy('id', farmCalls, this.getChain());

    return _.cloneDeep(result).map(item => {
      const farm = item.farm;

      const pendingTokens0 = additionalRewards[farm.raw.pid.toString()]?.pendingTokens0;
      if (pendingTokens0) {
        const [tokens, tokenRewards] = Object.values(pendingTokens0);

        const rewards = [];

        tokens.forEach((token, index) => {
          const decimals = this.tokenCollector.getDecimals(token);

          const reward = {
            symbol: this.tokenCollector.getSymbolByAddress(token),
            amount: tokenRewards[index] / (10 ** decimals),
          };

          const price = this.priceOracle.findPrice(token.toLowerCase());
          if (price) {
            reward.usd = reward.amount * price;
          }

          rewards.push(reward);
        });

        if (!item.rewards) {
          item.rewards = [];
        }

        item.rewards.push(...rewards);
      }

      return Object.freeze(item);
    });
  }

  getRawPools() {
    return [];
  }

  getName() {
    throw new Error('not implemented');
  }

  getChain() {
    throw new Error('not implemented');
  }

  getFarmLink(farm) {
    return 'https://app.sushi.com/farm';
  }

  getFarmEarns(farm) {
    return farm.id.startsWith(`${this.getName()}_farm_`)
      ? farm.raw.earns ? farm.raw.earns.map(i => i.symbol.toLowerCase()) : []
      : undefined;
  }

  getPendingRewardContractMethod() {
    return 'pendingSushi';
  }

  getSousAbi() {
    return [];
  }

  async getMasterChefAbi() {
    return MasterChefAbi;
  }

  getMasterChefAddress() {
    throw new Error('not implemented');
  }

  async onFarmsBuild(farms) {

    const farmCalls = farms
      .filter(f => f.raw.rewarder)
      .map(farm => {
        const contract = new Web3EthContract(RewarderApi, farm.raw.rewarder);

        return {
          id: farm.id.toString(),
          pendingTokens0: contract.methods.pendingTokens(farm.raw.pid, '0x0000000000000000000000000000000000000000', 0),
        };
      });

    const additionalRewards = await Utils.multiCallIndexBy('id', farmCalls, this.getChain());

    farms.forEach(farm => {
      if (additionalRewards[farm.id]?.pendingTokens0) {
        const foo = Object.values(additionalRewards[farm.id]?.pendingTokens0);

        foo[0].forEach(token => {
          const symbol = this.tokenCollector.getSymbolByAddress(token);

          if (!farm.earns) {
            farm.earns = [];
          }

          if (!farm.earns.includes(symbol)) {
            farm.earns.push(symbol);
          }

          if (!farm.earn) {
            farm.earn = [];
          }

          if (!farm.earn.some(r => r.address.toLowerCase() === token.toLowerCase())) {
            farm.earn.push({
              address: token.toLowerCase(),
              symbol: symbol,
              decimals: this.tokenCollector.getDecimals(token),
            });
          }
        });
      }

      farm.main_platform = 'sushi';
      farm.platform = 'sushi';
    });
  }
};
