"use strict";

const Beefy = require("../../bsc/beefy/beefy");

module.exports = class mbeefy extends Beefy {
  getGithubFarmsUrl() {
    return 'https://raw.githubusercontent.com/beefyfinance/beefy-app/master/src/features/configure/vault/moonriver_pools.js';
  }

  getName() {
    return 'mbeefy';
  }

  getChain() {
    return 'moonriver';
  }
}