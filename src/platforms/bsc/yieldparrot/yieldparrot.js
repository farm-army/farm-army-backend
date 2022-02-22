"use strict";

const Utils = require("../../../utils");
const AstParser = require("../../../utils/ast_parser");
const MasterChefWithAutoCompoundAndRewards = require("../../common").MasterChefWithAutoCompoundAndRewards;

module.exports = class yieldparrot extends MasterChefWithAutoCompoundAndRewards {
  getFarmLink() {
    return 'https://app.yieldparrot.finance/';
  }

  async farmInfo() {
    const cacheKey = `${this.getName()}-v1-farm-info`

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    const files = await Utils.getJavascriptFiles('https://app.yieldparrot.finance/');

    const rows = [];
    Object.values(files).forEach(f => {
      rows.push(...AstParser.createJsonFromObjectExpression(f, keys => keys.includes('strategyContractAddress') && keys.includes('token')));
    });

    if (rows.length === 0) {
      await this.cacheManager.set(cacheKey, [], {ttl: 60 * 30});
      return [];
    }

    const apys = (await Utils.requestJsonGet('https://api.yieldparrot.finance/apy')) || {};

    const map = [];
    rows.forEach(r => {
      const apy = apys[r.apiIndexApy];
      if (!apy || apy <= 0) {
        return;
      }

      map.push({
        id: r.farm.masterchefPid,
        apy: apy * 100,
      });
    });

    await this.cacheManager.set(cacheKey, map, {ttl: 60 * 30});

    return map;
  }

  getMasterChefAddress() {
    return "0x1bee93b82275F3F215411bE49F948F8568e5e103";
  }

  getChain() {
    return 'bsc';
  }

  getTvlFunction() {
    return 'wantLockedTotal';
  }
};
