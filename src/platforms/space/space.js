"use strict";

const MasterChefAbi = require('./abi/masterchef.json');

const Farms = require('./farms/farms.json');

const PancakePlatformFork = require("../common").PancakePlatformFork;

module.exports = class space extends PancakePlatformFork {
  static MASTER_ADDRESS = "0xc8cf0767fB2258b23B90636A5e21cfaD113e8182"

  async getRawFarms() {
    return Farms.filter(i => i.ended !== true);
  }

  getRawPools() {
    return [];
  }

  getName() {
    return 'space';
  }

  getFarmLink() {
    return 'https://farm.space/';
  }

  getFarmEarns(farm) {
    return farm.id.startsWith(`${this.getName()}_farm_`)
      ? ['space']
      : undefined;

  }

  getPendingRewardContractMethod() {
    return 'pendingSpace';
  }

  getSousAbi() {
    return [];
  }

  getMasterChefAbi() {
    return MasterChefAbi;
  }

  getMasterChefAddress() {
    return space.MASTER_ADDRESS;
  }
};
