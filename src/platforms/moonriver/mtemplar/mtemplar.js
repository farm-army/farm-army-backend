"use strict";

const OhmFork = require("../../common").OhmFork;

module.exports = class templar extends OhmFork {
  getConfig() {
    return {
      token: '0xD86E3F7B2Ff4e803f90c799D702955003bcA9875',
      sToken: '0x8C9827Cd430d945aE5A5c3cfdc522f8D342334B9',
      redeemHelper: '0xF4A0B875751486B55F9Cd50DF2f120e4b50A79d0',
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
    return 'mtemplar';
  }

  getChain() {
    return 'moonriver';
  }
}
