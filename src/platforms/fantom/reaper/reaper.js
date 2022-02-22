const Utils = require("../../../utils");
const AstParser = require("../../../utils/ast_parser");

const Web3EthContract = require("web3-eth-contract");
const VAULT_ABI = require("./abi/vault.json");
const BigNumber = require("bignumber.js");

module.exports = class reaper {
  constructor(priceOracle, tokenCollector, farmCollector, cacheManager, liquidityTokenCollector, farmPlatformResolver) {
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector;
    this.farmCollector = farmCollector;
    this.cacheManager = cacheManager;
    this.liquidityTokenCollector = liquidityTokenCollector;
    this.farmPlatformResolver = farmPlatformResolver;
  }

  async getRawFarms() {
    const cacheKey = `${this.getName()}-v3-farm-info`

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    const files = await Utils.getJavascriptFiles('https://www.reaper.farm/');

    const rows = [];
    Object.values(files).forEach(f => {
      rows.push(...AstParser.createJsonFromObjectExpression(f, keys => keys.includes('strategy') && keys.includes('vault')));
    });

    const result = rows.filter(pool => pool.vault.address && pool.strategy.address && pool.lpToken.address === 'string')

    await this.cacheManager.set(cacheKey, result, {ttl: 60 * 30})

    return result;
  }

  async getFarms(refresh = false) {
    let cacheKey = `getFarms-${this.getName()}`;

    if (!refresh) {
      const cacheItem = await this.cacheManager.get(cacheKey)
      if (cacheItem) {
        return cacheItem;
      }
    }

    const pools = await this.getRawFarms();

    const vaultCalls = pools.map(pool => {
      const vault = new Web3EthContract(VAULT_ABI, pool.vault.address);

      return {
        vault: pool.vault.address.toLowerCase(),
        pricePerFullShare: vault.methods.getPricePerFullShare(),
        tvl: vault.methods.balance()
      };
    });

    const vault = await Utils.multiCallIndexBy("vault", vaultCalls, this.getChain());

    const farms = [];
    pools.forEach(pool => {
      if (typeof pool?.lpToken?.address !== 'string') {
        return;
      }

      const name = pool.name
        .replace('Crypt', '')
        .trim()
        .replace(/\s+(\w+)$/i, '')
        .trim();

      const item = {
        id: `${this.getName()}_${pool.vault.address}`,
        name: name,
        provider: this.getName(),
        has_details: true,
        raw: Object.freeze(pool),
        extra: {},
        chain: this.getChain(),
        compound: true,
      };

      item.extra.transactionToken = pool.lpToken.address;
      item.extra.transactionAddress = pool.vault.address;

      if (this.liquidityTokenCollector.get(item.extra.transactionToken)) {
        item.extra.lpAddress = item.extra.transactionToken
      } else if (pool.name.match(/^([\w]{0,9})-([\w]{0,9})\s*/g)) {
        item.extra.lpAddress = item.extra.transactionToken
      }

      const platform = this.farmPlatformResolver.findMainPlatformNameForTokenAddress(item.extra.transactionToken);
      if (platform) {
        item.platform = platform;
      }

      const vaultElement = vault[pool.vault.address.toLowerCase()];
      if (vaultElement && vaultElement.pricePerFullShare) {
        item.extra.pricePerFullShare = vaultElement.pricePerFullShare / 1e18;
      }

      if (vaultElement && vaultElement.tvl) {
        item.tvl = {
          amount: vaultElement.tvl / (10 ** this.tokenCollector.getDecimals(item.extra.transactionToken))
        };

        const price = this.priceOracle.findPrice(item.extra.transactionToken);
        if (price) {
          item.tvl.usd = item.tvl.amount * price;
        }
      }

      if (this.liquidityTokenCollector && item?.extra?.transactionToken && this.liquidityTokenCollector.isStable(item.extra.transactionToken)) {
        if (!item.flags) {
          item.flags = [];
        }

        item.flags.push('stable');
      }

      farms.push(Object.freeze(item));
    });

    await this.cacheManager.set(cacheKey, farms, {ttl: 60 * 30})

    console.log(`${this.getName()} updated`);

    return farms;
  }

  async getAddressFarms(address) {
    let cacheKey = `getAddressFarms-${this.getName()}-${address}`;

    const cacheItem = await this.cacheManager.get(cacheKey)
    if (cacheItem) {
      return cacheItem;
    }

    const farms = await this.getFarms();

    const tokenCalls = farms.map(farm => {
      const token = new Web3EthContract(VAULT_ABI, farm.raw.vault.address);

      return {
        id: farm.id,
        balanceOf: token.methods.balanceOf(address)
      };
    });

    const calls = await Utils.multiCall(tokenCalls, this.getChain());

    const result = calls
      .filter(v => v.balanceOf && new BigNumber(v.balanceOf).isGreaterThan(0))
      .map(v => v.id);

    await this.cacheManager.set(cacheKey, result, {ttl: 60 * 5})

    return result;
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

    const tokenCalls = addressFarms.map(a => {
      const farm = farms.filter(f => f.id === a)[0];

      const token = new Web3EthContract(VAULT_ABI, farm.raw.vault.address);

      return {
        id: farm.id,
        balanceOf: token.methods.balanceOf(address)
      };
    });

    const calls = await Utils.multiCall(tokenCalls, this.getChain());

    return calls.map(call => {
      const farm = farms.find(f => f.id === call.id);

      const result = {
        farm: farm
      };

      let decimals = farm.raw.tokenAddress ? this.tokenCollector.getDecimals(farm.extra.transactionToken) : 18;
      const amount = call.balanceOf * farm.extra.pricePerFullShare;

      result.deposit = {
        symbol: "?",
        amount: amount / (10 ** decimals)
      };

      let price = this.priceOracle.findPrice(farm.extra.transactionToken);
      if (price) {
        result.deposit.usd = result.deposit.amount * price;
      }

      return Object.freeze(result);
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
    return 'reaper';
  }

  getChain() {
    return 'fantom';
  }
}