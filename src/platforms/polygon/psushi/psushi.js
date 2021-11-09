"use strict";

const Sushi = require("../../sushi");

module.exports = class psushi extends Sushi {
  getName() {
    return 'psushi';
  }

  getChain() {
    return 'polygon';
  }

  getMasterChefAddress() {
    return "0x0769fd68dFb93167989C6f7254cd0D766Fb2841F";
  }
};
