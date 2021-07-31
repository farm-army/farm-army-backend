"use strict";

const MasterChefWithAutoCompoundAndRewards = require("../../common").MasterChefWithAutoCompoundAndRewards;

module.exports = class ester extends MasterChefWithAutoCompoundAndRewards {
  getFarmLink() {
    return 'https://app.ester.finance';
  }

  getMasterChefAddress() {
    return '0xA6151b608f49Feb960e951F1C87F4C766850de31';
  }

  getChain() {
    return 'fantom';
  }
};
