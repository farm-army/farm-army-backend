"use strict";

const Beefy = require("../../beefy/beefy");

module.exports = class hbeefy extends Beefy {
  getGithubFarmsUrl() {
    return 'https://raw.githubusercontent.com/beefyfinance/beefy-app/master/src/features/configure/vault/harmony_pools.js';
  }

  getName() {
    return 'hbeefy';
  }

  getChain() {
    return 'harmony';
  }
}