"use strict";

const {AutoCompoundStakeVaults} = require("../../common");

module.exports = class biswap_auto extends AutoCompoundStakeVaults {
  async getRawFarms() {
    return [{
      contract: '0x97A16ff6Fd63A46bf973671762a39f3780Cda73D',
      token: '0x965f527d9159dce6288a2219db51fc6eef120dd1',
    }];
  }

  getFarmLink(farm) {
    return 'https://biswap.org/pools/stake_bsw';
  }

  getName() {
    return 'biswap';
  }

  getChain() {
    return 'bsc'
  }
};
