"use strict";

const _ = require("lodash");

module.exports = class peleven {
  constructor(peleven, pelevenLeverage) {
    this.peleven = peleven;
    this.pelevenLeverage = pelevenLeverage;
  }

  async getLbAddresses() {
    return _.uniq((await Promise.allSettled([
      this.peleven.getLbAddresses(),
      this.pelevenLeverage.getLbAddresses(),
    ]))
      .filter(p => p.status === 'fulfilled')
      .map(p => p.value).flat());
  }

  async getFarms(refresh = false) {
    return (await Promise.allSettled([
      this.peleven.getFarms(refresh),
      this.pelevenLeverage.getFarms(refresh),
    ]))
      .filter(p => p.status === 'fulfilled')
      .map(p => p.value).flat();
  }

  async getYields(address) {
    return (await Promise.allSettled([
      this.peleven.getYields(address),
      this.pelevenLeverage.getYields(address),
    ]))
      .filter(p => p.status === 'fulfilled')
      .map(p => p.value).flat();
  }

  async getDetails(address, id) {
    if (id.includes('_leverage_')) {
      return this.pelevenLeverage.getDetails(address, id);
    }

    return this.peleven.getDetails(address, id);
  }

  getName() {
    return 'peleven';
  }

  getChain() {
    return 'polygon';
  }
};
