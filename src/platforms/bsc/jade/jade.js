"use strict";

const OhmFork = require("../../common").OhmFork;
const Ohm = require("../../ohm");

module.exports = class jade extends OhmFork {
  async getRawPools() {
    const cacheKey = `getRawFarms-v4-${this.getName()}`;

    const cache = await this.cacheManager.get(cacheKey);
    if (cache) {
      return cache;
    }

    const bonds = await Ohm.getBondAddressesViaJavascript("https://jadeprotocol.io", this.getConfig());

    await this.cacheManager.set(cacheKey, bonds, {ttl: 60 * 30});

    return bonds;
  }

  getConfig() {
    return {
      token: '0x7ad7242A99F21aa543F9650A56D141C57e4F6081',
      sToken: '0x94CEA04C51E7d3EC0a4A97Ac0C3B3c9254c2aD41',
      redeemHelper: undefined,
    }
  }

  getFarmLink(farm) {
    let url = 'https://jadeprotocol.io';

    if (farm.id.includes('_bond_')) {
      url += '/#/bonds';
    } else if(farm.id.includes('_stake_')) {
      url += '/#/stake';
    }

    return url
  }

  getName() {
    return 'jade';
  }

  getChain() {
    return 'bsc';
  }
}
