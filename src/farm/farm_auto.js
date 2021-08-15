'use strict';

const Web3EthContract = require("web3-eth-contract");
const Utils = require("../utils");
const BigNumber = require("bignumber.js");
const erc20Abi = require("../abi/erc20.json");

module.exports = class FarmAuto {
  constructor(priceOracle, farmCollector, tokenCollector, cacheManager, chain) {
    this.priceOracle = priceOracle;
    this.farmCollector = farmCollector;
    this.tokenCollector = tokenCollector;
    this.cacheManager = cacheManager;
    this.chain = chain;
  }

  async getAutoAddressFarms(masterChefAddress, address = undefined) {
    const masterChefMetadataCache = `auto-farm-masterchef-meta-${this.chain}-${masterChefAddress}-v5`;

    let metaCache = await this.cacheManager.get(masterChefMetadataCache)
    if (!metaCache) {
      const masterChefMetadata = await this.farmCollector.fetchForMasterChefWithMeta(masterChefAddress, this.chain);

      const farmBalanceCalls = masterChefMetadata.pools
        .filter(farm => farm.raw.lpToken)
        .map(farm => {
          const token = new Web3EthContract(erc20Abi, farm.raw.lpToken);
          return {
            pid: farm.pid.toString(),
            balance: token.methods.balanceOf(masterChefAddress),
          };
        });

      const farmBalances = await Utils.multiCallIndexBy('pid', farmBalanceCalls, this.chain);

      let pools = masterChefMetadata.pools.filter(farm => farm.raw.lpToken).map(pool => {
        const farm = {
          id: `autofarm_farm_${masterChefAddress}_${pool.pid}`,
          name: pool.lpSymbol,
          provider: `farm_auto_${masterChefAddress}`,
          raw: Object.freeze(pool),
          chain: this.chain,
          extra: {
            transactionToken: pool.raw.lpToken,
            transactionAddress: masterChefAddress,
          },
        };

        if (pool.raw && pool.raw.earns && pool.raw.earns.length > 0) {
          farm.earn = pool.raw.earns.map(e => ({
            'address': e.address.toLowerCase(),
            'symbol': e.symbol.toLowerCase(),
            'decimals': e.decimals,
          }))

          farm.earns = farm.earn.map(e => e.symbol.toLowerCase())
        }

        let tvl = undefined;
        if (farmBalances[pool.pid].balance && farmBalances[pool.pid].balance > 0) {
          tvl = farmBalances[pool.pid].balance;
        } else if(pool.raw && pool.raw.poolInfoNormalized && pool.raw.poolInfoNormalized.tvl && pool.raw.poolInfoNormalized.tvl > 0) {
          tvl = pool.raw.poolInfoNormalized.tvl;
        }

        if (tvl) {
          farm.tvl = {
            amount: tvl / (10 ** this.tokenCollector.getDecimals(farm.extra.transactionToken))
          };

          const addressPrice = this.priceOracle.findPrice(farm.extra.transactionToken);
          if (addressPrice) {
            farm.tvl.usd = farm.tvl.amount * addressPrice;
          }
        }


        if (farm.tvl && farm.tvl.usd && pool.raw && pool.raw.yearlyRewardsInToken) {
          const yearlyRewardsInToken = pool.raw.yearlyRewardsInToken / (10 ** this.tokenCollector.getDecimals(farm.raw.earns[0].address));

          if (farm.raw.earns && farm.raw.earns[0]) {
            const tokenPrice = this.priceOracle.getAddressPrice(farm.raw.earns[0].address);
            if (tokenPrice) {
              const dailyApr = (yearlyRewardsInToken * tokenPrice) / farm.tvl.usd;

              farm.yield = {
                apy: Utils.compoundCommon(dailyApr) * 100
              };
            }
          }
        }

        return farm;
      });

      metaCache = {
        pools: pools,
        masterChefMetadata: masterChefMetadata,
      }

      await this.cacheManager.set(masterChefMetadataCache, metaCache, {ttl: 60 * 60});
    }

    const result = {
      masterChefMetadata: {
        pools: metaCache.pools,
        methods: metaCache.masterChefMetadata.methods,
      },
    };

    if (address) {
      const addressPoolCacheKey = `auto-farm-addresspools-${this.chain}-${masterChefAddress}-${address}-v2`;
      let addressPools = await this.cacheManager.get(addressPoolCacheKey)
      if (!addressPools) {
        addressPools = await this.getAddressFarmsInner(this.chain, masterChefAddress, metaCache, address);
        await this.cacheManager.set(addressPoolCacheKey, addressPools, {ttl: 60 * 3});
      }

      result.pools = addressPools;
    }

    return result;
  }

  async getAddressFarmsInner(chain, masterChefAddress, metaData, address) {
    const abi = metaData.masterChefMetadata.abi;
    const pools = metaData.pools;

    const vaultCalls = pools.map(farm => {
      const vault = new Web3EthContract(abi, masterChefAddress);
      return {
        id: farm.raw.pid.toString(),
        userInfo: vault.methods.userInfo(farm.raw.pid, address),
        pendingReward: metaData.masterChefMetadata.methods.pendingRewardsFunctionName ? vault.methods[metaData.masterChefMetadata.methods.pendingRewardsFunctionName](farm.raw.pid, address) : '0'
      };
    });

    const vaults = await Utils.multiCall(vaultCalls, chain);

    const result = vaults
      .filter(v =>
        new BigNumber((v.userInfo && v.userInfo[0]) ? v.userInfo[0] : 0).isGreaterThan(0) ||
        new BigNumber(v.pendingReward || 0).isGreaterThan(0)
      ).map(call => {
        const farm = pools.find(f => f.raw.pid.toString() === call.id.toString());

        const result = {
          farm: farm
        };

        const amount = (call.userInfo && call.userInfo[0]) ? call.userInfo[0] : 0;
        if (amount > 0) {
          const depositDecimals = farm.raw.lpToken ? this.tokenCollector.getDecimals(farm.raw.lpToken) : 18;

          result.deposit = {
            symbol: "?",
            amount: amount / (10 ** depositDecimals)
          };

          let price = farm.extra.transactionToken ? this.priceOracle.getAddressPrice(farm.extra.transactionToken) : undefined;
          if (price) {
            result.deposit.usd = result.deposit.amount * price;
          }
        }

        const rewards = call.pendingReward || 0;
        if (rewards > 0) {
          let reward = undefined;

          if (farm.raw.earns && farm.raw.earns[0]) {
            // new
            reward = {
              symbol: farm.raw.earns[0].symbol.toLowerCase(),
              amount: rewards / (10 ** farm.raw.earns[0].decimals)
            };

            const priceReward = this.priceOracle.getAddressPrice(farm.raw.earns[0].address);
            if (priceReward) {
              reward.usd = reward.amount * priceReward;
            }
          }

          if (reward) {
            result.rewards = [reward];
          }
        }

        return result;
      });

    return result;
  }
}
