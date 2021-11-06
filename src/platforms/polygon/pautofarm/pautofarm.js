"use strict";

const Autofarm = require("../../bsc/autofarm/autofarm");

// rewards:
// 0x2DE373C78AA74A0B3970880Fd2Ad3116ac1036c8

module.exports = class pautofarm extends Autofarm {
  getFarmDataUrl() {
    return 'https://static.autofarm.network/polygon/farm_data.json';
  }

  getMasterChefAddress() {
    return '0x89d065572136814230A55DdEeDDEC9DF34EB0B76';
  }

  getName() {
    return 'pautofarm';
  }

  getChain() {
    return 'polygon';
  }
}