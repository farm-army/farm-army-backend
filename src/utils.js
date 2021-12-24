const request = require("async-request");
const fs = require("fs");
const path = require("path");

const { MultiCall } = require("eth-multicall");
const Web3 = require("web3");
const _ = require("lodash");
const crypto = require("crypto");

const { ethers } = require("ethers");
const { providers } = require("ethers");
const fetch = require("node-fetch");
const AbortController = require("abort-controller");
const walk = require("acorn-walk");
const acorn = require("acorn");
const JSDOM = require("jsdom").JSDOM;
const { MulticallProvider } = require("@0xsequence/multicall").providers;
const HttpsProxyAgent = require('https-proxy-agent');
const {performance} = require("perf_hooks");

const MULTI_CALL_CONTRACT = {
  bsc: '0xB94858b0bB5437498F5453A16039337e5Fdc269C',
  polygon: '0x13E5407E38860A743E025A8834934BEA0264A8c1',
  fantom: '0xe6cd57c490cdc698aa6df974b207c4c044818d5a',
  kcc: '0xae49c2836d060bD7F4ed6566626b52cF4991B172',
  harmony: '0xd1AE3C177E13ac82E667eeEdE2609C98c69FF684',
  celo: '0xfEEaa3989087F2c9eB4e920D57Df0A3F83486414',
  moonriver: '0x814C1C56815D52b58d7254424c15307e7363E016',
  cronos: '0xd1AE3C177E13ac82E667eeEdE2609C98c69FF684',
}

// @TODO: move it to somewhere else
const CONFIG = _.merge(
  JSON.parse(fs.readFileSync(path.resolve(__dirname, "../config.json"), "utf8")),
  fs.existsSync(path.resolve(__dirname, "../config.json.local")) ? JSON.parse(fs.readFileSync(path.resolve(__dirname, "../config.json.local"), "utf8")) : {}
);

const HOSTS = Object.freeze([
  // Recommend
  'https://bsc-dataseed.binance.org/',
  'https://bsc-dataseed1.defibit.io/',
  'https://bsc-dataseed1.ninicoin.io/',

  // Backup
  'https://bsc-dataseed2.defibit.io/',
  'https://bsc-dataseed3.defibit.io/',
  'https://bsc-dataseed4.defibit.io/',
  'https://bsc-dataseed2.ninicoin.io/',
  'https://bsc-dataseed3.ninicoin.io/',
  'https://bsc-dataseed4.ninicoin.io/',
  'https://bsc-dataseed1.binance.org/',
  'https://bsc-dataseed2.binance.org/',
  'https://bsc-dataseed3.binance.org/',
  'https://bsc-dataseed4.binance.org/',
  ...((CONFIG['BSC_RPC'] || '').split(',').map(i => i.trim()).filter(i => i)),
]);

const HOSTS_POLYGON = Object.freeze([
  // Recommend
  'https://polygon-rpc.com/',
  //'https://rpc-mainnet.maticvigil.com',
  //'https://rpc-mainnet.matic.quiknode.pro',
  //'https://matic-mainnet.chainstacklabs.com',
 // 'https://matic-mainnet-full-rpc.bwarelabs.com',
  ...((CONFIG['POLYGON_RPC'] || '').split(',').map(i => i.trim()).filter(i => i)),
]);

const HOSTS_FANTOM = Object.freeze([
  // Recommend
  'https://rpc.ftm.tools',
  //'https://rpcapi.fantom.network',
  ...((CONFIG['FANTOM_RPC'] || '').split(',').map(i => i.trim()).filter(i => i)),
]);

const HOSTS_KCC = Object.freeze([
  // Recommend
  'https://rpc-mainnet.kcc.network',
  ...((CONFIG['KCC_RPC'] || '').split(',').map(i => i.trim()).filter(i => i)),
]);

const HOSTS_HARMONY = Object.freeze([
  // Recommend
  'https://harmony-0-rpc.gateway.pokt.network'
  //'https://api.harmony.one',
  //'https://api.s0.t.hmny.io'
  //'https://s1.api.harmony.one',
  //'https://s2.api.harmony.one',
  //'https://s3.api.harmony.one',
]);

const HOSTS_CELO = Object.freeze([
  'https://forno.celo.org',
  ...((CONFIG['CELO_RPC'] || '').split(',').map(i => i.trim()).filter(i => i)),
]);

const HOSTS_MOONRIVER = Object.freeze([
  'https://rpc.moonriver.moonbeam.network',
  'https://moonriver.api.onfinality.io/public',
  ...((CONFIG['MOONRIVER_RPC'] || '').split(',').map(i => i.trim()).filter(i => i)),
]);

