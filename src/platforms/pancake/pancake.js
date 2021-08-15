"use strict";

const _ = require("lodash");
const fs = require("fs");
const path = require("path");
const BigNumber = require("bignumber.js");
const Web3EthContract = require("web3-eth-contract");
const Utils = require("../../utils");

const masterChefAddress = "0x73feaa1eE314F8c655E354234017bE2193C9E24E";

const cakeVaultAddress = '0xa80240Eb5d7E05d3F250cF000eEc0891d00b51CC';
const cakeVaultAbi = require('./abi/cakeVault.json');

const erc20ABI = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "abi/erc20.json"), "utf8")
);
const masterchefABI = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "abi/masterchef.json"), "utf8")
);
const sousChefABI = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "abi/sousChef.json"), "utf8")
);

const sousChefCombinedABI = require('./abi/sousChefCombined.json');

module.exports = class pancake {
  constructor(cache, priceOracle, tokenCollector, farmCollector, cacheManager) {
    this.cache = cache;
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector;
    this.farmCollector = farmCollector;
    this.cacheManager = cacheManager;
  }

  async getLbAddresses() {
    let old = this.getRawFarms()
      .filter(c => c.lpAddresses && this.getAddress(c.lpAddresses))
      .map(c => this.getAddress(c.lpAddresses));

    const chain = (await this.getFetchedFarms())
      .filter(c => c.lpAddresses && c.isTokenOnly !== true)
      .map(c => this.getAddress(c.lpAddress));

    return _.uniqWith([...old, ...chain], (a,b) => a.toLowerCase() === b.toLowerCase())
  }

  async getFetchedFarms() {
    const cacheKey = `pancake-v4-master-farms`

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    // let error no break all
    let farmsResult = [];
    try {
      farmsResult = (await this.farmCollector.fetchForMasterChef(masterChefAddress)).filter(f => f.isFinished !== true);
    } catch (e) {
      console.log('pancake error: ' + e.message)
    }

    const reformat = farmsResult.map(f => {
      f.lpAddresses = f.lpAddress

      return f
    })

    await this.cacheManager.set(cacheKey, reformat, {ttl: 60 * 30})

    return reformat;
  }

  getRawFarms() {
    return JSON.parse(fs.readFileSync(path.resolve(__dirname, "farms/farms.json"), "utf8"));
  }

  getRawPools() {
    return JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "farms/pools.json"), "utf8")
    ).filter(p => p.isFinished !== true);
  }

  async getAddressFarms(address) {
    const cacheItem = this.cache.get(`getAddressFarms-pancake-${address}`);
    if (cacheItem) {
      return cacheItem;
    }

    const results = [];
    (await this.getFarms()).forEach(farm => {
      if (farm.id.startsWith('pancake_farm_')) {
        results.push({
          userInfo: new Web3EthContract(masterchefABI, masterChefAddress).methods.userInfo(farm.raw.pid, address),
          id: farm.id
        });
      } else if(farm.id.startsWith('pancake_pool_')) {
        results.push({
          userInfo: new Web3EthContract(sousChefABI, this.getAddress(farm.raw.contractAddress)).methods.userInfo(address),
          id: farm.id
        })
      } else if(farm.id.startsWith('pancake_auto')) {
        results.push({
          userInfo: new Web3EthContract(cakeVaultAbi, cakeVaultAddress).methods.userInfo(address),
          id: farm.id
        })
      }
    })

    const result = (await Utils.multiCall(results))
      .filter(v => v.userInfo && new BigNumber(v.userInfo[0] || 0).isGreaterThan(0))
      .map(v => v.id);

    this.cache.put(`getAddressFarms-pancake-${address}`, result, {
      ttl: 300 * 1000
    });

    return result;
  }

  async getApy() {
    try {
      return await Utils.requestJsonGet("https://api.beefy.finance/apy");
    } catch (e) {
      console.error("pancake: https://api.beefy.finance/apy", e.message);
    }

    return [];
  }

  async getFarms(refresh = false) {
    const cacheKey = "getFarms-pancake";

    if (!refresh) {
      const cacheItem = this.cache.get(cacheKey);
      if (cacheItem) {
        return cacheItem;
      }
    }

    const [farms, apys] = await Promise.all([
      this.getFetchedFarms(),
      this.getApy(),
    ]);

    const farmTvls = {};
    (await Utils.multiCall((await this.getFetchedFarms()).map(farm => {
      let lpAddresses = this.getAddress(farm.lpAddresses);
      return {
          totalSupply: new Web3EthContract(erc20ABI, lpAddresses).methods.totalSupply(),
          lpAddress: lpAddresses
        };
      })
    )).forEach(call => {
      farmTvls[call.lpAddress] = call.totalSupply;
    });

    const resultFarms = farms.map(farm => {
      const symbol = `${farm.lpSymbol}`.toLowerCase();

      const item = {
        id: `pancake_farm_${farm.pid}`,
        name: farm.lpSymbol,
        token: symbol,
        platform: "pancake",
        raw: Object.freeze(farm),
        provider: "pancake",
        earns: ["cake"],
        link: "https://pancakeswap.finance/farms",
        has_details: true,
        extra: {},
        chain: 'bsc',
        main_platform: 'pancake',
      };

      let lpAddress = this.getAddress(farm.lpAddresses);
      if (lpAddress) {
        item.extra.lpAddress = lpAddress;
        item.extra.transactionToken = lpAddress;
        item.extra.transactionAddress = masterChefAddress;
      }

      const apy = apys[`cakev2-${symbol}`];
      if (apy) {
        item.yield = {
          apy: apy * 100
        };
      }

      if (lpAddress && farmTvls[lpAddress]) {
        item.tvl = {
          amount: farmTvls[lpAddress] / (10 ** this.tokenCollector.getDecimals(lpAddress))
        };

        const addressPrice = this.priceOracle.getAddressPrice(lpAddress);
        if (addressPrice) {
          item.tvl.usd = item.tvl.amount * addressPrice;
        }
      }

      if (item.tvl && item.tvl.usd && farm.raw.yearlyRewardsInToken) {
        const yearlyRewardsInToken = farm.raw.yearlyRewardsInToken / (10 ** this.tokenCollector.getDecimals(item.raw.earns[0].address));

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

      return Object.freeze(item);
    });

    const rawPools = _.clone(this.getRawPools());

    const known = rawPools
      .filter(p => this.getAddress(p.contractAddress))
      .map(p => this.getAddress(p.contractAddress).toLowerCase());

    // append chain pools to static JSON
    (await this.getPools()).forEach(p => {
      const foo = p.raw.contractAddress.toLowerCase();

      if (!known.includes(foo)) {
        rawPools.push(p)
      }
    });

    const addresses = _.uniqWith(
      rawPools.map(p => [this.getAddress(p.stakingToken.address), this.getAddress(p.contractAddress)]),
      (a, b) => a[1].toLowerCase() === b[1].toLowerCase()
    );

    const tvlPools = await Utils.multiCallIndexBy('address', addresses.map(address => {
        return {
          address: address[1].toLowerCase(),
          balance: new Web3EthContract(erc20ABI, address[0]).methods.balanceOf(address[1])
        };
      })
    );

    const resultPools = rawPools.map(pool => {
      let symbol = pool.earningToken.symbol;

      let name = `${symbol} Pool`;
      let token = symbol.toLowerCase();

      //  Stake DOGE > Earn CAKE
      if (symbol.toLowerCase() === 'cake') {
        const symbolNew = this.tokenCollector.getSymbolByAddress(this.getAddress(pool.stakingToken.address))
        if (symbolNew) {
          name = `${symbolNew.toUpperCase()} Pool`;
          token = symbolNew.toLowerCase();
        }
      }

      const item = {
        id: `pancake_pool_${pool.sousId}`,
        name: name,
        token: token,
        platform: "pancake",
        raw: Object.freeze(pool),
        provider: "pancake",
        earns: [symbol.toLowerCase()],
        link: "https://pancakeswap.finance/pools",
        has_details: true,
        extra: {},
        chain: 'bsc',
      };

      item.extra.transactionToken = this.getAddress(pool.stakingToken.address);
      item.extra.transactionAddress = this.getAddress(pool.contractAddress);

      const tvl = tvlPools[this.getAddress(pool.contractAddress).toLowerCase()];
      if (tvl && tvl.balance) {
        item.tvl = {
          amount: tvl.balance / (10 ** this.tokenCollector.getDecimals(item.extra.transactionToken))
        };

        const addressPrice = this.priceOracle.getAddressPrice(item.extra.transactionToken);
        if (addressPrice) {
          item.tvl.usd = item.tvl.amount * addressPrice;
        }

        let rewardPerBlock = undefined;

        if (pool.raw && pool.raw.rewardPerBlock) {
          // chain data
          rewardPerBlock = pool.raw.rewardPerBlock;
        } else if(pool.tokenPerBlock) {
          // static data
          rewardPerBlock = pool.tokenPerBlock * 1e18;
        }

        if (item.tvl.usd && rewardPerBlock) {
          const earnTokenAddress = this.getAddress(pool.earningToken.address);
          const tokenPrice = this.priceOracle.getAddressPrice(earnTokenAddress);

          if (tokenPrice) {
            const secondsPerBlock = 3;
            const secondsPerYear = 31536000;
            const yearlyRewards = (rewardPerBlock / secondsPerBlock) * secondsPerYear  / (10 ** this.tokenCollector.getDecimals(earnTokenAddress));
            const dailyApr = (yearlyRewards * tokenPrice) / item.tvl.usd;

            // ignore pool init with low tvl
            if (dailyApr < 5) {
              item.yield = {
                apy: Utils.compoundCommon(dailyApr) * 100
              };
            }
          }

        }
      }

      return Object.freeze(item);
    });

    const result = [...resultFarms, ...resultPools];

    result.push({
      id: `pancake_auto`,
      name: `Auto CAKE`,
      token: 'cake',
      platform: "pancake",
      raw: Object.freeze({
        lpAddresses: '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82'
      }),
      provider: "pancake",
      earns: [],
      link: "https://pancakeswap.finance/pools",
      has_details: true,
      extra: {
        transactionToken: '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82',
        transactionAddress: cakeVaultAddress,
      },
      compound: true,
      chain: 'bsc',
    });

    this.cache.put(cacheKey, result, { ttl: 300 * 1000 });

    return result;
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

    const callsPromises = [];
    addresses.forEach(id => {
      const farm = farms.find(f => f.id === id);

      if (farm.id.startsWith('pancake_farm_')) {
        const contract = new Web3EthContract(masterchefABI, masterChefAddress);

        callsPromises.push({
          userInfo: contract.methods.userInfo(farm.raw.pid, address),
          pendingCake: contract.methods.pendingCake(farm.raw.pid, address),
          id: farm.id
        });
      } else if(farm.id.startsWith('pancake_pool_')) {
        const contract = new Web3EthContract(sousChefABI, this.getAddress(farm.raw.contractAddress));

        callsPromises.push({
          userInfo: contract.methods.userInfo(address),
          pendingReward: contract.methods.pendingReward(address),
          id: farm.id
        })
      } else if(farm.id.startsWith('pancake_auto')) {
        let contract = new Web3EthContract(cakeVaultAbi, cakeVaultAddress);

        callsPromises.push({
          userInfo: contract.methods.userInfo(address),
          id: farm.id
        });
      }
    })

    const calls = await Utils.multiCall(callsPromises);

    const resultFarms = calls
      .filter(c => c.userInfo && c.userInfo[0] && new BigNumber(c.userInfo[0]).isGreaterThan(0))
      .map(call => {
        const farm = farms.find(f => f.id === call.id);

        const result = {};

        const decimals = farm.extra.transactionToken
          ? 10 ** this.tokenCollector.getDecimals(farm.extra.transactionToken)
          : 1e18;

        result.deposit = {
          symbol: farm.symbol,
          amount: call.userInfo[0] / decimals
        };

        let address1 = this.getAddress(farm.extra.transactionToken);
        if (address1) {
          let price = this.priceOracle.getAddressPrice(address1);

          if (price) {
            result.deposit.usd = result.deposit.amount * price;
          }
        }

        if (new BigNumber(call.pendingCake).isGreaterThan(0)) {
          const reward = {
            symbol: "cake",
            amount: call.pendingCake / 1e18
          };

          const price = this.priceOracle.findPrice(reward.symbol);
          if (price) {
            reward.usd = reward.amount * price;
          }

          result.rewards = [reward];
        } else if (new BigNumber(call.pendingReward).isGreaterThan(0)) {
          let decimals = farm.raw.earningToken && farm.raw.earningToken.address && this.getAddress(farm.raw.earningToken.address)
            ? 10 ** this.tokenCollector.getDecimals(this.getAddress(farm.raw.earningToken.address))
            : 1e18;

          const reward = {
            symbol: farm.raw.earningToken ? farm.raw.earningToken.symbol.toLowerCase() : '?',
            amount: call.pendingReward / decimals
          };

          const price = this.priceOracle.findPrice(reward.symbol);
          if (price) {
            reward.usd = reward.amount * price;
          }

          result.rewards = [reward];
        }

        result.farm = farm;

        return result;
      });

    return Object.freeze(resultFarms);
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

  async getPools() {
    const cacheKey = `pancake-v6-master-pools`

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    const body = await Utils.requestGet("https://raw.githubusercontent.com/pancakeswap/pancake-frontend/develop/src/config/constants/pools.ts");

    let blockNumber = await Utils.getWeb3('bsc').eth.getBlockNumber();

    const calls = [...body.matchAll(/contractAddress:\s+{\s*.*?\s*.*?56:\s*['](.*)[']/gm)]
        .map(match => match && match[1])
        .map(address => {
          let web3EthContract = new Web3EthContract(sousChefCombinedABI, address);
          return {
            address: address,
            bonusEndBlock: web3EthContract.methods.bonusEndBlock(),
            rewardToken: web3EthContract.methods.rewardToken(),
            poolInfo: web3EthContract.methods.poolInfo(0),
            stakedToken: web3EthContract.methods.stakedToken(),
            syrup: web3EthContract.methods.syrup(),
            rewardPerBlock: web3EthContract.methods.rewardPerBlock(),
            multiplier: web3EthContract.methods.getMultiplier(blockNumber, blockNumber + 1),
          };
        });

    const items = [];
    let newVar = await Utils.multiCall(calls);
    newVar.forEach(item => {
      let lpToken = item.syrup;

      if (!lpToken || !lpToken.startsWith('0x')) {
        lpToken = item.stakedToken;
      }

      if (!lpToken || !lpToken.startsWith('0x')) {
        if (item.poolInfo && item.poolInfo[0] && item.poolInfo[0].startsWith('0x')) {
          lpToken = item.poolInfo[0];
        }
      }

      if (!lpToken || !item.rewardToken) {
        return;
      }

      if (!item.bonusEndBlock || blockNumber > parseInt(item.bonusEndBlock)) {
        return;
      }

      items.push({
        address: item.address,
        rewardToken: item.rewardToken,
        bonusEndBlock: item.bonusEndBlock,
        lpToken: lpToken,
        rewardPerBlock: item.rewardPerBlock,
        totalAllocPoint: item.totalAllocPoint,
        multiplier: item.multiplier,
        raw: {
          poolInfo: item.poolInfo
        },
      });
    });

    const rewardInfo = await Utils.multiCallIndexBy('token', items.map(item => {
      const web3EthContract = new Web3EthContract(erc20ABI, item.rewardToken);

      return {
        token: item.rewardToken.toLowerCase(),
        symbol: web3EthContract.methods.symbol(),
        decimals: web3EthContract.methods.decimals(),
      }
    }));

    const result = items
      .filter(line => rewardInfo[line.rewardToken.toLowerCase()])
      .map(line => {
        const rewardToken = rewardInfo[line.rewardToken.toLowerCase()];
        const lpTokenSymbol = this.tokenCollector.getSymbolByAddress(line.lpToken);

        const raw = line;
        raw.contractAddress = line.address; // needed for compatibility

        const item = {
          sousId: line.address,
          stakingToken: {
            symbol: lpTokenSymbol ? lpTokenSymbol.toLowerCase() : '?',
            address: line.lpToken,
          },
          earningToken: {
            symbol: rewardToken.symbol,
            address: rewardToken.token,
          },
          contractAddress: line.address,
          raw: raw,
        }

        return Object.freeze(item);
      });

    await this.cacheManager.set(cacheKey, result, {ttl: 60 * 30})

    return result;
  }
};
