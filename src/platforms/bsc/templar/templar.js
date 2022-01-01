"use strict";

const OhmFork = require("../../common").OhmFork;

module.exports = class templar extends OhmFork {
  getConfig() {
    return {
      token: '0x19e6bfc1a6e4b042fb20531244d47e252445df01',
      sToken: '0x8C9827Cd430d945aE5A5c3cfdc522f8D342334B9',
      redeemHelper: '0x38b306cDB3d35e03cff6bC59DA96b1212d2A075e',
    }
  }

  getFarmLink(farm) {
    let url = 'https://templar.finance';

    if (farm.id.includes('_bond_')) {
      url += '/#/bonds';
    } else if(farm.id.includes('_stake_')) {
      url += '/#/stake';
    }

    return url
  }

  getName() {
    return 'templar';
  }

  getChain() {
    return 'bsc';
  }
}
