"use strict";

const Sushi = require("../../sushi");

module.exports = class fsushi extends Sushi {
  getName() {
    return 'fsushi';
  }

  getChain() {
    return 'fantom';
  }

  getMasterChefAddress() {
    return "0xf731202a3cf7efa9368c2d7bd613926f7a144db5";
  }
};
