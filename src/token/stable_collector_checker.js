'use strict';

module.exports = class StableCollectorChecker {
  constructor(stableCollector, chain) {
    this.stableCollector = stableCollector;
    this.chain = chain;
  }

  isAllStables(addresses) {
    return this.stableCollector.isAllStables(this.chain, addresses);
  }
}
