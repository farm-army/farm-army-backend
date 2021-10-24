"use strict";

const _ = require("lodash");

module.exports = class farmersonly {
  constructor(compound, vault) {
    this.compound = compound;
    this.farm = vault;
  }

  async getLbAddresses() {
    return _.uniq((await Promise.allSettled([
      this.compound.getLbAddresses(),
      this.farm.getLbAddresses(),
    ]))
      .filter(p => p.status === 'fulfilled')
      .map(p => p.value).flat());
  }

  async getFarms(refresh = false) {
    return (await Promise.allSettled([
      this.compound.getFarms(refresh),
      this.farm.getFarms(refresh),
    ]))
      .filter(p => p.status === 'fulfilled')
      .map(p => p.value).flat();
  }

  async getYields(address) {
    return (await Promise.allSettled([
      this.compound.getYields(address),
      this.farm.getYields(address),
    ]))
      .filter(p => p.status === 'fulfilled')
      .map(p => p.value).flat();
  }

  async getDetails(address, id) {
    if (id.includes('_compound_')) {
      return this.compound.getDetails(address, id);
    }

    return this.farm.getDetails(address, id);
  }

  getName() {
    return 'farmersonly';
  }

  getChain() {
    return 'harmony';
  }
};