const HOSTS_CRONOS = Object.freeze([
  'https://evm-cronos.crypto.org',
  //'https://cronosrpc-1.xstaking.sg',
  'https://rpc.nebkas.ro/',
  //'http://rpc.nebkas.ro:8545',
  // 'http://cronos.blockmove.eu:8545',
  // 'https://rpc.crodex.app',
  ...((CONFIG['CRONOS_RPC'] || '').split(',').map(i => i.trim()).filter(i => i)),
]);

const WEB3_PROXIES = (CONFIG['WEB3_PROXIES'] || '').split(',').map(i => i.trim()).filter(i => i);

const ENDPOINTS_MULTICALL = {};
const ENDPOINTS_RPC_WRAPPER = {};

HOSTS.forEach(url => {
  [undefined, ...WEB3_PROXIES].forEach((proxy, index) => {
    ENDPOINTS_MULTICALL[url + '_' + index] = new MulticallProvider(
      new providers.StaticJsonRpcProvider({
        url: url,
        timeout: 10000,
      }),
      {
        contract: MULTI_CALL_CONTRACT.fantom,
        batchSize: 50,
        timeWindow: 50,
      }
    );

    const options = {
      keepAlive: true,
      timeout: 10000,
    };

    if (proxy) {
      options.agent = {
        'http': new HttpsProxyAgent(proxy),
        'https': new HttpsProxyAgent(proxy),
      };
    }

    ENDPOINTS_RPC_WRAPPER[url + '_' + index] = new Web3(new Web3.providers.HttpProvider(url, options));
  });
});

const ENDPOINTS = Object.freeze(Object.keys(ENDPOINTS_MULTICALL));

const ENDPOINTS_MULTICALL_POLYGON = {};
const ENDPOINTS_RPC_WRAPPER_POLYGON = {};

HOSTS_POLYGON.forEach(url => {
  [undefined, ...WEB3_PROXIES].forEach((proxy, index) => {
    ENDPOINTS_MULTICALL_POLYGON[url + '_' + index] = new MulticallProvider(
      new providers.StaticJsonRpcProvider({
        url: url,
        timeout: 10000,
      }),
      {
        contract: MULTI_CALL_CONTRACT.polygon,
        batchSize: 50,
        timeWindow: 50,
      }
    );

    const options = {
      keepAlive: true,
      timeout: 10000,
    };

    if (proxy) {
      options.agent = {
        'http': new HttpsProxyAgent(proxy),
        'https': new HttpsProxyAgent(proxy),
      };
    }

    ENDPOINTS_RPC_WRAPPER_POLYGON[url + '_' + index] = new Web3(new Web3.providers.HttpProvider(url, options));
  });
});

const ENDPOINTS_POLYGON = Object.freeze(Object.keys(ENDPOINTS_MULTICALL_POLYGON));

const ENDPOINTS_MULTICALL_FANTOM = {};
const ENDPOINTS_RPC_WRAPPER_FANTOM = {};

HOSTS_FANTOM.forEach(url => {
  [undefined, ...WEB3_PROXIES].forEach((proxy, index) => {
    ENDPOINTS_MULTICALL_FANTOM[url + '_' + index] = new MulticallProvider(
      new providers.StaticJsonRpcProvider({
        url: url,
        timeout: 10000,
      }),
      {
        contract: MULTI_CALL_CONTRACT.fantom,
        batchSize: 50,
        timeWindow: 50,
      }
    );

    const options = {
      keepAlive: true,
      timeout: 10000,
    };

    if (proxy) {
      options.agent = {
        'http': new HttpsProxyAgent(proxy),
        'https': new HttpsProxyAgent(proxy),
      };
    }

    ENDPOINTS_RPC_WRAPPER_FANTOM[url + '_' + index] = new Web3(new Web3.providers.HttpProvider(url, options));
  });
});

const ENDPOINTS_FANTOM = Object.freeze(Object.keys(ENDPOINTS_MULTICALL_FANTOM));

const ENDPOINTS_MULTICALL_KCC = {};
const ENDPOINTS_RPC_WRAPPER_KCC = {};

HOSTS_KCC.forEach(url => {
  [undefined, ...WEB3_PROXIES].forEach((proxy, index) => {
    ENDPOINTS_MULTICALL_KCC[url + '_' + index] = new MulticallProvider(
      new providers.StaticJsonRpcProvider({
        url: url,
        timeout: 10000,
      }),
      {
        contract: MULTI_CALL_CONTRACT.kcc,
        batchSize: 50,
        timeWindow: 50,
      }
    );

    const options = {
      keepAlive: true,
      timeout: 10000,
    };

    if (proxy) {
      options.agent = {
        'http': new HttpsProxyAgent(proxy),
        'https': new HttpsProxyAgent(proxy),
      };
    }

    ENDPOINTS_RPC_WRAPPER_KCC[url + '_' + index] = new Web3(new Web3.providers.HttpProvider(url, options));
  });
});

