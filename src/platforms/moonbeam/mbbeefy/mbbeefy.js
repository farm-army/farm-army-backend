"use strict";

const Beefy = require("../../bsc/beefy/beefy");

module.exports = class mbbeefy extends Beefy {
  getGithubFarmsUrl() {
    return 'https://raw.githubusercontent.com/beefyfinance/beefy-app/master/src/features/configure/vault/moonbeam_pools.js';
  }

  getName() {
    return 'mbbeefy';
  }

  getChain() {
    return 'moonbeam';
  }
}