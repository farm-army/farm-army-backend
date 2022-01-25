const Utils = require("../../../utils");
const _ = require("lodash");
const BigNumber = require("bignumber.js");
const Web3EthContract = require("web3-eth-contract");
const ERC20_ABI = require("../../../abi/erc20.json");

module.exports = class fyearn {
  static MASTER_ADDRESS = '0xe0c43105235C1f18EA15fdb60Bb6d54814299938'

  constructor(priceOracle, tokenCollector, cacheManager, liquidityTokenCollector) {
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector;
    this.cacheManager = cacheManager;
    this.liquidityTokenCollector = liquidityTokenCollector;
  }

  static async updateTokenPrices(priceOracle) {
    const result = await Utils.requestJsonGet('https://test-api.yearn.network/v1/chains/250/vaults/get');

    (result || []).forEach(r => {
      if (!r.address || !r?.metadata?.pricePerShare || !r.decimals) {
          return;
      }

      const price = priceOracle.findPrice(r.token);
      if (price) {
        const usdPrice = price * (r.metadata.pricePerShare / (10 ** r.decimals));
        priceOracle.updatePrice(r.address, usdPrice);
      }
    })
  }

  async getRawFarms() {
    const cacheKey = `${this.getName()}-getRawPools-v2`

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    const result = await Utils.requestJsonGet('https://test-api.yearn.network/v1/chains/250/vaults/get');

    await this.cacheManager.set(result, Object.freeze(result), {ttl: 60 * 60})

    return Object.freeze(result);
  }

  async getAddressFarms(address) {
    const cacheKey = `getAddressFarms-v2-${this.getName()}-${address}`;

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    const farms = await this.getFarms();

    const calls = await Utils.multiCall(farms.map(farm => ({
      id: farm.id,
      balanceOf: new Web3EthContract(ERC20_ABI, farm.raw.address).methods.balanceOf(address),
    })), this.getChain());

    const result = calls
      .filter(v => v?.balanceOf && new BigNumber(v.balanceOf).isGreaterThan(Utils.DUST_FILTER))
      .map(v => v.id);

    await this.cacheManager.set(cacheKey, result, {ttl: 60 * 5});

    return result;
  }

  async getFarms(refresh = false) {
    let cacheKey = `getFarms-v3-${this.getName()}`;

    if (!refresh) {
      const cache = await this.cacheManager.get(cacheKey)
      if (cache) {
        return cache;
      }
    }

    const farms = [];
    (await this.getRawFarms()).forEach(farm => {
      const item = {
        id: `${this.getName()}_farm_${farm.address.toLowerCase()}`,
        name: farm.name.replace('yVault', '').trim(),
        token: farm.symbol.replace('yv', '').toLowerCase().trim(),
        provider: this.getName(),
        has_details: true,
        raw: Object.freeze(farm),
        link: `https://yearn.finance/#/vault/${farm.address}`,
        extra: {},
        chain: this.getChain(),
        compound: true,
      };

      item.extra.transactionToken = farm.token;
      item.extra.transactionAddress = farm.address;

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

      if (farm?.metadata?.pricePerShare) {
        item.extra.pricePerFullShare = farm.metadata.pricePerShare / (10 ** farm.decimals);
      }

      if (farm?.underlyingTokenBalance?.amount) {
        item.tvl = {
          amount: farm.underlyingTokenBalance.amount / (10 ** farm.decimals)
        };

        if (farm?.underlyingTokenBalance?.amountUsdc) {
          item.tvl.usd = farm.underlyingTokenBalance.amountUsdc / 1e6;
        }
      }

      if (farm?.metadata?.apy?.net_apy) {
        item.yield = {
          apy: farm.metadata.apy.net_apy * 100
        };
      }

      if (farm.depositsDisabled === true || farm.withdrawalsDisabled === true) {
        if (!item.flags) {
          item.flags = [];
        }

        item.flags.push('deprecated');
      }

      if (farm?.metadata?.strategies?.strategiesMetadata && farm.metadata.strategies.strategiesMetadata.length > 0 && farm.metadata.strategies.strategiesMetadata[0].description) {
        if (!item.notes) {
          item.notes = [];
        }

        item.notes.push(farm.metadata.strategies.strategiesMetadata[0].description.substring(0, 200));

        if (farm.metadata.strategies.strategiesMetadata[0].protocols && farm.metadata.strategies.strategiesMetadata[0].protocols.length > 0) {
          item.platform = farm.metadata.strategies.strategiesMetadata[0].protocols.join(',').toLowerCase().substring(0, 50);
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

    const userInfo = await Utils.multiCall(addressFarms.map(id => {
      const farm = farms.find(f => f.id === id);

      return {
        id: farm.id,
        balanceOf: new Web3EthContract(ERC20_ABI, farm.raw.address).methods.balanceOf(address),
      };
    }), this.getChain());

    const result = userInfo.filter(v => v?.balanceOf && new BigNumber(v.balanceOf).isGreaterThan(Utils.DUST_FILTER));

    return result
      .map(call => {
        const farm = farms.find(f => f.id === call.id);

        const amount = call.balanceOf.toString();

        const result = {
          farm: farm
        };

        result.deposit = {
          symbol: '?',
          amount: amount / (10 ** farm.raw.decimals),
        };

        if (farm.extra.pricePerFullShare) {
          result.deposit.amount *= farm.extra.pricePerFullShare
        }

        let price = this.priceOracle.findPrice(farm.extra.transactionToken);
        if (price) {
          result.deposit.usd = result.deposit.amount * price;
        }

        return result;
      });
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
    return 'fyearn';
  }

  getChain() {
    return 'fantom';
  }
};
