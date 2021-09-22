"use strict";

const eleven = require("../../eleven/eleven");

module.exports = class peleven extends eleven {
  getName() {
    return 'peleven';
  }

  getChain() {
    return 'fantom';
  }

  getMasterChefAddress() {
    return '0x8eDCe6D0E0687DA9C07B36591781fB6641A53a12';
  }
}