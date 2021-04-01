"use strict";

const MasterChefAbi = require('./abi/masterchef.json');
const fs = require("fs");
const path = require("path");
const Farms = require('./farms/farms.json');
const PancakePlatformFork = require("../common").PancakePlatformFork;

module.exports = class polaris extends PancakePlatformFork {
  static MASTER_ADDRESS = "0x3a5325f0e5ee4da06a285e988f052d4e45aa64b4"

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
      ? ['polaris']
      : undefined;

  }

  getPendingRewardContractMethod() {
    return 'pendingRewards';
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
