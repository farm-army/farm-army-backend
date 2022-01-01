"use strict";

const OhmFork = require("../../common").OhmFork;

module.exports = class nemesis extends OhmFork {
  getConfig() {
    return {
      token: '0x8AC9DC3358A2dB19fDd57f433ff45d1fc357aFb3',
      sToken: '0xB91bfDb8b41120586CcB391f5cEE0dAe4482334f',
      redeemHelper: '0x1742705ee15155b189d3c361099a8d02fa6acb22',
    }
  }

  getFarmLink(farm) {
    let url = 'https://rising.nemesisdao.finance';

    if (farm.id.includes('_bond_')) {
      url += '/#/bonds';
    } else if(farm.id.includes('_stake_')) {
      url += '/#/stake';
    }

    return url
  }

  getName() {
    return 'nemesis';
  }

  getChain() {
    return 'bsc';
  }
}
