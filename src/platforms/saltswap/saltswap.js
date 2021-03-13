"use strict";

const MasterChefAbi = require('./abi/masterchef.json');
const SousChefAbi = require('./abi/souschef.json');

const Farms = require('./farms/farms.json');
const Pools = require('./farms/pools.json');

const PancakePlatformFork = require("../common").PancakePlatformFork;

module.exports = class saltswap extends PancakePlatformFork {
  static MASTER_ADDRESS = "0xB4405445fFAcF2B86BC2bD7D1C874AC739265658"

  getRawFarms() {
    return Farms.filter(i => i.ended !== true);
  }

  getRawPools() {
    return Pools.filter(p => p.isFinished !== true);
  }

  getName() {
    return 'saltswap';
  }

  getFarmLink(farm) {
    if (farm.id.startsWith(`${this.getName()}_sous_`)) {
      return 'https://www.saltswap.finance/oceans';
    }

    if (farm.id.startsWith(`${this.getName()}_farm_`)) {
      return farm.isTokenOnly === true
        ? 'https://www.saltswap.finance/pools'
        : 'https://www.saltswap.finance/farms';
    }

    return undefined;
  }

  getFarmEarns(farm) {
    return farm.id.startsWith(`${this.getName()}_farm_`)
      ? ['salt']
      : undefined;

  }

  getPendingRewardContractMethod() {
    return 'pendingSalt';
  }

  getSousAbi() {
    return SousChefAbi;
  }

  getMasterChefAbi() {
    return MasterChefAbi;
  }

  getMasterChefAddress() {
    return saltswap.MASTER_ADDRESS;
  }
};
