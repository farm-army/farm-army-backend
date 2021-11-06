"use strict";

const Web3EthContract = require("web3-eth-contract");
const BigNumber = require("bignumber.js");
const Utils = require("../utils");
const erc20Abi = require("../abi/erc20.json");
const MASTERCHEF_COMPOUND_STRAT_ABI = require('../abi/mini_masterchef_compound_strat.json');
const _ = require("lodash");
const crypto = require("crypto");

const AAVE_ABI = require("./fantom/geist/abi/geist.json");
const AAVE_A_TOKEN_ABI = require("./fantom/geist/abi/a_token.json");
const AAVE_B_TOKEN_ABI = require("./fantom/geist/abi/b_token.json");

module.exports = {
  PancakePlatformFork: class PancakePlatformFork {
    constructor(cacheManager, priceOracle, tokenCollector) {
      this.cacheManager = cacheManager;
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
      const cacheKey = `getAddressFarms-${this.getName()}-${address}`;

      const cache = await this.cacheManager.get(cacheKey);
      if (cache) {
        return cache;
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

      const sousAbi = this.getSousAbi() || [];
      const poolPendingRewardMethod = sousAbi.find(m => m.name && m.name.toLowerCase().startsWith('pendingreward') && m.inputs[0] && m.inputs[0].type === 'address' && !m.inputs[1]);

      const poolCalls = farmings
        .filter(p => p.id.startsWith(`${this.getName()}_sous_`))
        .map(farm => {
          const contract = new Web3EthContract(sousAbi, this.getAddress(farm.raw.contractAddress));
          return {
            userInfo: contract.methods.userInfo(address),
            pendingReward: contract.methods[poolPendingRewardMethod.name](address),
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
            new BigNumber((v.userInfo && v.userInfo[0]) ? v.userInfo[0] : 0).isGreaterThan(Utils.DUST_FILTER) ||
            new BigNumber((v.userInfo && v.userInfo[1]) ? v.userInfo[0] : 0).isGreaterThan(Utils.DUST_FILTER) ||
            new BigNumber(v.pendingReward || 0).isGreaterThan(Utils.DUST_FILTER)
        )
        .map(v => v.id);

      await this.cacheManager.set(cacheKey, result, {ttl: 60 * 5});

      return result;
    }

    async getFarms(refresh = false) {
      const cacheKey = `getFarms-${this.getName()}`;

      if (!refresh) {
        const cache = await this.cacheManager.get(cacheKey);
        if (cache) {
          return cache;
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

        if (item.tvl && item.tvl.usd && farm.raw && farm.raw.yearlyRewardsInToken && farm.raw.earns && farm.raw.earns[0]) {
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

        if (farm.actions) {
          item.actions = farm.actions;
        }

        if (farm.inactive === true) {
          if (!item.flags) {
            item.flags = [];
          }

          item.flags.push('inactive');
        }

        if (farm.deprecated === true) {
          if (!item.flags) {
            item.flags = [];
          }

          item.flags.push('deprecated');
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

      await this.cacheManager.set(cacheKey, finalResult, {ttl: 60 * 30});

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

      const sousAbi = this.getSousAbi();
      const poolPendingRewardMethod = sousAbi.find(m => m.name && m.name.toLowerCase().startsWith('pendingreward') && m.inputs[0] && m.inputs[0].type === 'address' && !m.inputs[1]);

      const sousCalls = addresses
        .filter(address => address.startsWith(`${this.getName()}_sous_`))
        .map(id => {
          const farm = farms.find(f => f.id === id);
          const contract = new Web3EthContract(sousAbi, this.getAddress(farm.raw.contractAddress));

          return {
            userInfo: contract.methods.userInfo(address),
            pendingReward: contract.methods[poolPendingRewardMethod.name](address),
            id: farm.id.toString()
          };
        });

      const [farmResults, sousResults] = await Promise.all([
        Utils.multiCall(farmCalls, this.getChain()),
        Utils.multiCall(sousCalls, this.getChain()),
      ]);

      const results = [];

      [...farmResults, ...sousResults].forEach(call => {
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

        let usdValue = 0;

        if (price) {
          result.deposit.usd = result.deposit.amount * price;
          usdValue += result.deposit.usd;
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
              usdValue += reward.usd;
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
              usdValue += reward.usd;
            }
          }

          if (reward) {
            result.rewards = [reward];
          }
        }

        if (usdValue > 0 && usdValue < 0.01) {
          return;
        }

        result.farm = farm;

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
    constructor(cacheManager2, priceOracle, tokenCollector, farmCollector, cacheManager, farmPlatformResolver) {
      this.cacheManager = cacheManager2;
      this.priceOracle = priceOracle;
      this.tokenCollector = tokenCollector;
      this.farmCollector = farmCollector;
      this.cacheManager = cacheManager;
      this.farmPlatformResolver = farmPlatformResolver;
    }

    async getLbAddresses() {
      return (await this.getFarms())
        .filter(f => f?.extra?.lpAddress )
        .map(f => f.extra.lpAddress);
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
        const cache = await this.cacheManager.get(cacheKey);
        if (cache) {
          return cache;
        }
      }

      let matcherChefMeta = await this.getMatcherChefMeta();

      let pools = matcherChefMeta.pools.filter(f => f.isFinished !== true);

      let farmBalances = {};
      if (this.getTvlFunction()) {
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

        farmBalances = await Utils.multiCallIndexBy('pid', farmBalanceCalls, this.getChain());
      }

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
          const yearlyRewardsInToken = farm.raw.yearlyRewardsInToken / (10 ** this.tokenCollector.getDecimals(farm.raw.earns[0].address));

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

        if (farm.actions) {
          item.actions = farm.actions;
        }

        if (farm.inactive === true) {
          if (!item.flags) {
            item.flags = [];
          }

          item.flags.push('inactive');
        }

        if (farm.deprecated === true) {
          if (!item.flags) {
            item.flags = [];
          }

          item.flags.push('deprecated');
        }

        return item;
      });

      if (typeof this.onFarmsBuild !== "undefined") {
        await this.onFarmsBuild(farms)
      }

      const result = farms.map(f => Object.freeze(f));

      await this.cacheManager.set(cacheKey, result, {ttl: 60 * 30});

      console.log(`${this.getName()} updated`);

      return result;
    }

    async getAddressFarms(address) {
      const cacheKey = `getAddressFarms-${this.getName()}-${address}`;
      const cache = await this.cacheManager.get(cacheKey);
      if (cache) {
        return cache;
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
        new BigNumber((v.userInfo && v.userInfo[0]) ? v.userInfo[0] : 0).isGreaterThan(Utils.DUST_FILTER) ||
        new BigNumber(v.pendingReward || 0).isGreaterThan(Utils.DUST_FILTER)
      ).map(v => v.id);

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

  LendBorrowPlatform: class LendBorrowPlatform {
    constructor(priceOracle, tokenCollector, cacheManager, liquidityTokenCollector, farmPlatformResolver) {
      this.priceOracle = priceOracle;
      this.tokenCollector = tokenCollector;
      this.cacheManager = cacheManager;
      this.liquidityTokenCollector = liquidityTokenCollector;
      this.farmPlatformResolver = farmPlatformResolver;
    }

    async getFarms(refresh) {
      const cacheKey = `getFarms-${this.getName()}-v5`;

      if (!refresh) {
        const cache = await this.cacheManager.get(cacheKey);
        if (cache) {
          return cache;
        }
      }

      const config = _.merge({
        cashMethod: 'getCash',
        exchangeRateMethod: 'exchangeRate',
        underlyingMethod: 'underlying',
        symbol: 'symbol',
      }, this.getConfig());

      let rawFarms = await this.getTokens();

      let tvlCalls = rawFarms.map(token => {
        const contract = new Web3EthContract(this.getTokenAbi(), token.address);

        return {
          address: token.address.toLowerCase(),
          tvl: contract.methods[config.cashMethod](),
          exchangeRate: contract.methods[config.exchangeRateMethod](),
          underlying: contract.methods[config.underlyingMethod](),
          symbol: contract.methods[config.symbol](),
        };
      });

      const tvl = await Utils.multiCallIndexBy('address', tvlCalls, this.getChain());

      const farms = [];

      rawFarms.forEach(token => {
        const info = tvl[token.address.toLowerCase()];
        if (!info) {
          return;
        }

        // nativ chain token
        let tokenName = token.name;

        if (!tokenName && info.symbol) {
          tokenName = info.symbol;
        }

        if (this.getChain() === 'bsc') {
          if (!info.underlying && tokenName?.toLowerCase().includes('bnb')) {
            info.underlying = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'
          } else if (info?.underlying?.toLowerCase().includes('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb') && tokenName?.toLowerCase().includes('bnb')) {
            // 0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
            info.underlying = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'
          }
        }

        // 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE
        if (this.getChain() === 'polygon' && info.underlying && info.underlying.toLowerCase().includes('eeeeeeeeeeeeeeeeeeeeeeeeeeeeee') && tokenName && tokenName.toLowerCase().includes('matic')) {
          info.underlying = '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270'
        }

        if (this.getChain() === 'fantom' && info.underlying && info.underlying.toLowerCase().includes('eeeeeeeeeeeeeeeeeeeeeeeeeeeeee')) {
          info.underlying = '0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83'
        }

        if (this.getChain() === 'harmony' && !info.underlying && tokenName?.toLowerCase().includes('one')) {
          info.underlying = '0xcf664087a5bb0237a0bad6742852ec6c8d69a27a'
        }

        if (!info.underlying) {
          console.log(`${this.getName()}: missing underlying ${JSON.stringify(info)}`)
          return;
        }

        let isLiquidityPool = false;
        let symbol = this.tokenCollector.getSymbolByAddress(info.underlying);
        if (!symbol) {
          symbol = this.liquidityTokenCollector.getSymbolNames(info.underlying);
          isLiquidityPool = true;
        }

        if (!symbol && tokenName) {
          symbol = tokenName;
        }

        if (!symbol) {
          symbol = '?';
        }

        const item = {
          id: `${this.getName()}_${token.address.toLowerCase()}`,
          name: symbol.toUpperCase(),
          token: symbol.toLowerCase(),
          raw: Object.freeze(_.merge(token, {
            exchangeRate: info.exchangeRate,
            underlying: info.underlying,
          })),
          provider: this.getName(),
          has_details: false,
          extra: {},
          chain: this.getChain(),
          flags: ['lend', 'borrow'],
        };

        item.extra.transactionToken = info.underlying;
        item.extra.transactionAddress = token.address;

        if (isLiquidityPool) {
          item.extra.lpAddress = item.extra.transactionToken;

          const platform = this.farmPlatformResolver.findMainPlatformNameForTokenAddress(item.extra.lpAddress);
          if (platform) {
            item.platform = platform;
          }
        }

        if (info && info.tvl) {
          item.tvl = {
            amount: info.tvl / (10 ** this.tokenCollector.getDecimals(item.extra.transactionToken))
          };

          const addressPrice = this.priceOracle.getAddressPrice(item.extra.transactionToken);
          if (addressPrice) {
            item.tvl.usd = item.tvl.amount * addressPrice;
          }
        }

        const link = this.getFarmLink(item);
        if (link) {
          item.link = link;
        }

        const farmEarns = this.getFarmEarns(item);
        if (farmEarns && farmEarns.length > 0) {
          item.earns = farmEarns;
        }

        farms.push(item);
      });

      if (typeof this.onFarmsBuild !== "undefined") {
        await this.onFarmsBuild(farms)
      }

      await this.cacheManager.set(cacheKey, farms, {ttl: 60 * 30});

      console.log(`${this.getName()} updated`);

      return farms;
    }

    async getAddressFarms(address) {
      const cacheKey = `getAddressFarms-v1-${this.getName()}-${address}`;
      const cache = await this.cacheManager.get(cacheKey);
      if (cache) {
        return cache;
      }

      const config = _.merge({
        balanceOfMethod: 'balanceOf',
        borrowBalanceOfMethod: 'borrowBalanceOf',
      }, this.getConfig());

      let calls = Object.values(await this.getFarms()).map(farm => {
        const contract = new Web3EthContract(this.getTokenAbi(), farm.raw.address);

        return {
          id: farm.id,
          balanceOf: contract.methods[config.balanceOfMethod](address),
          borrowBalanceOf: contract.methods[config.borrowBalanceOfMethod](address),
        };
      });

      const result = (await Utils.multiCall(calls, this.getChain()))
        .filter(c => c.balanceOf > 0 || c.borrowBalanceOf > 0)
        .map(c => c.id);

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

    async getYieldsInner(address, farmIds) {
      if (farmIds.length === 0) {
        return [];
      }

      const config = _.merge({
        balanceOfMethod: 'balanceOf',
        borrowBalanceOfMethod: 'borrowBalanceOf',
      }, this.getConfig());

      const farms = await this.getFarms();

      const callsPromises = await Utils.multiCall(farmIds.map(id => {
        const farm = farms.find(f => f.id === id);
        const contract = new Web3EthContract(this.getTokenAbi(), farm.raw.address);

        return {
          id: farm.id,
          balanceOf: contract.methods[config.balanceOfMethod](address),
          borrowBalanceOf: contract.methods[config.borrowBalanceOfMethod](address),
        };
      }), this.getChain());

      const result = (await Utils.multiCall(callsPromises, this.getChain()))
        .filter(c => c.balanceOf > 0 || c.borrowBalanceOf > 0)

      const results = [];

      result.forEach(call => {
        const farm = farms.find(f => f.id === call.id);

        if (call.balanceOf > 0) {
          const result = {
            farm: farm
          };

          const exchangeRate = farm.raw.exchangeRate ? farm.raw.exchangeRate / 1e18 : 1;

          result.deposit = {
            symbol: '?',
            amount: (call.balanceOf / (10 ** this.tokenCollector.getDecimals(farm.extra.transactionToken))) * exchangeRate, // value in borrowToken token
          };

          const price = this.priceOracle.getAddressPrice(farm.extra.transactionToken);
          if (price) {
            result.deposit.usd = result.deposit.amount * price;
          }

          const isDust = 'usd' in result.deposit && result.deposit.usd < 0.02;
          if (!isDust) {
            results.push(Object.freeze(result));
          }
        }

        if (call.borrowBalanceOf > 0) {
          const result = {
            farm: farm
          };

          result.deposit = {
            symbol: '?',
            amount: call.borrowBalanceOf / (10 ** this.tokenCollector.getDecimals(farm.extra.transactionToken)) * -1, // value in borrowToken token
          };

          const price = this.priceOracle.getAddressPrice(farm.extra.transactionToken); // bnb or busd
          if (price) {
            result.deposit.usd = result.deposit.amount * price;
          }

          const isDust = 'usd' in result.deposit && Math.abs(result.deposit.usd) < 0.02;
          if (!isDust) {
            results.push(Object.freeze(result));
          }
        }
      })

      return results;
    }

    getName() {
      throw new Error('not implemented');
    }

    getChain() {
      throw new Error('not implemented');
    }

    getTokenAbi() {
      throw new Error('not implemented');
    }

    async getTokens() {
      throw new Error('not implemented');
    }

    /**
     * cashMethod: 'getCash',
     * exchangeRateMethod: 'exchangeRate',
     * underlyingMethod: 'underlying',
     * balanceOfMethod: 'balanceOf',
     * borrowBalanceOfMethod: 'borrowBalanceOf',
     * symbol: 'symbol',
     */
    getConfig() {
      throw new Error('not implemented');
    }

    getFarmLink(farm) {
      throw new Error('not implemented');
    }

    getFarmEarns(farm) {
      throw new Error('not implemented');
    }
  },

  AaveFork: class AaveFork {
    constructor(cacheManager, priceOracle, tokenCollector) {
      this.cacheManager = cacheManager;
      this.priceOracle = priceOracle;
      this.tokenCollector = tokenCollector;
    }

    async getRawFarms() {
      let cacheKey = `getRawFarms-v1-${this.getName()}`;
      const cache = await this.cacheManager.get(cacheKey)
      if (cache) {
        return cache;
      }

      const reservesList = await Utils.multiCall([{
        reservesList: new Web3EthContract(AAVE_ABI, this.getBankAddress()).methods.getReservesList(),
      }], this.getChain());

      const callsA = reservesList[0].reservesList.map(token => {
        return {
          reference: token,
          contractAddress: this.getBankAddress(),
          abi: AAVE_ABI,
          calls: [
            {
              reference: "reserveData",
              method: "getReserveData",
              parameters: [token]
            },
          ]
        }
      })

      const reservesListTokenData = await Utils.multiCallRpc(callsA, this.getChain());

      const tokenCalls = [];

      reservesListTokenData.forEach(i => {
        const contract = new Web3EthContract(AAVE_B_TOKEN_ABI, i.reserveData.aTokenAddress);

        tokenCalls.push({
          token: i.id,
          type: 'supply',
          totalSupply: contract.methods.totalSupply(),
          decimals: contract.methods.decimals(),
        });

        const contract2 = new Web3EthContract(AAVE_B_TOKEN_ABI, i.reserveData.variableDebtTokenAddress);

        tokenCalls.push({
          token: i.id,
          type: 'borrow',
          totalSupply: contract2.methods.totalSupply(),
          decimals: contract2.methods.decimals(),
        });
      });

      const details = await Utils.multiCall(tokenCalls, this.getChain());

      const tokens = reservesListTokenData.map(p => {
        const itemA = details.find(i => i.token === p.id && i.type === 'supply');
        const itemB = details.find(i => i.token === p.id && i.type === 'borrow');

        return {
          supply: itemA,
          borrow: itemB,
          token: p.id,
          aTokenAddress: p.reserveData.aTokenAddress,
          variableDebtTokenAddress: p.reserveData.variableDebtTokenAddress,
          currentStableBorrowRate: p.reserveData.currentStableBorrowRate.toString(),
          currentVariableBorrowRate: p.reserveData.currentVariableBorrowRate.toString(),
        };
      });

      await this.cacheManager.set(cacheKey, tokens, {ttl: 60 * 60});

      return tokens;
    }

    async getFarms(refresh = false) {
      let cacheKey = `getFarms-${this.getName()}`;

      if (!refresh) {
        const cache = await this.cacheManager.get(cacheKey)
        if (cache) {
          return cache;
        }
      }

      const rawFarms = await this.getRawFarms();

      const farms = [];

      rawFarms.forEach(farm => {
        let id = crypto.createHash('md5')
          .update(farm.token)
          .digest('hex');

        const symbol = this.tokenCollector.getSymbolByAddress(farm.token);

        const item = {
          id: `${this.getName()}_${id}`,
          name: (symbol || 'unknown').toUpperCase(),
          token: symbol || 'unknown',
          provider: this.getName(),
          has_details: false,
          raw: Object.freeze(farm),
          extra: {},
          chain: this.getChain(),
          flags: ['lend', 'borrow'],
        };

        if (farm?.supply?.totalSupply) {
          item.tvl = {
            amount: farm.supply.totalSupply / (10 ** farm.supply.decimals),
          };

          const addressPrice = this.priceOracle.getAddressPrice(farm.token);
          if (addressPrice) {
            item.tvl.usd = item.tvl.amount * addressPrice;
          }
        }

        item.extra.transactionToken = farm.token;
        //item.extra.transactionAddress = farm.gauge;

        farms.push(Object.freeze(item));
      });

      if (typeof this.onFarmsBuild !== "undefined") {
        await this.onFarmsBuild(farms)
      }

      await this.cacheManager.set(cacheKey, farms, {ttl: 60 * 30});

      console.log(`${this.getName()} updated`);

      return farms;
    }

    async getAddressFarms(address) {
      let cacheKey = `getAddressFarms-${this.getName()}-${address}`;

      const cache = await this.cacheManager.get(cacheKey)
      if (cache) {
        return cache;
      }

      const pools = await this.getFarms();

      const poolAPromise = [];
      const poolBPromise = [];

      pools.forEach(farm => {
        poolAPromise.push({
          id: farm.id,
          balanceOf: new Web3EthContract(AAVE_A_TOKEN_ABI, farm.raw.aTokenAddress).methods.balanceOf(address),
        });

        poolBPromise.push({
          id: farm.id,
          balanceOf: new Web3EthContract(AAVE_B_TOKEN_ABI, farm.raw.variableDebtTokenAddress).methods.balanceOf(address),
        });
      });

      const [poolA, poolB] = await Promise.all([
        Utils.multiCall(poolAPromise, this.getChain()),
        Utils.multiCall(poolBPromise, this.getChain()),
      ]);

      const result = _.uniq([...poolA, ...poolB]
        .filter(v => new BigNumber(v.balanceOf).isGreaterThan(0))
        .map(v => v.id));

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

      const poolAPromise = [];
      const poolBPromise = [];

      addressFarms.forEach(farmId => {
        const farm = farms.find(f => f.id === farmId);

        poolAPromise.push({
          id: farm.id,
          type: 'supply',
          balanceOf: new Web3EthContract(AAVE_A_TOKEN_ABI, farm.raw.aTokenAddress).methods.balanceOf(address),
          decimals: farm.raw.supply.decimals,
        });

        poolBPromise.push({
          id: farm.id,
          type: 'borrow',
          balanceOf: new Web3EthContract(AAVE_B_TOKEN_ABI, farm.raw.variableDebtTokenAddress).methods.balanceOf(address),
          decimals: farm.raw.borrow.decimals,
        });
      });

      const [poolA, poolB] = await Promise.all([
        Utils.multiCall(poolAPromise, this.getChain()),
        Utils.multiCall(poolBPromise, this.getChain()),
      ]);

      const results = [];
      [...poolA, ...poolB].forEach(call => {
        if (!new BigNumber(call.balanceOf).isGreaterThan(0)) {
          return
        }

        const farm = farms.find(f => f.id === call.id);

        const result = {
          farm: farm
        };

        result.deposit = {
          symbol: "?",
          amount: call.balanceOf / (10 ** call.decimals)
        };

        if (call.type === 'borrow') {
          result.deposit.amount *= -1;
        }

        if (farm.extra.transactionToken) {
          const price = this.priceOracle.findPrice(farm.extra.transactionToken);

          if (price) {
            result.deposit.usd = result.deposit.amount * price;
          }
        }

        if (result?.deposit?.usd && Math.abs(result.deposit.usd) < 0.01) {
          return;
        }

        results.push(result);
      });

      return results;
    }

    async getDetails(address, id) {
      const farm = (await this.getFarms()).find(f => f.id === id);
      if (!farm) {
        return {};
      }

      const [yieldFarms] = await Promise.all([
        this.getYieldsInner(address, [farm.id]),
      ]);

      const result = {};

      if (yieldFarms[0]) {
        result.farm = yieldFarms[0];
      }

      return result;
    }

    getName() {
      throw new Error('not implemented');
    }

    getChain() {
      throw new Error('not implemented');
    }

    getBankAddress() {
      throw new Error('not implemented');
    }
  }
};