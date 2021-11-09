"use strict";

const Sushi = require('../../sushi');

module.exports = class hsushi extends Sushi {
  getName() {
    return 'hsushi';
  }

  getChain() {
    return 'harmony';
  }

  getMasterChefAddress() {
    return '0x67dA5f2FfaDDfF067AB9d5F025F8810634d84287';
  }
};

