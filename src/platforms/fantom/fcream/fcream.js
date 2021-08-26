"use strict";

const Cream = require("../../bsc/cream/cream");

module.exports = class fcream extends Cream {
  getMarketsUrl() {
    return 'https://api.cream.finance/api/v1/crtoken?comptroller=fantom';
  }

  getName() {
    return 'fcream';
  }

  getChain() {
    return 'fantom';
  }
}
