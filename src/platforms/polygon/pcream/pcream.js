"use strict";

const Cream = require("../../bsc/cream/cream");

module.exports = class pcream extends Cream {
  getMarketsUrl() {
    return 'https://api.cream.finance/api/v1/crtoken?comptroller=polygon';
  }

  getName() {
    return 'pcream';
  }

  getChain() {
    return 'polygon';
  }
}
