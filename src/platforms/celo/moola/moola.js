"use strict";

const AaveFork = require("../../common").AaveFork;

module.exports = class moola extends AaveFork {
  getBankAddress() {
    return '0x970b12522CA9b4054807a2c5B736149a5BE6f670'
  }

  getName() {
    return 'moola';
  }

  getChain() {
    return 'celo';
  }
}