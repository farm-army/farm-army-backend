const Utils = require("../utils");
const Web3EthContract = require("web3-eth-contract");

const TokenABI = require("./abi/abiToken.json");
const ErcAbi = require("./abi/abiErc.json");

const _ = require("lodash");

class PoolInfo {
  constructor(pid, input, methods) {
    this.pid = pid;
    this.input = input;
    this.methods = methods;
  }

  appendInput(input, method) {
    this.input.push(input);
    this.methods.push(method);
  }

  getPid() {
    return this.pid;
  }

  getLpToken() {
    for (const name of this.methods) {
      if (name.toLowerCase() === 'lptoken' || name.toLowerCase() === 'want') {
        return this.input[this.methods.indexOf(name)];
      }
    }

    if (this.input[0] && this.input[0].startsWith('0x')) {
      return this.input[0];
    }

    for (const object of this.methods) {
      const index = this.methods.indexOf(object);

      if (this.input[index] && this.input[index].startsWith('0x')) {
        return this.input[index];
      }
    }

    return undefined
  }

  getNormalized() {
    const result = {
      lpToken: undefined,
      allocPoint: undefined,
      lastRewardBlock: undefined,
      accCakePerShare: undefined,
      strategy: undefined,
      tvl: undefined,
    }

    if (this.input[0] && this.input[0].startsWith('0x')) {
      result.lpToken = this.input[0];
    }

    for (const name of this.methods) {
      if (name.toLowerCase() === 'lptoken' || name.toLowerCase() === 'want' || name.toLowerCase() === 'staketoken') {
        result.lpToken = this.input[this.methods.indexOf(name)];
      } else if (name.toLowerCase() === 'allocpoint') {
        result.allocPoint = this.input[this.methods.indexOf(name)];
      } else if (name.toLowerCase() === 'lastrewardblock') {
        result.lastRewardBlock = this.input[this.methods.indexOf(name)];
      } else if (name.toLowerCase().match(/acc.*per\w+/i)) {
        result.accCakePerShare = this.input[this.methods.indexOf(name)];
      } else if (name.toLowerCase() === 'lastrewardtime') {
        result.lastRewardTime = this.input[this.methods.indexOf(name)];
      } else if (name.toLowerCase() === 'strat') {
        result.strategy = this.input[this.methods.indexOf(name)];
      } else if (name.toLowerCase() === 'totalstake') {
        result.tvl = this.input[this.methods.indexOf(name)];
      }
    }

    return result;
  }
}

