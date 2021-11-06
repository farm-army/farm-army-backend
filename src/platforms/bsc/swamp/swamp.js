"use strict";

const PancakePlatformFork = require("../../common").PancakePlatformFork;
const MasterChefAbi = require('./abi/masterchef.json');
const Web3EthContract = require("web3-eth-contract");
const BigNumber = require("bignumber.js");

const Utils = require("../../../utils");
const JSDOM = require("jsdom").JSDOM;

module.exports = class swamp extends PancakePlatformFork {
  static MASTER_ADDRESS = "0x33adbf5f1ec364a4ea3a5ca8f310b597b8afdee3"

  constructor(cache, priceOracle, tokenCollector, farmCollector, cacheManager) {
    super(cache, priceOracle);

    this.cache = cache;
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector;
    this.farmCollector = farmCollector;
    this.cacheManager = cacheManager;
  }

  async getVaultInfo() {
    const cacheKey = `swamp-v1-html-vaults`

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    let response
    try {
      response = await Utils.requestGet('https://swamp.finance/app/');
    } catch (e) {
      console.log('error swamp fetching vault info')
      await this.cacheManager.set(cacheKey, [], {ttl: 60 * 20})

      return [];
    }

    const dom = new JSDOM(response);

    const vaults = [];

    const platforms = [];
    dom.window.document.querySelectorAll(".platform .itm").forEach(i => {
      const attributes = i.attributes;
      const info = {};
      for (let i = attributes.length - 1; i >= 0; i--) {
        let attribute = attributes[i];

        if (attribute.name.startsWith('data-')) {
          info[attribute.name.substr(5)] = attribute.value
        }
      }

      platforms.push(info);
    })

    dom.window.document.querySelectorAll(".pools .pool-card").forEach(i => {
      const attributes = i.attributes;

      const vault = {};
      for (let i = attributes.length - 1; i >= 0; i--) {
        let attribute = attributes[i];

        if (attribute.name.startsWith('data-')) {
          vault[attribute.name.substr(5)] = attribute.value
        }
      }

      if (vault.platform) {
        const platform = platforms.find(p => p.value.toString() === vault.platform.toString());

        if (platform) {
          vault.platform_name = platform.name;
        }
      }

      vaults.push(vault);
    })

    await this.cacheManager.set(cacheKey, vaults, {ttl: 60 * 20});

    return vaults;
  }

  async getFarms(refresh = false) {
    const cacheKey = `getFarms-${this.getName()}`;

    if (!refresh) {
      const cache = await this.cacheManager.get(cacheKey)
      if (cache) {
        return cache;
      }
    }

    const vaultInfos = await this.getVaultInfo();

    const farms = (await this.getRawFarms()).map(farm => {
      const item = {
        id: `${this.getName()}_farm_${farm.pid}`,
        name: farm.lpSymbol,
        provider: this.getName(),
        raw: Object.freeze(farm),
        has_details: true,
        extra: {},
        chain: this.getChain(),
        compound: true,
      };

      if (farm.isTokenOnly !== true) {
        item.extra.lpAddress = this.getAddress(farm.lpAddresses);
        item.extra.transactionToken = this.getAddress(farm.lpAddresses);
      } else {
        item.extra.transactionToken = this.getAddress(farm.tokenAddresses);
      }

      const farmEarns = this.getFarmEarns(item);
      if (farmEarns && farmEarns.length > 0) {
        item.earns = farmEarns;
      }

      item.extra.transactionAddress = this.getMasterChefAddress();

      const link = this.getFarmLink(item);
      if (link) {
        item.link = link;
      }

      const vaultInfo = vaultInfos.find(v => v.pid.toString() === farm.pid.toString());
      if (vaultInfo && vaultInfo.tvl && parseFloat(vaultInfo.tvl) > 0) {
        item.tvl = {
          usd: parseFloat(vaultInfo.tvl)
        };
      }

      if (vaultInfo && vaultInfo.apy && parseFloat(vaultInfo.apy) > 0) {
        item.yield = {
          apy: parseFloat(vaultInfo.apy)
        };
      }

      if (vaultInfo && vaultInfo.platform_name) {
        item.platform = vaultInfo.platform_name.toLowerCase();

        item.platform = item.platform
          .replace('pancake swap v2', 'pancake')
          .replace('pancake swap', 'pancake')
      }

      if (farm.actions) {
        item.actions = farm.actions;
      }

      return Object.freeze(item);
    });

    const result = [...farms]

    await this.cacheManager.set(cacheKey, result, {ttl: 60 * 30});

    console.log(`${this.getName()} updated`);

    return result;
  }

  async getFetchedFarms() {
    const cacheKey = `swamp-v3-master-farms`

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    const foo = (await this.farmCollector.fetchForMasterChef(swamp.MASTER_ADDRESS)).filter(f => f.isFinished !== true);

    const reformat = foo.map(f => {
      f.lpAddresses = f.lpAddress

      if (f.isTokenOnly === true) {
        f.tokenAddresses = f.lpAddress
      }

      return f
    })

    await this.cacheManager.set(cacheKey, reformat, {ttl: 60 * 30})

    return reformat;
  }
  async getYieldsInner(address, addressFarms) {
    if (addressFarms.length === 0) {
      return [];
    }

    const farms = await this.getFarms();

    const tokenCalls = addressFarms.map(id => {
      const farm = farms.find(f => f.id === id);

      const contract = new Web3EthContract(this.getMasterChefAbi(), this.getMasterChefAddress());
      return {
        id: farm.id,
        pendingNATIVE: contract.methods.pendingNATIVE(farm.raw.pid, address),
        stakedWantTokens: contract.methods.stakedWantTokens(farm.raw.pid, address)
      };
    });

    const calls = await Utils.multiCall(tokenCalls);

    const results = [];
    calls.forEach(call => {
      const farm = farms.find(f => f.id === call.id);

      const result = {};
      result.farm = farm;

      if (new BigNumber(call.pendingNATIVE).isGreaterThan(0)) {
        const reward = {
          symbol: "swamp",
          amount: call.pendingNATIVE / 1e18
        };

        const swampPrice = this.priceOracle.findPrice("swamp");
        if (swampPrice) {
          reward.usd = reward.amount * swampPrice;
        }

        result.rewards = [reward];
      }

      if (new BigNumber(call.stakedWantTokens).isGreaterThan(0)) {
        const deposit = {
          symbol: "?",
          amount: call.stakedWantTokens / 1e18
        };

        const price = this.priceOracle.getAddressPrice(this.getAddress(farm.raw.lpAddresses));
        if (price) {
          deposit.usd = deposit.amount * price;

          // dust
          if (deposit.usd < 0.01) {
            return;
          }
        }

        result.deposit = deposit;
      }

      results.push(result);
    });

    return results;
  }
  
  async getRawFarms() {
    return this.getFetchedFarms();
  }

  getRawPools() {
    return [];
  }

  getName() {
    return 'swamp';
  }

  getFarmLink() {
    return 'https://swamp.finance/app/';
  }

  getFarmEarns(farm) {
    return farm.id.startsWith(`${this.getName()}_farm_`)
      ? ['swamp']
      : undefined;

  }

  getPendingRewardContractMethod() {
    return 'pendingNATIVE';
  }

  getSousAbi() {
    return [];
  }

  getMasterChefAbi() {
    return MasterChefAbi;
  }

  getMasterChefAddress() {
    return swamp.MASTER_ADDRESS;
  }

  async getDetails(address, id) {
    const farm = (await this.getFarms()).find(f => f.id === id);
    if (!farm) {
      return {};
    }

    const [yieldFarms, transactions] = await Promise.all([
      this.getYieldsInner(address, [farm.id]),
      this.getTransactions(address, id)
    ]);

    const result = {};

    let lpTokens = [];
    if (yieldFarms[0]) {
      result.farm = yieldFarms[0];
      lpTokens = this.priceOracle.getLpSplits(farm, yieldFarms[0]);
    }

    if (transactions && transactions.length > 0) {
      result.transactions = transactions;
    }

    if (lpTokens && lpTokens.length > 0) {
      result.lpTokens = lpTokens;
    }

    const yieldDetails = Utils.findYieldForDetails(result);
    if (yieldDetails) {
      result.yield = yieldDetails;
    }

    return result;
  }
};
