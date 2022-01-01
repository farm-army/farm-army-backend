"use strict";

const OhmFork = require("../../common").OhmFork;

module.exports = class hectordao extends OhmFork {
  getConfig() {
    return {
      token: '0x5C4FDfc5233f935f20D2aDbA572F770c2E377Ab0',
      sToken: '0x75bdeF24285013387A47775828bEC90b91Ca9a5F',
      redeemHelper: '0xe78D7ECe7969d26Ae39b2d86BbC04Ae32784daF2',
    }
  }

  getFarmLink(farm) {
    let url = 'https://app.hectordao.com';

    if (farm.id.includes('_bond_')) {
      url += '/#/bonds';
    } else if(farm.id.includes('_stake_')) {
      url += '/#/stake';
    }

    return url
  }

  getName() {
    return 'hectordao';
  }

  getChain() {
    return 'fantom';
  }
}
