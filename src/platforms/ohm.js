const Utils = require("./../utils");
const AstParser = require("./../utils/ast_parser");
const walk = require("acorn-walk");
const acorn = require("acorn-loose");

module.exports = {
  async getBondAddressesViaJavascript(website, config) {
    const javascriptFiles = await Utils.getJavascriptFiles(website);

    const bonds = [];

    Object.values(javascriptFiles).forEach(f => {
      AstParser.createJsonFromObjectExpression(f, keys => keys.includes('name') && keys.includes('bondToken'), (item, node) => {
        const find = node.properties.find(p => p.key?.name?.toLowerCase() === 'networkaddrs');
        if (!find) {
          return;
        }

        const text = f.substring(find.value.start, find.value.end);

        walk.simple(acorn.parse(text, {ecmaVersion: 'latest'}), {
          ObjectExpression(node) {
            const keys = node.properties.map(p => (p.key && p.key.name) ? p.key.name : undefined);
            if (keys.includes('bondAddress') && keys.includes('reserveAddress')) {
              const foo = text.substring(node.start - 10, node.start);
              if (foo.toLowerCase().includes('mainnet')) {
                const parseObject = AstParser.parseObject(node);
                item.bondAddress = parseObject.bondAddress
                item.reserveAddress = parseObject.reserveAddress
              }
            }
          }
        });
      }).forEach(item => {
        if (!item.bondAddress || !item.reserveAddress) {
          return;
        }

        bonds.push(Object.freeze({
          name: item.displayName,
          token: item.bondToken,
          bondAddress: item.bondAddress,
          reserveAddress: item.reserveAddress,
          rewardToken: config.token,
        }));
      })
    });

    return bonds;
  }
}