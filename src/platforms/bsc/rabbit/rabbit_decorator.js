"use strict";

const _ = require("lodash");

module.exports = class rabbit {
  constructor(rabbit, dao) {
    this.rabbit = rabbit;
    this.dao = dao;
  }

  async getLbAddresses() {
    return _.uniq((await Promise.all([
      this.dao.getLbAddresses(),
    ])).flat());
  }

  async getFarms(refresh = false) {
    return (await Promise.all([
      this.rabbit.getFarms(refresh),
      this.dao.getFarms(refresh),
    ])).flat();
  }

  async getYields(address) {
    return (await Promise.all([
      this.rabbit.getYields(address),
      this.dao.getYields(address),
    ])).flat();
  }

  async getDetails(address, id) {
    if (!id.includes('_dao_')) {
      return this.rabbit.getDetails(address, id);
    }

    return this.dao.getDetails(address, id);
  }

  getName() {
    return 'rabbit';
  }

  getChain() {
    return 'bsc';
  }
};
