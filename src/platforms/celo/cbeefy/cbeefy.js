"use strict";

const Beefy = require("../../beefy/beefy");

module.exports = class cbeefy extends Beefy {
  getGithubFarmsUrl() {
    return 'https://raw.githubusercontent.com/beefyfinance/beefy-app/master/src/features/configure/vault/celo_pools.js';
  }

  getName() {
    return 'cbeefy';
  }

  getChain() {
    return 'celo';
  }
}
