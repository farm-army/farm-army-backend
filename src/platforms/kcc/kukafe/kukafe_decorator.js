"use strict";

const _ = require("lodash");

module.exports = class kukafe {
  constructor(kukafe, kukafeCompound) {
    this.kukafe = kukafe;
    this.kukafeCompound = kukafeCompound;
  }

  async getLbAddresses() {
    return _.uniq((await Promise.allSettled([
      this.kukafe.getLbAddresses(),
      this.kukafeCompound.getLbAddresses(),
    ]))
      .filter(p => p.status === 'fulfilled')
      .map(p => p.value).flat());
  }

  async getFarms(refresh = false) {
    return (await Promise.allSettled([
      this.kukafe.getFarms(refresh),
      this.kukafeCompound.getFarms(refresh),
    ]))
      .filter(p => p.status === 'fulfilled')
      .map(p => p.value).flat();
  }

  async getYields(address) {
    return (await Promise.allSettled([
      this.kukafe.getYields(address),
      this.kukafeCompound.getYields(address),
    ]))
      .filter(p => p.status === 'fulfilled')
      .map(p => p.value).flat();
  }

  async getDetails(address, id) {
    if (id.includes('_compound_')) {
      return this.kukafeCompound.getDetails(address, id);
    }

    return this.kukafe.getDetails(address, id);
  }

  getName() {
    return 'kukafe';
  }

  getChain() {
    return 'kcc';
  }
};
