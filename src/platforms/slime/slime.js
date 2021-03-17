"use strict";

const MasterChefAbi = require('./abi/masterchef.json');
const SousChefAbi = require('./abi/souschef.json');

const Farms = require('./farms/farms.json');
const Pools = require('./farms/pools.json');

const PancakePlatformFork = require("../common").PancakePlatformFork;

module.exports = class slime extends PancakePlatformFork {
  static MASTER_ADDRESS = "0x4B0073A79f2b46Ff5a62fA1458AAc86Ed918C80C"

  getRawFarms() {
    return Farms.filter(i => i.ended !== true);
  }

  getRawPools() {
    return Pools.filter(p => p.isFinished !== true);
  }

  getName() {
    return 'slime';
  }

  getFarmLink(farm) {
    if (farm.id.startsWith(`${this.getName()}_sous_`)) {
      return 'https://slime.finance/pools';
    }

    return 'https://slime.finance/farms';
  }

  getFarmEarns(farm) {
    return farm.id.startsWith(`${this.getName()}_farm_`)
      ? ['slime']
      : undefined;
  }

  getPendingRewardContractMethod() {
    return 'pendingReward';
  }

  getSousAbi() {
    return SousChefAbi;
  }

  getMasterChefAbi() {
    return MasterChefAbi;
  }

  getMasterChefAddress() {
    return slime.MASTER_ADDRESS;
  }
};
