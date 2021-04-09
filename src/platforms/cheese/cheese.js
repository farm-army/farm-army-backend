"use strict";

const MasterChefAbi = require('./abi/masterchef.json');
const Farms = require('./farms/farms.json');
const PancakePlatformFork = require("../common").PancakePlatformFork;

module.exports = class cheese extends PancakePlatformFork {
  static MASTER_ADDRESS = "0x398d648c58ccf6337dded3dac7cbd7970ae474b8"

  getRawFarms() {
    return Farms.filter(i => i.ended !== true);
  }

  getRawPools() {
    return [];
  }

  getName() {
    return 'cheese';
  }

  getFarmLink(farm) {
    return farm.isTokenOnly === true
      ? 'https://cheesecakeswap.com/pools'
      : 'https://cheesecakeswap.com/farms';
  }

  getFarmEarns(farm) {
    return farm.id.startsWith(`${this.getName()}_farm_`)
      ? ['ccake']
      : undefined;

  }

  getPendingRewardContractMethod() {
    return 'pendingCcake';
  }

  getSousAbi() {
    return [];
  }

  getMasterChefAbi() {
    return MasterChefAbi;
  }

  getMasterChefAddress() {
    return cheese.MASTER_ADDRESS;
  }
};