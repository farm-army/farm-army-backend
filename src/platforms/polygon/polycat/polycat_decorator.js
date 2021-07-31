"use strict";

const _ = require("lodash");

module.exports = class polycat_decorator {
  static MASTER_ADDRESS = "0x8CFD1B9B7478E7B0422916B72d1DB6A9D513D734"

  constructor(polycat, polycatCompound) {
    this.polycat = polycat;
    this.polycatCompound = polycatCompound;
  }

  async getLbAddresses() {
    return _.uniq((await Promise.allSettled([
      this.polycat.getLbAddresses(),
      this.polycatCompound.getLbAddresses(),
    ]))
      .filter(p => p.status === 'fulfilled')
      .map(p => p.value).flat());
  }

  async getFarms(refresh = false) {
    return (await Promise.allSettled([
      this.polycat.getFarms(refresh),
      this.polycatCompound.getFarms(refresh),
    ]))
      .filter(p => p.status === 'fulfilled')
      .map(p => p.value).flat();
  }

  async getYields(address) {
    return (await Promise.allSettled([
      this.polycat.getYields(address),
      this.polycatCompound.getYields(address),
    ]))
      .filter(p => p.status === 'fulfilled')
      .map(p => p.value).flat();
  }

  async getDetails(address, id) {
    if (id.includes('_compound_')) {
      return this.polycatCompound.getDetails(address, id);
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
