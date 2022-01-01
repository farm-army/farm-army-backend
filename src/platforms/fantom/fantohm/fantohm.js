"use strict";

const OhmFork = require("../../common").OhmFork;

module.exports = class fantohm extends OhmFork {
  getConfig() {
    return {
      token: '0xfa1FBb8Ef55A4855E5688C0eE13aC3f202486286',
      sToken: '0x5E983ff70DE345de15DbDCf0529640F14446cDfa',
      redeemHelper: '0xF709c33F84Da692f76F035e51EE660a456196A67',
    }
  }

  getFarmLink(farm) {
    let url = 'https://app.fantohm.com';

    if (farm.id.includes('_bond_')) {
      url += '/#/bonds';
    } else if(farm.id.includes('_stake_')) {
      url += '/#/stake';
    }

    return url
  }

  getName() {
    return 'fantohm';
  }

  getChain() {
    return 'fantom';
  }
}
