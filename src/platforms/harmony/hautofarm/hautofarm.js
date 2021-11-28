"use strict";

const Autofarm = require("../../bsc/autofarm/autofarm");

module.exports = class hautofarm extends Autofarm {
  getFarmDataUrl() {
    return 'https://static.autofarm.network/harmony/farm_data.json';
  }

  getMasterChefAddress() {
    return '0x67dA5f2FfaDDfF067AB9d5F025F8810634d84287';
  }

  getName() {
    return 'hautofarm';
  }

  getChain() {
    return 'harmony';
  }
}