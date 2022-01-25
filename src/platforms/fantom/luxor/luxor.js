"use strict";

const OhmFork = require("../../common").OhmFork;

module.exports = class luxor extends OhmFork {
  getConfig() {
    return {
      token: '0x6671E20b83Ba463F270c8c75dAe57e3Cc246cB2b',
      sToken: '0x4290b33158F429F40C0eDc8f9b9e5d8C5288800c',
      redeemHelper: '0xc7c9A5789759C61c1469b81990e1380C8fB84e5D',
    }
  }

  getFarmLink(farm) {
    let url = 'https://app.luxor.money';

    if (farm.id.includes('_bond_')) {
      url += '/#/bonds';
    } else if(farm.id.includes('_stake_')) {
      url += '/#/stake';
    }

    return url
  }

  getName() {
    return 'luxor';
  }

  getChain() {
    return 'fantom';
  }
}
