"use strict";

const Autofarm = require("../../bsc/autofarm/autofarm");

module.exports = class mautofarm extends Autofarm {
  getFarmDataUrl() {
    return 'https://static.autofarm.network/moonriver/farm_data.json';
  }

  getMasterChefAddress() {
    return '0xfadA8Cc923514F1D7B0586aD554b4a0CeAD4680E';
  }

  getName() {
    return 'mautofarm';
  }

  getChain() {
    return 'moonriver';
  }
}