const ENDPOINTS_KCC = Object.freeze(Object.keys(ENDPOINTS_MULTICALL_KCC));

const ENDPOINTS_MULTICALL_HARMONY = {};
const ENDPOINTS_RPC_WRAPPER_HARMONY = {};

HOSTS_HARMONY.forEach(url => {
  [undefined, ...WEB3_PROXIES].forEach((proxy, index) => {
    ENDPOINTS_MULTICALL_HARMONY[url + '_' + index] = new MulticallProvider(
      new providers.StaticJsonRpcProvider({
        url: url,
        timeout: 10000,
      }),
      {
        contract: MULTI_CALL_CONTRACT.harmony,
        batchSize: 50,
        timeWindow: 50,
      }
    );

    const options = {
      keepAlive: true,
      timeout: 10000,
    };

    if (proxy) {
      options.agent = {
        'http': new HttpsProxyAgent(proxy),
        'https': new HttpsProxyAgent(proxy),
      };
    }

    ENDPOINTS_RPC_WRAPPER_HARMONY[url + '_' + index] = new Web3(new Web3.providers.HttpProvider(url, options));
  });
});

const ENDPOINTS_HARMONY = Object.freeze(Object.keys(ENDPOINTS_MULTICALL_HARMONY));

const ENDPOINTS_MULTICALL_CELO = {};
const ENDPOINTS_RPC_WRAPPER_CELO = {};

HOSTS_CELO.forEach(url => {
  [undefined, ...WEB3_PROXIES].forEach((proxy, index) => {
    ENDPOINTS_MULTICALL_CELO[url + '_' + index] = new MulticallProvider(
      new providers.StaticJsonRpcProvider({
        url: url,
        timeout: 10000,
      }),
      {
        contract: MULTI_CALL_CONTRACT.celo,
        batchSize: 50,
        timeWindow: 50,
      }
    );

    const options = {
      keepAlive: true,
      timeout: 10000,
    };

    if (proxy) {
      options.agent = {
        'http': new HttpsProxyAgent(proxy),
        'https': new HttpsProxyAgent(proxy),
      };
    }

    ENDPOINTS_RPC_WRAPPER_CELO[url + '_' + index] = new Web3(new Web3.providers.HttpProvider(url, options));
  });
});

const ENDPOINTS_CELO = Object.freeze(Object.keys(ENDPOINTS_MULTICALL_CELO));

const ENDPOINTS_MULTICALL_MOONRIVER = {};
const ENDPOINTS_RPC_WRAPPER_MOONRIVER = {};

HOSTS_MOONRIVER.forEach(url => {
  [undefined, ...WEB3_PROXIES].forEach((proxy, index) => {
    ENDPOINTS_MULTICALL_MOONRIVER[url + '_' + index] = new MulticallProvider(
      new providers.StaticJsonRpcProvider({
        url: url,
        timeout: 10000,
      }),
      {
        contract: MULTI_CALL_CONTRACT.moonriver,
        batchSize: 50,
        timeWindow: 50,
      }
    );

    const options = {
      keepAlive: true,
      timeout: 10000,
    };

    if (proxy) {
      options.agent = {
        'http': new HttpsProxyAgent(proxy),
        'https': new HttpsProxyAgent(proxy),
      };
    }

    ENDPOINTS_RPC_WRAPPER_MOONRIVER[url + '_' + index] = new Web3(new Web3.providers.HttpProvider(url, options));
  });
});

const ENDPOINTS_MOONRIVER = Object.freeze(Object.keys(ENDPOINTS_MULTICALL_MOONRIVER));


const ENDPOINTS_MULTICALL_CRONOS = {};
const ENDPOINTS_RPC_WRAPPER_CRONOS = {};

HOSTS_CRONOS.forEach(url => {
  [undefined, ...WEB3_PROXIES].forEach((proxy, index) => {
    ENDPOINTS_MULTICALL_CRONOS[url + '_' + index] = new MulticallProvider(
      new providers.StaticJsonRpcProvider({
        url: url,
        timeout: 10000,
      }),
      {
        contract: MULTI_CALL_CONTRACT.cronos,
        batchSize: 50,
        timeWindow: 50,
      }
    );

    const options = {
      keepAlive: true,
      timeout: 10000,
    };

    if (proxy) {
      options.agent = {
        'http': new HttpsProxyAgent(proxy),
        'https': new HttpsProxyAgent(proxy),
      };
    }

    ENDPOINTS_RPC_WRAPPER_CRONOS[url + '_' + index] = new Web3(new Web3.providers.HttpProvider(url, options));
  });
});

