const coins = {};

module.exports = [{
  dataIndex: 0,
  id: '2pool',
  name: '2pool',
  lpTokenInfo: {
    name: '2Curve',
    symbol: '2Crv',
  },
  assets: 'DAI+USDC',
  coins: [
    coins.dai,
    coins.usdc,
  ],
  addresses: {
    swap: '0x27e611fd27b276acbd5ffd632e5eaebec9761e40',
    lpToken: '0x27e611fd27b276acbd5ffd632e5eaebec9761e40',
    gauge: '0x8866414733F22295b7563f9C5299715D2D76CAf4', // Unused
    old_gauge: '0x0a53FaDa2d943057C47A301D25a4D9b3B8e01e8E',
  },
  gaugeVersion: 3, // No CRV rewards
  additionalRewards: [{
    key: 'CRV2POOL',
    name: 'CRV',
    amountDataKey: 'crvRewards',
    rewardTokenAddress: '0x1E4F97b9f9F913c46F1632781732927B9019C68b',
    rewardTokenDecimals: 18,
    rewardContract: '0xb9c05b8ee41fdcbd9956114b3af15834fdedcb54',
    rewardTokenCoingeckoId: 'curve-dao-token',
  },{
    key: 'FTM2POOL',
    name: 'wFTM',
    amountDataKey: 'ftmRewards',
    rewardTokenAddress: '0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83',
    rewardTokenDecimals: 18,
    rewardContract: '0xb9c05b8ee41fdcbd9956114b3af15834fdedcb54',
    rewardTokenCoingeckoId: 'fantom',
  }],
  hasNoCRVRewards: true,
  hasGauge: true
}, {
  dataIndex: 1,
  id: 'fusdt',
  name: 'fUSDT',
  lpTokenInfo: {
    name: 'fusdtCurve',
    symbol: 'fusdtCrv',
  },
  coingeckoInfo: {
    id: 'tether',
    symbol: 'USDT',
  },
  assets: 'fUSDT+2pool',
  isMetaPool: true,
  coins: [
    coins.fusdt,
    coins.twocrv,
  ],
  metaCoins: [
    coins.dai,
    coins.usdc,
  ],
  addresses: {
    swap: '0x92d5ebf3593a92888c25c0abef126583d4b5312e',
    lpToken: '0x92d5ebf3593a92888c25c0abef126583d4b5312e',
    gauge: '0x06e3C4da96fd076b97b7ca3Ae23527314b6140dF',
    old_gauge: '0x4f3E8F405CF5aFC05D68142F3783bDfE13811522',
    deposit: '0xa42bd395f183726d1a8774cfa795771f8acfd777',
  },
  oldAdditionalRewards: [{
    name: 'CRV',
    amountDataKey: 'crvRewards',
    rewardTokenAddress: '0x1E4F97b9f9F913c46F1632781732927B9019C68b',
    rewardTokenDecimals: 18,
    rewardTokenCoingeckoId: 'curve-dao-token',
  },{
    name: 'wFTM',
    amountDataKey: 'ftmRewards',
    rewardTokenAddress: '0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83',
    rewardTokenDecimals: 18,
    rewardTokenCoingeckoId: 'fantom',
  }],
  gaugeVersion: 3, // No CRV rewards
  hasNoCRVRewards: true,
  hasGauge: true

}, {

  dataIndex: 2,
  id: 'ren',
  name: 'ren',
  lpTokenInfo: {
    name: 'renCurve',
    symbol: 'renCrv',
  },
  coingeckoInfo: {
    id: 'renbtc',
    symbol: 'RENBTC',
    referenceAssetId: 'bitcoin',
  },
  assets: 'wBTC+renBTC',
  coins: [
    coins.wbtc,
    coins.renbtc,
  ],
  addresses: {
    swap: '0x3eF6A01A0f81D6046290f3e2A8c5b843e738E604',
    lpToken: '0x5B5CFE992AdAC0C9D48E05854B2d91C73a003858',
    gauge: '0xBdFF0C27dd073C119ebcb1299a68A6A92aE607F0',
    old_gauge: '0x6600e98b71dabfD4A8Cac03b302B0189Adb86Afb'
  },
  gaugeVersion: 3, // No CRV rewards
  hasNoCRVRewards: true,
  additionalRewards: [{
    key: 'CRVREN',
    name: 'CRV',
    amountDataKey: 'crvRenRewards',
    rewardTokenAddress: '0x1E4F97b9f9F913c46F1632781732927B9019C68b',
    rewardTokenDecimals: 18,
    rewardTokenCoingeckoId: 'curve-dao-token',
    rewardContract: '0xfdb129ea4b6f557b07bcdcede54f665b7b6bc281'
  },{
    key: 'FTMREN',
    name: 'wFTM',
    amountDataKey: 'ftmRewards',
    rewardTokenAddress: '0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83',
    rewardTokenDecimals: 18,
    rewardContract: '0xfdb129ea4b6f557b07bcdcede54f665b7b6bc281',
    rewardTokenCoingeckoId: 'fantom',
  }],
},
  {
    dataIndex: 3,
    id: 'tricrypto',
    name: 'tricrypto',
    lpTokenInfo: {
      name: '3CrvCrypto',
      symbol: '3CrvCrypto',
    },
    assets: 'usdt+eth+wbtc',
    coins: [
      coins.fusdt,
      coins.wbtc,
      coins.eth,
    ],
    addresses: {
      swap: '0x3a1659Ddcf2339Be3aeA159cA010979FB49155FF',
      lpToken: '0x58e57cA18B7A47112b877E31929798Cd3D703b0f',
      gauge: '0x00702BbDEaD24C40647f235F15971dB0867F6bdB',
    },
    gaugeVersion: 3, // No CRV rewards
    hasNoCRVRewards: true,
    cryptoPool: true,
    additionalRewards: [{
      key: 'CRVTRICRYPTO',
      name: 'CRV',
      amountDataKey: 'crvRenRewards',
      rewardTokenAddress: '0x1E4F97b9f9F913c46F1632781732927B9019C68b',
      rewardTokenDecimals: 18,
      rewardTokenCoingeckoId: 'curve-dao-token',
      rewardContract: '0x260e4fbb13dd91e187ae992c3435d0cf97172316'
    },{
      key: 'FTMTRICRYPTO',
      name: 'wFTM',
      amountDataKey: 'ftmRewards',
      rewardTokenAddress: '0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83',
      rewardTokenDecimals: 18,
      rewardContract: '0x260e4fbb13dd91e187ae992c3435d0cf97172316',
      rewardTokenCoingeckoId: 'fantom',
    }],
  },
  {
    dataIndex: 4,
    id: 'ib',
    name: 'ironbank',
    lpTokenInfo: {
      name: 'ibCurve',
      symbol: 'ib3Crv',
    },
    coingeckoInfo: {
      id: 'cream-2',
      symbol: 'CREAM',
    },
    assets: 'cyDAI+cyUSDC+cyUSDT',
    coins: [
      coins.cydai,
      coins.cyusdc,
      coins.cyusdt,
    ],
    underlyingCoins: [
      coins.dai,
      coins.usdc,
      coins.fusdt,
    ],
    isLendingPool: true,
    isModernLendingPool: true,
    addresses: {
      swap: '0x4FC8D635c3cB1d0aa123859e2B2587d0FF2707b1',
      lpToken: '0xDf38ec60c0eC001142a33eAa039e49E9b84E64ED',
      gauge: '0xDee85272EAe1aB4afBc6433F4d819BaBC9c7045A',
    },
    gaugeVersion: 3, // No CRV rewards
    hasNoCRVRewards: true,
  },
  {
    dataIndex: 5,
    id: 'geist',
    name: 'geist',
    lpTokenInfo: {
      name: 'geistCurve',
      symbol: 'g3Crv',
    },
    coingeckoInfo: {
      id: 'geist-finance',
      symbol: 'GEIST',
    },
    assets: 'gDAI+gUSDC+gUSDT',
    coins: [
      coins.gdai,
      coins.gusdc,
      coins.gusdt,
    ],
    underlyingCoins: [
      coins.dai,
      coins.usdc,
      coins.fusdt,
    ],
    isLendingPool: true,
    isModernLendingPool: true,
    addresses: {
      swap: '0x0fa949783947Bf6c1b171DB13AEACBB488845B3f',
      lpToken: '0xD02a30d33153877BC20e5721ee53DeDEE0422B2F',
      gauge: '0xd4F94D0aaa640BBb72b5EEc2D85F6D114D81a88E',
    },
    gaugeVersion: 3, // No CRV rewards
    additionalRewards: [{
      key: 'GEISTGEIST',
      name: 'GEIST',
      rewardTokenCoingeckoId: 'geist-finance',
      rewardTokenDecimals: 18,
      rewardTokenAddress: '0xd8321aa83fb0a4ecd6348d4577431310a6e0814d',
      rewardContract: '0xd4f94d0aaa640bbb72b5eec2d85f6d114d81a88e'
    },
      {
        key: 'CRVGEIST',
        name: 'CRV',
        amountDataKey: 'crvRewards',
        rewardTokenAddress: '0x1E4F97b9f9F913c46F1632781732927B9019C68b',
        rewardTokenDecimals: 18,
        rewardTokenCoingeckoId: 'curve-dao-token',
        rewardContract: '0xfE1A3dD8b169fB5BF0D5dbFe813d956F39fF6310'
      },{
        key: 'FTMGEIST',
        name: 'wFTM',
        amountDataKey: 'ftmRewards',
        rewardTokenAddress: '0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83',
        rewardTokenDecimals: 18,
        rewardContract: '0xfE1A3dD8b169fB5BF0D5dbFe813d956F39fF6310',
        rewardTokenCoingeckoId: 'fantom',
      }],
    hasNoCRVRewards: true,
  },
];
