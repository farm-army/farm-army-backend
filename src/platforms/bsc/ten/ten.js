"use strict";

const {MasterChefWithAutoCompoundAndRewards} = require("../../common");

module.exports = class ten extends MasterChefWithAutoCompoundAndRewards {
  getFarmLink() {
    return 'https://app.ten.finance/';
  }

  async farmInfo() {
    return [];
  }

  getMasterChefAddress() {
    return "0x264A1b3F6db28De4D3dD4eD23Ab31A468B0C1A96";
  }

  getChain() {
    return 'bsc';
  }

  getTvlFunction() {
    return 'wantLockedTotal';
  }
};
