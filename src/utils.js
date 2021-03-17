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
const { MulticallProvider } = require("@0xsequence/multicall").providers;

const ENDPOINTS_MULTICALL = {
  // Recommend
  "https://bsc-dataseed.binance.org/": new MulticallProvider(
    new providers.JsonRpcProvider("https://bsc-dataseed.binance.org/"),
    {
      contract: module.exports.MULTI_CALL_CONTRACT,
      timeWindow: "15"
    }
  ),
  "https://bsc-dataseed1.defibit.io/": new MulticallProvider(
    new providers.JsonRpcProvider("https://bsc-dataseed1.defibit.io/"),
    {
      contract: module.exports.MULTI_CALL_CONTRACT,
      timeWindow: "15"
    }
  ),
  "https://bsc-dataseed1.ninicoin.io/": new MulticallProvider(
    new providers.JsonRpcProvider("https://bsc-dataseed1.ninicoin.io/"),
    {
      contract: module.exports.MULTI_CALL_CONTRACT,
      timeWindow: "15"
    }
  ),

  // Backups
  "https://bsc-dataseed2.defibit.io/": new MulticallProvider(
    new providers.JsonRpcProvider("https://bsc-dataseed2.defibit.io/"),
    {
      contract: module.exports.MULTI_CALL_CONTRACT,
      timeWindow: "15"
    }
  ),
  "https://bsc-dataseed3.defibit.io/": new MulticallProvider(
    new providers.JsonRpcProvider("https://bsc-dataseed3.defibit.io/"),
    {
      contract: module.exports.MULTI_CALL_CONTRACT,
      timeWindow: "15"
    }
  ),
  "https://bsc-dataseed4.defibit.io/": new MulticallProvider(
    new providers.JsonRpcProvider("https://bsc-dataseed4.defibit.io/"),
    {
      contract: module.exports.MULTI_CALL_CONTRACT,
      timeWindow: "15"
    }
  ),
  "https://bsc-dataseed2.ninicoin.io/": new MulticallProvider(
    new providers.JsonRpcProvider("https://bsc-dataseed2.ninicoin.io/"),
    {
      contract: module.exports.MULTI_CALL_CONTRACT,
      timeWindow: "15"
    }
  ),
  "https://bsc-dataseed3.ninicoin.io/": new MulticallProvider(
    new providers.JsonRpcProvider("https://bsc-dataseed3.ninicoin.io/"),
    {
      contract: module.exports.MULTI_CALL_CONTRACT,
      timeWindow: "15"
    }
  ),
  "https://bsc-dataseed4.ninicoin.io/": new MulticallProvider(
    new providers.JsonRpcProvider("https://bsc-dataseed4.ninicoin.io/"),
    {
      contract: module.exports.MULTI_CALL_CONTRACT,
      timeWindow: "15"
    }
  )
};

const ENDPOINTS = Object.keys(ENDPOINTS_MULTICALL);

const ENDPOINTS_RPC_WRAPPER = {
  // Recommend
  "https://bsc-dataseed.binance.org/": new Web3(
    "https://bsc-dataseed.binance.org/"
  ),
  "https://bsc-dataseed1.defibit.io/": new Web3(
    "https://bsc-dataseed1.defibit.io/"
  ),
  "https://bsc-dataseed1.ninicoin.io/": new Web3(
    "https://bsc-dataseed1.ninicoin.io/"
  ),

  // Backups
  "https://bsc-dataseed2.defibit.io/": new Web3(
    "https://bsc-dataseed2.defibit.io/"
  ),
  "https://bsc-dataseed3.defibit.io/": new Web3(
    "https://bsc-dataseed3.defibit.io/"
  ),
  "https://bsc-dataseed4.defibit.io/": new Web3(
    "https://bsc-dataseed4.defibit.io/"
  ),

  "https://bsc-dataseed2.ninicoin.io/": new Web3(
    "https://bsc-dataseed2.ninicoin.io/"
  ),
  "https://bsc-dataseed3.ninicoin.io/": new Web3(
    "https://bsc-dataseed3.ninicoin.io/"
  ),
  "https://bsc-dataseed4.ninicoin.io/": new Web3(
    "https://bsc-dataseed4.ninicoin.io/"
  )
};

let allApys = {};

