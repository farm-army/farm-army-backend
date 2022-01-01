"use strict";

const MasterChefWithAutoCompoundAndRewards = require("../../common").MasterChefWithAutoCompoundAndRewards;

module.exports = class pacoca extends MasterChefWithAutoCompoundAndRewards {
  getFarmLink() {
    return 'https://pacoca.io/invest';
  }

  async farmInfo() {
    return [];
  }

  getMasterChefAddress() {
    return "0x55410D946DFab292196462ca9BE9f3E4E4F337Dd";
  }

  getChain() {
    return 'bsc';
  }

  getTvlFunction() {
    return 'wantLockedTotal';
  }

  getName() {
    return 'pacoca'
  }
};
