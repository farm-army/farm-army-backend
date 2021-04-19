const request = require("async-request");
const Utils = require("../utils");
const Web3EthContract = require("web3-eth-contract");

const TokenABI = require("./abi/abiToken.json");
const ErcAbi = require("./abi/abiErc.json");

const _ = require("lodash");

module.exports = class FarmFetcher {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  async fetchForMasterChef(masterChef) {
    const text = await request(`https://api.bscscan.com/api?module=contract&action=getabi&address=${masterChef}&apikey=${this.apiKey}`);

    const abi = JSON.parse(JSON.parse(text.body).result);

    const poolInfoFunction = abi.find(f => f.name && f.type === 'function' && f.name && f.name.toLowerCase().startsWith('poolinfo'));
    const poolLengthFunction = abi.find(f => f.name && f.type === 'function' && f.name && f.name.toLowerCase().startsWith('poollength'));

    const poolInfoFunctionName = poolInfoFunction.name;
    const poolLengthFunctionName = poolLengthFunction.name;

    let rewardTokenFunctionName = undefined;
    const pendingFunction = abi.find(f => f.name && f.type === 'function' && f.name && f.name.toLowerCase().startsWith('pending'));
    if (pendingFunction.name) {
      const pendingFunctionName = pendingFunction.name;

      const func = abi.find(f => f.name && f.type === 'function' && f.name && f.name.toLowerCase() === pendingFunctionName.replace('pending', '').toLowerCase());
      if (func.name) {
        rewardTokenFunctionName = func.name;
      }
    }

    if (!rewardTokenFunctionName) {
      console.log('no reward token contract method found')
    }

    let web3EthContract1 = new Web3EthContract(abi, masterChef);
    let masterInfoCall = {
      poolLength: web3EthContract1.methods[poolLengthFunctionName](),
    };

    if (rewardTokenFunctionName) {
      masterInfoCall.rewardToken = web3EthContract1.methods[rewardTokenFunctionName]();
    }

    const masterInfo = await Utils.multiCall([masterInfoCall]);

    if (!masterInfo[0].poolLength) {
      console.log('found not poolLength')
      process.exit();
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

    const pools = await Utils.multiCall([...Array(parseInt(masterInfo[0].poolLength)).keys()].map(id => {
      return {
        pid: id.toString(),
        poolInfo: new Web3EthContract(abi, masterChef).methods[poolInfoFunctionName](id),
      };
    }));

    // lpToken or single token
    const lpTokens = await Utils.multiCallIndexBy('pid', pools.filter(p => p.poolInfo && p.poolInfo[0]).map(p => {
      const [lpToken, allocPoint, lastRewardBlock, accCakePerShare] = Object.values(p.poolInfo);

      const web3EthContract = new Web3EthContract(TokenABI, lpToken);

      return {
        pid: p.pid.toString(),
        lpToken: lpToken,
        symbol: web3EthContract.methods.symbol(),
        token0: web3EthContract.methods.token0(),
        token1: web3EthContract.methods.token1(),
      };
    }));

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
    }));

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
      const [lpToken, allocPoint, lastRewardBlock, accCakePerShare] = Object.values(pool.poolInfo);

      const item = {
        pid: parseInt(pool.pid),
        lpAddress: pool.poolInfo[0],
        isTokenOnly: !isLp,
        raw: {
          masterChefAddress: masterChef,
          lpToken: lpToken,
          lpSymbol: lpTokenInfo.symbol,
          allocPoint: allocPoint,
          lastRewardBlock: lastRewardBlock,
          accCakePerShare: accCakePerShare,
        }
      };

      if (parseInt(allocPoint) === 0) {
        item.isFinished = true;
      }

      if (!isLp) {
        let token = tokens[pool.poolInfo[0].toLowerCase()];

        if (!token) {
          return;
        }

        item.token = {
          symbol: token.symbol,
          address: pool.poolInfo[0],
          decimals: parseInt(token.decimals),
        }

        item.raw.tokens = [
          {
            address: pool.poolInfo[0],
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

      if (masterInfo[0].rewardToken && tokens[masterInfo[0].rewardToken]) {
        let earnToken = tokens[masterInfo[0].rewardToken];

        item.raw.earns = [
          {
            address: masterInfo[0].rewardToken,
            symbol: earnToken.symbol,
            decimals: parseInt(earnToken.decimals),
          }
        ]
      }

      all.push(item)
    });

    return all;
  }
}
