const assert = require('assert');
const fs = require('fs');

const utils = require('../src/utils');

describe('#test utils functions', function() {
    it('test only deposit transactions yield extraction', () => {
        const transactions = JSON.parse(fs.readFileSync(`${__dirname}/fixtures/transactions-only-deposit.json`, 'utf8'));

        const input = {
            farm: {
                deposit: {amount: 150},
            },
            transactions: transactions
        };

        const result = utils.findYieldForDetails(input)

        assert.strictEqual(result.amount.toFixed(2), '22.91');
        assert.strictEqual(result.percent.toFixed(2), '15.28');
    });

    it('test negative balance should reset transactions on yield extraction', () => {
        const transactions = JSON.parse(fs.readFileSync(`${__dirname}/fixtures/transactions-balance-below-zero.json`, 'utf8'));

        const input = {
            farm: {
                deposit: {amount: 150},
            },
            transactions: transactions
        };

        const result = utils.findYieldForDetails(input)

        assert.strictEqual(result.amount.toFixed(2), '33.91');
        assert.strictEqual(result.percent.toFixed(2), '22.61');
    });

    it('test mixed balance transactions', () => {
        const transactions = JSON.parse(fs.readFileSync(`${__dirname}/fixtures/transactions-mixed.json`, 'utf8'));

        const input = {
            farm: {
                deposit: {amount: 53054.920},
            },
            transactions: transactions
        };

        const result = utils.findYieldForDetails(input)

        assert.strictEqual(result.amount.toFixed(2), '3460.99');
        assert.strictEqual(result.percent.toFixed(2), '6.52');
    });
});