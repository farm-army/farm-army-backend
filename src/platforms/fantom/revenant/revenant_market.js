const Utils = require("../../../utils");
const _ = require("lodash");
const BigNumber = require("bignumber.js");
const Web3EthContract = require("web3-eth-contract");
const CREDITUM_ABI = require("./abi/creditum.json");
const ERC20Abi = require("../../../abi/erc20.json");

module.exports = class revenant_market {
  static ADDRESS = '0x04D2C91A8BDf61b11A526ABea2e2d8d778d4A534'

  constructor(priceOracle, tokenCollector, cacheManager, liquidityTokenCollector) {
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector;
    this.cacheManager = cacheManager;
    this.liquidityTokenCollector = liquidityTokenCollector;
  }

  async getRawFarms() {
    const cacheKey = `${this.getName()}-markets-getRawPools-v4`

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    const foo = {
      wftm: "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
      usdc: "0x04068da6c83afcfa0e13ba15a6696662335d5b75",
      dai: "0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e",
      eth: "0x74b23882a30290451A17c44f4F05243b6b58C76d",
      btc: "0x321162Cd933E2Be498Cd2267a90534A804051b11",
      yvdai: "0x637eC617c86D24E421328e6CAEa1d92114892439",
      yvusdc: "0xEF0210eB96c7EB36AF8ed1c20306462764935607",
      yvwftm: "0x0DEC85e74A92c52b7F708c4B10207D9560CEFaf0"
    };

    const decimals = await Utils.multiCallIndexBy('token', Object.values(foo).map(address => ({
      token: address.toLowerCase(),
      decimals: new Web3EthContract(ERC20Abi, address).methods.decimals()
    })), this.getChain());

    const result = [];

    for (const [key, value] of Object.entries(foo)) {
      const item = {
        symbol: key,
        address: value,
      };

      if (decimals[value.toLowerCase()]?.decimals) {
        item.decimals = decimals[value.toLowerCase()].decimals;
      }

      result.push(item);
    }

    await this.cacheManager.set(result, Object.freeze(result), {ttl: 60 * 60})

    return Object.freeze(result);
  }

  async getAddressFarms(address) {
    const cacheKey = `getAddressFarms-markets-v3-${this.getName()}-${address}`;

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    const farms = await this.getFarms();

    const calls = await Utils.multiCall(farms.map(farm => ({
      id: farm.id,
      userData: new Web3EthContract(CREDITUM_ABI, revenant_market.ADDRESS).methods.userData(farm.raw.address, address),
    })), this.getChain());

    const result = calls
      .filter(v => v?.userData && v?.userData[0] && new BigNumber(v?.userData[0]).isGreaterThan(Utils.DUST_FILTER))
      .map(v => v.id);

    await this.cacheManager.set(cacheKey, result, {ttl: 60 * 5});

    return result;
  }

  async getFarms(refresh = false) {
    let cacheKey = `getFarms-markets-v4-${this.getName()}`;

    if (!refresh) {
      const cache = await this.cacheManager.get(cacheKey)
      if (cache) {
        return cache;
      }
    }

    const markets = await this.getRawFarms();

    const balances = await Utils.multiCallIndexBy('token', markets.map(market => ({
      token: market.address.toLowerCase(),
      balanceOf: new Web3EthContract(ERC20Abi, market.address).methods.balanceOf(revenant_market.ADDRESS)
    })), this.getChain());

    const farms = [];

    markets.forEach(farm => {
      const item = {
        id: `${this.getName()}_market_${farm.address.toLowerCase()}`,
        name: farm.symbol.toUpperCase(),
        token: farm.symbol.replace('yv', '').toLowerCase(),
        provider: this.getName(),
        has_details: true,
        raw: Object.freeze(farm),
        link: `https://revenant.finance/creditum/cusd/yvusdc/${farm.symbol}`,
        extra: {},
        chain: this.getChain(),
      };

      item.extra.transactionToken = farm.address;
      item.extra.transactionAddress = revenant_market.ADDRESS;

      // resolve: lp pools
      let symbol = this.tokenCollector.getSymbolByAddress(item.extra.transactionToken);
      if (!symbol) {
        symbol = this.liquidityTokenCollector.getSymbolNames(item.extra.transactionToken);

        if (symbol) {
          item.extra.lpAddress = item.extra.transactionToken;
        }
      }

      if (symbol) {
        item.token = symbol.toLowerCase();
      }

      if (balances[farm.address.toLowerCase()] && balances[farm.address.toLowerCase()].balanceOf) {
        item.tvl = {
          amount: balances[farm.address.toLowerCase()].balanceOf / (10 ** (farm.decimals || 18))
        };

        const price = this.priceOracle.findPrice(item.extra.transactionToken);
        if (price) {
          item.tvl.usd = item.tvl.amount * price;
        }
      }

      farms.push(Object.freeze(item));
    });

    await this.cacheManager.set(cacheKey, farms, {ttl: 60 * 30});

    console.log(`${this.getName()} updated`);

    return farms;
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

    const callsPromises = await Utils.multiCall(farms.map(farm => ({
      id: farm.id,
      userData: new Web3EthContract(CREDITUM_ABI, revenant_market.ADDRESS).methods.userData(farm.raw.address, address),
    })), this.getChain());

    const calls = callsPromises.filter(v => v?.userData && v?.userData[0] && new BigNumber(v?.userData[0]).isGreaterThan(Utils.DUST_FILTER))

    const result2 = [];

    calls.forEach(call => {
      const farm = farms.find(f => f.id === call.id);

      const amount = call.userData[0].toString();
      if (amount > 0) {
        const result = {
          farm: farm
        };

        result.deposit = {
          symbol: '?',
          amount: amount / (10 ** (farm.raw.decimals || 18)),
        };

        const price = this.priceOracle.findPrice(farm.extra.transactionToken);
        if (price) {
          result.deposit.usd = result.deposit.amount * price;
        }

        if (!(result?.deposit?.usd && result.deposit.usd < 0.01)) {
          result2.push(Object.freeze(result));
        }
      }

      const debit = call.userData[1].toString();
      if (debit > 0) {
        const farm1 = _.cloneDeep(farm);

        farm1.name = farm1.name += ' Borrow (cUSD)'

        const result = {
          farm: farm1
        };

        result.deposit = {
          symbol: '?',
          amount: -(debit / (10 ** this.tokenCollector.getDecimals('0xe3a486c1903ea794eed5d5fa0c9473c7d7708f40'))),
        };

        const price = this.priceOracle.findPrice('0xe3a486c1903ea794eed5d5fa0c9473c7d7708f40') || 1;
        if (price) {
          result.deposit.usd = result.deposit.amount * price;
        }

        if (!(result?.deposit?.usd && Math.abs(result.deposit.usd) < 0.01)) {
          result2.push(Object.freeze(result));
        }
      }
    });

    return result2;
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

    return {};
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

  getName() {
    return 'revenant';
  }

  getChain() {
    return 'fantom';
  }
};
