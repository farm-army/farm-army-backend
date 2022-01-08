"use strict";

const OhmFork = require("../../common").OhmFork;
const Ohm = require("../../ohm");
const Utils = require("../../../utils");
const walk = require("acorn-walk");
const acorn = require("acorn");

module.exports = class unus extends OhmFork {
  async getRawPools() {
    const cacheKey = `getRawFarms-v2-${this.getName()}`;

    const cache = await this.cacheManager.get(cacheKey);
    if (cache) {
      return cache;
    }

    // or use dashboard => 0x0e60726F5AcA46D9Eb190235aC9140570ce4A70B
    const javascriptFiles = await Utils.getJavascriptFiles("https://unusdao.finance/");

    const bonds = [];

    const me = this;
    Object.values(javascriptFiles).forEach(body => {
      walk.simple(acorn.parse(body, {ecmaVersion: 'latest'}), {
        Literal(node) {
          if (node.value && node.value.toString().startsWith('{') && (node.value.toString().toLowerCase().includes('deposittoken') && node.value.toString().toLowerCase().includes('address') && node.value.toString().toLowerCase().includes('contractname'))) {
            let items = {};

            try {
              items = JSON.parse(node.value);
            } catch (e) {
              console.log('invalid farm json')
            }

            for (const [key, value] of Object.entries(items)) {
              if (value.address && value.depositToken && key.toLowerCase().includes('bond')) {
                bonds.push({
                  bondAddress: value.address,
                  reserveAddress: value.depositToken,
                  rewardToken: me.getConfig().token,
                })
              }
            }
          }
        }
      })
    });

    await this.cacheManager.set(cacheKey, bonds, {ttl: 60 * 30});

    return bonds;
  }

  getConfig() {
    return {
      token: '0xB91Ec4F9D7D12A1aC145A7Ae3b78AFb45856C9c8',
      sToken: '0x76D91700CE49968DC314a23287343Ed9A0571eD0',
      redeemHelper: undefined,
      usePercentVestedFor: true,
    }
  }

  getFarmLink(farm) {
    let url = 'https://unusdao.finance';

    if(farm.id.includes('_stake_')) {
      url += '/#/stake';
    }

    return url
  }

  getName() {
    return 'unus';
  }

  getChain() {
    return 'bsc';
  }
}
