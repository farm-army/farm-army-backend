"use strict";

const _ = require("lodash");

module.exports = class market {
  constructor(pool5, pool3) {
    this.pool5 = pool5;
    this.pool3 = pool3;
  }

  async getFarms(refresh = false) {
    return (await Promise.all([
      this.pool5.getFarms(refresh),
      this.pool3.getFarms(refresh),
    ])).flat();
  }

  async getYields(address) {
    return (await Promise.all([
      this.pool5.getYields(address),
      this.pool3.getYields(address),
    ])).flat();
  }

  async getDetails(address, id) {
    if (id.includes('_pool5')) {
      return this.pool5.getDetails(address, id);
    }

    if (id.includes('_pool3')) {
      return this.pool3.getDetails(address, id);
    }

    return {}
  }

  getName() {
    return 'market';
  }

  getChain() {
    return 'polygon';
  }
};
