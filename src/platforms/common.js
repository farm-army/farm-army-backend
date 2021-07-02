"use strict";

const Web3EthContract = require("web3-eth-contract");
const BigNumber = require("bignumber.js");
const Utils = require("../utils");
const erc20Abi = require("../abi/erc20.json");

module.exports = {
  PancakePlatformForkAuto: class PancakePlatformForkAuto {
    constructor(cache, priceOracle) {
      this.cache = cache;
      this.priceOracle = priceOracle;
    }


  },

  PancakePlatformFork: class PancakePlatformFork {
    constructor(cache, priceOracle) {
      this.cache = cache;
      this.priceOracle = priceOracle;
    }

    async getRawFarms() {
      throw new Error('not implemented');
    }

    getRawPools() {
      throw new Error('not implemented');
    }

    getName() {
      throw new Error('not implemented');
    }

    getFarmLink(farm) {
      throw new Error('not implemented');
    }

    getFarmEarns(farm) {
      throw new Error('not implemented');
    }

    getPendingRewardContractMethod() {
      throw new Error('not implemented');
    }

    getSousAbi() {
      throw new Error('not implemented');
    }

    async getMasterChefAbi() {
      throw new Error('not implemented');
    }

    getMasterChefAddress() {
      throw new Error('not implemented');
    }

    getChain() {
      return 'bsc';
    }

    async getLbAddresses() {
      return (await this.getRawFarms())
        .filter(f => f.lpAddresses && this.getAddress(f.lpAddresses))
        .map(farm => this.getAddress(farm.lpAddresses));
    }

    async getAddressFarms(address) {
      const cacheItem = this.cache.get(`getAddressFarms-${this.getName()}-${address}`);
      if (cacheItem) {
        return cacheItem;
      }

      let farmings = await this.getFarms();
      const masterChefAbi = await this.getMasterChefAbi();

      const vaultCalls = farmings
        .filter(p => p.id.startsWith(`${this.getName()}_farm_`))
        .filter(f => f.raw.lpAddresses && this.getAddress(f.raw.lpAddresses))
        .map(farm => {
          const vault = new Web3EthContract(masterChefAbi, this.getMasterChefAddress());
          return {
            userInfo: vault.methods.userInfo(farm.raw.pid, address),
            pendingReward: this.getPendingRewardContractMethod() ? vault.methods[this.getPendingRewardContractMethod()](farm.raw.pid, address) : '0',
            id: farm.id.toString()
          };
        });

      const poolCalls = farmings
        .filter(p => p.id.startsWith(`${this.getName()}_sous_`))
        .map(farm => {
          const contract = new Web3EthContract(this.getSousAbi(), this.getAddress(farm.raw.contractAddress));
          return {
            userInfo: contract.methods.userInfo(address),
            pendingReward: contract.methods.pendingReward(address),
            id: farm.id.toString()
          };
        });

      const [farms, pools] = await Promise.all([
        Utils.multiCall(vaultCalls, this.getChain()),
        Utils.multiCall(poolCalls, this.getChain())
      ]);

      const result = [...farms, ...pools]
        .filter(
          v =>
            new BigNumber((v.userInfo && v.userInfo[0]) ? v.userInfo[0] : 0).isGreaterThan(0) ||
            new BigNumber((v.userInfo && v.userInfo[1]) ? v.userInfo[0] : 0).isGreaterThan(0) ||
            new BigNumber(v.pendingReward || 0).isGreaterThan(0)
        )
        .map(v => v.id);

      this.cache.put(`getAddressFarms-${this.getName()}-${address}`, result, { ttl: 300 * 1000 });

      return result;
    }

    async getFarms(refresh = false) {
      const cacheKey = `getFarms-${this.getName()}`;

      if (!refresh) {
        const cacheItem = this.cache.get(cacheKey);
        if (cacheItem) {
          return cacheItem;
        }
      }

      const farmBalanceCalls = (await this.getRawFarms()).map(farm => {
        let address = farm.isTokenOnly !== true
          ? this.getAddress(farm.lpAddresses)
          : this.getAddress(farm.tokenAddresses);

        const token = new Web3EthContract(erc20Abi, address);
        return {
          address: address,
          balance: token.methods.balanceOf(this.getMasterChefAddress()),
        };
      });

      const poolBalanceCalls = this.getRawPools().map(farm => {
        let address = this.guessValue(farm, 'stakingTokenAddress');

        const token = new Web3EthContract(erc20Abi, address);
        return {
          address: this.getAddress(farm.contractAddress),
          balance: token.methods.balanceOf(this.getAddress(farm.contractAddress)),
        };
      });

      const [farmBalances, poolBalance] = await Promise.all([
        Utils.multiCallIndexBy('address', farmBalanceCalls, this.getChain()),
        Utils.multiCallIndexBy('address', poolBalanceCalls, this.getChain()),
      ]);

      const farms = (await this.getRawFarms()).map(farm => {
        const item = {
          id: `${this.getName()}_farm_${farm.pid}`,
          name: farm.lpSymbol,
          provider: this.getName(),
          raw: Object.freeze(farm),
          has_details: true,
          extra: {},
          chain: this.getChain(),
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

        if (item.extra.transactionToken && farmBalances[item.extra.transactionToken] && farmBalances[item.extra.transactionToken].balance && farmBalances[item.extra.transactionToken].balance > 0) {
          item.tvl = {
            amount: farmBalances[item.extra.transactionToken].balance / 1e18
          };

          const addressPrice = this.priceOracle.findPrice(item.extra.transactionToken);
          if (addressPrice) {
            item.tvl.usd = item.tvl.amount * addressPrice;
          }
        }

        if (item.tvl && item.tvl.usd && farm.raw && farm.raw.yearlyRewardsInToken) {
          const yearlyRewardsInToken = farm.raw.yearlyRewardsInToken;

          if (item.raw.earns && item.raw.earns[0]) {
            const tokenPrice = this.priceOracle.getAddressPrice(item.raw.earns[0].address);
            if (tokenPrice) {
              const dailyApr = (yearlyRewardsInToken * tokenPrice) / item.tvl.usd;

              item.yield = {
                apy: Utils.compoundCommon(dailyApr) * 100
              };
            }
          }
        }

        return item;
      });

      const souses = this.getRawPools().map(farm => {
        const earningToken = this.guessValue(farm, 'earningToken');

        const item = {
          id: `${this.getName()}_sous_${farm.sousId}`,
          name: `${earningToken} Pool`,
          token: this.guessValue(farm, 'stakingTokenName').toLowerCase(),
          provider: this.getName(),
          raw: Object.freeze(farm),
          has_details: true,
          extra: {},
          chain: this.getChain(),
        };

        item.earns = [earningToken.toLowerCase()];
        item.extra.transactionAddress = this.getAddress(farm.contractAddress);
        item.extra.transactionToken = this.guessValue(farm, 'stakingTokenAddress');

        const link = this.getFarmLink(item);
        if (link) {
          item.link = link;
        }

        if (item.extra.transactionAddress && poolBalance[item.extra.transactionAddress] && poolBalance[item.extra.transactionAddress].balance) {
          item.tvl = {
            amount: poolBalance[item.extra.transactionAddress].balance / 1e18
          };

          const addressPrice = this.priceOracle.findPrice(item.extra.transactionToken);
          if (addressPrice) {
            item.tvl.usd = item.tvl.amount * addressPrice;
          }
        }

        return item;
      });

      const result = [...farms, ...souses];

      if (typeof this.onFarmsBuild !== "undefined") {
        await this.onFarmsBuild(result)
      }

      const finalResult = result.map(r => Object.freeze(r))

      this.cache.put(cacheKey, finalResult, { ttl: 1000 * 60 * 30 });

      console.log(`${this.getName()} updated`);

      return finalResult;
    }

    async getYields(address) {
      const addressFarms = await this.getAddressFarms(address);
      if (addressFarms.length === 0) {
        return [];
      }

      return await this.getYieldsInner(address, addressFarms);
    }

    async getYieldsInner(address, addresses) {
      if (addresses.length === 0) {
        return [];
      }

      const farms = await this.getFarms();
      const masterChefAbi = await this.getMasterChefAbi();

      const farmCalls = addresses
        .filter(address => address.startsWith(`${this.getName()}_farm_`))
        .map(id => {
          const farm = farms.find(f => f.id === id);
          const contract = new Web3EthContract(masterChefAbi, this.getMasterChefAddress());

          return {
            userInfo: contract.methods.userInfo(farm.raw.pid, address),
            pendingReward: this.getPendingRewardContractMethod() ? contract.methods[this.getPendingRewardContractMethod()](farm.raw.pid, address) : '0',
            id: farm.id.toString()
          };
        });

      const sousCalls = addresses
        .filter(address => address.startsWith(`${this.getName()}_sous_`))
        .map(id => {
          const farm = farms.find(f => f.id === id);
          const contract = new Web3EthContract(this.getSousAbi(), this.getAddress(farm.raw.contractAddress));

          return {
            userInfo: contract.methods.userInfo(address),
            pendingReward: contract.methods.pendingReward(address),
            id: farm.id.toString()
          };
        });

      const [farmResults, sousResults] = await Promise.all([
        Utils.multiCall(farmCalls, this.getChain()),
        Utils.multiCall(sousCalls, this.getChain()),
      ]);

      return [...farmResults, ...sousResults].map(call => {
        const farm = farms.find(f => f.id === call.id);

        const amount = (call.userInfo && call.userInfo[0]) ? call.userInfo[0] : 0;
        const rewards = call.pendingReward || 0;

        const result = {};

        result.deposit = {
          symbol: "?",
          amount: amount / 1e18
        };

        let price;
        if (farm.extra && farm.extra.transactionToken) {
          price = this.priceOracle.getAddressPrice(farm.extra.transactionToken);
        }

        if (price) {
          result.deposit.usd = result.deposit.amount * price;
        }

        if (rewards > 0) {
          const reward = {
            symbol: farm.earns && farm.earns[0] ? farm.earns[0] : '?',
            amount: rewards / 1e18
          };

          if (farm.earns && farm.earns[0]) {
            const priceReward = this.priceOracle.findPrice(farm.earns[0]);
            if (priceReward) {
              reward.usd = reward.amount * priceReward;
            }
          }

          result.rewards = [reward];
        }

        result.farm = farm;

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
          address
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

      return result;
    }

    getAddress(address) {
      if (typeof address === 'string' && address.startsWith('0x')) {
        return address;
      }

      if (address[56]) {
        return address[56];
      }

      return undefined;
    }

    guessValue(object, findName) {
      if (findName === 'earningToken') {
        if (object.earningToken && object.earningToken.symbol) {
          return object.earningToken.symbol;
        }

        if (object.tokenName) {
          return object.tokenName;
        }

        throw new Error(`Invalid ${findName} ${JSON.stringify(object)}`);
      }

      if (findName === 'stakingTokenAddress') {
        if (object.stakingTokenAddress) {
          return this.getAddress(object.stakingTokenAddress);
        }

        if (object.stakingToken && object.stakingToken.address) {
          return this.getAddress(object.stakingToken.address);
        }

        throw new Error(`Invalid ${findName} ${JSON.stringify(object)}`);
      }

      if (findName === 'stakingTokenName') {
        if (object.stakingTokenName) {
          return object.stakingTokenName;
        }

        if (object.stakingToken && object.stakingToken.symbol) {
          return object.stakingToken.symbol;
        }

        throw new Error(`Invalid ${findName} ${JSON.stringify(object)}`);
      }
    }
  }
};