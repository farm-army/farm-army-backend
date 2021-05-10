const request = require("async-request");
const PromiseThrottle = require('promise-throttle');

module.exports = class BscscanRequest {
    constructor(apiKey) {
        this.apiKey = apiKey;

        this.promiseThrottle = new PromiseThrottle({
            requestsPerSecond: 3,
            promiseImplementation: Promise
        });
    }

    async get(url) {
        // 5 sec limit; also need some window
        return this.promiseThrottle.add(async () => {
            return await request(url + `&apikey=${encodeURIComponent(this.apiKey)}`)
        });
    }
}
