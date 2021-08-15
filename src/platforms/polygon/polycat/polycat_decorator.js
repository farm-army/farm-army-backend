"use strict";

const _ = require("lodash");

module.exports = class polycat {
  constructor(polycat, polycatCompound, polycatPaw) {
    this.polycat = polycat;
    this.polycatCompound = polycatCompound;
    this.polycatPaw = polycatPaw;
  }

  async getLbAddresses() {
    return _.uniq((await Promise.allSettled([
      this.polycat.getLbAddresses(),
      this.polycatCompound.getLbAddresses(),
      this.polycatPaw.getLbAddresses(),
    ]))
      .filter(p => p.status === 'fulfilled')
      .map(p => p.value).flat());
  }

  async getFarms(refresh = false) {
    return (await Promise.allSettled([
      this.polycat.getFarms(refresh),
      this.polycatCompound.getFarms(refresh),
      this.polycatPaw.getFarms(refresh),
    ]))
      .filter(p => p.status === 'fulfilled')
      .map(p => p.value).flat();
  }

  async getYields(address) {
    return (await Promise.allSettled([
      this.polycat.getYields(address),
      this.polycatPaw.getYields(address),
      this.polycatCompound.getYields(address),
    ]))
      .filter(p => p.status === 'fulfilled')
      .map(p => p.value).flat();
  }

  async getDetails(address, id) {
    if (id.includes('_compound_')) {
      return this.polycatCompound.getDetails(address, id);
    }

    if (id.includes('_paw_')) {
      return this.polycatPaw.getDetails(address, id);
    }

    return this.polycat.getDetails(address, id);
  }

  getName() {
    return 'polycat';
  }

  getChain() {
    return 'polygon';
  }
};
