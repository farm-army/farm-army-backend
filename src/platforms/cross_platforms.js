"use strict";

module.exports = class CrossPlatforms {
  constructor(platforms) {
    this.platforms = platforms;
  }

  getFunctionAwaits(func, parameters) {
    const result = [];

    for (const platform of this.platforms) {
      result.push(...platform.getFunctionAwaits(func, parameters));
    }

    return result;
  }

  getFunctionAwaitsForPlatforms(wantPlatforms, func, parameters) {
    const result = [];

    for (const platform of this.platforms) {
      result.push(...platform.getFunctionAwaitsForPlatforms(wantPlatforms, func, parameters));
    }

    return result;
  }
}
