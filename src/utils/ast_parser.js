const walk = require("acorn-walk");
const acorn = require("acorn");

module.exports = {
  parseObject: (node) => {
    const row = {};

    if (!node.properties) {
      return row;
    }

    node.properties.forEach(property => {
      if (!property.key.name) {
        return;
      }

      const propertyValue = property.value;
      if (!propertyValue) {
        return;
      }

      if (propertyValue.type === 'Literal') {
        row[property.key.name] = propertyValue.value;
      } else if (propertyValue.type === 'ObjectExpression') {
        row[property.key.name] = module.exports.parseObject(propertyValue);
      } else if (propertyValue.type === 'UnaryExpression' && propertyValue.operator === '!') {
        if (propertyValue.argument && typeof propertyValue.argument.value !== 'undefined' && ['0', '1'].includes(propertyValue.argument.value.toString())) {
          row[property.key.name] = eval(`!${propertyValue.argument.value.toString()}`);
        }
      }
    })

    return row
  },

  createJsonFromObjectExpression: (body, filter) => {
    const items = [];

    walk.simple(acorn.parse(body, {ecmaVersion: 2020}), {
      ObjectExpression(node) {
        const keys = node.properties.map(p => (p.key && p.key.name) ? p.key.name : undefined);
        if (!filter(keys)) {
          return;
        }

        items.push(module.exports.parseObject(node));
      }
    })

    return items;
  }
}