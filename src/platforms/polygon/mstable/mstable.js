"use strict";

const _ = require("lodash");
const Utils = require("../../../utils");
const Web3EthContract = require("web3-eth-contract");
const BigNumber = require("bignumber.js");
const ASSET_ABI = require(`./abi/asset_abi.json`);
const MTOKEN_ABI = require(`./abi/mtoken.json`);
const BASSET_ABI = require(`./abi/basset.json`);

module.exports = class mstable {
  constructor(cacheManager, priceOracle, tokenCollector) {
    this.cacheManager = cacheManager;
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector
  }

  async getAddressFarms(address) {
    let cacheKey = `getAddressFarms-v2-mstable-${address}`;

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    const tokenCalls = (await this.getFarms()).map(farm => {
      if (farm.raw.type === 'basset') {
        const contract = new Web3EthContract(BASSET_ABI, farm.raw.address);

        return {
          id: farm.id.toString(),
          balanceOf: contract.methods.lockedLiquidityOf(address),
        };
      }

      const contract = new Web3EthContract(ASSET_ABI, farm.raw.address);
      return {
        id: farm.id.toString(),
        balanceOf: contract.methods.balanceOf(address)
      };
    });

    let newVar = await Utils.multiCall(tokenCalls, 'polygon');
    const result = newVar
      .filter(v => new BigNumber(v.balanceOf).isGreaterThan(0))
      .map(v => v.id);

    await this.cacheManager.set(cacheKey, result, {ttl: 60 * 5});

    return result;
  }

  getRawFarms() {
    return [
      {
        id: 1,
        name: 'imUSD Vault',
        address: '0x32aba856dc5ffd5a56bcd182b13380e5c855aa29',
        token: 'USD',
        stakingToken: '0x5290ad3d83476ca6a2b178cd9727ee1ef72432af',
        price: 1,
        earns: [
          {
            symbol: 'mta',
            address: '0xf501dd45a1198c2e1b5aef5314a68b9006d842e0',
          },
          {
            symbol: 'matic',
            address: '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
          },
        ],
        claim: 'claimReward',
      },
      {
        id: 2,
        name: 'mUSD-FRAX',
        address: '0xc425Fd9Ed3C892d849C9E1a971516da1C1B29696',
        token: 'musd-fxs',
        stakingToken: '0xb30a907084ac8a0d25dddab4e364827406fd09f0',
        type: 'basset',
        price: 1,
        earns: [
          {
            symbol: 'fxs',
            address: '0x3e121107F6F22DA4911079845a470757aF4e1A1b',
          },
          {
            symbol: 'mta',
            address: '0xf501dd45a1198c2e1b5aef5314a68b9006d842e0',
          },
        ],
        claim: 'getReward',
      }
    ];
  }

  async getFarms(refresh = false) {
    const cacheKey = "getFarms-mstable";

    if (!refresh) {
      const cache = await this.cacheManager.get(cacheKey)
      if (cache) {
        return cache;
      }
    }

    let rawFarms = this.getRawFarms();

    let mTokenCalls = rawFarms.map(farm => {
      const contract = new Web3EthContract(MTOKEN_ABI, farm.stakingToken);

      return {
        stakingToken: farm.stakingToken.toLowerCase(),
        exchangeRate: contract.methods.exchangeRate(),
      };
    });

    const result = await Utils.multiCallIndexBy('stakingToken', mTokenCalls, 'polygon');

    const farms = rawFarms.map(farm => {
      const item = {
        id: `mstable_${farm.id}`,
        name: farm.name,
        token: farm.token,
        raw: Object.freeze(farm),
        provider: "mstable",
        link: `https://mstable.org/`,
        has_details: true,
        extra: {},
        earns: (farm.earns || []).map(i => i.symbol),
        chain: 'polygon',
      };

      let exchangeRange = 1;

      if (result[farm.stakingToken.toLowerCase()].exchangeRate) {
        exchangeRange = result[farm.stakingToken.toLowerCase()].exchangeRate / 1e18;
      }

      item.extra.pricePerFullShare = exchangeRange;
      item.extra.transactionAddress = farm.address;
      item.extra.transactionToken = farm.stakingToken;

      if (farm.claim) {
        item.actions = [
          {
            contract: farm.address,
            method: farm.claim,
            type: 'claim',
          }
        ];
      }

      return item;
    });

    await this.cacheManager.set(cacheKey, farms, {ttl: 60 * 30});

    console.log("mstable updated");

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
        'polygon'
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

    const tokenCalls = addressFarms
      .map(farmId => farms.find(f => f.id.toString() === farmId.toString()))
      .map(farm => {
        const contract = new Web3EthContract(ASSET_ABI, farm.raw.address);

        return {
          id: farm.id.toString(),
          balanceOf: contract.methods.balanceOf(address),
          earned: contract.methods.earned(address),
        };
      });

    const tokenCalls2 = addressFarms
      .map(farmId => farms.find(f => f.id.toString() === farmId.toString()))
      .filter(farm => farm.raw.type === 'basset')
      .map(farm => {
        const contract = new Web3EthContract(BASSET_ABI, farm.raw.address);

        return {
          id: farm.id.toString(),
          balanceOf: contract.methods.lockedLiquidityOf(address),
        };
      });

    const [x, y] = await Promise.all([
      Utils.multiCall(tokenCalls, 'polygon'),
      Utils.multiCall(tokenCalls2, 'polygon'),
    ]);

    const items = {};

    [...x, ...y].forEach(i => {
      if (!items[i.id]) {
        items[i.id] = {
          id: i.id
        };
      }

      if (i.balanceOf) {
        items[i.id].balanceOf = i.balanceOf;
      }

      if (i.earned) {
        items[i.id].earned = i.earned;
      }
    })

    const result = Object.values(items).filter(v => new BigNumber(v.balanceOf).isGreaterThan(0));

    const results = [];

    result.forEach(call => {
      const farm = farms.find(f => f.id === call.id);

      const result = {
        farm: farm
      };

      result.deposit = {
        symbol: "?",
        amount: call.balanceOf / 1e18
      };

      let price = this.priceOracle.findPrice(farm.raw.stakingToken);
      if (!price) {
        price = farm.raw.price
      }

      if (price) {
        result.deposit.usd = result.deposit.amount * farm.extra.pricePerFullShare * price;
      }

      const rewards = [];

      const xxx = Object.values(call.earned).slice(0, -1);

      xxx.forEach((e, index) => {
        let rewardToken = (farm.raw.earns || [])[index];
        if (!rewardToken) {
          return;
        }

        if (new BigNumber(e).isGreaterThan(0)) {
          const reward = {
            symbol: rewardToken.symbol,
            amount: e / 1e18
          };

          const price = this.priceOracle.findPrice(rewardToken.address, rewardToken.symbol);
          if (price) {
            reward.usd = reward.amount * price;
          }

          rewards.push(reward);
        }
      });

      if (rewards.length > 0) {
        result.rewards = rewards;
      }

      results.push(result);
    })

    return results;
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

    if (yieldFarms[0]) {
      result.farm = yieldFarms[0];
    }

    if (transactions && transactions.length > 0) {
      result.transactions = transactions;
    }

    return result;
  }

  getName() {
    return 'mstable';
  }
};
