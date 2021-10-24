"use strict";

const crypto = require('crypto');
const BigNumber = require("bignumber.js");
const Web3EthContract = require("web3-eth-contract");
const Utils = require("../../../utils");

const MULTI_REWARD_ABI = require('./abi/gaugev3.json');
const ERC20_ABI = require('../../../abi/erc20.json');
const AstParser = require("../../../utils/ast_parser");
const _ = require("lodash");
const lpAbi = require("../../../lpAbi.json");

const CELO_SADDLE_SWAP_ABI = [{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"provider","type":"address"},{"indexed":false,"internalType":"uint256[]","name":"tokenAmounts","type":"uint256[]"},{"indexed":false,"internalType":"uint256[]","name":"fees","type":"uint256[]"},{"indexed":false,"internalType":"uint256","name":"invariant","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"lpTokenSupply","type":"uint256"}],"name":"AddLiquidity","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"newAdminFee","type":"uint256"}],"name":"NewAdminFee","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"newSwapFee","type":"uint256"}],"name":"NewSwapFee","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"newWithdrawFee","type":"uint256"}],"name":"NewWithdrawFee","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"oldA","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"newA","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"initialTime","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"futureTime","type":"uint256"}],"name":"RampA","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"provider","type":"address"},{"indexed":false,"internalType":"uint256[]","name":"tokenAmounts","type":"uint256[]"},{"indexed":false,"internalType":"uint256","name":"lpTokenSupply","type":"uint256"}],"name":"RemoveLiquidity","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"provider","type":"address"},{"indexed":false,"internalType":"uint256[]","name":"tokenAmounts","type":"uint256[]"},{"indexed":false,"internalType":"uint256[]","name":"fees","type":"uint256[]"},{"indexed":false,"internalType":"uint256","name":"invariant","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"lpTokenSupply","type":"uint256"}],"name":"RemoveLiquidityImbalance","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"provider","type":"address"},{"indexed":false,"internalType":"uint256","name":"lpTokenAmount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"lpTokenSupply","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"boughtId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"tokensBought","type":"uint256"}],"name":"RemoveLiquidityOne","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"currentA","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"time","type":"uint256"}],"name":"StopRampA","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"buyer","type":"address"},{"indexed":false,"internalType":"uint256","name":"tokensSold","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"tokensBought","type":"uint256"},{"indexed":false,"internalType":"uint128","name":"soldId","type":"uint128"},{"indexed":false,"internalType":"uint128","name":"boughtId","type":"uint128"}],"name":"TokenSwap","type":"event"},{"inputs":[{"internalType":"uint256[]","name":"amounts","type":"uint256[]"},{"internalType":"uint256","name":"minToMint","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"addLiquidity","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"calculateCurrentWithdrawFee","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"calculateRemoveLiquidity","outputs":[{"internalType":"uint256[]","name":"","type":"uint256[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"},{"internalType":"uint256","name":"tokenAmount","type":"uint256"},{"internalType":"uint8","name":"tokenIndex","type":"uint8"}],"name":"calculateRemoveLiquidityOneToken","outputs":[{"internalType":"uint256","name":"availableTokenAmount","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint8","name":"tokenIndexFrom","type":"uint8"},{"internalType":"uint8","name":"tokenIndexTo","type":"uint8"},{"internalType":"uint256","name":"dx","type":"uint256"}],"name":"calculateSwap","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"},{"internalType":"uint256[]","name":"amounts","type":"uint256[]"},{"internalType":"bool","name":"deposit","type":"bool"}],"name":"calculateTokenAmount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getA","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getAPrecise","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"index","type":"uint256"}],"name":"getAdminBalance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"getDepositTimestamp","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint8","name":"index","type":"uint8"}],"name":"getToken","outputs":[{"internalType":"contract IERC20","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint8","name":"index","type":"uint8"}],"name":"getTokenBalance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"tokenAddress","type":"address"}],"name":"getTokenIndex","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getVirtualPrice","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"contract IERC20[]","name":"_pooledTokens","type":"address[]"},{"internalType":"uint8[]","name":"decimals","type":"uint8[]"},{"internalType":"string","name":"lpTokenName","type":"string"},{"internalType":"string","name":"lpTokenSymbol","type":"string"},{"internalType":"uint256","name":"_a","type":"uint256"},{"internalType":"uint256","name":"_fee","type":"uint256"},{"internalType":"uint256","name":"_adminFee","type":"uint256"},{"internalType":"uint256","name":"_withdrawFee","type":"uint256"}],"name":"initialize","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256[]","name":"minAmounts","type":"uint256[]"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"removeLiquidity","outputs":[{"internalType":"uint256[]","name":"","type":"uint256[]"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256[]","name":"amounts","type":"uint256[]"},{"internalType":"uint256","name":"maxBurnAmount","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"removeLiquidityImbalance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenAmount","type":"uint256"},{"internalType":"uint8","name":"tokenIndex","type":"uint8"},{"internalType":"uint256","name":"minAmount","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"removeLiquidityOneToken","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint8","name":"tokenIndexFrom","type":"uint8"},{"internalType":"uint8","name":"tokenIndexTo","type":"uint8"},{"internalType":"uint256","name":"dx","type":"uint256"},{"internalType":"uint256","name":"minDy","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"swap","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"swapStorage","outputs":[{"internalType":"uint256","name":"initialA","type":"uint256"},{"internalType":"uint256","name":"futureA","type":"uint256"},{"internalType":"uint256","name":"initialATime","type":"uint256"},{"internalType":"uint256","name":"futureATime","type":"uint256"},{"internalType":"uint256","name":"swapFee","type":"uint256"},{"internalType":"uint256","name":"adminFee","type":"uint256"},{"internalType":"uint256","name":"defaultWithdrawFee","type":"uint256"},{"internalType":"contract LPToken","name":"lpToken","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"transferAmount","type":"uint256"}],"name":"updateUserWithdrawFee","outputs":[],"stateMutability":"nonpayable","type":"function"}]
const CELO_SADDLE_LP_TOKEN_ABI = [{"inputs":[{"internalType":"string","name":"name_","type":"string"},{"internalType":"string","name":"symbol_","type":"string"},{"internalType":"uint8","name":"decimals_","type":"uint8"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"spender","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Transfer","type":"event"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"burn","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"burnFrom","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"subtractedValue","type":"uint256"}],"name":"decreaseAllowance","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"addedValue","type":"uint256"}],"name":"increaseAllowance","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"mint","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"swap","outputs":[{"internalType":"contract ISwap","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"sender","type":"address"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"}]

// https://github.com/mobiusAMM/mobius-interface/blob/e9a482a39cf7e89ec91700b02f247b357cc2a902/src/state/stablePools/updater.ts

module.exports = class mobius {
  constructor(cacheManager, priceOracle, tokenCollector, liquidityTokenCollector) {
    this.cacheManager = cacheManager;
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector;
    this.liquidityTokenCollector = liquidityTokenCollector;
  }

  async getLbAddresses() {
    return [];
  }

  async getLbPrices() {
    const cacheKey = `getLbPrices-v2-${this.getName()}`;

    const cache = await this.cacheManager.get(cacheKey);
    if (cache) {
      return cache;
    }

    const addresses = _.uniq((await this.getRawFarms()).filter(p => p.stakingToken).map(p => p.stakingToken));

    const vaultCalls = await Utils.multiCall(addresses.map(address => {
      const vault = new Web3EthContract(CELO_SADDLE_LP_TOKEN_ABI, address);
      return {
        swap: vault.methods.swap(),
        address: address,
        decimals: vault.methods.decimals(),
        totalSupply: vault.methods.totalSupply(),
      };
    }), this.getChain());

    const swapCalls = await Utils.multiCall(vaultCalls.map(f => {
      const vault = new Web3EthContract(CELO_SADDLE_SWAP_ABI, f.swap);
      return {
        virtualPrice: vault.methods.getVirtualPrice(),
        address: f.address,
        token0: vault.methods.getToken(0),
        decimals: f.decimals,
        totalSupply: f.totalSupply,
      };
    }), this.getChain());

    const result = {};
    swapCalls.forEach(i => {
      const price = this.priceOracle.findPrice(i.token0);
      if (price) {
        result[i.address.toLowerCase()] = (i.virtualPrice / 1e18) * price;
      }
    })

    await this.cacheManager.set(cacheKey, result, {ttl: 60 * 30});

    return result;
  }

  async getRawFarms(refresh) {
    const cacheKey = `getRawFarms-v4-${this.getName()}`;

    if (!refresh) {
      const cache = await this.cacheManager.get(cacheKey);
      if (cache) {
        return cache;
      }
    }

    const files = await Utils.getJavascriptFiles('https://www.mobius.money/');

    const rawPools = [];
    Object.values(files).forEach(f => {
      rawPools.push(...AstParser.createJsonFromObjectExpression(f, keys => keys.includes('gaugeAddress') && keys.includes('name') && keys.includes('tokenAddresses')));
    });

    const pools = rawPools.map(i => {
      i.stakingRewardAddress = i.gaugeAddress;
      return i;
    });

    const calls = [];

    pools.forEach(myPool => {
      const token = new Web3EthContract(MULTI_REWARD_ABI, myPool.stakingRewardAddress);

      calls.push({
        stakingRewardAddress: myPool.stakingRewardAddress,
        stakingToken: token.methods.lp_token(),
        rewardsToken: '0x73a210637f6F6B7005512677Ba6B3C96bb4AA44B',
        totalSupply: token.methods.totalSupply(),
        decimals: token.methods.decimals(),
      });
    });

    const callsResult = await Utils.multiCall(calls, this.getChain());

    const foo = [];
    callsResult.forEach(i => {
      if (!i.stakingToken) {
        return;
      }

      const h = _.merge(
        _.cloneDeep(pools.find(p => p.stakingRewardAddress === i.stakingRewardAddress)),
        i
      );

      foo.push(h);
    });

    await this.cacheManager.set(cacheKey, foo, {ttl: 60 * 30});

    return foo;
  }

  async getFarms(refresh = false) {
    let cacheKey = `getFarms-v2-${this.getName()}`;

    if (!refresh) {
      const cache = await this.cacheManager.get(cacheKey);
      if (cache) {
        return cache;
      }
    }

    const rawFarms = await this.getRawFarms();
    const lbPrices = await this.getLbPrices(refresh);

    const calls = [];

    Object.values(rawFarms).forEach(c => {
      if (!c.stakingToken || !c.stakingRewardAddress) {
        return;
      }

      const contract = new Web3EthContract(ERC20_ABI, c.stakingToken);

      calls.push({
        stakingRewardAddress: c.stakingRewardAddress.toLowerCase(),
        balanceOf: contract.methods.balanceOf(c.stakingRewardAddress),
        decimals: contract.methods.decimals(),
      });
    });

    const callsTvl = await Utils.multiCallIndexBy('stakingRewardAddress', calls, this.getChain());

    const farms = [];

    rawFarms.forEach(farm => {
      let id = crypto.createHash('md5')
        .update(farm.stakingRewardAddress.toLowerCase())
        .digest('hex');

      let info = farm;

      let lpAddress = undefined;

      let symbol = undefined;

      // resolve: lp pools
      if (info && info.stakingToken) {
        symbol = this.liquidityTokenCollector.getSymbolNames(info.stakingToken);
        if (symbol) {
          lpAddress = info.stakingToken;
        }
      }

      if (!symbol && info.name) {
        symbol = info.name.replace('Pool', '').trim();
      }

      if (!symbol) {
        symbol = '?';
      }

      const item = {
        id: `${this.getName()}_${id}`,
        name: symbol,
        token: symbol.toLowerCase().replace(/(\s+\(.*\))/i, '').trim().toLowerCase(),
        provider: this.getName(),
        has_details: true,
        raw: Object.freeze(farm),
        extra: {},
        chain: this.getChain(),
        platform: 'mobius',
        main_platform: 'mobius',
      };

      item.extra.transactionAddress = farm.stakingRewardAddress;
      item.extra.transactionToken = info.stakingToken;

      if (lpAddress) {
        item.extra.lpAddress = item.extra.transactionToken;
      }

      item.earn = [info.rewardsToken, info.rewardsToken0, info.rewardsToken1, info.rewardsToken2]
        .filter(r => r)
        .map(address => ({
          'address': address.toLowerCase(),
          'symbol': this.tokenCollector.getSymbolByAddress(address) || '?',
          'decimals': this.tokenCollector.getDecimals(address),
        }));

      item.earns = item.earn.map(r => r.symbol);

      if (farm.totalSupply && farm.decimals) {
        item.tvl = {
          amount: farm.totalSupply / (10 ** farm.decimals)
        };

        const price = lbPrices[farm.stakingToken.toLowerCase()];

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

  async getAddressInfo(address, fetchRewards = false) {
    let cacheKey = `getAddressInfo-${this.getName()}-${address}-${fetchRewards}`;

    const cache = await this.cacheManager.get(cacheKey);
    if (cache) {
      return cache;
    }

    const pools = await this.getFarms();

    const tokenCalls = pools.map(myPool => {
      const token = new Web3EthContract(MULTI_REWARD_ABI, myPool.raw.stakingRewardAddress);

      const newVar = {
        id: myPool.id,
        balanceOf: token.methods.balanceOf(address),
        rewards: token.methods.claimable_tokens(address),
      };

      if (fetchRewards) {
        if (myPool.raw?.info?.rewardsToken0) {
          newVar.externalRewards0 = token.methods.externalRewards(address, myPool.raw.info.rewardsToken0);
        }

        if (myPool.raw?.info?.rewardsToken1) {
          newVar.externalRewards1 = token.methods.externalRewards(address, myPool.raw.info.rewardsToken1);
        }

        if (myPool.raw?.info?.rewardsToken2) {
          newVar.externalRewards2 = token.methods.externalRewards(address, myPool.raw.info.rewardsToken2);
        }
      }

      return newVar;
    });

    const calls = await Utils.multiCall(tokenCalls, this.getChain());

    const result = calls.filter(v =>
      new BigNumber(v.balanceOf).isGreaterThan(0) ||
      new BigNumber(v.rewards || 0).isGreaterThan(0)
    );

    await this.cacheManager.set(cacheKey, result, {ttl: 60 * 5});

    return result;
  }

  async getAddressFarms(address) {
    let cacheKey = `getAddressFarms-${this.getName()}-${address}`;

    const cache = await this.cacheManager.get(cacheKey);
    if (cache) {
      return cache;
    }

    const calls = await this.getAddressInfo(address);

    const result = calls
      .filter(v => new BigNumber(v.balanceOf).isGreaterThan(0) || new BigNumber(v.rewards || 0).isGreaterThan(0))
      .map(v => v.id);

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
    const calls = (await this.getAddressInfo(address, true))
      .filter(c => addressFarms.includes(c.id));

    const lpPrices = await this.getLbPrices();

    const results = [];
    calls.forEach(call => {
      const farm = farms.find(f => f.id === call.id);

      const result = {
        farm: farm
      };

      let depositDecimals = farm.extra.transactionToken ? this.tokenCollector.getDecimals(farm.extra.transactionToken) : 18;
      result.deposit = {
        symbol: "?",
        amount: call.balanceOf / (10 ** depositDecimals)
      };

      if (farm.extra.transactionToken && lpPrices[farm.extra.transactionToken.toLowerCase()]) {
        const price = lpPrices[farm.extra.transactionToken.toLowerCase()];
        if (price) {
          result.deposit.usd = result.deposit.amount * price;
        }
      }

      const rewards = [];

      [call.rewards, call.externalRewards0, call.externalRewards1, call.externalRewards2]
        .forEach((value, index) => {
          if (!value || !new BigNumber(value).isGreaterThan(0) || !farm.earn[index]) {
            return;
          }

          const reward = {
            symbol: farm.earn[index].symbol,
            amount: call.rewards / (10 ** farm.earn[index].decimals)
          };

          const price = this.priceOracle.findPrice(farm.earn[index].address);
          if (price) {
            reward.usd = reward.amount * price;
          }

          // ignore reward dust
          if (reward.usd && reward.usd < 0.01 && result.deposit <= 0) {
            return;
          }

          rewards.push(reward);
        });

      if (rewards.length > 0) {
        result.rewards = rewards;
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
    return 'mobius';
  }

  getChain() {
    return 'celo';
  }
}