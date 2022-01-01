"use strict";

const OhmFork = require("../../common").OhmFork;
const Ohm = require("../../ohm");

module.exports = class euphoria extends OhmFork {
  async getRawPools() {
    const cacheKey = `getRawFarms-v4-${this.getName()}`;

    const cache = await this.cacheManager.get(cacheKey);
    if (cache) {
      return cache;
    }

    const bonds = await Ohm.getBondAddressesViaJavascript("https://app.euphoria.money", this.getConfig());

    await this.cacheManager.set(cacheKey, bonds, {ttl: 60 * 30});

    return bonds;
  }

  getConfig() {
    return {
      token: '0x0dc78c79B4eB080eaD5C1d16559225a46b580694',
      sToken: '0xF38593388079F7f5130d605E38aBF6090D981eC2',
      redeemHelper: undefined,
    }
  }

  getFarmLink(farm) {
    let url = 'https://app.euphoria.money';

    if (farm.id.includes('_bond_')) {
      url += '/#/mints';
    } else if(farm.id.includes('_stake_')) {
      url += '/#/stake';
    }

    return url
  }

  getName() {
    return 'euphoria';
  }

  getChain() {
    return 'harmony';
  }
}
