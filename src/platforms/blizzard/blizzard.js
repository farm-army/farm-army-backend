"use strict";

const PancakePlatformFork = require("../common").PancakePlatformFork;

const MasterChefAbi = require('./abi/masterchef.json');
const SousChefAbi = require('./abi/souschef.json');

const Farms = require('./farms/farms.json');
const Pools = require('./farms/pools.json');

module.exports = class blizzard extends PancakePlatformFork {
  static MASTER_ADDRESS = "0x2078F4A75c92A6918D13e3e2F14183443ebf55D3"

  getRawFarms() {
    return Farms.filter(i => i.ended !== true);
  }

  getRawPools() {
    return Pools.filter(p => p.isFinished !== true);
  }

  getName() {
    return 'blizzard';
  }

  getFarmLink(farm) {
    if (farm.id.startsWith(`${this.getName()}_sous_`)) {
      return 'https://www.blizzard.money/pools';
    }

    return 'https://www.blizzard.money/farms';
  }

  getFarmEarns(farm) {
    return farm.id.startsWith(`${this.getName()}_farm_`)
      ? ['blzd']
      : undefined;
  }

  getPendingRewardContractMethod() {
    return 'pendingBlzd';
  }

  getSousAbi() {
    return SousChefAbi;
  }

  getMasterChefAbi() {
    return MasterChefAbi;
  }

  getMasterChefAddress() {
    return blizzard.MASTER_ADDRESS;
  }
};
