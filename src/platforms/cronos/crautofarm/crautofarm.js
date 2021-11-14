"use strict";

const Autofarm = require("../../bsc/autofarm/autofarm");

module.exports = class crautofarm extends Autofarm {
  getFarmDataUrl() {
    return 'https://static.autofarm.network/cronos/farm_data.json';
  }

  getMasterChefAddress() {
    return '0x76b8c3ECdF99483335239e66F34191f11534cbAA';
  }

  getName() {
    return 'crautofarm';
  }

  getChain() {
    return 'cronos';
  }
}
