"use strict";

const MasterChefAbi = require('./abi/masterchef.json');
const fs = require("fs");
const path = require("path");
const Farms = require('./farms/farms.json');
const PancakePlatformFork = require("../common").PancakePlatformFork;

module.exports = class wault extends PancakePlatformFork {
  static MASTER_ADDRESS = "0x52a2B3BEAfA46BA51A4792793a7447396D09423f"

  getRawFarms() {
    return Farms.filter(i => i.ended !== true);
  }
  
  getRawPools() {
    return [];
  }

  getName() {
    return 'wault';
  }

  getFarmLink() {
    return 'https://app.wault.finance/';
  }

  getFarmEarns(farm) {
    return farm.id.startsWith(`${this.getName()}_farm_`)
      ? ['wault']
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
    return wault.MASTER_ADDRESS;
  }
};
