"use strict";

const Sushi = require('../../sushi');

module.exports = class csushi extends Sushi {
  getName() {
    return 'csushi';
  }

  getChain() {
    return 'celo';
  }

  getMasterChefAddress() {
    return '0x0769fd68dFb93167989C6f7254cd0D766Fb2841F';
  }
};
