"use strict";

const {AutoCompoundStakeVaults} = require("../../common");
const VVS_AUTO_ABI = require('./abi/0xA6fF77fC8E839679D4F7408E8988B564dE1A2dcD.json');

module.exports = class vvs_auto extends AutoCompoundStakeVaults {
  async getRawFarms() {
    return [{
      contract: '0xA6fF77fC8E839679D4F7408E8988B564dE1A2dcD',
      token: '0x2D03bECE6747ADC00E1a131BBA1469C15fD11e03',
    }];
  }

  getFarmLink(farm) {
    return 'https://vvs.finance/mines';
  }

  async getAddressAbi(contract) {
    return VVS_AUTO_ABI;
  }

  getName() {
    return 'vvs';
  }

  getChain() {
    return 'cronos'
  }
};
