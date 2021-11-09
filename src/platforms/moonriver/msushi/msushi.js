"use strict";

const Sushi = require("../../sushi");

module.exports = class msushi extends Sushi {
  getName() {
    return 'msushi';
  }

  getChain() {
    return 'moonriver';
  }

  getMasterChefAddress() {
    return "0x3dB01570D97631f69bbb0ba39796865456Cf89A5";
  }
};
