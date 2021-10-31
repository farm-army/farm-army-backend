"use strict";

const _ = require("lodash");

module.exports = class mars {
  constructor(masterchef0, masterchef1) {
    this.masterchef0 = masterchef0;
    this.masterchef1 = masterchef1;
  }

  async getLbAddresses() {
    return _.uniq((await Promise.all([
      this.masterchef0.getLbAddresses(),
      this.masterchef1.getLbAddresses(),
    ])).flat());
  }

  async getFarms(refresh = false) {
    return (await Promise.all([
      this.masterchef0.getFarms(refresh),
      this.masterchef1.getFarms(refresh),
    ])).flat();
  }

  async getYields(address) {
    return (await Promise.all([
      this.masterchef0.getYields(address),
      this.masterchef1.getYields(address),
    ])).flat();
  }

  async getDetails(address, id) {
    if (id.includes('_masterchef0_')) {
      return this.masterchef0.getDetails(address, id);
    }

    if (id.includes('_masterchef1_')) {
      return this.masterchef1.getDetails(address, id);
    }
    
    throw new Error('Invalid mars');
  }

  getName() {
    return 'mars';
  }

  getChain() {
    return 'bsc';
  }
};
