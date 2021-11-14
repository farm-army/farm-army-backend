"use strict";

const fs = require("fs");
const path = require("path");


module.exports = class Platforms {
  constructor(platforms, cache, priceOracle, tokenCollector, folder) {
    this.myPlatforms = platforms;
    this.cache = cache;
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector;
    this.folder = folder;
    this.platformInstances = undefined;
  }

  requirePlatforms() {
    const me = this;
    const alreadyInjected = this.myPlatforms.map(p => p.getName());

    const newInstances = [];

    if (this.folder) {
      const platforms = fs
        .readdirSync(this.folder, {withFileTypes: true})
        .filter(f => f.isDirectory() && !alreadyInjected.includes(f.name))
        .map(f => f.name);

      const inst =  platforms
        .map(x => `${this.folder}/${x}/${x}.js`)
        .filter(x => fs.existsSync(x))
        .map(p => [
          path.basename(p).substr(0, path.basename(p).length - 3),
          new (require(p))(me.cache, me.priceOracle, me.tokenCollector) // TODO: init should be done from services.js
        ]);

      newInstances.push(...inst);
    }

    newInstances.push(...this.myPlatforms.map(p => [p.getName(), p]));

    return newInstances;
  }

  platforms() {
    if (!this.platformInstances) {
      this.platformInstances = this.requirePlatforms();
    }

    return this.platformInstances;
  }

  getPlatformByName(name) {
    const find = this.platforms().find(item => item[0] === name);

    if (!find) {
      throw Error(`Invalid platform: ${name}`);
    }

    return find[1];
  }

  getFunctionAwaits(func, parameters) {
    return this.platforms()
      .filter(p => p[1][func])
      .map(p => {
        return parameters ? p[1][func](...parameters) : p[1][func]();
      });
  }

  getFunctionAwaitsForPlatforms(platforms, func, parameters) {
    return this.platforms()
      .filter(p => platforms.includes(p[0]) && p[1][func])
      .map(p => {
        return parameters ? p[1][func](...parameters) : p[1][func]();
      });
  }
};
