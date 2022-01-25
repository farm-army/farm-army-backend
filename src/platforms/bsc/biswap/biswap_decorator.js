"use strict";

const _ = require("lodash");

module.exports = class biswap_decorator {
  constructor(masterchef, auto) {
    this.masterchef = masterchef;
    this.auto = auto;
  }

  async getLbAddresses() {
    return _.uniq((await Promise.all([
      this.masterchef.getLbAddresses(),
    ])).flat());
  }

  async getFarms(refresh = false) {
    return (await Promise.all([
      this.masterchef.getFarms(refresh),
      this.auto.getFarms(refresh),
    ])).flat();
  }

  async getYields(address) {
    return (await Promise.all([
      this.masterchef.getYields(address),
      this.auto.getYields(address),
    ])).flat();
  }

  async getDetails(address, id) {
    if (id.includes('_auto_')) {
      return this.auto.getDetails(address, id);
    }

    return this.masterchef.getDetails(address, id);
  }

  getName() {
    return 'biswap';
  }

  getChain() {
    return this.masterchef.getChain();
  }
};
