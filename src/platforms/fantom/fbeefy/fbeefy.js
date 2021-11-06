"use strict";

const Beefy = require("../../bsc/beefy/beefy");

module.exports = class fbeefy extends Beefy {
  getGithubFarmsUrl() {
    return 'https://raw.githubusercontent.com/beefyfinance/beefy-app/master/src/features/configure/vault/fantom_pools.js';
  }

  getName() {
    return 'fbeefy';
  }

  getChain() {
    return 'fantom';
  }
}