module.exports = {
  PRICES: {},
  MULTI_CALL_CONTRACT: "0xB94858b0bB5437498F5453A16039337e5Fdc269C",
  BITQUERY_TRANSACTIONS: fs.readFileSync(
    path.resolve(__dirname, "bitquery/transactions.txt"),
    "utf8"
  ),
  erc20ABI: JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "platforms/pancake/abi/erc20.json"), "utf8")
  ),

  // @TODO: move it to somewhere else
  CONFIG: _.merge(
      JSON.parse(fs.readFileSync(path.resolve(__dirname, "../config.json"), "utf8")),
      fs.existsSync(path.resolve(__dirname, "../config.json.local")) ? JSON.parse(fs.readFileSync(path.resolve(__dirname, "../config.json.local"), "utf8")) : {}
  ),

  DUST_FILTER: 0.00000000001 * 1e18,


  getWeb3: () => {
    return ENDPOINTS_RPC_WRAPPER[_.shuffle(Object.keys(ENDPOINTS_RPC_WRAPPER))[0]];
  },

  multiCall: async vaultCalls => {
    if (vaultCalls.length === 0) {
      return [];
    }

    const promises = [];
    const endpoints = _.shuffle(ENDPOINTS.slice());

    let i = 0;
    const max = endpoints.length;

    const hash = crypto
      .createHash("md5")
      .update(new Date().getTime().toString())
      .digest("hex");
    // console.log('chunks', hash, vaultCalls.length, 'to ' + max);

    for (const chunk of _.chunk(vaultCalls, 80)) {
      const endpoint = endpoints[i];

      promises.push(async () => {
        let endpointInner = endpoint;

        let existing = endpoints.slice();

        const done = [];

        let throwIt;
        for (let i = 0; i < 5; i++) {
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

          try {
            done.push(endpointInner);

            const [foo] = await new MultiCall(
              ENDPOINTS_RPC_WRAPPER[endpointInner],
              module.exports.MULTI_CALL_CONTRACT
            ).all([chunk]);
            return foo;
          } catch (e) {
            console.error("failed", endpointInner, chunk.length);
            throwIt = e;
          }
        }

        throw new Error(
          `final error: ${hash} ${endpointInner} ${
            chunk.length
          } ${JSON.stringify(done)} ${throwIt.message.substring(0, 100)}`
        );
      });

      i += 1;
      if (i > max - 1) {
        i = 0;
      }
    }

    return (await Promise.all(promises.map(fn => fn()))).flat(1);
  },

  multiCallIndexBy: async (index, vaultCalls) => {
    const proms = await module.exports.multiCall(vaultCalls);

    const results = {};

    proms.forEach(c => {
      if (c[index]) {
        results[c[index]] = c;
      }
    });

    return results;
  },

  multiCallRpcIndex: async calls => {
    const endpoints = _.shuffle(ENDPOINTS.slice());

    const promises = [];

    calls.forEach(group => {
      const contract = new ethers.Contract(
        group.contractAddress,
        group.abi,
        ENDPOINTS_MULTICALL[endpoints[0]]
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

    const results = await Promise.all([...promises]);

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

  multiCallRpc: async calls => {
    return Object.values(await module.exports.multiCallRpcIndex(calls));
  },

  fetchApys: async () => {
    try {
      const response = await request("https://api.beefy.finance/apy");
      allApys = JSON.parse(response.body);
    } catch (e) {
      console.error("https://api.beefy.finance/apy", e.message);
    }
  },

  getApy: token => {
    return allApys[token] || undefined;
  },

  findYieldForDetails: result => {
    const percent = module.exports.findYieldForDetailsInner(result);

    if (
      percent &&
      percent.percent !== undefined &&
      Math.abs(percent.percent) <= 0
    ) {
      return undefined;
    }

    return percent;
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
      percent: parseFloat(((yieldAmount / deposits) * 100).toFixed(3))
    };
  },

  getTransactionsViaBsc: async (contract, lpAddress, address) => {
    const url =
      "https://api.bscscan.com/api?module=account&action=tokentx&contractaddress=%contractaddress%&address=%address%&page=1&sort=asc&apikey=%apikey%";

    const myUrl = url
        .replace("%contractaddress%", lpAddress)
        .replace("%address%", address)
        .replace("%apikey%", module.exports.CONFIG['BSCSCAN_API_KEY']);

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

  getTransactions: async (contract, lpAddress, address) => {
    try {
      return await module.exports.getTransactionsViaBsc(
        contract,
        lpAddress,
        address
      );
    } catch (e) {
      console.log("transactions failed bsc", e.message);
    }

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

  findYieldForMixedTransactions: (depositAmount, transactions) => {
    let deposit = 0;
    let withdraw = 0;

    transactions.forEach(t => {
      if (t.amount < 0) {
        withdraw += Math.abs(t.amount);
      } else {
        deposit += t.amount;
      }
    });

    const yieldAmount = depositAmount - (deposit - withdraw);

    return {
      amount: yieldAmount,
      percent: parseFloat(((yieldAmount / depositAmount) * 100).toFixed(3))
    };
  }
};
