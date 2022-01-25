"use strict";

const Utils = require("../../../utils");
const walk = require("acorn-walk");
const acorn = require("acorn");
const QtokenAbi = require("./abi/qtoken.json");
const LendBorrowPlatform = require("../../common").LendBorrowPlatform;
const _ = require("lodash");

module.exports = class qubit extends LendBorrowPlatform {
  async getTokens() {
    const cacheKey = `getFarmsViaHtml-v5-${this.getName()}`;

    const cache = await this.cacheManager.get(cacheKey);
    if (cache) {
      return cache;
    }

    const javascriptFiles = await Utils.getJavascriptFiles("https://qbt.fi/app");

    let rawFarms = {};

    Object.values(javascriptFiles).forEach(body => {
      walk.simple(acorn.parse(body, {ecmaVersion: 'latest'}), {
        Literal(node) {
          if (node.value && node.value.toString().startsWith('{') && (node.value.toString().toLowerCase().includes('underlying') && node.value.toString().toLowerCase().includes('address'))) {
            try {
              const rawFarms1 = JSON.parse(node.value);
              if (!rawFarms1['KLAY'])  {
                rawFarms = _.assign(rawFarms, rawFarms1);
              }
            } catch (e) {
              console.log('invalid farm json')
            }
          }
        }
      })
    });

    const result = [];

    for (const [key, value] of Object.entries(rawFarms)) {
      result.push({
        name: key,
        address: value.address,
      })
    }

    await this.cacheManager.set(cacheKey, Object.freeze(result), {ttl: 60 * 30});

    return Object.freeze(result);
  }

  getName() {
    return 'qubit';
  }

  getChain() {
    return 'bsc';
  }

  getTokenAbi() {
    return QtokenAbi;
  }

  getConfig() {
    return {}
  }

  getFarmLink(farm) {
    return 'https://qbt.fi/app'
  }

  getFarmEarns(farm) {
    return ['qbt'];
  }
}
