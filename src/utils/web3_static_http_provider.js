const Web3 = require("web3");

module.exports = class Web3StaticHttpProvider extends Web3.providers.HttpProvider {
  chainId = undefined;

  constructor(host, options) {
    super(host, options);
  }

  send(payload, callback) {
    if (payload?.method && payload?.method != 'eth_call') {
      console.log(payload.method);
    }

    if (payload?.method === 'eth_chainId') {
      // init
      if (!this.chainId) {
        super.send(payload, (error, result) => {
          this.chainId = result.result;

          callback(error, result);

          console.log(result);
        });

        return;
      }

      callback(null, {
        "id": payload.id,
        "jsonrpc": "2.0",
        "result": this.chainId,
      });

      return;
    }


    super.send(payload, callback);
  }
};