const PromiseThrottle = require('promise-throttle');
const Utils = require("../utils");

module.exports = class BscscanRequest {
    constructor(bscApiKey, polygonApiKey, fantomApiKey) {
        this.bscApiKey = bscApiKey;
        this.polygonApiKey = polygonApiKey;
        this.fantomApiKey = fantomApiKey;

        this.promiseThrottle = new PromiseThrottle({
            requestsPerSecond: 2,
            promiseImplementation: Promise
        });
    }

    async get(url, chain = 'bsc') {
        let apiKey
        if (chain === 'bsc') {
            apiKey = this.bscApiKey;
        } else if(chain === 'polygon') {
            apiKey = this.polygonApiKey;
        } else if (chain === 'fantom') {
            apiKey = this.fantomApiKey;
        } else {
            apiKey = this.bscApiKey;
        }

        // 5 sec limit; also need some window
        return this.promiseThrottle.add(async () => {
            return await Utils.requestJsonGet(url + `&apikey=${encodeURIComponent(apiKey)}`)
        });
    }
}
