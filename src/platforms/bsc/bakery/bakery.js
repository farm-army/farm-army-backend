"use strict";

const Web3EthContract = require("web3-eth-contract");
const BigNumber = require("bignumber.js");
const Utils = require("../../../utils");
const ERC20Abi = require("../../../abi/erc20.json");
const MasterV2Abi = require("./abi/masterv2.json");

module.exports = class bakery {
  constructor(priceOracle, cacheManager, tokenCollector, liquidityTokenCollector) {
    this.priceOracle = priceOracle;
    this.cacheManager = cacheManager;
    this.tokenCollector = tokenCollector;
    this.liquidityTokenCollector = liquidityTokenCollector;
  }

  static MASTER_ADDRESS_V2 = '0x6a8DbBfbB5a57d07D14E63E757FB80B4a7494f81'

  async getLbAddresses() {
    return (await this.getRawPools())
      .filter(f => f.lpAddresses && f.lpAddresses[56])
      .map(farm => farm.lpAddresses[56]);
  }

  async getRawPools() {
    const cacheKey = `${this.getName()}-getRawPools-v1`

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    const masterchefInfo = await Utils.multiCall([{
      poolLength: new Web3EthContract(MasterV2Abi, bakery.MASTER_ADDRESS_V2).methods.poolLength(),
      token: new Web3EthContract(MasterV2Abi, bakery.MASTER_ADDRESS_V2).methods.token(),
    }], this.getChain());

    const addresses = await Utils.multiCall([...Array(parseInt(masterchefInfo[0].poolLength)).keys()].map(id => ({
      poolAddress: new Web3EthContract(MasterV2Abi, bakery.MASTER_ADDRESS_V2).methods.poolAddresses(id),
    })), this.getChain());

    const poolInfos = (await Utils.multiCall(addresses.map(address => {
      const contract = new Web3EthContract(MasterV2Abi, bakery.MASTER_ADDRESS_V2);

      return {
        address: address.poolAddress,
        poolInfo: contract.methods.poolInfoMap(address.poolAddress),
      };
    }), this.getChain())).filter(p => p.poolInfo && p.poolInfo[2] && p.poolInfo[2] > 0);

    const tokenNames = await Utils.multiCallIndexBy('address', poolInfos.map(p => p.address).map(address => {
      const contract = new Web3EthContract(ERC20Abi, address);

      return {
        address: address.toLowerCase(),
        name: contract.methods.name(),
      };
    }), this.getChain());

    const pools = [];

    poolInfos.forEach(info => {
      const item = {};

      item.id = info.address;

      item.tokenSymbol = "BAKE";

      item.lpAddresses = {
        56: info.address
      };

      item.tokenAddresses = {
        56: masterchefInfo[0].token
      };

      let tokenName = tokenNames[info.address.toLowerCase()];
      if (tokenName && tokenName.name) {
        item.name = tokenName.name
      }

      pools.push(item);
    });

    await this.cacheManager.set(cacheKey, Object.freeze(pools), {ttl: 60 * 60})

    return Object.freeze(pools);
  }

  async getAddressFarms(address) {
    const cacheKey = `getAddressFarms-bakery-${address}`;

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    const vaultCalls = (await this.getFarms())
      .filter(f => f.raw.lpAddresses && f.raw.lpAddresses[56])
      .map(farm => {
        const vault = new Web3EthContract(MasterV2Abi, bakery.MASTER_ADDRESS_V2);

        return {
          id: farm.id.toString(),
          poolUserInfoMap: vault.methods.poolUserInfoMap(farm.raw.lpAddresses[56], address)
        };
      });

    const farmCalls = await Utils.multiCall(vaultCalls);

    const result = farmCalls
      .filter(v =>
          new BigNumber(v.poolUserInfoMap[0] || 0).isGreaterThan(Utils.DUST_FILTER)
      )
      .map(v => v.id);

    await this.cacheManager.set(cacheKey, result, {ttl: 60 * 5});

    return result;
  }

  async getFarms(refresh = false) {
    const cacheKey = "getFarms-bakery";

    if (!refresh) {
      const cache = await this.cacheManager.get(cacheKey)
      if (cache) {
        return cache;
      }
    }

    const rawPools = (await this.getRawPools()).filter(i => i.ended !== true);

    // TVL USD
    const farmTvls = {};
    (await Utils.multiCall(
      rawPools.map(farm => ({
        lpAddress: farm.lpAddresses[56].toLowerCase(),
        tvl: new Web3EthContract(ERC20Abi, farm.lpAddresses[56]).methods.balanceOf(bakery.MASTER_ADDRESS_V2),
      }))
    )).forEach(call => {
      farmTvls[call.lpAddress] = call.tvl;
    });

    const result = rawPools.map(farm => {
      let name = this.tokenCollector.getSymbolByAddress(farm.lpAddresses[56]);
      if (!name) {
        name = this.liquidityTokenCollector.getSymbolNames(farm.lpAddresses[56]);
      }

      if (!name && farm.name) {
        name = farm.name;
      }

      if (!name) {
        name = '?';
      }

      const item = {
        id: `bakery_${farm.id.toLowerCase()}`,
        name: name.toUpperCase(),
        token: name.toLowerCase(),
        provider: "bakery",
        raw: Object.freeze(farm),
        link: "https://www.bakeryswap.org/",
        has_details: true,
        extra: {},
        chain: 'bsc',
      };

      if (!item.name.toLowerCase().includes('stakingpower')) {
        item.earns = ['bake'];
      } else {
        item.name = item.name
          .replace('StakingPower', '')
          .replace('NFT', '')
          .replace('Mixer', '')
          .trim()

        item.token = item.name.toLowerCase();
        item.name += ' NFT';
        item.notes = ['NTF'];
      }

      item.extra.lpAddress = farm.lpAddresses[56];
      item.extra.transactionToken = item.extra.lpAddress;
      item.extra.transactionAddress = bakery.MASTER_ADDRESS_V2;

      let farmTvl = farmTvls[item.extra.transactionToken.toLowerCase()];
      if (farmTvl) {
        item.tvl = {
          amount: farmTvl / 10 ** this.tokenCollector.getDecimals(item.extra.transactionToken)
        };

        const addressPrice = this.priceOracle.getAddressPrice(farm.lpAddresses[56]);
        if (addressPrice) {
          item.tvl.usd = item.tvl.amount * addressPrice;
        }
      }

      return Object.freeze(item);
    });

    await this.cacheManager.set(cacheKey, result, {ttl: 60 * 30});

    console.log("bakery updated");

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

    const vaultCalls = addresses.map(id => {
      const farm = farms.find(f => f.id === id);
      const vault = new Web3EthContract(MasterV2Abi, bakery.MASTER_ADDRESS_V2);

      return {
        id: farm.id.toString(),
        poolUserInfoMap: vault.methods.poolUserInfoMap(farm.raw.lpAddresses[56], address),
        pendingBake: vault.methods.pendingToken(farm.raw.lpAddresses[56], address)
      };
    });

    const calls = await Utils.multiCall(vaultCalls);

    const resultFarms = calls
      .filter(
        v =>
          new BigNumber(v.poolUserInfoMap[0] || 0).isGreaterThan(0)
      )
      .map(call => {
        const farm = farms.find(f => f.id === call.id);

        const amount = call.poolUserInfoMap[0] || 0;
        const rewards = call.pendingBake || 0;

        const result = {};

        result.deposit = {
          symbol: "?",
          amount: amount / 1e18
        };

        let price;
        if (farm.raw.lpAddresses && farm.raw.lpAddresses[56]) {
          price = this.priceOracle.findPrice(farm.raw.lpAddresses[56]);
        }

        if (!price) {
          price = this.priceOracle.findPrice(`bake-${farm.token}`);
        }

        if (price) {
          result.deposit.usd = result.deposit.amount * price;
        }

        if (rewards > 0 && farm.raw.tokenSymbol) {
          const reward = {
            symbol: farm.raw.tokenSymbol.toLowerCase(),
            amount: rewards / 1e18
          };

          const priceReward = this.priceOracle.findPrice(farm.raw.tokenSymbol.toLowerCase());
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

  getChain() {
    return 'bsc';
  }

  getName() {
    return 'wault';
  }
};
