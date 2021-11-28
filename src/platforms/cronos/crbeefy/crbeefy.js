"use strict";

const Beefy = require("../../bsc/beefy/beefy");

module.exports = class crbeefy extends Beefy {
  getGithubFarmsUrl() {
    return 'https://raw.githubusercontent.com/beefyfinance/beefy-app/master/src/features/configure/vault/cronos_pools.js';
  }

  getName() {
    return 'crbeefy';
  }

  getChain() {
    return 'cronos';
  }
}
