"use strict";

const Autofarm = require("../../autofarm/autofarm");

module.exports = class cautofarm extends Autofarm {
  getFarmDataUrl() {
    return 'https://static.autofarm.network/celo/farm_data.json';
  }

  getMasterChefAddress() {
    return '0xdD11b66B90402F294a017c4688509c364312303F';
  }

  getName() {
    return 'cautofarm';
  }

  getChain() {
    return 'celo';
  }
}