"use strict";

const _ = require("lodash");

module.exports = class planet {
  constructor(master, lend) {
    this.master = master;
    this.lend = lend;
  }

  async getLbAddresses() {
    return _.uniq((await Promise.all([
      this.master.getLbAddresses(),
    ])).flat());
  }

  async getFarms(refresh = false) {
    return (await Promise.all([
      this.master.getFarms(refresh),
      this.lend.getFarms(refresh),
    ])).flat();
  }

  async getYields(address) {
    return (await Promise.all([
      this.master.getYields(address),
      this.lend.getYields(address),
    ])).flat();
  }

  async getDetails(address, id) {
    if (id.includes('_lend_')) {
      return this.lend.getDetails(address, id);
    }

    return this.master.getDetails(address, id);
  }

  getName() {
    return 'planet';
  }

  getChain() {
    return 'bsc';
  }
};
