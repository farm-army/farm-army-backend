"use strict";

const _ = require("lodash");

module.exports = class fmarket {
  constructor(...pools) {
    this.pools = pools;
  }

  async getFarms(refresh = false) {
    return (await Promise.all(this.pools.map(i => i.getFarms(refresh)))).flat();
  }

  async getYields(address) {
    return (await Promise.all(this.pools.map(i => i.getYields(address)))).flat();
  }

  async getDetails(address, id) {
    for (const pool of this.pools) {
      const name = pool.getName();
      if (id.startsWith(name) && typeof pool.getDetails !== "undefined") {
        return pool.getDetails(address, id);
      }
    }

    return {}
  }

  getName() {
    return 'fmarket';
  }

  getChain() {
    return 'fantom';
  }
};
