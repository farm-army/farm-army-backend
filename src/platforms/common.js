"use strict";

const Web3EthContract = require("web3-eth-contract");
const BigNumber = require("bignumber.js");
const Utils = require("../utils");
const erc20Abi = require("../abi/erc20.json");
const MASTERCHEF_COMPOUND_STRAT_ABI = require('../abi/mini_masterchef_compound_strat.json');

module.exports = {
  PancakePlatformFork: class PancakePlatformFork {
    constructor(cache, priceOracle, tokenCollector) {
      this.cache = cache;
      this.priceOracle = priceOracle;
      this.tokenCollector = tokenCollector;
    }

    async getRawFarms() {
      throw new Error('not implemented');
    }

    async getRawPools() {
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

      let rawFarms = await this.getRawFarms();
      const farmBalanceCalls = rawFarms.map(farm => {
        let address = farm.isTokenOnly !== true
          ? this.getAddress(farm.lpAddresses)
          : this.getAddress(farm.tokenAddresses);

        const token = new Web3EthContract(erc20Abi, address);
        return {
          address: address,
          balance: token.methods.balanceOf(this.getMasterChefAddress()),
        };
      });

      const poolBalanceCalls = (await this.getRawPools()).map(farm => {
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

      const moreInfo = typeof this.farmInfo !== "undefined"
        ? await this.farmInfo(rawFarms)
        : [];

      const farms = rawFarms.map(farm => {
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

        if (item.raw && item.raw.earns && item.raw.earns.length > 0) {
          item.earn = item.raw.earns.map(e => ({
            'address': e.address.toLowerCase(),
            'symbol': e.symbol.toLowerCase(),
            'decimals': e.decimals,
          }))
        }

        item.extra.transactionAddress = this.getMasterChefAddress();

        const link = this.getFarmLink(item);
        if (link) {
          item.link = link;
        }

        let tvl = undefined;
        if (item.extra.transactionToken && farmBalances[item.extra.transactionToken] && farmBalances[item.extra.transactionToken].balance && farmBalances[item.extra.transactionToken].balance > 0) {
          tvl = farmBalances[item.extra.transactionToken].balance;
        }

        const info = moreInfo.find(i => i.id.toString() === farm.pid.toString());
        if (info && info.balance && info.balance > 0) {
          tvl = info.balance;
        } else if (farm.raw && farm.raw.poolInfoNormalized && farm.raw.poolInfoNormalized.tvl && farm.raw.poolInfoNormalized.tvl > 0) {
          tvl = farm.raw.poolInfoNormalized.tvl;
        }

        if (item.extra.transactionToken && tvl) {
          item.tvl = {
            amount: tvl / (10 ** this.tokenCollector.getDecimals(item.extra.transactionToken))
          };

          const addressPrice = this.priceOracle.findPrice(item.extra.transactionToken);
          if (addressPrice) {
            item.tvl.usd = item.tvl.amount * addressPrice;
          }
        }

        if (item.tvl && item.tvl.usd && farm.raw && farm.raw.yearlyRewardsInToken) {
          const yearlyRewardsInToken = farm.raw.yearlyRewardsInToken / (10 ** this.tokenCollector.getDecimals(farm.raw.earns[0].address));

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

      const souses = [];
      (await this.getRawPools()).forEach(farm => {
        let earningTokenSymbol = undefined;

        try {
          earningTokenSymbol = this.guessValue(farm, 'earningToken');
        } catch (e) {
          return;
        }

        let stakingTokenAddress = this.guessValue(farm, 'stakingTokenAddress');
        if (!earningTokenSymbol) {
          earningTokenSymbol = this.tokenCollector.getSymbolByAddress(stakingTokenAddress);
        }

        if (!earningTokenSymbol) {
          console.log(`${this.getName()}: invalid earningTokenSymbol:  ${JSON.stringify(farm)}`)
          earningTokenSymbol = '?';
        }

        const item = {
          id: `${this.getName()}_sous_${farm.sousId}`,
          name: `${earningTokenSymbol.toUpperCase()} Pool`,
          token: this.guessValue(farm, 'stakingTokenName').toLowerCase(),
          provider: this.getName(),
          raw: Object.freeze(farm),
          has_details: true,
          extra: {},
          chain: this.getChain(),
        };

        item.earns = [earningTokenSymbol.toLowerCase()];
        item.extra.transactionAddress = this.getAddress(farm.contractAddress);
        item.extra.transactionToken = stakingTokenAddress;

        const link = this.getFarmLink(item);
        if (link) {
          item.link = link;
        }

        if (item.extra.transactionAddress && poolBalance[item.extra.transactionAddress] && poolBalance[item.extra.transactionAddress].balance) {
          item.tvl = {
            amount: poolBalance[item.extra.transactionAddress].balance / (10 ** this.tokenCollector.getDecimals(item.extra.transactionToken))
          };

          const addressPrice = this.priceOracle.findPrice(item.extra.transactionToken);
          if (addressPrice) {
            item.tvl.usd = item.tvl.amount * addressPrice;
          }
        }

        // APY on tvl
        const secondsPerYear = 31536000;
        let yearlyRewardsInToken = undefined;
        if (farm.raw && farm.raw.rewardPerBlock) {
          yearlyRewardsInToken = (farm.raw.rewardPerBlock / Utils.getChainSecondsPerBlock(this.getChain())) * secondsPerYear;
        } else if(farm.raw && farm.raw.tokenPerSecond) {
          yearlyRewardsInToken = farm.raw.tokenPerSecond * secondsPerYear;
        }

        if (item.tvl && item.tvl.usd && yearlyRewardsInToken) {
          const earnTokenAddress = this.getAddress(farm.earningToken.address);
          const tokenPrice = this.priceOracle.getAddressPrice(earnTokenAddress);

          if (tokenPrice) {
            const yearlyRewards = yearlyRewardsInToken / (10 ** this.tokenCollector.getDecimals(earnTokenAddress));
            const dailyApr = (yearlyRewards * tokenPrice) / item.tvl.usd;

            // ignore pool init with low tvl
            if (dailyApr < 10) {
              item.yield = {
                apy: Utils.compoundCommon(dailyApr) * 100
              };
            }
          }
        }

        souses.push(item);
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

        let depositDecimals = 18;
        if (farm.extra && farm.extra.transactionToken) {
          depositDecimals = this.tokenCollector.getDecimals(farm.extra.transactionToken);
        }

        result.deposit = {
          symbol: "?",
          amount: amount / (10 ** depositDecimals)
        };

        let price;
        if (farm.extra && farm.extra.transactionToken) {
          price = this.priceOracle.getAddressPrice(farm.extra.transactionToken);
        }

        if (price) {
          result.deposit.usd = result.deposit.amount * price;
        }

        if (rewards > 0) {
          let reward = undefined;

          if (farm.earn && farm.earn[0]) {
            // new
            reward = {
              symbol: farm.earn[0].symbol,
              amount: rewards / (10 ** farm.earn[0].decimals)
            };

            const priceReward = this.priceOracle.getAddressPrice(farm.earn[0].address);
            if (priceReward) {
              reward.usd = reward.amount * priceReward;
            }
          } else if (farm.earns && farm.earns[0]) {
            // old
            reward = {
              symbol: farm.earns && farm.earns[0] ? farm.earns[0] : '?',
              amount: rewards / 1e18
            };

            const priceReward = this.priceOracle.findPrice(farm.earns[0]);
            if (priceReward) {
              reward.usd = reward.amount * priceReward;
            }
          }

          if (reward) {
            result.rewards = [reward];
          }
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
  },

  MasterChefWithAutoCompoundAndRewards: class MasterChefWithAutoCompoundAndRewards {
    constructor(cache, priceOracle, tokenCollector, farmCollector, cacheManager, farmPlatformResolver) {
      this.cache = cache;
      this.priceOracle = priceOracle;
      this.tokenCollector = tokenCollector;
      this.farmCollector = farmCollector;
      this.cacheManager = cacheManager;
      this.farmPlatformResolver = farmPlatformResolver;
    }

    async getMatcherChefMeta() {
      const cacheKey = `${this.getName()}-v3-master-meta`

      const cache = await this.cacheManager.get(cacheKey)
      if (cache) {
        return cache;
      }

      const foo = (await this.farmCollector.fetchForMasterChefWithMeta(this.getMasterChefAddress(), this.getChain()));

      await this.cacheManager.set(cacheKey, foo, {ttl: 60 * 30})

      return foo;
    }

    async getFarms(refresh = false) {
      const cacheKey = `getFarms-${this.getName()}`;

      if (!refresh) {
        const cacheItem = this.cache.get(cacheKey);
        if (cacheItem) {
          return cacheItem;
        }
      }

      let matcherChefMeta = await this.getMatcherChefMeta();

      let pools = matcherChefMeta.pools.filter(f => f.isFinished !== true);

      const farmBalanceCalls = [];
      pools.forEach(farm => {
        if (!farm.raw.lpToken || !farm.raw.poolInfoNormalized || !farm.raw.poolInfoNormalized.strategy) {
          return;
        }

        const token = new Web3EthContract(MASTERCHEF_COMPOUND_STRAT_ABI, farm.raw.poolInfoNormalized.strategy);
        farmBalanceCalls.push({
          pid: farm.pid.toString(),
          balance: token.methods[this.getTvlFunction()](),
        });
      });

      const farmBalances = await Utils.multiCallIndexBy('pid', farmBalanceCalls, this.getChain());

      const moreInfos = typeof this.farmInfo !== "undefined"
        ? await this.farmInfo(pools)
        : [];

      const farms = pools.map(farm => {
        const item = {
          id: `${this.getName()}_farm_${farm.pid}`,
          name: farm.lpSymbol.toUpperCase(),
          token: farm.lpSymbol.toLowerCase(),
          provider: this.getName(),
          raw: Object.freeze(farm),
          has_details: true,
          extra: {},
          compound: true,
          chain: this.getChain(),
        };

        const link = this.getFarmLink(item);
        if (link) {
          item.link = link;
        }

        item.extra.transactionToken = farm.lpAddress;
        item.extra.transactionAddress = this.getMasterChefAddress();

        const platform = this.farmPlatformResolver.findMainPlatformNameForTokenAddress(item.extra.transactionToken);
        if (platform) {
          item.platform = platform;
        }


        if (farm.isTokenOnly !== true) {
          item.extra.lpAddress = item.extra.transactionToken;
        }

        if (farm.raw.earns) {
          item.earns = farm.raw.earns.map(i => i.symbol.toLowerCase());

          item.earn = farm.raw.earns.map(e => ({
            'address': e.address.toLowerCase(),
            'symbol': e.symbol.toLowerCase(),
            'decimals': e.decimals,
          }))
        }

        if (farmBalances[farm.pid] && farmBalances[farm.pid].balance  && farmBalances[farm.pid].balance > 0) {
          item.tvl = {
            amount: farmBalances[farm.pid].balance / (10 ** this.tokenCollector.getDecimals(item.extra.transactionToken))
          };

          const addressPrice = this.priceOracle.getAddressPrice(item.extra.transactionToken);
          if (addressPrice) {
            item.tvl.usd = item.tvl.amount * addressPrice;
          }
        }

        let apy = 0;
        const moreInfo = moreInfos.find(i => i.id.toString() === farm.pid.toString())
        if (moreInfo && moreInfo.apy) {
          apy += moreInfo.apy
        }

        if (item.tvl && item.tvl.usd && farm.raw && farm.raw.yearlyRewardsInToken) {
          const yearlyRewardsInToken = farm.raw.yearlyRewardsInToken / (10 ** this.tokenCollector.getDecimals(farm.raw.earns[0].address));;

          if (item.raw.earns && item.raw.earns[0]) {
            const tokenPrice = this.priceOracle.getAddressPrice(item.raw.earns[0].address);
            if (tokenPrice) {
              const dailyApr = (yearlyRewardsInToken * tokenPrice) / item.tvl.usd;
              apy += Utils.compoundCommon(dailyApr) * 100
            }
          }
        }

        if (apy > 0) {
          item.yield = {
            apy: apy
          };
        }

        return Object.freeze(item);
      });

      this.cache.put(cacheKey, farms, {ttl: 1000 * 60 * 30});

      console.log(`${this.getName()} updated`);

      return farms;
    }

    async getAddressFarms(address) {
      const cacheItem = this.cache.get(`getAddressFarms-${this.getName()}-${address}`);
      if (cacheItem) {
        return cacheItem;
      }

      let farmings = await this.getFarms();
      const masterChefMeta = await this.getMatcherChefMeta();

      const vaultCalls = farmings.map(farm => {
        const contract = new Web3EthContract(masterChefMeta.abi, this.getMasterChefAddress());
        return {
          id: farm.id.toString(),
          userInfo: contract.methods.userInfo(farm.raw.pid, address),
          pendingReward: masterChefMeta.methods.pendingRewardsFunctionName ? contract.methods[masterChefMeta.methods.pendingRewardsFunctionName](farm.raw.pid, address) : '0'
        };
      });

      const farms = await Utils.multiCall(vaultCalls, this.getChain());

      const result = farms.filter(v =>
        new BigNumber((v.userInfo && v.userInfo[0]) ? v.userInfo[0] : 0).isGreaterThan(0) ||
        new BigNumber(v.pendingReward || 0).isGreaterThan(0)
      ).map(v => v.id);

      this.cache.put(`getAddressFarms-${this.getName()}-${address}`, result, { ttl: 300 * 1000 });

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
      const masterChefMeta = await this.getMatcherChefMeta();

      const tokenCalls = addressFarms.map(id => {
        const farm = farms.find(f => f.id === id);

        const contract = new Web3EthContract(masterChefMeta.abi, this.getMasterChefAddress());
        return {
          id: farm.id,
          pendingReward: masterChefMeta.methods.pendingRewardsFunctionName ? contract.methods[masterChefMeta.methods.pendingRewardsFunctionName](farm.raw.pid, address) : '0',
          stakedWantTokens: contract.methods.stakedWantTokens(farm.raw.pid, address)
        };
      });

      const calls = await Utils.multiCall(tokenCalls, this.getChain());

      const results = [];
      calls.forEach(call => {
        const farm = farms.find(f => f.id === call.id);

        const result = {};
        result.farm = farm;

        if (new BigNumber(call.stakedWantTokens).isGreaterThan(0)) {
          const deposit = {
            symbol: "?",
            amount: call.stakedWantTokens / (10 ** this.tokenCollector.getDecimals(farm.extra.transactionToken)),
          };

          const price = this.priceOracle.getAddressPrice(farm.extra.transactionToken);
          if (price) {
            deposit.usd = deposit.amount * price;

            // dust
            if (deposit.usd < 0.01) {
              return;
            }
          }

          result.deposit = deposit;

          if (new BigNumber(call.pendingReward).isGreaterThan(0) && farm.earn && farm.earn[0]) {
            const reward = {
              symbol: farm.earn[0].symbol.toLowerCase(),
              amount: call.pendingReward / ( 10 ** farm.earn[0].decimals),
            };

            const price = this.priceOracle.findPrice(farm.earn[0].address);
            if (price) {
              reward.usd = reward.amount * price;
            }

            result.rewards = [reward];
          }
        }

        results.push(result);
      });

      return results;
    }

    getName() {
      return this.constructor.name;
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

    getMasterChefAddress() {
      throw new Error('not implemented');
    }

    getChain() {
      throw new Error('not implemented');
    }

    getFarmLink(farm) {
      throw new Error('not implemented');
    }

    getTvlFunction() {
      return 'sharesTotal';
    }
  },
};