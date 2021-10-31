"use strict";

const _ = require("lodash");

module.exports = class moonkafe {
  constructor(compound) {
    this.compound = compound;
  }

  async getLbAddresses() {
    return _.uniq((await Promise.allSettled([
      this.compound.getLbAddresses(),
    ]))
      .filter(p => p.status === 'fulfilled')
      .map(p => p.value).flat());
  }

  async getFarms(refresh = false) {
    return (await Promise.allSettled([
      this.compound.getFarms(refresh),
    ]))
      .filter(p => p.status === 'fulfilled')
      .map(p => p.value).flat();
  }

  async getYields(address) {
    return (await Promise.allSettled([
      this.compound.getYields(address),
    ]))
      .filter(p => p.status === 'fulfilled')
      .map(p => p.value).flat();
  }

  async getDetails(address, id) {
    if (id.includes('_compound_')) {
      return this.compound.getDetails(address, id);
    }

    return [];
  }

  getName() {
    return 'moonkafe';
  }

  getChain() {
    return 'moonriver';
  }
};
