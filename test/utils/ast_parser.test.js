const assert = require('assert');
const fs = require('fs');

const AstParser = require('../../src/utils/ast_parser');

describe('#ast parser utils functions', () => {
  it('test createJsonFromObjectExpression as JSON', () => {
    const transactions = fs.readFileSync(`${__dirname}/fixtures/object_array.js`, 'utf8');

    const result = AstParser.createJsonFromObjectExpression(transactions, (keys) =>
      keys.includes('strategyContractAddress') && keys.includes('token')
    );

    const first = result.find(i => i.id === 'USDT-USDC LP');

    assert.strictEqual(first.tokenDecimals, 18);
    assert.strictEqual(first.farm.earnedToken, 'LORY');
    assert.strictEqual(first.isCompounding, true);
    assert.strictEqual(first.claimable, false);
    assert.strictEqual(first.idFoobarBool, true);
    assert.strictEqual(first.idFoobarBoolFalse, false);
    assert.notStrictEqual(first.path0, ['0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c', '0x55d398326f99059ff775485246999027b3197955']);

    assert.strictEqual(first.farms[0].earnedToken, "LORY");
    assert.strictEqual(first.farms[1].earnedToken, "LORY2");

    assert.strictEqual(first.number[25], '0x1d94447C8f4fC0bEB2da20BEdCccD30d50FA7211');
    assert.strictEqual(first.number[338], 'test');

    const second = result.find(i => i.id === 'WINGS-BNB LP');

    assert.strictEqual(second.tokenDecimals, 18);
    assert.strictEqual(second.farm.earnedToken, 'LORY');
  })
});