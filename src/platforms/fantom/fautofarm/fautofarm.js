"use strict";

const Autofarm = require("../../autofarm/autofarm");

// rewards:
// ???

module.exports = class fautofarm extends Autofarm {
  getFarmDataUrl() {
    return 'https://static.autofarm.network/fantom/farm_data.json';
  }

  getMasterChefAddress() {
    return '0x76b8c3ECdF99483335239e66F34191f11534cbAA';
  }

  getName() {
    return 'fautofarm';
  }

  getChain() {
    return 'fantom';
  }
}