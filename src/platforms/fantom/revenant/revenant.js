"use strict";

const _ = require("lodash");

module.exports = class revenant {
  constructor(service0, service1) {
    this.service0 = service0;
    this.service1 = service1;
  }

  async getLbAddresses() {
    return _.uniq((await Promise.all([
      this.service0.getLbAddresses(),
    ])).flat());
  }

  async getFarms(refresh = false) {
    return (await Promise.all([
      this.service0.getFarms(refresh),
      this.service1.getFarms(refresh),
    ])).flat();
  }

  async getYields(address) {
    return (await Promise.all([
      this.service0.getYields(address),
      this.service1.getYields(address),
    ])).flat();
  }

  async getDetails(address, id) {
    if (id.includes('_farm_')) {
      return this.service0.getDetails(address, id);
    }

    if (id.includes('_market_')) {
      return this.service1.getDetails(address, id);
    }

    throw new Error('Invalid revenant type');
  }

  getName() {
    return 'revenant';
  }

  getChain() {
    return 'fantom';
  }
};
