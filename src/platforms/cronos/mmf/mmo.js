"use strict";

const _ = require("lodash");
const Utils = require("../../../utils");
const DASHBOARD_ADDRESS = "0x55f040E3A6e0ff69f5095B3cbF458919C5e02A0B";
const DASHBOARD_ABI = require(`./abi/mmo_dashboard.json`);
const VAULTS = require(`./vaults.json`);

module.exports = class mmo {
  constructor(cacheManager, priceOracle, tokenCollector, liquidityTokenCollector) {
    this.cacheManager = cacheManager;
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector
    this.liquidityTokenCollector = liquidityTokenCollector
  }

  async getLbAddresses() {
    const response = _.cloneDeep((await this.getFarmsViaHtml()) || {});

    const lpAddresses = [];
    for (const key of Object.keys(response)) {
      const farm = response[key];

      // lpAddress
      if (farm.token && key.match(/([\w]{0,4})-([\w]{0,4})\s*/g)) {
        lpAddresses.push(farm.token);
      }
    }

    return _.uniq(lpAddresses);
  }

  async getBalancedAddressPoolInfo(address, pools) {
    const calls = await Utils.multiCallRpcIndex([{
      reference: 'poolsOf',
      contractAddress: DASHBOARD_ADDRESS,
      abi: DASHBOARD_ABI,
      calls: [
        {
          reference: "poolsOf",
          method: "poolsOf",
          parameters: [address, pools]
        }
      ]
    }], this.getChain());

    return (calls && calls.poolsOf && calls.poolsOf.poolsOf ? calls.poolsOf.poolsOf : [])
      .filter(p => p.balance > 0)
      .map(i => Utils.convertRcpResultObject(i))
  }

  async getAddressFarms(address) {
    const cacheKey = `getAddressFarms-${this.getName()}-${address}`;
    const cache = await this.cacheManager.get(cacheKey);
    if (cache) {
      return cache;
    }

    const farms = await this.getFarms();

    const poolsOf = await this.getBalancedAddressPoolInfo(address, farms.filter(farm => farm.raw.vaultAddress).map(farm => farm.raw.vaultAddress))

    await this.cacheManager.set(`getAddressFarms-all-${this.getName()}-${address}`, poolsOf, {ttl: 60 * 5});

    const result = poolsOf
      .filter(p => p.balance > 0)
      .map(p =>
        farms.find(f => f.raw.vaultAddress.toLowerCase() === p.pool.toLowerCase()).id
      )

    await this.cacheManager.set(cacheKey, result, {ttl: 60 * 5});

    return result;
  }

  async getFarms(refresh = false) {
    const cacheKey = `getFarms-${this.getName()}`;

    if (!refresh) {
      const cache = await this.cacheManager.get(cacheKey);
      if (cache) {
        return cache;
      }
    }

    const response = _.cloneDeep((await this.getFarmsViaHtml()) || {});

    const overall = await this.getOverall();

    const farms = [];

    for (const key of Object.keys(response)) {
      const farm = response[key];

      if (farm.closed === true) {
        continue;
      }

      farm.id = farm.vaultAddress;

      let tokenSymbol = farm.name.toLowerCase()
        .trim()
        .replace('boost', '')
        .replace('flip', '')
        .replace('cake maximizer', '')
        .replace('maximizer', '')
        .replace('flip', '')
        .replace('v2', '')
        .replace(/\s+\w*lp$/, '')
        .replace(/\s/g, '')
        .trim();

      if (farm.lpAddresses) {
        const lpSymbol = this.tokenCollector.getSymbolByAddress(farm.lpAddresses);
        if (lpSymbol) {
          tokenSymbol = lpSymbol;
        }
      }

      const items = {
        id: `${this.getName()}_${farm.vaultAddress.toLowerCase()}`,
        name: tokenSymbol.toUpperCase(),
        token: tokenSymbol,
        raw: Object.freeze(farm),
        provider: this.getName(),
        link: 'https://vaults.mm.finance/vault',
        has_details: true,
        extra: {},
        compound: true,
        chain: this.getChain(),
      };

      if (farm.swap) {
        items.platform = farm.swap;
      }

      // lpAddress
      if (key.match(/([\w]{0,4})-([\w]{0,4})\s*/g)) {
        items.extra.lpAddress = farm.lpAddresses;
      }

      if (farm.vaultAddress) {
        items.extra.transactionAddress = farm.vaultAddress;
      }

      if (farm.lpAddresses) {
        items.extra.transactionToken = farm.lpAddresses;
      }

      if (farm?.vault?.tokenPrices?.lpPrice) {
        items.extra.tokenPrice = farm.vault.tokenPrices.lpPrice;
      }

      const notes = [];
      if (farm.summary) {
        notes.push(farm.summary);
      }

      if (farm.description) {
        notes.push(farm.description);
      }

      const finalNotes = _.uniq(
        notes
          .map(b => b.replace(/<\/?[^>]+(>|$)/g, "").trim())
          .filter(b => b.length > 0)
      );

      if (finalNotes.length > 0) {
        items.notes = finalNotes;
      }

      if (farm.vaultAddress && overall[farm.vaultAddress.toLowerCase()] && overall[farm.vaultAddress.toLowerCase()].tvl) {
        items.tvl = {
          usd: overall[farm.vaultAddress.toLowerCase()].tvl
        };
      }

      /*
      let infoPool = overall[farm.address.toLowerCase()];
      if (infoPool) {
        if (infoPool.apy > 0) {
          items.yield = {
            apy: infoPool.apy
          };
        }
      }
      }
      */

      if (farm.earn) {
        const earn = farm.earn.toLowerCase().replace(/ /g, '');
        earn.split("+").filter(e => e.match(/^[\w]{1,10}$/g)).forEach(e => {
          const token = e.trim();
          if (!items.earns) {
            items.earns = [];
          }

          items.earns.push(token);
        });
      }

      if (items?.extra?.transactionToken && this.liquidityTokenCollector.isStable(items.extra.transactionToken)) {
        if (!items.flags) {
          items.flags = [];
        }

        items.flags.push('stable');
      }

      farms.push(Object.freeze(items));
    }

    await this.cacheManager.set(cacheKey, farms, {ttl: 60 * 30});

    console.log(`${this.getName()} updated`);

    return farms;
  }

  async getTransactions(address, id) {
    const farm = (await this.getFarms()).find(f => f.id === id);
    if (!farm) {
      return {};
    }

    if (farm.extra.transactionAddress && farm.extra.transactionToken) {
      return Utils.getTransactions(
        farm.extra.transactionAddress,
        farm.extra.transactionToken,
        address,
        this.getChain()
      );
    }

    return [];
  }

  async getYields(address) {
    const addressFarms = await this.getAddressFarms(address);
    if (addressFarms.length === 0) {
      return [];
    }

    return await this.getYieldsInner(address, addressFarms);
  }

  async getYieldsInner(address, addressFarms) {
    if (addressFarms.length === 0) {
      return [];
    }

    const farms = await this.getFarms();

    const cacheKey = `getAddressFarms-all-${this.getName()}-${address}`;

    let poolsOfCalls = await this.cacheManager.get(cacheKey);
    if (!poolsOfCalls) {
      const poolsOfAddresses = addressFarms
        .map(farmId => farms.find(f => f.id === farmId))
        .map(farm => farm.raw.vaultAddress);

      poolsOfCalls = await this.getBalancedAddressPoolInfo(address, poolsOfAddresses);
    }

    const poolsOf = {};
    if (poolsOfCalls) {
      poolsOfCalls.forEach(p => {
        poolsOf[p.pool.toLowerCase()] = p;
      })
    }

    const results = [];

    for (const id of addressFarms) {
      const farm = farms.find(f => f.id === id);

      const result = {};

      result.farm = farm;

      let balance

      let poolsOfElement = poolsOf[farm.raw.vaultAddress.toLowerCase()];
      if (poolsOfElement) {
        balance = poolsOfElement.balance.toString();
      }

      if (balance) {
        result.deposit = {
          symbol: "?",
          amount: balance / (10 ** this.tokenCollector.getDecimals(farm.extra.transactionToken))
        };

        let price = farm?.extra?.tokenPrice;
        if (!price) {
          price = this.priceOracle.getAddressPrice(farm.extra.transactionToken);
        }

        if (price) {
          result.deposit.usd = result.deposit.amount * price;
        }
      }

      // dust
      if (result.deposit && result.deposit.usd && result.deposit.usd < 0.01) {
        continue;
      }


      const pendingPlatformToken = poolsOfElement?.pMMO;
      const pBASE = poolsOfElement?.pBASE;

      const rewards = [];

      if (pendingPlatformToken && pendingPlatformToken > 0) {
        const item = {
          symbol: "mmo",
          amount: pendingPlatformToken / (10 ** this.tokenCollector.getDecimals('0x50c0C5bda591bc7e89A342A3eD672FB59b3C46a7'))
        };

        const bunnyPrice = this.priceOracle.findPrice('0x50c0C5bda591bc7e89A342A3eD672FB59b3C46a7')
        if (bunnyPrice) {
          item.usd = item.amount * bunnyPrice;
        }

        rewards.push(item);
      }

      if (pBASE && pBASE > 0) {
        const mmfToken = '0x97749c9B61F878a880DfE312d2594AE07AEd7656';

        const item = {
          symbol: this.tokenCollector.getSymbolByAddress(mmfToken),
          amount: pBASE / (10 ** this.tokenCollector.getDecimals(mmfToken))
        };

        const price = this.priceOracle.findPrice(mmfToken)
        if (price) {
          item.usd = item.amount * price;
        }

        rewards.push(item);
      }

      if (rewards.length > 0) {
        result.rewards = rewards;
      }

      results.push(result);
    }

    return results;
  }

  async getOverall() {
    const addresses = _.cloneDeep((await this.getFarmsViaHtml()) || {})
      .map(farm => farm.vaultAddress);

    const calls = await Utils.multiCallRpcIndex([{
      reference: 'poolsOf',
      contractAddress: DASHBOARD_ADDRESS,
      abi: DASHBOARD_ABI,
      calls: [
        {
          reference: "poolsOf",
          method: "poolsOf",
          parameters: ['0x0000000000000000000000000000000000000000', addresses]
        }
      ]
    }], this.getChain());

    const poolsOf = {};
    if (calls?.poolsOf?.poolsOf) {
      calls.poolsOf.poolsOf.forEach(p => {
        poolsOf[p.pool.toLowerCase()] = {
          tvl: p.tvl.toString() / 1e18
        };
      })
    }

    return poolsOf
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

  async getFarmsViaHtml() {
    return Object.freeze(VAULTS);

    const cacheKey = `getFarmsViaHtml-v1-${this.getName()}`;

    const cache = await this.cacheManager.get(cacheKey);
    if (cache) {
      return cache;
    }

    let result = await this.cacheManager.get(cacheKey + '-long');
    const response = await Utils.requestJsonGet('https://madmeerkat.io/api/vault');
    if (response?.vaultData) {
      result = response.vaultData;
      await this.cacheManager.set(cacheKey + '-long', result, {ttl: 60 * 60 * 6});
    }

    await this.cacheManager.set(cacheKey, result, {ttl: 60 * 30});

    return Object.freeze(result);
  }

  getName() {
    return 'mmo';
  }

  getChain() {
    return 'cronos';
  }
};
