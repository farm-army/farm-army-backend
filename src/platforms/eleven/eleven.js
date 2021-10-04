"use strict";

const _ = require("lodash");
const BigNumber = require("bignumber.js");
const Web3EthContract = require("web3-eth-contract");
const Utils = require("../../utils");
const vaultABI = require("./abi/vaultABI.json");
const erc20Abi = require("../../abi/erc20.json");
const MasterchefAbi = require("./abi/masterchef.json");
const BankAbi = require("./abi/bank.json");
const AstParser = require("../../utils/ast_parser");

module.exports = class eleven {
  static ELEVEN_TOKEN = '0xAcD7B3D9c10e97d0efA418903C0c7669E702E4C0';

  constructor(cache, priceOracle, tokenCollector, farmCollector, cacheManager, liquidityTokenCollector) {
    this.cache = cache;
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector;
    this.farmCollector = farmCollector;
    this.cacheManager = cacheManager;
    this.liquidityTokenCollector = liquidityTokenCollector;
  }

  async getLbAddresses() {
    return [];
  }

  getMasterChefAddress() {
    return '0x1ac6C0B955B6D7ACb61c9Bdf3EE98E0689e07B8A';
  }

  async getBanks() {
    let cacheKey = `getBanks-v1-${this.getName()}`;

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    const files = await Utils.getJavascriptFiles('https://eleven.finance/');

    const banks = [];
    Object.values(files).forEach(f => {
      banks.push(...AstParser.createJsonFromObjectExpression(f, keys => keys.includes('collateralTokens') && keys.includes('minLoanSize') && keys.includes('baseToken')));
    });

    const result = banks.filter(f => f.network === this.getChain());

    result.forEach(bank => {
      if (bank.baseToken) {
        let baseTokenAddress = this.tokenCollector.getAddressBySymbol(bank.baseToken.toLowerCase());

        // strip W
        if (!baseTokenAddress && bank.baseToken.toLowerCase().startsWith('w')) {
          baseTokenAddress = this.tokenCollector.getAddressBySymbol(bank.baseToken.toLowerCase().substring(1));
        }

        if (baseTokenAddress) {
          bank.baseTokenAddress = baseTokenAddress;
        }
      }
    })

    await this.cacheManager.set(cacheKey, result, {ttl: 60 * 60 * 3})

    return result;
  }

  async fetchBankTokens() {
    const bank = await this.getBanks();

    const calls = await Utils.multiCallIndexBy('id', bank.map(bank => {
      const contract = new Web3EthContract(BankAbi, bank.address);

      return {
        id: bank.id,
        pricePerFullShare: contract.methods.getPricePerFullShare(),
        decimals: contract.methods.decimals(),
      };
    }), this.getChain());

    bank.forEach(bank => {
      if (!bank.baseTokenAddress || !calls[bank.id] || !calls[bank.id].pricePerFullShare) {
        return;
      }

      this.tokenCollector.add({
        address: bank.address.toLowerCase(),
        symbol: bank.name.toLowerCase(),
        decimals: parseInt(calls[bank.id].decimals),
      });

      const basePrice = this.priceOracle.findPrice(bank.baseTokenAddress);
      if (!basePrice) {
        return;
      }

      const price = basePrice * (calls[bank.id].pricePerFullShare / 1e18);
      if (price) {
        this.priceOracle.updatePrice(bank.address, price);
      }
    })
  }

  async getRawFarms() {
    let cacheKey = `getRawFarms-${this.getName()}`;

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    let rows = [];

    Object.values(await Utils.getJavascriptFiles('https://eleven.finance/')).forEach(f => {
      rows.push(...AstParser.createJsonFromObjectExpression(f, keys => keys.includes('earnedTokenAddress') && keys.includes('network') && keys.includes('token')));
    });

    if (rows.length === 0) {
      rows = require('./farms.json');
    }

    const result = rows.filter(f => f.network === this.getChain());

    await this.cacheManager.set(cacheKey, result, {ttl: 60 * 30})

    return result;
  }

  async getAddressFarms(address) {
    const cacheKey = `getAddressFarms-${this.getName()}-${address}`;

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    const farms = await this.getFarms();

    const tokenCalls = [];

    farms.forEach(farm => {
      if (farm.raw.farm && farm.raw.farm.masterchefPid) {
        const contract = new Web3EthContract(MasterchefAbi, this.getMasterChefAddress());
        tokenCalls.push({
          id: farm.id,
          userInfo: contract.methods.userInfo(farm.raw.farm.masterchefPid, address)
        });
      }

      if (farm.raw.earnedTokenAddress) {
        const contract = new Web3EthContract(erc20Abi, farm.raw.earnedTokenAddress);
        tokenCalls.push({
          id: farm.id,
          balanceOf: contract.methods.balanceOf(address)
        });
      }
    });

    const calls = await Utils.multiCall(tokenCalls, this.getChain());

    const result = _.uniq(calls
      .filter(v =>
        (v.userInfo && v.userInfo[0] && new BigNumber(v.userInfo[0]).isGreaterThan(Utils.DUST_FILTER)) ||
        (v.balanceOf && new BigNumber(v.balanceOf).isGreaterThan(Utils.DUST_FILTER))
      )
      .map(v => v.id));

    await this.cacheManager.set(cacheKey, result, {ttl: 60 * 5});

    return result;
  }

  async getFarms(refresh = false) {
    let cacheKey = `getFarms-${this.getName()}`;

    if (!refresh) {
      const cache = await this.cacheManager.get(cacheKey)
      if (cache) {
        return cache;
      }
    }

    await this.fetchBankTokens();

    let apys = {};
    try {
      apys = await Utils.requestJsonGet("https://eleven.finance/api.json");
    } catch (e) {
      console.error("https://eleven.finance/api.json", e.message);
    }

    const pools = await this.getRawFarms();

    const vaultCalls = pools.map(pool => {
      const vault = new Web3EthContract(vaultABI, pool.earnedTokenAddress);

      return {
        id: pool.id,
        pricePerFullShare: vault.methods.getPricePerFullShare(),
        tvl: vault.methods.balance()
      };
    });

    const vault = await Utils.multiCallIndexBy("id", vaultCalls, this.getChain());

    const farms = [];
    pools.forEach(farm => {
      const token = farm.token.toLowerCase()
        .replace(/\s+v\d+$/, '')
        .replace(/\s+\w*lp$/, '');

      const item = {
        id: `${this.getName()}_${farm.id.toLowerCase()}`,
        name: token.toUpperCase().trim(),
        token: token.trim(),
        platform: farm.platform,
        provider: this.getName(),
        has_details: !!(farm.earnedTokenAddress && farm.tokenAddress),
        raw: Object.freeze(farm),
        extra: {},
        chain: this.getChain(),
        compound: true,
      };

      if (farm.farm && farm.farm.earnedToken) {
        item.earns = [farm.farm.earnedToken.toLowerCase()];
      }

      if (farm.uses) {
        const uses = farm.uses.toLowerCase().replace('uses', '').trim();
        if (uses.length > 0) {
          item.platform = uses;
        }
      }

      const vaultElement = vault[farm.id];
      if (vaultElement.pricePerFullShare) {
        item.extra.pricePerFullShare = vaultElement.pricePerFullShare / 1e18;
      }

      if (farm.earnedTokenAddress) {
        item.extra.transactionAddress = farm.earnedTokenAddress;
        item.extra.pricePerFullShareToken = farm.earnedTokenAddress;
      }

      if (farm.tokenAddress) {
        item.extra.transactionToken = farm.tokenAddress;

        if (this.liquidityTokenCollector.get(farm.tokenAddress)) {
          item.extra.lpAddress = farm.tokenAddress;
        }

        item.tvl = {
          amount: vaultElement.tvl / (10 ** this.tokenCollector.getDecimals(farm.tokenAddress))
        };

        const price = this.priceOracle.findPrice(farm.tokenAddress);
        if (price) {
          item.tvl.usd = item.tvl.amount * price;
        }
      }

      if (apys[farm.token] && apys[farm.token].farm && apys[farm.token].farm.apy) {
        item.yield = {
          apy: apys[farm.token].farm.apy
        };
      }

      if (apys[farm.token] && apys[farm.token].tvl) {
        if (!item.tvl) {
          item.tvl = {};
        }

        item.tvl.usd = apys[farm.token].tvl;
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

    const callsPromise = [];
    const calls2Promise = [];

    addressFarms.forEach(id => {
      const farm = farms.find(f => f.id === id);

      if (farm.raw.farm && farm.raw.farm.masterchefPid) {
        const contract = new Web3EthContract(MasterchefAbi, this.getMasterChefAddress());

        callsPromise.push({
          id: farm.id.toString(),
          pendingRewards: contract.methods.pendingEleven(farm.raw.farm.masterchefPid, address),
          userInfo: contract.methods.userInfo(farm.raw.farm.masterchefPid, address),
        })
      }

      if (farm.raw.earnedTokenAddress) {
        calls2Promise.push({
          id: farm.id.toString(),
          balanceOf: new Web3EthContract(erc20Abi, farm.raw.earnedTokenAddress).methods.balanceOf(address),
        });
      }
    });

    const [userInfo, balanceOf] = await Promise.all([
      Utils.multiCallIndexBy('id', callsPromise, this.getChain()),
      Utils.multiCallIndexBy('id', calls2Promise, this.getChain()),
    ])

    const result = _.uniq([...Object.values(userInfo), ...Object.values(balanceOf)]
      .filter(v =>
        (v.userInfo && v.userInfo[0] && new BigNumber(v.userInfo[0]).isGreaterThan(Utils.DUST_FILTER)) ||
        (v.balanceOf && new BigNumber(v.balanceOf).isGreaterThan(Utils.DUST_FILTER))
      )
      .map(v => v.id));

    return result
      .map(id => {
        const farm = farms.find(f => f.id === id);

        let amount = 0;
        if (userInfo[id] && userInfo[id].userInfo && userInfo[id].userInfo[0] && userInfo[id].userInfo[0] > 0) {
          const decimals = farm.extra.transactionAddress ? (10 ** this.tokenCollector.getDecimals(farm.extra.transactionAddress)) : 1e18;
          amount = (userInfo[id].userInfo[0] / decimals) * farm.extra.pricePerFullShare;
        } else if (balanceOf[id] && balanceOf[id].balanceOf && balanceOf[id].balanceOf > 0) {
          amount = balanceOf[id].balanceOf / 1e18 * farm.extra.pricePerFullShare;
        }

        const result = {};
        result.farm = farm;

        result.deposit = {
          symbol: "?",
          amount: amount,
        };

        let price = undefined;

        if (farm.raw?.tokenAddress) {
          price = this.priceOracle.findPrice(farm.raw.tokenAddress);
        } else if(farm.extra?.transactionAddress) {
          price = this.priceOracle.findPrice(farm.extra.transactionAddress);
        }

        if (price) {
          result.deposit.usd = result.deposit.amount * price;
        }

        if (userInfo[id] && new BigNumber(userInfo[id].pendingRewards).isGreaterThan(0)) {
          const reward = {
            symbol: "ele",
            amount: userInfo[id].pendingRewards / (10 ** this.tokenCollector.getDecimals(eleven.ELEVEN_TOKEN))
          };

          const price = this.priceOracle.findPrice(eleven.ELEVEN_TOKEN);
          if (price) {
            reward.usd = reward.amount * price;
          }

          result.rewards = [reward];
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
    return 'eleven';
  }

  getChain() {
    return 'bsc';
  }
};
