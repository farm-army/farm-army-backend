"use strict";

const MasterChefAbi = require('./abi/masterchef.json');
const SousChefAbi = require('./abi/souschef.json');

const Farms = require('./farms/farms.json');
const Pools = require('./farms/pools.json');

const PancakePlatformFork = require("../common").PancakePlatformFork;

module.exports = class apeswap extends PancakePlatformFork {
  static MASTER_ADDRESS = "0x5c8D727b265DBAfaba67E050f2f739cAeEB4A6F9"

  getRawFarms() {
    return Farms.filter(i => i.ended !== true);
  }

  getRawPools() {
    return Pools.filter(p => p.isFinished !== true);
  }

  getName() {
    return 'apeswap';
  }

  getFarmLink(farm) {
    return farm.isTokenOnly === true
      ? 'https://apeswap.finance/pools'
      : 'https://apeswap.finance/farms';
  }

  getFarmEarns(farm) {
    return farm.id.startsWith(`${this.getName()}_farm_`)
      ? ['banana']
      : undefined;
  }

  getPendingRewardContractMethod() {
    return 'pendingCake';
  }

  getSousAbi() {
    return SousChefAbi;
  }

  getMasterChefAbi() {
    return MasterChefAbi;
  }

  getMasterChefAddress() {
    return apeswap.MASTER_ADDRESS;
  }
};
