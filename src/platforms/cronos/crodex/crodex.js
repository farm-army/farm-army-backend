"use strict";

const Utils = require("../../../utils");
const AstParser = require("../../../utils/ast_parser");
const StakingRewardSingleReward = require("../../common").StakingRewardSingleReward;

module.exports = class crodex extends StakingRewardSingleReward {
  async getRawFarms() {
    const cacheKey = `getRawFarms-v3-html-${this.getName()}`;

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    let rows = [];

    Object.values(await Utils.getJavascriptFiles('https://swap.crodex.app/')).forEach(f => {
      rows.push(...AstParser.createJsonFromObjectExpression(f, keys => keys.includes('stakingRewardAddress') && (keys.includes('tokens') || keys.includes('token'))));
    });

    const pools = rows
      .filter(i => i.stakingRewardAddress)
      .map(i => ({
        stakingRewardAddress: i.stakingRewardAddress,
      }));

    const cacheKeyLong = `${cacheKey}-long`;

    if (pools.length > 0) {
      await this.cacheManager.set(cacheKeyLong, pools, {ttl: 60 * 60 * 5});
    }

    await this.cacheManager.set(cacheKey, pools, {ttl: 60 * 60});

    return await this.cacheManager.get(cacheKeyLong);
  }

  getName() {
    return 'crodex';
  }

  getChain() {
    return 'cronos';
  }
}