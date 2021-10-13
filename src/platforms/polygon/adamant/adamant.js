"use strict";

const crypto = require('crypto');
const Web3EthContract = require("web3-eth-contract");
const Utils = require("../../../utils");
const _ = require("lodash");
const VAULT_ABI = require('./abi/vault.json');
const VAULT_INFORMATION_ABI = require('./abi/vault_information.json');

module.exports = class adamant {
  constructor(cacheManager, priceOracle, tokenCollector, farmPlatformResolver) {
    this.cacheManager = cacheManager;
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector;
    this.farmPlatformResolver = farmPlatformResolver;
  }

  async getLbAddresses() {
    return (await this.getRawFarms())
      .filter(f => f.token0Name && f.token1Name)
      .map(f => f.lpAddress);
  }

  async getRawFarms() {
    const cacheKey = `getRawFarms-github-${this.getName()}`;

    const cache = await this.cacheManager.get(cacheKey);
    if (cache) {
      return cache;
    }

    const response = await Utils.requestJsonGet('https://raw.githubusercontent.com/eepdev/vaults/main/current_vaults.json');

    await this.cacheManager.set(cacheKey, response, {ttl: 60 * 60});

    return response;
  }

  async getFarms(refresh = false) {
    let cacheKey = `getFarms-${this.getName()}`;

    if (!refresh) {
      const cache = await this.cacheManager.get(cacheKey);
      if (cache) {
        return cache;
      }
    }

    const rawFarms = await this.getRawFarms();

    const farms = [];

    const tokenCalls = [];

    rawFarms.forEach(pool => {
      if (!pool.vaultAddress) {
        return;
      }

      const token = new Web3EthContract(VAULT_ABI, pool.vaultAddress);

      tokenCalls.push({
        vaultAddress: pool.vaultAddress.toLowerCase(),
        balance: token.methods.balance(),
        totalShares: token.methods.totalShares(),
      });
    });

    const calls = await Utils.multiCallIndexBy('vaultAddress', tokenCalls, this.getChain());

    rawFarms.forEach(farm => {
      if (!farm.vaultAddress) {
        return;
      }

      let vaultInfo = calls[farm.vaultAddress.toLowerCase()];
      if (!vaultInfo || !vaultInfo.balance || vaultInfo.balance <= 0) {
        return;
      }

      let id = crypto.createHash('md5')
        .update(farm.vaultAddress.toLowerCase())
        .digest('hex');

      const item = {
        id: `${this.getName()}_${id}`,
        name: farm.poolName.replace('/', '-'),
        token: farm.poolName.toLowerCase().replace('/', '-'),
        provider: this.getName(),
        has_details: true,
        raw: Object.freeze(farm),
        earns: ['addy'],
        extra: {},
        chain: 'poylgon',
      };

      item.extra.transactionToken = farm.lpAddress;
      item.extra.transactionAddress = farm.vaultAddress;

      if (farm.token0Name && farm.token1Name) {
        item.extra.lpAddress = item.extra.transactionToken;
      }

      const platform = this.farmPlatformResolver.findMainPlatformNameForTokenAddress(item.extra.transactionToken);
      if (platform) {
        item.platform = platform;
      }

      if (!vaultInfo || !vaultInfo.totalShares || vaultInfo.totalShares >= 0) {
        item.tvl = {
          amount: vaultInfo.totalShares / (10 ** this.tokenCollector.getDecimals(item.extra.transactionToken))
        };

        let price = this.priceOracle.findPrice(item.extra.transactionToken);
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

  async getAddressFarms(address) {
    let cacheKey = `getAddressFarms-${this.getName()}-${address}`;

    const cache = await this.cacheManager.get(cacheKey);
    if (cache) {
      return cache;
    }

    const pools = await this.getFarms();

    let addresses = _.chunk(pools, 10).map((i, x) => {
      const vaults = i.filter(p => p.raw.vaultAddress).map(p => p.raw.vaultAddress);

      return {
        reference: vaults.join(','),
        contractAddress: '0x9902ca940fd5ba9bec64877fbc86c79002b06623',
        abi: VAULT_INFORMATION_ABI,
        calls: [
          {
            reference: "infoForVaults",
            method: "getInfoForVaults",
            parameters: [address, vaults]
          }
        ]
      }
    })

    const calls = await Utils.multiCallRpcIndex(addresses, this.getChain());

    const result = [];

    for (const [key, value] of Object.entries(calls)) {
      key.split(',').forEach((vaultAddress, index) => {
        const vaultInfo = value.infoForVaults[index];
        if (vaultInfo.amountUserStaked && vaultInfo.amountUserStaked.gt(0)) {
          const farm = pools.find(p => p.raw.vaultAddress.toLowerCase() === vaultAddress.toLowerCase());
          if (farm) {
            result.push(farm.id);
          }
        }
      })
    }

    await this.cacheManager.set(cacheKey, result, {ttl: 60 * 5});

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

    const vaultAddresses = addressFarms.map(farmId => {
      const farm = farms.find(f => f.id === farmId);
      return farm.raw.vaultAddress;
    });

    const calls = await Utils.multiCallRpc([{
      reference: 'infoForVaults',
      contractAddress: '0x9902ca940fd5ba9bec64877fbc86c79002b06623',
      abi: VAULT_INFORMATION_ABI,
      calls: [
        {
          reference: "infoForVaults",
          method: "getInfoForVaults",
          parameters: [address, vaultAddresses]
        }
      ]
    }], this.getChain());

    const keys = vaultAddresses.map(i => i.toLowerCase());
    const values = calls[0].infoForVaults;
    const merged = keys.reduce((obj, key, index) => ({ ...obj, [key]: values[index] }), {});

    const results = [];

    addressFarms.forEach(i => {
      const farm = farms.find(f => f.id === i);

      const foo = merged[farm.raw.vaultAddress.toLowerCase()];
      if (!foo.amountUserStaked || !foo.amountUserStaked.gt(0)) {
        return;
      }

      const result = {
        farm: farm
      };

      let depositDecimals = this.tokenCollector.getDecimals(farm.extra.transactionToken);
      result.deposit = {
        symbol: "?",
        amount: foo.amountUserStaked.toString() / (10 ** depositDecimals)
      };

      let price = this.priceOracle.findPrice(farm.extra.transactionToken);
      if (price) {
        result.deposit.usd = result.deposit.amount * price;
      }

      if (foo.pendingAddyReward && foo.pendingAddyReward.gt(0)) {
        const reward = {
          symbol: 'addy',
          amount: foo.pendingAddyReward.toString() / 1e18
        };

        const priceReward = this.priceOracle.findPrice('0xc3fdbadc7c795ef1d6ba111e06ff8f16a20ea539');
        if (priceReward) {
          reward.usd = reward.amount * priceReward;
        }

        result.rewards = [reward];
      }

      results.push(result);
    });

    return results;
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

    return result;
  }

  getName() {
    return 'adamant';
  }

  getChain() {
    return 'polygon';
  }
}