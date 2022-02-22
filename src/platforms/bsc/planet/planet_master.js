"use strict";

const MasterChefWithAutoCompoundAndRewards = require("../../common").MasterChefWithAutoCompoundAndRewards;

module.exports = class planet_master extends MasterChefWithAutoCompoundAndRewards {
  getFarmLink() {
    return 'https://planetfinance.io/';
  }

  async farmInfo() {
    return [];
  }

  getMasterChefAddress() {
    return "0x0ac58fd25f334975b1b61732cf79564b6200a933";
  }

  getChain() {
    return 'bsc';
  }

  getTvlFunction() {
    return 'wantLockedTotal';
  }

  getName() {
    return 'planet'
  }
};
