"use strict";

const _ = require("lodash");

module.exports = class spiritswap {
  constructor(spiritswap, spiritswapLend) {
    this.spiritswap = spiritswap;
    this.spiritswapLend = spiritswapLend;
  }

  async getLbAddresses() {
    return _.uniq((await Promise.allSettled([
      this.spiritswap.getLbAddresses(),
    ]))
      .filter(p => p.status === 'fulfilled')
      .map(p => p.value).flat());
  }

  async getFarms(refresh = false) {
    return (await Promise.allSettled([
      this.spiritswap.getFarms(refresh),
      this.spiritswapLend.getFarms(refresh),
    ]))
      .filter(p => p.status === 'fulfilled')
      .map(p => p.value).flat();
  }

  async getYields(address) {
    return (await Promise.allSettled([
      this.spiritswap.getYields(address),
      this.spiritswapLend.getYields(address),
    ]))
      .filter(p => p.status === 'fulfilled')
      .map(p => p.value).flat();
  }

  async getDetails(address, id) {
    if (id.includes('_lend_')) {
      return this.spiritswapLend.getDetails(address, id);
    }

    return this.spiritswap.getDetails(address, id);
  }

  getName() {
    return 'spiritswap';
  }

  getChain() {
    return 'fantom';
  }
};
