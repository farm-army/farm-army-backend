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
      } else if (propertyValue.type === 'ArrayExpression') {
        row[property.key.name] = [];

        propertyValue.elements.forEach(element => {
          if (element.type === 'Literal') {
            row[property.key.name].push(element.value);
          } else if (element.type === 'ObjectExpression') {
            row[property.key.name].push(module.exports.parseObject(element));
          }
        })
      } else if (propertyValue.type === 'UnaryExpression' && propertyValue.operator === '!') {
        if (propertyValue.argument && typeof propertyValue.argument.value !== 'undefined' && ['0', '1'].includes(propertyValue.argument.value.toString())) {
          row[property.key.name] = eval(`!${propertyValue.argument.value.toString()}`);
        }
      }
    })

    return row
  },

  createJsonFromObjectExpression: (body, filter, callback) => {
    const items = [];

    try {
      walk.simple(acorn.parse(body, {ecmaVersion: 'latest'}), {
        ObjectExpression(node) {
          const keys = node.properties.map(p => (p.key && p.key.name) ? p.key.name : undefined);
          if (!filter(keys)) {
            return;
          }

          const items1 = module.exports.parseObject(node);

          if (callback) {
            callback(items1, node);
          }

          items.push(items1);
        }
      });
    } catch (e) {
      console.log('ast error', e)
      return [];
    }

    return items;
  }
}