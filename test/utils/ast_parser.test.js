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

    const second = result.find(i => i.id === 'WINGS-BNB LP');

    assert.strictEqual(second.tokenDecimals, 18);
    assert.strictEqual(second.farm.earnedToken, 'LORY');
  })
});