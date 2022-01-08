"use strict";

const OhmFork = require("../../common").OhmFork;

module.exports = class jade_dao extends OhmFork {
  getConfig() {
    return {
      token: '0xC25b7244e192D531495C400c64ea914A77E730A2',
      sToken: '0xe148b222026dc52729fb168c83db675e3c5885bf',
      redeemHelper: '0xe758e14da2092925EA46296caB7a4f394e1F1f54',
    }
  }

  getFarmLink(farm) {
    let url = 'https://rabbitdao.rabbitfinance.io';

    if (farm.id.includes('_bond_')) {
      url += '/mint';
    } else if(farm.id.includes('_stake_')) {
      url += '/stake';
    }

    return url
  }

  async onFarmsBuild(farms) {
    farms.forEach(farm => {
      farm.provider = 'rabbit';
    });
  }

  getName() {
    return 'rabbit_dao';
  }

  getChain() {
    return 'bsc';
  }
}
