const Utils = require("../../../utils");

const Web3EthContract = require("web3-eth-contract");
const FACTORY_ABI = require("./abi/factory.json");
const _ = require("lodash");
const HttpsProxyAgent = require('https-proxy-agent');

module.exports = class tarot {
  constructor(priceOracle, tokenCollector, cacheManager, liquidityTokenCollector, farmPlatformResolver, proxy) {
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector;
    this.cacheManager = cacheManager;
    this.liquidityTokenCollector = liquidityTokenCollector;
    this.farmPlatformResolver = farmPlatformResolver;
    this.proxy = proxy;
  }

  async getLbAddresses() {
    const lbAddresses = (await this.getRawFarms())
      .filter(p => p?.subgraph?.pair?.uniswapV2PairAddress)
      .map(p => p.subgraph.pair.uniswapV2PairAddress)

    return _.uniq(lbAddresses);
  }

  async getRawFarms() {
    const cacheKey = `${this.getName()}-v5-farm-info`

    const cacheItem = await this.cacheManager.get(cacheKey)
    if (cacheItem) {
      return cacheItem;
    }

    const allLendingPoolsLengthResult = await Utils.multiCall([{
      allLendingPoolsLength: new Web3EthContract(FACTORY_ABI, '0x35c052bbf8338b06351782a565aa9aad173432ea').methods.allLendingPoolsLength(),
    }], this.getChain());

    const poolsRaw = await Utils.multiCall([...Array(parseInt(allLendingPoolsLengthResult[0].allLendingPoolsLength)).keys()].map(id => ({
      id: id.toString(),
      address: new Web3EthContract(FACTORY_ABI, '0x35c052bbf8338b06351782a565aa9aad173432ea').methods.allLendingPools(id),
    })), this.getChain());

    const poolsRaw2 = await Utils.multiCall(poolsRaw.map(call => ({
      address: call.address,
      lendingPool: new Web3EthContract(FACTORY_ABI, '0x35c052bbf8338b06351782a565aa9aad173432ea').methods.getLendingPool(call.address),
    })), this.getChain());

    const result = poolsRaw2
      .filter(i => i.lendingPool[0] === true)
      .map(i => ({
        address: i.address,
        initialized: i.lendingPool[0],
        lendingPoolId: parseInt(i.lendingPool[1]),
        collateral: i.lendingPool[2],
        borrowable0: i.lendingPool[3],
        borrowable1: i.lendingPool[4],
      }));

    const subgraphResponse = await this.proxyRequest('POST', "https://dev.tarot.to/subgraphs/name/tarot-finance/tarot", {
      "headers": {
        "accept": "*/*",
        "accept-language": "en-US,en;q=0.9,de;q=0.8",
        "content-type": "application/json",
        "sec-ch-ua": "\"Google Chrome\";v=\"93\", \" Not;A Brand\";v=\"99\", \"Chromium\";v=\"93\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"Linux\"",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site"
      },
      "referrer": "https://www.tarot.to/",
      "referrerPolicy": "strict-origin-when-cross-origin",
      "body": "{\"operationName\":null,\"variables\":{},\"query\":\"{\\n  lendingPools(first: 1000, orderBy: totalBorrowsUSD, orderDirection: desc) {\\n    id\\n    borrowable0 {\\n      id\\n      underlying {\\n        id\\n        symbol\\n        name\\n        decimals\\n        derivedUSD\\n        __typename\\n      }\\n      totalBalance\\n      totalBorrows\\n      borrowRate\\n      reserveFactor\\n      kinkBorrowRate\\n      kinkUtilizationRate\\n      borrowIndex\\n      accrualTimestamp\\n      exchangeRate\\n      totalBalanceUSD\\n      totalSupplyUSD\\n      totalBorrowsUSD\\n      farmingPool {\\n        epochAmount\\n        epochBegin\\n        segmentLength\\n        vestingBegin\\n        sharePercentage\\n        distributor {\\n          id\\n          __typename\\n        }\\n        __typename\\n      }\\n      __typename\\n    }\\n    borrowable1 {\\n      id\\n      underlying {\\n        id\\n        symbol\\n        name\\n        decimals\\n        derivedUSD\\n        __typename\\n      }\\n      totalBalance\\n      totalBorrows\\n      borrowRate\\n      reserveFactor\\n      kinkBorrowRate\\n      kinkUtilizationRate\\n      borrowIndex\\n      accrualTimestamp\\n      exchangeRate\\n      totalBalanceUSD\\n      totalSupplyUSD\\n      totalBorrowsUSD\\n      farmingPool {\\n        epochAmount\\n        epochBegin\\n        segmentLength\\n        vestingBegin\\n        sharePercentage\\n        distributor {\\n          id\\n          __typename\\n        }\\n        __typename\\n      }\\n      __typename\\n    }\\n    collateral {\\n      id\\n      totalBalance\\n      totalBalanceUSD\\n      safetyMargin\\n      liquidationIncentive\\n      exchangeRate\\n      __typename\\n    }\\n    pair {\\n      reserve0\\n      reserve1\\n      reserveUSD\\n      token0Price\\n      token1Price\\n      derivedUSD\\n      derivedETH\\n      isVaultToken\\n      uniswapV2PairAddress\\n      rewardsToken {\\n        id\\n        symbol\\n        name\\n        decimals\\n        derivedUSD\\n        __typename\\n      }\\n      __typename\\n    }\\n    __typename\\n  }\\n}\\n\"}",
      "method": "POST",
      "mode": "cors"
    });

    const subgraphs = subgraphResponse
      ? JSON.parse(subgraphResponse)?.data?.lendingPools || []
      : [];

    result.forEach(i => {
      const item = subgraphs.find(x => x.id.toLowerCase() === i.address.toLowerCase());
      if (item) {
        i.subgraph = item;
      }
    });

    await this.cacheManager.set(cacheKey, result, {ttl: 60 * 60 * 3})

    return result;
  }

  async getFarms(refresh = false) {
    let cacheKey = `getFarms-v2-${this.getName()}`;

    if (!refresh) {
      const cacheItem = await this.cacheManager.get(cacheKey)
      if (cacheItem) {
        return cacheItem;
      }
    }

    const pools = await this.getRawFarms();

    const farms = [];
    pools.forEach(pool => {
      if (!pool.subgraph) {
        return;
      }

      const name = this.liquidityTokenCollector.getSymbolNames(pool.subgraph.pair.uniswapV2PairAddress) || '?';

      const item = {
        id: `${this.getName()}_${pool.address.toLowerCase()}`,
        name: name.toUpperCase(),
        token: name.toLowerCase(),
        provider: this.getName(),
        has_details: false,
        raw: Object.freeze(pool),
        extra: {},
        chain: this.getChain(),
        compound: true,
        flags: ['lend', 'borrow'],
        link: `https://www.tarot.to/lending-pool/250/${pool.address}`,
        leverage: true,
      };

      item.extra.transactionToken = pool.subgraph.pair.uniswapV2PairAddress;
      item.extra.transactionAddress = pool.address;

      item.extra.lpAddress = item.extra.transactionToken;

      const platform = this.farmPlatformResolver.findMainPlatformNameForTokenAddress(item.extra.transactionToken);
      if (platform) {
        item.platform = platform;
      }

      if (pool?.subgraph?.pair?.reserveUSD) {
        item.tvl = {
          usd: parseFloat(pool.subgraph.pair.reserveUSD)
        };
      }

      farms.push(Object.freeze(item));
    });

    await this.cacheManager.set(cacheKey, farms, {ttl: 60 * 30})

    console.log(`${this.getName()} updated`);

    return farms;
  }

  async proxyRequest(method, url, opt, timeout) {
    for (const proxy of [this.proxy]) {
      if (proxy) {
        opt.agent = new HttpsProxyAgent(proxy);
      }

      const response = await Utils.request(method, url, opt, timeout);
      if (response) {
        return response;
      }
    }

    return undefined;
  }

  async getAddressFarms(address) {
    let cacheKey = `getAddressFarms-${this.getName()}-v2-${address}`;

    const cacheItem = await this.cacheManager.get(cacheKey)
    if (cacheItem) {
      return cacheItem;
    }

    const subgraphResponse = await this.proxyRequest("POST", "https://dev.tarot.to/subgraphs/name/tarot-finance/tarot", {
      "headers": {
        "accept": "*/*",
        "accept-language": "en-US,en;q=0.9",
        "cache-control": "no-cache",
        "content-type": "application/json",
        "pragma": "no-cache",
        "sec-ch-ua": "\"Chromium\";v=\"93\", \" Not;A Brand\";v=\"99\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"Linux\"",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site"
      },
      "referrer": "https://www.tarot.to/",
      "referrerPolicy": "strict-origin-when-cross-origin",
      "body": "{\"operationName\":null,\"variables\":{},\"query\":\"{\\n  user(id: \\\"" + address.toLowerCase() + "\\\") {\\n    collateralPositions(first: 1000) {\\n      balance\\n      collateral {\\n        lendingPool {\\n          id\\n          __typename\\n        }\\n        __typename\\n      }\\n      __typename\\n    }\\n    supplyPositions(first: 1000) {\\n      balance\\n      borrowable {\\n        underlying {\\n          id\\n          __typename\\n        }\\n        lendingPool {\\n          id\\n          __typename\\n        }\\n        __typename\\n      }\\n      __typename\\n    }\\n    borrowPositions(first: 1000) {\\n      borrowBalance\\n      borrowIndex\\n      borrowable {\\n        underlying {\\n          id\\n          __typename\\n        }\\n        lendingPool {\\n          id\\n          __typename\\n        }\\n        __typename\\n      }\\n      __typename\\n    }\\n    __typename\\n  }\\n}\\n\"}",
      "method": "POST",
      "mode": "cors"
    }, 15);

    const result = subgraphResponse
      ? JSON.parse(subgraphResponse)?.data?.user || []
      : [];

    await this.cacheManager.set(cacheKey, result, {ttl: 60 * 5})

    return result;
  }

  async getYields(address) {
    const addressFarms = await this.getAddressFarms(address);
    if ((addressFarms.supplyPositions || []).length === 0 && (addressFarms.collateralPositions || []).length === 0 && (addressFarms.borrowPositions || []).length === 0) {
      return [];
    }

    return await this.getYieldsInner(address, addressFarms);
  }

  async getYieldsInner(address, addressFarms) {
    if (addressFarms.length === 0) {
      return [];
    }

    const farms = await this.getFarms();

    const results = [];

    (addressFarms.supplyPositions || []).forEach(supply => {
      const farmOrigin = farms.find(f => supply?.borrowable?.lendingPool?.id && f.raw.address.toLowerCase() === supply.borrowable.lendingPool.id.toLowerCase());
      if (!farmOrigin) {
        return;
      }

      const farm = _.cloneDeep(farmOrigin);

      const result = {
        farm: farm
      };

      const token = [farm.raw.subgraph.borrowable0, farm.raw.subgraph.borrowable1]
        .find(b => b?.underlying?.id && supply?.borrowable?.underlying?.id && b.underlying.id.toLowerCase() === supply.borrowable.underlying.id.toLowerCase());

      if (!token) {
        return;
      }

      const symbol = this.tokenCollector.getSymbolByAddress(supply.borrowable.underlying.id);

      if (symbol) {
        result.farm.name = 'Supply: ' + symbol.toUpperCase()
      }

      result.deposit = {
        symbol: (symbol || '?').toLowerCase(),
        amount: supply.balance * token.exchangeRate
      };

      if (Math.abs(result.deposit.amount) * 1e18 < Utils.DUST_FILTER) {
        return;
      }

      if (supply?.borrowable?.underlying?.id) {
        const price = this.priceOracle.findPrice(supply.borrowable.underlying.id);
        if (price) {
          result.deposit.usd = result.deposit.amount * price;
        }
      }

      if ('usd' in result.deposit && Math.abs(result.deposit.usd) < 0.01) {
        return;
      }

      results.push(result);
    });

    (addressFarms.collateralPositions || []).forEach(supply => {
      const farm = farms.find(f => supply?.collateral?.lendingPool?.id && f.raw.address.toLowerCase() === supply.collateral.lendingPool.id.toLowerCase());
      if (!farm) {
        return;
      }

      const result = {
        farm: Object.freeze(farm),
      };

      const symbol = this.tokenCollector.getSymbolByAddress(farm.extra.transactionToken);

      result.deposit = {
        symbol: (symbol || '?').toLowerCase(),
        amount: supply.balance // * farm.raw.subgraph.collateral.exchangeRate,
      };

      if (Math.abs(result.deposit.amount) * 1e18 < Utils.DUST_FILTER) {
        return;
      }

      const price = this.priceOracle.findPrice(farm.extra.transactionToken);
      if (price) {
        result.deposit.usd = result.deposit.amount * price;
      }

      if ('usd' in result.deposit && Math.abs(result.deposit.usd) < 0.01) {
        return;
      }

      results.push(result);
    });

    (addressFarms.borrowPositions || []).forEach(supply => {
      const farmOrigin = farms.find(f => supply?.borrowable?.lendingPool?.id && f.raw.address.toLowerCase() === supply.borrowable.lendingPool.id.toLowerCase());
      if (!farmOrigin) {
        return;
      }

      const farm = _.cloneDeep(farmOrigin);

      const result = {
        farm: farm
      };

      const borrowTokenAddress = supply.borrowable.underlying.id;
      const token = [farm.raw.subgraph.borrowable0, farm.raw.subgraph.borrowable1]
        .find(b => b?.underlying?.id && supply?.borrowable?.underlying?.id && b.underlying.id.toLowerCase() === borrowTokenAddress.toLowerCase());

      if (!token) {
        return;
      }

      const symbol = this.tokenCollector.getSymbolByAddress(borrowTokenAddress);

      if (symbol) {
        result.farm.name = 'Borrow: ' + symbol.toUpperCase()
      }

      result.deposit = {
        symbol: (symbol || '?').toLowerCase(),
        amount: supply.borrowBalance * -1 // * token.exchangeRate ???
      };

      if (Math.abs(result.deposit.amount) * 1e18 < Utils.DUST_FILTER) {
        return;
      }

      const price = this.priceOracle.findPrice(borrowTokenAddress);
      if (price) {
        result.deposit.usd = result.deposit.amount * price;
      }

      if ('usd' in result.deposit && Math.abs(result.deposit.usd) < 0.01) {
        return;
      }

      results.push(result);
    });

    return Object.freeze(results);
  }

  async getTransactions(address, id) {
    return {};
  }

  async getDetails(address, id) {
    return {};
  }

  getName() {
    return 'tarot';
  }

  getChain() {
    return 'fantom';
  }
}