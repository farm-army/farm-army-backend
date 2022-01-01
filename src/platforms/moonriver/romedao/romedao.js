"use strict";

const OhmFork = require("../../common").OhmFork;

module.exports = class romedao extends OhmFork {
  getConfig() {
    return {
      token: '0x4a436073552044D5f2f49B176853ad3Ad473d9d6',
      sToken: '0x89f52002e544585b42f8c7cf557609ca4c8ce12a',
      redeemHelper: '0x697a247544a27bf7F7a172E910c817436DE2b9B1',
    }
  }

  getFarmLink(farm) {
    let url = 'https://romedao.finance';

    if (farm.id.includes('_bond_')) {
      url += '/bonds';
    } else if(farm.id.includes('_stake_')) {
      url += '/stake';
    }

    return url
  }

  getName() {
    return 'romedao';
  }

  getChain() {
    return 'moonriver';
  }
}
