"use strict";

const MasterChefAbi = require('./abi/masterchef.json');
const Farms = require('./farms/farms.json');
const PancakePlatformFork = require("../common").PancakePlatformFork;

module.exports = class polaris extends PancakePlatformFork {
  static MASTER_ADDRESS = "0x69C77Aca910851E61a64b855116888F1c5eD3B75"

  getRawFarms() {
    return Farms.filter(i => i.ended !== true);
  }

  getRawPools() {
    return [];
  }

  getName() {
    return 'polaris';
  }

  getFarmLink() {
    return 'https://app.polarisdefi.io/';
  }

  getFarmEarns(farm) {
    return farm.id.startsWith(`${this.getName()}_farm_`)
      ? ['polar']
      : undefined;

  }

  getPendingRewardContractMethod() {
    return 'pendingPolar';
  }

  getSousAbi() {
    return [];
  }

  getMasterChefAbi() {
    return MasterChefAbi;
  }

  getMasterChefAddress() {
    return polaris.MASTER_ADDRESS;
  }
};