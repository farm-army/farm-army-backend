"use strict";

const PancakePlatformFork = require("../common").PancakePlatformFork;

const MasterChefAbi = require('./abi/masterchef.json');
const SousChefAbi = require('./abi/souschef.json');

const Farms = require('./farms/farms.json');
const Pools = require('./farms/pools.json');

module.exports = class hyperjump extends PancakePlatformFork {
  static MASTER_ADDRESS = "0x4F1818Ff649498a2441aE1AD29ccF55a8E1C6250"

  getRawFarms() {
    return Farms.filter(i => i.ended !== true);
  }

  getRawPools() {
    return Pools.filter(p => p.isFinished !== true);
  }

  getName() {
    return 'hyperjump';
  }

  getFarmLink(farm) {
    if (farm.id.startsWith(`${this.getName()}_sous_`)) {
      return 'https://farm.hyperjump.fi/pools';
    }

    return 'https://farm.hyperjump.fi/farms';
  }

  getFarmEarns(farm) {
    return farm.id.startsWith(`${this.getName()}_farm_`)
      ? ['alloy']
      : undefined;
  }

  getPendingRewardContractMethod() {
    return 'pendingAlloy';
  }

  getSousAbi() {
    return SousChefAbi;
  }

  getMasterChefAbi() {
    return MasterChefAbi;
  }

  getMasterChefAddress() {
    return hyperjump.MASTER_ADDRESS;
  }
};
