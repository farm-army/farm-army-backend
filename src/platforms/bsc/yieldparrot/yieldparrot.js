"use strict";

const MasterChefWithAutoCompoundAndRewards = require("../../common").MasterChefWithAutoCompoundAndRewards;

module.exports = class yieldparrot extends MasterChefWithAutoCompoundAndRewards {
  getFarmLink() {
    return 'https://app.yieldparrot.finance/';
  }

  getMasterChefAddress() {
    return "0x1bee93b82275F3F215411bE49F948F8568e5e103";
  }

  getChain() {
    return 'bsc';
  }
};
