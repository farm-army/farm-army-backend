"use strict";

const VAULT_ABI = require('./abi/vault.json');
const Web3EthContract = require("web3-eth-contract");
const BigNumber = require("bignumber.js");

const Utils = require("../../../utils");
const walk = require("acorn-walk");
const acorn = require("acorn");

module.exports = class moonkafe_compound {
  constructor(priceOracle, tokenCollector, farmCollector, cacheManager, farmPlatformResolver) {
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector;
    this.farmCollector = farmCollector;
    this.cacheManager = cacheManager;
    this.farmPlatformResolver = farmPlatformResolver;
  }

  async getLbAddresses() {
    return (await this.getFarmsRaw())
      .filter(f => f.lpAddress && f.lpSymbol && f.lpSymbol.includes('LP)'))
      .map(f => f.lpAddress);
  }

  async getFarmsRaw() {
    let cacheKey = `getFarmsRaw-js-v3-${this.getName()}`;

    const cache = await this.cacheManager.get(cacheKey);
    if (cache) {
      return cache;
    }

    const files = await Utils.getJavascriptFiles('https://moon.kafe.finance/');

    const pools = [];
    Object.values(files).forEach(body => {
      walk.simple(acorn.parse(body, {ecmaVersion: 'latest'}), {
        ObjectExpression(node) {
          const keys = node.properties.map(p => (p.key && p.key.name) ? p.key.name.toLowerCase() : '');

          if (keys.includes('contractaddress') && (keys.includes('sousid') || keys.includes('stakingtoken') || keys.includes('stakingtokenname'))) {

            const contractAddressNode = node.properties.find(p => p.key && p.key.name.toLowerCase() === 'contractaddress');
            const contractAddress = body.substring(contractAddressNode.start, contractAddressNode.end)
              .match(/(0x[0-9a-f]{40})/i);

            if (contractAddress && contractAddress[1]) {
              const item = {
                contractAddress: contractAddress[1],
              }

              const stakingTokenAddressNode = node.properties.find(p => p.key && p.key.name.toLowerCase() === 'stakingtokenaddress');
              const stakingTokenAddress = body.substring(stakingTokenAddressNode.start, stakingTokenAddressNode.end)
                .match(/(0x[0-9a-f]{40})/i);

              if (stakingTokenAddress && stakingTokenAddress[1]) {
                item.stakingToken = stakingTokenAddress[1]
              }

              const tokenNameNode = node.properties.find(p => p.key && p.key.name.toLowerCase() === 'tokenname');
              const tokenName = body.substring(tokenNameNode.start, tokenNameNode.end)
                .match(/"(.*)"/i);

              if (tokenName && tokenName[1]) {
                item.tokenName = tokenName[1]
              }

              pools.push(item);
            }
          }
        }
      })
    })

    const tokenCalls = pools.map(pool => {
      const token = new Web3EthContract(VAULT_ABI, pool.contractAddress);

      return {
        vaultAddress: pool.contractAddress.toLowerCase(),
        strategy: token.methods.strategy(),
        stakingToken: token.methods.token(),
        pricePerFullShare: token.methods.getPricePerFullShare(),
        balance: token.methods.balance(),
      };
    });

    const calls = await Utils.multiCallIndexBy('vaultAddress', tokenCalls, this.getChain());

    const result = [];

    pools.forEach(p => {
      let info = calls[p.contractAddress.toLowerCase()];
      if (!info || !info.stakingToken) {
        return;
      }

      result.push({
        contractAddress: p.contractAddress,
        lpSymbol: p.tokenName || undefined,
        lpAddress: info.stakingToken,
        pricePerFullShare: info.pricePerFullShare,
        balance: info.balance,
      });
    })

    await this.cacheManager.set(cacheKey, result, {ttl: 60 * 30});

    return result;
  }

  async getAddressFarms(address) {
    let cacheKey = `getAddressFarms-${this.getName()}-${address}`;

    const cache = await this.cacheManager.get(cacheKey);
    if (cache) {
      return cache;
    }

    const pools = await this.getFarms();

    const tokenCalls = pools.map(myPool => {
      const token = new Web3EthContract(VAULT_ABI, myPool.raw.contractAddress);

      return {
        id: myPool.id,
        balanceOf: token.methods.balanceOf(address)
      };
    });

    const calls = await Utils.multiCall(tokenCalls, this.getChain());

    const result = calls
      .filter(v => new BigNumber(v.balanceOf).isGreaterThan(0))
      .map(v => v.id);

    await this.cacheManager.set(cacheKey, result, {ttl: 60 * 5});

    return result;
  }

  async getFarms(refresh = false) {
    const cacheKey = `getFarms-${this.getName()}-compound`;

    if (!refresh) {
      const cache = await this.cacheManager.get(cacheKey);
      if (cache) {
        return cache;
      }
    }

    const farms = (await this.getFarmsRaw()).map(farm => {
      let name = farm.lpSymbol.replace(/\(\w+LP\)$/, '').trim();

      const item = {
        id: `${this.getName()}_${farm.contractAddress}`,
        name: name,
        provider: 'moonkafe',
        raw: Object.freeze(farm),
        has_details: true,
        link: 'https://moon.kafe.finance/#/espresso/',
        extra: {},
        chain: this.getChain(),
        compound: true,
      };

      item.extra.transactionToken = farm.lpAddress;
      item.extra.transactionAddress = farm.contractAddress;

      if (farm.lpSymbol && farm.lpSymbol.includes('LP)')) {
        item.extra.lpAddress = item.extra.transactionToken;
      }

      if (farm.lpSymbol) {
        const match = farm.lpSymbol.match(/\((\w+)LP\)$/);

        if (match && match[1]) {
          item.platform = match[1].toLowerCase();
        }
      }

      const platform = this.farmPlatformResolver.findMainPlatformNameForTokenAddress(item.extra.transactionToken);
      if (platform) {
        item.platform = platform;
      }

      if (farm.balance) {
        item.tvl = {
          amount: farm.balance / (10 ** this.tokenCollector.getDecimals(item.extra.transactionToken))
        };

        const addressPrice = this.priceOracle.getAddressPrice(item.extra.transactionToken);
        if (addressPrice) {
          item.tvl.usd = item.tvl.amount * addressPrice;
        }
      }

      return Object.freeze(item);
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

    const tokenCalls = addressFarms.map(id => {
      const farm = farms.find(f => f.id === id);

      const contract = new Web3EthContract(VAULT_ABI, farm.raw.contractAddress);
      return {
        id: farm.id,
        stakedWantTokens: contract.methods.balanceOf(address)
      };
    });

    const calls = await Utils.multiCall(tokenCalls, this.getChain());

    const results = [];
    calls.forEach(call => {
      const farm = farms.find(f => f.id === call.id);

      const result = {};
      result.farm = farm;

      if (new BigNumber(call.stakedWantTokens).isGreaterThan(0)) {

        let depositDecimals = farm.extra.transactionToken ? this.tokenCollector.getDecimals(farm.extra.transactionToken) : 18;
        result.deposit = {
          symbol: "?",
          amount: call.stakedWantTokens / (10 ** depositDecimals) * (farm.raw.pricePerFullShare / 1e18)
        };

        const price = this.priceOracle.getAddressPrice(farm.extra.transactionToken);
        if (price) {
          result.deposit.usd = result.deposit.amount * price;

          // dust
          if (result.deposit.usd < 0.01) {
            return;
          }
        }
      }

      results.push(result);
    });

    return results;
  }

  getName() {
    return 'moonkafe_compound';
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

  getChain() {
    return 'moonriver';
  }
};
