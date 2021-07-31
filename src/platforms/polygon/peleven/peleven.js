"use strict";

const eleven = require("../../eleven/eleven");

module.exports = class peleven extends eleven {
  getName() {
    return 'peleven';
  }

  getChain() {
    return 'polygon';
  }

  getMasterChefAddress() {
    return '0xD109D9d6f258D48899D7D16549B89122B0536729';
  }
}