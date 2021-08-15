const assert = require('assert');
const fs = require('fs');

const FarmFetcher = require('../../src/farm/farm_fetcher');

describe('#test farm fetcher for masterchef', function () {
  it('test extraction for pancake abi fixtures', () => {
    const abi = JSON.parse(fs.readFileSync(`${__dirname}/fixtures/pancake-abi.json`, 'utf8'));

    const farmFetcher = new FarmFetcher({});

    assert.deepStrictEqual(farmFetcher.extractFunctionsFromAbi(abi), {
      multiplierFunctionName: 'getMultiplier',
      poolInfoFunctionName: "poolInfo",
      poolLengthFunctionName: "poolLength",
      rewardTokenFunctionName: "cake",
      tokenPerBlockFunctionName: "cakePerBlock",
      totalAllocPointFunctionName: "totalAllocPoint",
      tokenPerSecondFunctionName: undefined,
      pendingRewardsFunctionName: "pendingCake"
    });
  });

  it('test extraction for cheese abi fixtures', () => {
    const abi = JSON.parse(fs.readFileSync(`${__dirname}/fixtures/cheese-abi.json`, 'utf8'));

    const farmFetcher = new FarmFetcher({});

    assert.deepStrictEqual(farmFetcher.extractFunctionsFromAbi(abi), {
      multiplierFunctionName: 'getMultiplier',
      poolInfoFunctionName: "poolInfo",
      poolLengthFunctionName: "poolLength",
      rewardTokenFunctionName: "ccake",
      tokenPerBlockFunctionName: "ccakePerBlock",
      totalAllocPointFunctionName: "totalAllocPoint",
      tokenPerSecondFunctionName: undefined,
      pendingRewardsFunctionName: "pendingCcake"
    });
  });

  it('test extraction for mdex abi fixtures', () => {
    const abi = JSON.parse(fs.readFileSync(`${__dirname}/fixtures/mdex-abi.json`, 'utf8'));

    const farmFetcher = new FarmFetcher({});

    assert.deepStrictEqual(farmFetcher.extractFunctionsFromAbi(abi), {
      multiplierFunctionName: undefined,
      poolInfoFunctionName: "poolInfo",
      poolLengthFunctionName: "poolLength",
      rewardTokenFunctionName: undefined,
      tokenPerBlockFunctionName: "mdxPerBlock",
      totalAllocPointFunctionName: "totalAllocPoint",
      tokenPerSecondFunctionName: undefined,
      pendingRewardsFunctionName: "pending"
    });
  });

  it('test extraction for polar abi fixtures', () => {
    const abi = JSON.parse(fs.readFileSync(`${__dirname}/fixtures/polar-abi.json`, 'utf8'));

    const farmFetcher = new FarmFetcher({});

    assert.deepStrictEqual(farmFetcher.extractFunctionsFromAbi(abi), {
      multiplierFunctionName: 'getMultiplier',
      poolInfoFunctionName: "poolInfo",
      poolLengthFunctionName: "poolLength",
      rewardTokenFunctionName: 'polar',
      tokenPerBlockFunctionName: "polarPerBlock",
      totalAllocPointFunctionName: "totalAllocPoint",
      tokenPerSecondFunctionName: undefined,
      pendingRewardsFunctionName: "pendingPolar"
    });
  });

  it('test extraction for kebab abi fixtures', () => {
    const abi = JSON.parse(fs.readFileSync(`${__dirname}/fixtures/kebab-abi.json`, 'utf8'));

    const farmFetcher = new FarmFetcher({});

    assert.deepStrictEqual(farmFetcher.extractFunctionsFromAbi(abi), {
      multiplierFunctionName: 'getMultiplier',
      poolInfoFunctionName: "poolInfo",
      poolLengthFunctionName: "poolLength",
      rewardTokenFunctionName: 'cake',
      tokenPerBlockFunctionName: "cakePerBlock",
      totalAllocPointFunctionName: "totalAllocPoint",
      tokenPerSecondFunctionName: undefined,
      pendingRewardsFunctionName: "pendingCake"
    });
  });

  it('test extraction for blizzard abi fixtures', () => {
    const abi = JSON.parse(fs.readFileSync(`${__dirname}/fixtures/blizzard-abi.json`, 'utf8'));

    const farmFetcher = new FarmFetcher({});

    assert.deepStrictEqual(farmFetcher.extractFunctionsFromAbi(abi), {
      multiplierFunctionName: 'getMultiplier',
      poolInfoFunctionName: "poolInfo",
      poolLengthFunctionName: "poolLength",
      rewardTokenFunctionName: 'xBLZD',
      tokenPerBlockFunctionName: "xBLZDPerBlock",
      totalAllocPointFunctionName: "totalAllocPoint",
      tokenPerSecondFunctionName: undefined,
      pendingRewardsFunctionName: "pendingxBLZD"
    });
  });

  it('test extraction for kyber abi fixtures', () => {
    const abi = JSON.parse(fs.readFileSync(`${__dirname}/fixtures/kyber-abi.json`, 'utf8'));

    const farmFetcher = new FarmFetcher({});

    assert.deepStrictEqual(farmFetcher.extractFunctionsFromAbi(abi), {
      poolInfoFunctionName: "getPoolInfo",
      rewardTokenFunctionName: undefined,
      poolLengthFunctionName: "poolLength",
      pendingRewardsFunctionName: "pendingRewards",
      totalAllocPointFunctionName: undefined,
      tokenPerSecondFunctionName: undefined,
      tokenPerBlockFunctionName: undefined,
      multiplierFunctionName: undefined,
    });
  });
});