const ENDPOINTS_CRONOS = Object.freeze(Object.keys(ENDPOINTS_MULTICALL_CRONOS));

module.exports = {
  PRICES: {},
  BITQUERY_TRANSACTIONS: fs.readFileSync(
    path.resolve(__dirname, "bitquery/transactions.txt"),
    "utf8"
  ),

  // @TODO: move it to somewhere else
  CONFIG: CONFIG,

  DUST_FILTER: 0.00000000000000000001 * 1e18,


  getWeb3: (chain = 'bsc') => {
    switch (chain) {
      case 'polygon':
        return ENDPOINTS_RPC_WRAPPER_POLYGON[_.shuffle(Object.keys(ENDPOINTS_RPC_WRAPPER_POLYGON))[0]];
      case 'fantom':
        return ENDPOINTS_RPC_WRAPPER_FANTOM[_.shuffle(Object.keys(ENDPOINTS_RPC_WRAPPER_FANTOM))[0]];
      case 'kcc':
        return ENDPOINTS_RPC_WRAPPER_KCC[_.shuffle(Object.keys(ENDPOINTS_RPC_WRAPPER_KCC))[0]];
      case 'harmony':
        return ENDPOINTS_RPC_WRAPPER_HARMONY[_.shuffle(Object.keys(ENDPOINTS_RPC_WRAPPER_HARMONY))[0]];
      case 'celo':
        return ENDPOINTS_RPC_WRAPPER_CELO[_.shuffle(Object.keys(ENDPOINTS_RPC_WRAPPER_CELO))[0]];
      case 'moonriver':
        return ENDPOINTS_RPC_WRAPPER_MOONRIVER[_.shuffle(Object.keys(ENDPOINTS_RPC_WRAPPER_MOONRIVER))[0]];
      case 'cronos':
        return ENDPOINTS_RPC_WRAPPER_CRONOS[_.shuffle(Object.keys(ENDPOINTS_RPC_WRAPPER_CRONOS))[0]];
      case 'bsc':
      default:
        return ENDPOINTS_RPC_WRAPPER[_.shuffle(Object.keys(ENDPOINTS_RPC_WRAPPER))[0]];
    }
  },

  multiCall: async (vaultCalls, chain = 'bsc') => {
    if (vaultCalls.length === 0) {
      return [];
    }

    const promises = [];

    let selectedEndpoints = [];
    switch (chain) {
      case 'polygon':
        selectedEndpoints = ENDPOINTS_POLYGON.slice();
        break;
      case 'fantom':
        selectedEndpoints = ENDPOINTS_FANTOM.slice();
        break;
      case 'kcc':
        selectedEndpoints = ENDPOINTS_KCC.slice();
        break;
      case 'harmony':
        selectedEndpoints = ENDPOINTS_HARMONY.slice();
        break;
      case 'celo':
        selectedEndpoints = ENDPOINTS_CELO.slice();
        break;
      case 'moonriver':
        selectedEndpoints = ENDPOINTS_MOONRIVER.slice();
        break;
      case 'cronos':
        selectedEndpoints = ENDPOINTS_CRONOS.slice();
        break;
      case 'bsc':
      default:
        selectedEndpoints = ENDPOINTS.slice();
    }

    const endpoints = _.shuffle(selectedEndpoints);

    let i = 0;

    const hash = crypto
      .createHash("md5")
      .update(new Date().getTime().toString())
      .digest("hex");

    for (const chunk of _.chunk(vaultCalls, 80)) {
      const endpoint = endpoints[i];

      promises.push(async () => {
        let endpointInner = endpoint;

        let existing = endpoints.slice();

        const done = [];

        let throwIt;
        for (let i = 0; i < 2; i++) {
          if (i > 0) {
            existing = _.shuffle(
              existing.slice().filter(item => item !== endpointInner)
            );
            if (existing.length === 0) {
              console.log("no one left", hash);
              break;
            }

            endpointInner = existing[0];
          }

          const timer = -performance.now();

          try {
            done.push(endpointInner);

            let web3
            if (chain === 'polygon') {
              web3 = ENDPOINTS_RPC_WRAPPER_POLYGON[endpointInner]
            } else if(chain === 'fantom') {
              web3 = ENDPOINTS_RPC_WRAPPER_FANTOM[endpointInner]
            } else if(chain === 'kcc') {
              web3 = ENDPOINTS_RPC_WRAPPER_KCC[endpointInner]
            } else if(chain === 'harmony') {
              web3 = ENDPOINTS_RPC_WRAPPER_HARMONY[endpointInner]
            } else if (chain === 'celo') {
              web3 = ENDPOINTS_RPC_WRAPPER_CELO[endpointInner]
            } else if (chain === 'moonriver') {
              web3 = ENDPOINTS_RPC_WRAPPER_MOONRIVER[endpointInner]
            } else if (chain === 'cronos') {
              web3 = ENDPOINTS_RPC_WRAPPER_CRONOS[endpointInner]
            } else {
              web3 = ENDPOINTS_RPC_WRAPPER[endpointInner]
            }

            const [foo] = await new MultiCall(web3, MULTI_CALL_CONTRACT[chain]).all([chunk]);

            let durationSec = (timer + performance.now()) / 1000;
            if (durationSec > 9.5) {
              console.log(`Slow multicall: ${chain} - ${(durationSec).toFixed(3)} sec - ${endpointInner}`);
            }

            return foo;
          } catch (e) {
            console.error("failed", "multiCall", endpointInner, chunk.length, e.message);

            let durationSec = (timer + performance.now()) / 1000;
            if (durationSec > 9.5) {
              console.log(`Slow multicall: ${chain} - ${(durationSec).toFixed(3)} sec - ${endpointInner}`);
            }

            throwIt = e;
          }
        }

        throw new Error(
          `final error: ${hash} ${endpointInner} ${
            chunk.length
          } ${JSON.stringify(done)} ${throwIt.message.substring(0, 100)}`
        );
      });
    }

    return (await Promise.all(promises.map(fn => fn()))).flat(1);
  },

  multiCallIndexBy: async (index, vaultCalls, chain = 'bsc') => {
    const proms = await module.exports.multiCall(vaultCalls, chain);

    const results = {};

    proms.forEach(c => {
      if (c[index]) {
        results[c[index]] = c;
      }
    });

    return results;
  },

  multiCallRpcIndex: async (calls, chain = 'bsc') => {
    const try1 =  await module.exports.multiCallRpcIndexInner(calls, chain);

    if (try1 === false) {
      console.error('multiCallRpcIndex retry');
      const try2 = await module.exports.multiCallRpcIndexInner(calls, chain);

      if (try2 === false) {
        console.error('multiCallRpcIndex final failed');
        return []
      }

      return try2
    }

    return try1;
  },

  multiCallRpcIndexInner: async (calls, chain = 'bsc') => {
    let selectedEndpoints = [];
    switch (chain) {
      case 'polygon':
        selectedEndpoints = ENDPOINTS_POLYGON.slice();
        break;
      case 'fantom':
        selectedEndpoints = ENDPOINTS_FANTOM.slice();
        break;
      case 'kcc':
        selectedEndpoints = ENDPOINTS_KCC.slice();
        break;
      case 'harmony':
        selectedEndpoints = ENDPOINTS_HARMONY.slice();
        break;
      case 'celo':
        selectedEndpoints = ENDPOINTS_CELO.slice();
        break;
      case 'moonriver':
        selectedEndpoints = ENDPOINTS_MOONRIVER.slice();
        break;
      case 'cronos':
        selectedEndpoints = ENDPOINTS_CRONOS.slice();
        break;
      case 'bsc':
      default:
        selectedEndpoints = ENDPOINTS.slice();
    }

    const endpoints = _.shuffle(selectedEndpoints);

    const promises = [];

    calls.forEach(group => {
      let options;

      if (chain === 'polygon') {
        options = ENDPOINTS_MULTICALL_POLYGON[endpoints[0]];
      } else if (chain === 'fantom') {
        options = ENDPOINTS_MULTICALL_FANTOM[endpoints[0]];
      } else if (chain === 'kcc') {
        options = ENDPOINTS_MULTICALL_KCC[endpoints[0]];
      } else if (chain === 'harmony') {
        options = ENDPOINTS_MULTICALL_HARMONY[endpoints[0]];
      } else if (chain === 'celo') {
        options = ENDPOINTS_MULTICALL_CELO[endpoints[0]];
      } else if (chain === 'bsc') {
        options = ENDPOINTS_MULTICALL[endpoints[0]];
      } else if (chain === 'moonriver') {
        options = ENDPOINTS_MULTICALL_MOONRIVER[endpoints[0]];
      } else if (chain === 'cronos') {
        options = ENDPOINTS_MULTICALL_CRONOS[endpoints[0]];
      } else {
        options = ENDPOINTS_MULTICALL[endpoints[0]];
      }

      const contract = new ethers.Contract(
        group.contractAddress,
        group.abi,
        options
      );

      group.calls.forEach(call => {
        promises.push(
          contract[call.method](...call.parameters).then(r => {
            const reference = call.reference ? call.reference : call.method;

            return {
              reference: group.reference,
              call: [reference, r]
            };
          })
        );
      });
    });

    let results
    try {
      results = await Promise.all([...promises]);
    } catch (e) {
      console.error('failed', 'multiCallRpcIndex', e.message);
      if (e.message && e.message.includes('property \'toHexString\' of undefined')) {
        return false;
      }

      return [];
    }

    // pcIndex Cannot read property 'toHexString' of undefined

    const final = {};
    results.forEach(call => {
      if (!final[call.reference]) {
        final[call.reference] = {
          id: call.reference
        };
      }

      final[call.reference][call.call[0]] = call.call[1];
    });

    return final;
  },

  multiCallRpc: async (calls, chain = 'bsc') => {
    return Object.values(await module.exports.multiCallRpcIndex(calls, chain));
  },

  findYieldForDetails: result => {
    const yieldObject = module.exports.findYieldForDetailsInner(result);

    if (!yieldObject) {
      return undefined;
    }

    if (yieldObject.percent !== undefined && Math.abs(yieldObject.percent) <= 0) {
      return undefined;
    }

    if (yieldObject?.amount && result?.farm?.deposit?.amount && result?.farm?.deposit?.usd) {
      yieldObject.usd = (result.farm.deposit.usd / result.farm.deposit.amount) * yieldObject.amount;
    }

    if (result.lpTokens && result.lpTokens.length > 0 && yieldObject.percent) {
      yieldObject.lpTokens = result.lpTokens.map(token => {
        const newToken = _.cloneDeep(token);

        newToken.amount = (newToken.amount / 100) * yieldObject.percent

        return newToken;
      })
    }

    return yieldObject;
  },

  findYieldForDetailsInner: result => {
    if (
      result.transactions &&
      result.transactions.length > 0 &&
      result.farm &&
      result.farm.deposit &&
      result.farm.deposit.amount
    ) {
      // no withdraw fine
      if (!result.transactions.find(t => t.amount < 0.0)) {
        return module.exports.findYieldForDepositOnly(
          result.farm.deposit.amount,
          result.transactions
        );
      }

      // filter by reset on withdraw below zero
      const filteredTransactions = module.exports.filterNegativeWithdrawResetTransaction(
        result.transactions
      );
      if (
        !filteredTransactions.find(t => t.amount < 0.0) &&
        filteredTransactions.length > 0
      ) {
        return module.exports.findYieldForDepositOnly(
          result.farm.deposit.amount,
          filteredTransactions
        );
      }

      if (filteredTransactions.length > 0) {
        return module.exports.findYieldForMixedTransactions(
          result.farm.deposit.amount,
          filteredTransactions
        );
      }
    }

    return undefined;
  },

  findYieldForDepositOnly: (deposits, transactions) => {
    const transactionDeposit = transactions
      .map(t => t.amount)
      .reduce((a, b) => a + b);

    const yieldAmount = deposits - transactionDeposit;

    return {
      amount: yieldAmount,
      percent: parseFloat(((deposits / transactionDeposit) * 100).toFixed(4)) - 100,
    };
  },

  getTransactionsViaBsc: async (contract, lpAddress, address, chain = 'bsc') => {
    let host;
    let apiKey;

    if (chain === 'bsc') {
      host = 'api.bscscan.com';
      apiKey = module.exports.CONFIG['BSCSCAN_API_KEY'];
    } else if (chain === 'polygon') {
      host = 'api.polygonscan.com';
      apiKey = module.exports.CONFIG['POLYGOnSCAN_API_KEY'];
    } else if (chain === 'fantom') {
      host = 'api.ftmscan.com';
      apiKey = module.exports.CONFIG['FANTOMSCAN_API_KEY'];
    } else if (chain === 'kcc') {
      host = 'api.ftmscan.com';
      apiKey = module.exports.CONFIG['KCCSCAN_API_KEY'];
    } else if (chain === 'harmony') {
      host = 'explorer.harmony.one/';
      apiKey = module.exports.CONFIG['HARMONYSCAN_API_KEY'];
    } else if (chain === 'celo') {
      host = 'explorer.celo.org';
      apiKey = module.exports.CONFIG['CELOSCAN_API_KEY'];
    } else if (chain === 'moonriver') {
      host = 'blockscout.moonriver.moonbeam.network';
      apiKey = module.exports.CONFIG['MOONRIVERSCAN_API_KEY'];
    } else if (chain === 'cronos') {
      host = 'cronos.crypto.org/explorer';
      apiKey = module.exports.CONFIG['CRONOSSCAN_API_KEY'];
    } else {
      host = 'api.bscscan.com';
      apiKey = module.exports.CONFIG['BSCSCAN_API_KEY'];
    }

    const url =
      "https://%host%/api?module=account&action=tokentx&contractaddress=%contractaddress%&address=%address%&page=1&sort=asc&apikey=%apikey%";

    const myUrl = url
      .replace("%host%", host)
      .replace("%contractaddress%", lpAddress)
      .replace("%address%", address)
      .replace("%apikey%", apiKey);

    let response = {};
    try {
      const responseBody = await request(myUrl);
      response = JSON.parse(responseBody.body);
    } catch (e) {
      console.error(myUrl, e.message);
      return [];
    }

    if (!response.result) {
      return [];
    }

    const transactions = response.result
      .filter(
        t =>
          t.value &&
          t.value > 0 &&
          t.tokenDecimal &&
          (t.to.toLowerCase() === contract.toLowerCase() ||
            t.from.toLowerCase() === contract.toLowerCase())
      )
      .map(t => {
        let amount = t.value / 10 ** t.tokenDecimal;

        if (t.from.toLowerCase() === contract.toLowerCase()) {
          amount = -amount;
        }

        return {
          timestamp: parseInt(t.timeStamp),
          amount: amount,
          hash: t.hash,
        };
      });

    return transactions.sort(function(a, b) {
      return b.timestamp - a.timestamp;
    });
  },

  getTransactions: async (contract, lpAddress, address, chain = 'bsc') => {
    try {
      return await module.exports.getTransactionsViaBsc(
        contract,
        lpAddress,
        address,
        chain
      );
    } catch (e) {
      console.log("transactions failed bsc", e.message);
    }

    if (chain === 'bsc') {
      try {
        return await module.exports.getTransactionsViaBitquery(
          contract,
          lpAddress,
          address
        );
      } catch (e) {
        console.log("transactions retry via bitquery", e.message);
      }

      try {
        return await module.exports.getTransactionsViaBitquery(
          contract,
          lpAddress,
          address
        );
      } catch (e) {
        console.log("transactions retry via bitquery failed also", e.message);
      }
    }


    return [];
  },

  getTransactionsViaBitquery: async (contract, lpAddress, address) => {
    const query = module.exports.BITQUERY_TRANSACTIONS.replace(
      "%address%",
      address
    )
      .replace("%contract%", contract)
      .replace("%lp_address%", lpAddress)
      .replace("%address%", address)
      .replace("%contract%", contract)
      .replace("%lp_address%", lpAddress);

    const controller = new AbortController();
    setTimeout(() => controller.abort(), 11000);

    const opts = {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query
      }),
      signal: controller.signal
    };

    const foo = await fetch("https://graphql.bitquery.io/", opts);
    const data = await foo.json();

    const transactions = [];

    data.data.ethereum.in.forEach(item => {
      transactions.push({
        timestamp: item.block.timestamp.unixtime,
        amount: item.amount,
        hash: item.transaction.hash,
      });
    });

    data.data.ethereum.out.forEach(item => {
      transactions.push({
        timestamp: item.block.timestamp.unixtime,
        amount: -item.amount,
        hash: item.transaction.hash,
      });
    });

    return transactions.sort(function(a, b) {
      return b.timestamp - a.timestamp;
    });
  },

  filterNegativeWithdrawResetTransaction: transactions => {
    const reverse = transactions.slice().reverse();

    let balance = 0;
    let items = [];

    reverse.forEach(t => {
      if (t.amount > 0) {
        items.push(t);
        balance += t.amount;
      }

      if (t.amount < 0) {
        if (balance - Math.abs(t.amount) < 0) {
          balance = 0;
          items = [];
        } else {
          balance -= Math.abs(t.amount);
          items.push(t);
        }
      }
    });

    return items.reverse();
  },

  findYieldForMixedTransactions: (deposits, transactions) => {
    let deposit = 0;
    let withdraw = 0;

    transactions.forEach(t => {
      if (t.amount < 0) {
        withdraw += Math.abs(t.amount);
      } else {
        deposit += t.amount;
      }
    });

    const yieldAmount = deposits - (deposit - withdraw);

    return {
      amount: yieldAmount,
      percent: parseFloat(((deposits / (deposit - withdraw)) * 100).toFixed(4)) - 100,
    };
  },

  /**
   * Also used sometimes
   */
  compoundCommon: (r) => {
    return module.exports.compound(r, 2190, 1, 0.955);
  },

  compound: (r, n = 365, t = 1, c = 1) => {
    return (1 + (r * c) / n) ** (n * t) - 1;
  },

  request: async (method, url, opts, timeout = 25) => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), timeout * 1000);

    opts.method = method;
    opts.signal = controller.signal;

    try {
      return await (await fetch(url, opts)).text();
    } catch (e) {
      console.error('requestGet error: ', url, e.message)
    }

    return undefined;
  },

  requestJsonGet: async (url, timeout = 25, proxy = false) => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), timeout * 1000);

    const opts = {
      method: "GET",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:91.0) Gecko/20100101 Firefox/91.0"
      }
    };

    if (proxy && module.exports.CONFIG['DEFAULT_PROXY']) {
      opts.agent = new HttpsProxyAgent(module.exports.CONFIG['DEFAULT_PROXY']);
    }

    try {
      const foo = await fetch(url, opts);
      return await foo.json();
    } catch (e) {
      console.error('error: ', url, e.message)
    }

    return undefined;
  },

  requestJsonGetRetry: async (url, timeout = 25) => {
    const response = await module.exports.requestJsonGet(url, timeout);
    if (response) {
      return response;
    }

    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    await delay(2000);

    console.log('retry: ', url)

    return module.exports.requestJsonGet(url, timeout);
  },

  requestGet: async (url, timeout = 25) => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), timeout * 1000);

    const opts = {
      method: "GET",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:91.0) Gecko/20100101 Firefox/91.0"
      }
    };

    try {
      const foo = await fetch(url, opts);
      return await foo.text();
    } catch (e) {
      console.error('requestGet error: ', url, e.message)
    }

    return undefined;
  },

  getJavascriptFiles: async (url) => {
    const urlObject = new URL(url);

    let jsdom;
    try {
      jsdom = await JSDOM.fromURL(url);
    } catch (e) {
      console.log(`JSONDOM error: ${url} ${e.message.substring(0, 100)}`)
      return [];
    }
    const document = jsdom.window.document

    const result = document.evaluate("//script", jsdom.window.document, null, jsdom.window.XPathResult.ANY_TYPE, null);

    let node;
    const javascriptFiles = {};
    while (node = result.iterateNext()) {
      const src = node.getAttribute("src");

      if (src) {
        let srcUrl = new URL(src, url);
        if (urlObject.hostname === srcUrl.hostname) {
          javascriptFiles[srcUrl] = await module.exports.requestGet(srcUrl.href);
        }
      }
    }

    return javascriptFiles;
  },

  getPoolsFromJavascript: async (url) => {
    const files = await module.exports.getJavascriptFiles(url);

    const pools = [];

    for (const [file, body] of Object.entries(files)) {
      let node1;

      try {
        node1 = acorn.parse(body, {ecmaVersion: 'latest'});
      } catch (e) {
        console.error('ast error:', url, file, e.message);
        continue;
      }

      walk.simple(node1, {
        ArrayExpression(node) {
          if (node.elements[0] && node.elements[0].properties) {
            const keys = node.elements[0].properties.map(p => (p.key && p.key.name) ? p.key.name.toLowerCase() : '');

            if (keys.includes('contractaddress') && (keys.includes('sousid') || keys.includes('stakingtoken') || keys.includes('stakingtokenname'))) {
              node.elements.forEach(element => {
                if (!element.properties) {
                  return;
                }

                const contractAddressNode = element.properties.find(p => p.key && p.key.name.toLowerCase() === 'contractaddress');
                if (contractAddressNode && contractAddressNode.value && contractAddressNode.value.type === 'ObjectExpression' && contractAddressNode.value.properties) {
                  const contractAddressChain = contractAddressNode.value.properties.find(p => p.key && p.key.value && ['56', '137'].includes(p.key.value.toString()) && p.value && p.value.value && p.value.value.toString().startsWith('0x'));
                  if (contractAddressChain) {
                    pools.push({
                      contractAddress: contractAddressChain.value.value.toString()
                    });
                  }
                }
              })
            }
          }
        }
      });
    }


    return pools;
  },

  getChainSecondsPerBlock: (chain) => {
    switch (chain) {
      case 'polygon':
        return 2.1
      case 'fantom':
        return 1; // its 2 but why everyone use '1'?
      case 'kcc':
        return 3;
      case 'harmony':
        return 2;
      case 'celo':
        return 5;
      case 'moonriver':
        return 13;
      case 'cronos':
        return 5.5;
      case 'bsc':
        return 3;
    }

    throw new Error('Invalid chain: ' + chain);
  },

  convertRcpResultObject: (item) => {
    const result = {};

    Object.entries(item).forEach(value => {
      let valueElement = value[1];

      if (valueElement._isBigNumber === true) {
        valueElement = valueElement.toString();
      }

      result[value[0]] = valueElement;
    });

    return result;
  }
};
