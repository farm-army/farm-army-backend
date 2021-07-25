"use strict";

const fs = require("fs");
const path = require("path");
const Web3EthContract = require("web3-eth-contract");
const BigNumber = require("bignumber.js");
const request = require("async-request");
const Utils = require("../../utils");

const ABI_0xcAB056427F99c9DB95e7fd39B16aC7f1AeBd0ce6 = require('./abi/0xcAB056427F99c9DB95e7fd39B16aC7f1AeBd0ce6.json')
const ABI_0x7A4cFC24841c799832fFF4E5038BBA14c0e73ced = require('./abi/0x7A4cFC24841c799832fFF4E5038BBA14c0e73ced.json')
const ABI_POOLINFO = require('./abi/poolinfo.json')

module.exports = class bdollar {
  constructor(cache, priceOracle, tokenCollector) {
    this.cache = cache;
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector
  }

  static MASTER_ABI = JSON.parse(
    fs.readFileSync(
      path.resolve(
        __dirname,
        "abi/0x948dB1713D4392EC04C86189070557C5A8566766.json"
      ),
      "utf8"
    )
  )

  static MASTER_ADDRESS = "0x948dB1713D4392EC04C86189070557C5A8566766"

  static TOKENS = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "farms/tokens.json"), "utf8")
  )

  getRawPools() {
    // https://api.bdollar.fi/api/bvault/get-vaults
    return Object.values(
      JSON.parse(
        fs.readFileSync(path.resolve(__dirname, "farms/farms.json"), "utf8")
      )
    ).filter(f => f.type === "share" || f.type === 'seed');
  }

  async getAddressFarms(address) {
    const cacheItem = this.cache.get(`getAddressFarms-bdollar-${address}`);
    if (cacheItem) {
      return cacheItem;
    }

    let farms = await this.getFarms();

    const vaultCalls = farms
      .filter(farm => farm.id.startsWith('bdollar_share_'))
      .map(farm => {
        const vault = new Web3EthContract(bdollar.MASTER_ABI, bdollar.MASTER_ADDRESS);

        return {
          userInfo: vault.methods.userInfo(farm.raw.pid, address),
          id: farm.id.toString()
        };
      });

    const seedCalls = [];
    farms.filter(farm => farm.id.startsWith('bdollar_seed_'))
      .forEach(farm => {
        if (farm.raw.address === '0xcAB056427F99c9DB95e7fd39B16aC7f1AeBd0ce6') {
          const vault = new Web3EthContract(ABI_0xcAB056427F99c9DB95e7fd39B16aC7f1AeBd0ce6, farm.raw.address);

          seedCalls.push({
            userInfo: vault.methods.userInfo(farm.raw.pid, address),
            id: farm.id.toString()
          });
        }

        if (farm.raw.address === '0x7A4cFC24841c799832fFF4E5038BBA14c0e73ced') {
          const vault = new Web3EthContract(ABI_0x7A4cFC24841c799832fFF4E5038BBA14c0e73ced, farm.raw.address);

          seedCalls.push({
            userInfo: vault.methods.userInfo(farm.raw.pid, address),
            id: farm.id.toString()
          });
        }
      });

    const [farmCalls, seeds] = await Promise.all([
      Utils.multiCall(vaultCalls),
      Utils.multiCall(seedCalls),
    ]);

    const result = [...farmCalls, ...seeds]
      .filter(v =>
        new BigNumber(v.userInfo[0] || 0).isGreaterThan(Utils.DUST_FILTER)
      )
      .map(v => v.id);

    this.cache.put(`getAddressFarms-bdollar-${address}`, result, {
      ttl: 300 * 1000
    });

    return result;
  }

  async getFarms(refresh = false) {
    const cacheKey = "getFarms-bdollar";

    if (!refresh) {
      const cacheItem = this.cache.get(cacheKey);
      if (cacheItem) {
        return cacheItem;
      }
    }

    const data = {};

    try {
      const text = await request("https://api.bdollar.fi/api/bvault/get-vaults");
      const response = JSON.parse(text.body);

      Object.values(response.data.vaultInfos).forEach(v => {
        data[v.pid] = v;
      });
    } catch (e) {
      console.log('error api.bdollar.fi/api/bvault/get-vaults')
    }

    const rawPools = this.getRawPools();

    const poolInfosCalls = [];
    rawPools
      .filter(farm => farm.pid && ['0xcAB056427F99c9DB95e7fd39B16aC7f1AeBd0ce6', '0x7A4cFC24841c799832fFF4E5038BBA14c0e73ced'].includes(farm.address))
      .forEach(farm => {
        const contract = new Web3EthContract(ABI_POOLINFO, farm.address);

        poolInfosCalls.push({
          contract: farm.contract,
          poolInfo: contract.methods.poolInfo(farm.pid),
        })
      })

    const poolInfos = await Utils.multiCallIndexBy('contract', poolInfosCalls);

    const result = rawPools.map(farm => {
      const name = farm.name
        .replace("pancake", "")
        .replace("/", "-")
        .trim();

      let token = name.toLowerCase();
      if (farm.depositTokenName) {
        token = farm.depositTokenName
          .toLowerCase()
          .replace('vlp', '')
          .replace('cakelp', '')
          .replace('cake-lp', '')
          .replace("/", "-")
          .trim();
      }

      const item = {
        id: `bdollar_${farm.type}_${farm.contract.replace(/[^a-z0-9 -]/ig, '_').toLowerCase()}`,
        name: name,
        token: token,
        provider: "bdollar",
        raw: Object.freeze(farm),
        link: "https://bdollar.fi/shares",
        has_details: true,
        extra: {}
      };

      if (farm.type === 'share') {
        if (bdollar.TOKENS[farm.depositTokenName]) {
          item.extra.transactionToken = bdollar.TOKENS[farm.depositTokenName][0];
        }

        item.extra.transactionAddress = bdollar.MASTER_ADDRESS;
      } else if(farm.type === 'seed') {
        let poolInfo = poolInfos[farm.contract];
        if (poolInfo && poolInfo.poolInfo && poolInfo.poolInfo[0]) {
          item.extra.transactionToken = poolInfo.poolInfo[0]
        } else if (bdollar.TOKENS[farm.depositTokenName]) {
          item.extra.transactionToken = bdollar.TOKENS[farm.depositTokenName][0];
        }
      }

      if (farm.earnTokenName) {
        const earnTokenName = farm.earnTokenName.toLowerCase().replace(/\s/g, '')
        let split = earnTokenName.split('+').filter(e => e.match(/^[\w-]{1,6}$/g));

        if (split.length > 0) {
          item.earns = split;
        }
      }

      if (!item.extra.transactionToken && farm.depositTokenName) {
        const address = this.tokenCollector.getAddressBySymbol(farm.depositTokenName)
        if (address) {
          item.extra.transactionToken = address;
        }
      }

      item.extra.transactionAddress = farm.address;

      if (data[farm.pid] && data[farm.pid].apy) {
        item.yield = {
          apy: data[farm.pid].apy
        };
      }

      if (data[farm.pid] && data[farm.pid].tvl) {
        item.tvl = {
          usd: data[farm.pid].tvl
        };
      }

      return Object.freeze(item);
    });

    this.cache.put(cacheKey, result, { ttl: 1000 * 60 * 30 });

    console.log("bdollar updated");

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

    const vaultCalls = addresses
      .filter(id => id.startsWith('bdollar_share_'))
      .map(id => {
        const farm = farms.find(f => f.id === id);
        const vault = new Web3EthContract(bdollar.MASTER_ABI, bdollar.MASTER_ADDRESS);

        return {
          userInfo: vault.methods.userInfo(farm.raw.pid, address),
          pendingShare: vault.methods.pendingShare(farm.raw.pid, address),
          id: farm.id.toString()
        };
      });

    const seedCalls = [];
    addresses
      .filter(id => id.startsWith('bdollar_seed_'))
      .forEach(id => {
        const farm = farms.find(f => f.id === id);

        if (farm.raw.address === '0xcAB056427F99c9DB95e7fd39B16aC7f1AeBd0ce6') {
          const vault = new Web3EthContract(ABI_0xcAB056427F99c9DB95e7fd39B16aC7f1AeBd0ce6, farm.raw.address);

          seedCalls.push({
            userInfo: vault.methods.userInfo(farm.raw.pid, address),
            pendingShare: vault.methods.pendingReward(farm.raw.pid, address),
            id: farm.id.toString()
          });
        }

        if (farm.raw.address === '0x7A4cFC24841c799832fFF4E5038BBA14c0e73ced') {
          const vault = new Web3EthContract(ABI_0x7A4cFC24841c799832fFF4E5038BBA14c0e73ced, farm.raw.address);

          seedCalls.push({
            userInfo: vault.methods.userInfo(farm.raw.pid, address),
            pendingShare: vault.methods.pendingBDO(farm.raw.pid, address),
            id: farm.id.toString()
          });
        }
      });

    const [calls, seeds] = await Promise.all([
      Utils.multiCall(vaultCalls),
      Utils.multiCall(seedCalls),
    ]);

    const resultFarms = [...calls, ...seeds]
      .filter(v => new BigNumber(v.userInfo[0] || 0).isGreaterThan(0))
      .map(call => {
        const farm = farms.find(f => f.id === call.id);

        const amount = call.userInfo[0];

        const result = {};

        result.deposit = {
          symbol: "?",
          amount: amount / 1e18
        };

        if (farm.extra.transactionToken) {
          const price = this.priceOracle.findPrice(farm.extra.transactionToken);
          if (price) {
            result.deposit.usd = result.deposit.amount * price;
          }
        }

        if (call.pendingShare > 0 && farm.earns[0]) {
          const reward = {
            symbol: farm.earns[0],
            amount: call.pendingShare / 1e18
          };

          const priceReward = this.priceOracle.findPrice(farm.earns[0]);
          if (priceReward) {
            reward.usd = reward.amount * priceReward;
          }

          result.rewards = [reward];
        }

        result.farm = farm;

        return result;
      });

    return resultFarms;
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
};
