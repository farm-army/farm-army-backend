"use strict";

const eleven = require("../../bsc/eleven/eleven");

module.exports = class feleven extends eleven {
  getName() {
    return 'feleven';
  }

  getChain() {
    return 'fantom';
  }

  getMasterChefAddress() {
    return '0x8eDCe6D0E0687DA9C07B36591781fB6641A53a12';
  }
}