module.exports = class FarmFetcher {
  constructor(contractAbiFetcher) {
    this.contractAbiFetcher = contractAbiFetcher;
  }

  extractFunctionsFromAbi(abi) {
    const poolInfoFunction = abi.find(f => f.name && f.type === 'function' && f.name && (f.name.toLowerCase().startsWith('poolinfo') || f.name.toLowerCase().startsWith('getpoolinfo')));
    const poolInfoFunctionName = poolInfoFunction.name;

    let rewardTokenFunctionName = undefined;
    const pendingFunction = abi.find(f => f.name && f.type === 'function' && f.name && f.name.toLowerCase() !== 'pendingowner' && f.name.toLowerCase() !== 'pendingadmin' && f.name.toLowerCase().startsWith('pending'));
    if (pendingFunction && pendingFunction.name) {
      const pendingFunctionName = pendingFunction.name;

      const pendingFunc = pendingFunctionName.replace('pending', '').toLowerCase();
      if (pendingFunc.length > 0) {
        const func = abi.find(f => f.name && f.type === 'function' && f.name && (f.name.toLowerCase() === pendingFunc || f.name.toLowerCase() === pendingFunc + 'token'));
        if (func && func.name) {
          rewardTokenFunctionName = func.name;
        }
      }
    }

    // same have a "st" or "erc20" method
    if (!rewardTokenFunctionName) {
      const stFunction = abi.find(f => f.name && f.type === 'function' && f.name && (f.name.toLowerCase() === 'st' || f.name.toLowerCase() === 'erc20' || f.name.toLowerCase() === 'earningtoken'));
      if (stFunction && stFunction.outputs && stFunction.outputs[0] && stFunction.outputs[0].type === 'address') {
        rewardTokenFunctionName = stFunction.name
      }
    }

    // multiplier
    let multiplierFunctionName = undefined;
    const multiplierFunction = abi.find(f => f.name && f.type === 'function' && f.name && f.name.toLowerCase().includes('multiplier') && f.inputs.length === 2);
    if (multiplierFunction && multiplierFunction.name) {
      multiplierFunctionName = multiplierFunction.name;
    }

    // tokenPerBlock
    let tokenPerBlockFunctionName = undefined;
    const tokenPerBlockFunction = abi.find(f => f.name && f.type === 'function' && f.name && !f.name.includes('DevPerBlock') && f.name.toLowerCase().includes('perblock') && f.inputs.length === 0);
    if (tokenPerBlockFunction && tokenPerBlockFunction.name) {
      tokenPerBlockFunctionName = tokenPerBlockFunction.name;
    }

    // tokenPerBlock
    let tokenPerSecondFunctionName = undefined;
    const tokenPerSecondFunction = abi.find(f => f.name && f.type === 'function' && f.name && f.name.toLowerCase().includes('persecond') && f.inputs.length === 0);
    if (tokenPerSecondFunction && tokenPerSecondFunction.name) {
      tokenPerSecondFunctionName = tokenPerSecondFunction.name;
    }

    // totalAllocPoint
    let totalAllocPointFunctionName = undefined;
    const totalAllocPointFunction = abi.find(f => f.name && f.type === 'function' && f.name && f.name.toLowerCase().includes('totalallocpoint'));
    if (totalAllocPointFunction && totalAllocPointFunction.name) {
      const hasInput = totalAllocPointFunction.inputs && totalAllocPointFunction.inputs.length > 0;

      if (!hasInput) {
        totalAllocPointFunctionName = totalAllocPointFunction.name;
      }
    }

    // poolLength
    let poolLengthFunctionName = undefined;
    const poolLengthFunction = abi.find(f => f.name && f.type === 'function' && f.name && f.name.toLowerCase().startsWith('poollength'));
    if (poolLengthFunction && poolLengthFunction.name) {
      poolLengthFunctionName = poolLengthFunction.name;
    }

    return {
      poolInfoFunctionName: poolInfoFunctionName,
      rewardTokenFunctionName: rewardTokenFunctionName,
      multiplierFunctionName: multiplierFunctionName,
      tokenPerBlockFunctionName: tokenPerBlockFunctionName,
      tokenPerSecondFunctionName: tokenPerSecondFunctionName,
      totalAllocPointFunctionName: totalAllocPointFunctionName,
      poolLengthFunctionName: poolLengthFunctionName,
      pendingRewardsFunctionName: pendingFunction ? pendingFunction.name : undefined,
    }
  }

  async fetchForMasterChef(masterChef, chain = 'bsc', options = {}) {
    return (await this.fetchForMasterChefWithMeta(masterChef, chain, options)).pools || [];
  }

  async fetchForMasterChefWithMeta(masterChef, chain = 'bsc', options = {}) {
    const abi = options.abi
      ? options.abi
      : await this.contractAbiFetcher.getAbiForContractAddress(masterChef, chain, options);

    let {
      poolInfoFunctionName,
      rewardTokenFunctionName,
      multiplierFunctionName,
      tokenPerBlockFunctionName,
      totalAllocPointFunctionName,
      tokenPerSecondFunctionName,
      poolLengthFunctionName,
      pendingRewardsFunctionName
    } = this.extractFunctionsFromAbi(abi);

    if (options.rewardTokenFunctionName) {
      rewardTokenFunctionName = options.rewardTokenFunctionName;
    }

    if (!rewardTokenFunctionName) {
      console.log(`no reward token contract method found for "${masterChef}"`)
    }

    let web3EthContract1 = new Web3EthContract(abi, masterChef);

    let masterInfoCall = {};

    if (rewardTokenFunctionName) {
      masterInfoCall.rewardToken = web3EthContract1.methods[rewardTokenFunctionName]();
    }

    let blockNumber = await Utils.getWeb3(chain).eth.getBlockNumber();

    // multiplier
    if (multiplierFunctionName) {
      masterInfoCall.multiplier = web3EthContract1.methods[multiplierFunctionName](blockNumber, blockNumber + 1);
    }

    // tokenPerBlock
    if (tokenPerBlockFunctionName) {
      masterInfoCall.tokenPerBlock = web3EthContract1.methods[tokenPerBlockFunctionName]();
    }

    // tokenPerBlock
    if (tokenPerSecondFunctionName) {
      masterInfoCall.tokenPerSecond = web3EthContract1.methods[tokenPerSecondFunctionName]();
    }

    // tokenPerBlock
    if (totalAllocPointFunctionName) {
      masterInfoCall.totalAllocPoint = web3EthContract1.methods[totalAllocPointFunctionName]();
    }

    // poolLength
    if (poolLengthFunctionName) {
      masterInfoCall.poolLength = web3EthContract1.methods[poolLengthFunctionName]()
    }

    const masterInfo = await Utils.multiCall([masterInfoCall], chain);
    let poolLength = masterInfo[0].poolLength;

    if (!poolLength) {
      poolLength = await this.findPoolLengthViaPoolInfo(web3EthContract1, poolInfoFunctionName, chain);
    }

    if (!poolLength) {
      console.log('found no poolLength')
      return {};
    }


    // error case when address === 0?
    // fetch all pools
    /*
    const pools2 = await Utils.multiCallRpc([...Array(parseInt(poolLengthCalls[0].poolLength)).keys()].map(id => {
      return {
        reference: id.toString(),
        contractAddress: masterChef,
        abi: abi,
        calls: [
          {
            reference: poolInfoFunctionName,
            method: poolInfoFunctionName,
            parameters: [id]
          }
        ]
      };
    }));
    */

    const poolsRaw = await Utils.multiCall([...Array(parseInt(poolLength)).keys()].map(id => {
      return {
        pid: id.toString(),
        poolInfo: new Web3EthContract(abi, masterChef).methods[poolInfoFunctionName](id),
      };
    }), chain);

    // filter also: "0x0000000000000000000000000000000000000064" but no empty
    const methods = abi.find(f => f.name === poolInfoFunctionName).outputs.map(o => o.name);
    let pools = poolsRaw.map(p => {
      p.poolInfoObject = new PoolInfo(p.pid, Object.values(p.poolInfo).slice(0, -1), methods);
      return p;
    }).filter(p => !p.poolInfoObject.getLpToken() || !p.poolInfoObject.getLpToken().startsWith('0x00000000000000000000'));

    // sushi: enrich lptoken
    const hasLpToken = pools.find(p => p.poolInfoObject.getLpToken());
    if (!hasLpToken) {
      const foo = abi.find(f => f.name && f.name.toLowerCase() === 'lptoken' && f.inputs && f.inputs.length === 1 && f.outputs && f.outputs.length === 1 && f.outputs[0].type === 'address');

      const lpTokens = await Utils.multiCall([...Array(parseInt(poolLength)).keys()].map(id => {
        return {
          pid: id.toString(),
          lptoken: new Web3EthContract(abi, masterChef).methods[foo.name](id),
        };
      }), chain);

      lpTokens.forEach(lpTokenResult => {
        const pool = pools.find(p => p.poolInfoObject.getPid() === lpTokenResult.pid);
        if (pool) {
          pool.poolInfoObject.appendInput(lpTokenResult.lptoken, 'lptoken');
        }
      });
    }

    // lpToken or single token
    let vaultCalls = pools.filter(p => p.poolInfoObject && p.poolInfoObject.getLpToken()).map(p => {
      const lpToken = p.poolInfoObject.getLpToken();

      const web3EthContract = new Web3EthContract(TokenABI, lpToken);

      return {
        pid: p.pid.toString(),
        lpToken: lpToken,
        symbol: web3EthContract.methods.symbol(),
        token0: web3EthContract.methods.token0(),
        token1: web3EthContract.methods.token1(),
      };
    });

    const lpTokens = await Utils.multiCallIndexBy('pid', vaultCalls, chain);

    // resolve token symbols
    const tokenAddresses = [];
    Object.values(lpTokens).forEach(result => {
      if (!result.token0) {
        tokenAddresses.push(result.lpToken);
      } else if (result.token0 && result.token1) {
        tokenAddresses.push(result.token0);
        tokenAddresses.push(result.token1);
      }
    });

    if (masterInfo[0].rewardToken) {
      tokenAddresses.push(masterInfo[0].rewardToken);
    }

    const tokensRaw = await Utils.multiCallIndexBy('token', _.uniq(tokenAddresses).map(token => {
      const web3EthContract = new Web3EthContract(ErcAbi, token);

      return {
        token: token,
        symbol: web3EthContract.methods.symbol(),
        decimals: web3EthContract.methods.decimals(),
      }
    }), chain);

    const tokens = {}
    for (const [key, value] of Object.entries(tokensRaw)) {
      if (value.decimals && value.symbol) {
        tokens[key.toLowerCase()] = value;
      }
    }

    // format items in pancakeswap format
    const all = [];
    pools.forEach(pool => {
      const lpTokenInfo = lpTokens[pool.pid];
      if (!lpTokenInfo) {
        return;
      }

      const isLp = !!lpTokenInfo.token0;

      const poolInfoNormalized = pool.poolInfoObject.getNormalized();
      const {lpToken, allocPoint, lastRewardBlock, accCakePerShare, lastRewardTime} = poolInfoNormalized;

      let lastRewardSecondsAgo = undefined;
      if (lastRewardBlock) {
        lastRewardSecondsAgo = (blockNumber - lastRewardBlock) * Utils.getChainSecondsPerBlock(chain);
      } else if(lastRewardTime && lastRewardTime.length <= 10) {
        lastRewardSecondsAgo = Math.round(new Date().getTime() / 1000) - lastRewardTime
      }

      const item = {
        pid: parseInt(pool.pid),
        lpAddress: pool.poolInfoObject.getLpToken(),
        isTokenOnly: !isLp,
        raw: {
          masterChefAddress: masterChef,
          lpToken: lpToken,
          lpSymbol: lpTokenInfo.symbol,
          allocPoint: allocPoint,
          lastRewardBlock: lastRewardBlock,
          lastRewardSecondsAgo: lastRewardSecondsAgo,
          tokenPerBlock: masterInfo[0].tokenPerBlock,
          tokenPerSecond: masterInfo[0].tokenPerSecond,
          accCakePerShare: accCakePerShare,
          poolInfo: pool.poolInfo,
          poolInfoNormalized: poolInfoNormalized
        }
      };

      if (parseInt(allocPoint) === 0) {
        item.isFinished = true;
      }

      if (parseInt(allocPoint) > 0) {
        const masterInfoCall = masterInfo[0];

        if (masterInfoCall.totalAllocPoint && masterInfoCall.tokenPerBlock) {
          const totalAllocPoint = masterInfoCall.totalAllocPoint;
          const multiplier = masterInfoCall.multiplier || 1;

          const poolBlockRewards = (masterInfoCall.tokenPerBlock * multiplier * allocPoint) / totalAllocPoint;

          const secondsPerBlock = Utils.getChainSecondsPerBlock(chain);
          const secondsPerYear = 31536000;
          item.raw.yearlyRewardsInToken = (poolBlockRewards / secondsPerBlock) * secondsPerYear;
        } else if(masterInfoCall.totalAllocPoint && masterInfoCall.tokenPerSecond) {
          const totalAllocPoint = masterInfoCall.totalAllocPoint;
          const poolSecondsRewards = (masterInfoCall.tokenPerSecond * allocPoint) / totalAllocPoint;

          const secondsPerYear = 31536000;
          item.raw.yearlyRewardsInToken = poolSecondsRewards * secondsPerYear;
        }
      }

      if (!isLp) {
        let token = tokens[pool.poolInfoObject.getLpToken().toLowerCase()];

        if (!token) {
          return;
        }

        item.token = {
          symbol: token.symbol,
          address: pool.poolInfoObject.getLpToken(),
          decimals: parseInt(token.decimals),
        }

        item.raw.tokens = [
          {
            address: pool.poolInfoObject.getLpToken(),
            symbol: token.symbol,
            decimals: parseInt(token.decimals),
          }
        ];
      } else {
        let token0 = tokens[lpTokenInfo.token0.toLowerCase()];
        let token1 = tokens[lpTokenInfo.token1.toLowerCase()];

        if (!token0 || !token1) {
          return;
        }

        item.quoteToken = {
          symbol: token1.symbol,
          address: lpTokenInfo.token1,
          decimals: parseInt(token1.decimals),
        }

        item.token = {
          symbol: token0.symbol,
          address: lpTokenInfo.token0,
          decimals: parseInt(token0.decimals),
        }

        item.raw.tokens = [
          {
            address: lpTokenInfo.token0,
            symbol: token0.symbol,
            decimals: parseInt(token0.decimals),
          },
          {
            address: lpTokenInfo.token1,
            symbol: token1.symbol,
            decimals: parseInt(token1.decimals),
          }
        ];
      }

      item.lpSymbol = item.raw.tokens.map(t => t.symbol.toUpperCase()).join('-');

      if (masterInfo[0].rewardToken && tokens[masterInfo[0].rewardToken.toLowerCase()]) {
        let earnToken = tokens[masterInfo[0].rewardToken.toLowerCase()];

        item.earns = item.raw.earns = [
          {
            address: masterInfo[0].rewardToken,
            symbol: earnToken.symbol,
            decimals: parseInt(earnToken.decimals),
          }
        ]
      }

      all.push(item)
    });

    return {
      abi: abi,
      pools: all,
      methods: {
        pendingRewardsFunctionName: pendingRewardsFunctionName,
      }
    };
  }

  async findPoolLengthViaPoolInfo(web3EthContract, poolInfoFunctionName, chain) {
    const calls = [];

    for(let id = 1; id < 1000; id += 10){
      calls.push({
        pid: id.toString(),
        poolInfo: web3EthContract.methods[poolInfoFunctionName](id),
      });
    }

    const tokensRaw = await Utils.multiCall(calls, chain);

    const results = tokensRaw.filter(p => p.poolInfo).map(p => parseInt(p.pid))
    if (results.length === 0) {
      return undefined;
    }

    return Math.max(...results);
  }
}
