"use strict";

const MasterChefAbi = require('./abi/masterchef.json');
const Farms = require('./farms/farms.json');
const PancakePlatformFork = require("../common").PancakePlatformFork;

module.exports = class goose extends PancakePlatformFork {
  static MASTER_ADDRESS = "0xe70E9185F5ea7Ba3C5d63705784D8563017f2E57"

  getRawFarms() {
    return Farms.filter(i => i.ended !== true);
  }

  getRawPools() {
    return [];
  }

  getName() {
    return 'goose';
  }

  getFarmLink(farm) {
    return farm.isTokenOnly === true
      ? 'https://www.goosedefi.com/pools'
      : 'https://www.goosedefi.com/farms';
  }

  getFarmEarns(farm) {
    return farm.id.startsWith(`${this.getName()}_farm_`)
      ? ['egg']
      : undefined;
  }

  getPendingRewardContractMethod() {
    return 'pendingEgg';
  }

  getSousAbi() {
    return {};
  }

  getMasterChefAbi() {
    return MasterChefAbi;
  }

  getMasterChefAddress() {
    return goose.MASTER_ADDRESS;
  }
};
