"use strict";

const Beefy = require("../../beefy/beefy");

module.exports = class pbeefy extends Beefy {
  getGithubFarmsUrl() {
    return 'https://raw.githubusercontent.com/beefyfinance/beefy-app/master/src/features/configure/vault/polygon_pools.js';
  }

  getName() {
    return 'pbeefy';
  }

  getChain() {
    return 'polygon';
  }
}