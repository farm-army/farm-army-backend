"use strict";

const _ = require("lodash");

module.exports = class crannex {
  constructor(masterchef) {
    this.masterchef = masterchef;
  }

  async getLbAddresses() {
    return _.uniq((await Promise.all([
      this.masterchef.getLbAddresses(),
    ])).flat());
  }

  async getFarms(refresh = false) {
    return (await Promise.all([
      this.masterchef.getFarms(refresh),
    ])).flat();
  }

  async getYields(address) {
    return (await Promise.all([
      this.masterchef.getYields(address),
    ])).flat();
  }

  async getDetails(address, id) {
    if (id.includes('_masterchef_')) {
      return this.masterchef.getDetails(address, id);
    }

    return [];
  }

  getName() {
    return 'crannex';
  }

  getChain() {
    return 'cronos';
  }
};
