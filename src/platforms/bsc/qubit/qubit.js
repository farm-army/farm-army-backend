"use strict";

const Utils = require("../../../utils");
const walk = require("acorn-walk");
const acorn = require("acorn");
const QtokenAbi = require("./abi/qtoken.json");
const LendBorrowPlatform = require("../../common").LendBorrowPlatform;

module.exports = class qubit extends LendBorrowPlatform {
  async getTokens() {
    const cacheKey = `getFarmsViaHtml-v5-${this.getName()}`;

    const cache = await this.cacheManager.get(cacheKey);
    if (cache) {
      return cache;
    }

    const javascriptFiles = await Utils.getJavascriptFiles("https://qbt.fi/app");

    let rawFarms = undefined;

    Object.values(javascriptFiles).forEach(body => {
      walk.simple(acorn.parse(body, {ecmaVersion: 'latest'}), {
        Literal(node) {
          if (node.value && node.value.toString().startsWith('{') && (node.value.toString().toLowerCase().includes('underlying') && node.value.toString().toLowerCase().includes('address'))) {
            try {
              rawFarms = JSON.parse(node.value);
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
