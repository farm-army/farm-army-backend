"use strict";

const OhmFork = require("../../common").OhmFork;

module.exports = class hunnydao extends OhmFork {
  getConfig() {
    return {
      token: '0x9505dbD77DaCD1F6C89F101b98522D4b871d88C5',
      sToken: '0x9F12CAd130D40d40541CaE8e3c295228769ad111',
      redeemHelper: '0xe28C91F878B99fA1cFB5068B4C6603aCE507a7c5',
    }
  }

  getFarmLink(farm) {
    let url = 'https://dao.hunny.finance';

    if (farm.id.includes('_bond_')) {
      url += '/#/bonds';
    } else if(farm.id.includes('_stake_')) {
      url += '/#/stake';
    }

    return url
  }

  getName() {
    return 'hunnydao';
  }

  getChain() {
    return 'bsc';
  }
}
