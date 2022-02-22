const walk = require("acorn-walk");
const acornLoose = require("acorn-loose");

module.exports = {
  parseObject: (node) => {
    const row = {};

    if (!node.properties) {
      return row;
    }

    node.properties.forEach(property => {
      let key = undefined;

      if (property?.key?.name) {
        key = property.key.name
      } else if (property?.key?.value) {
        key = property.key.value
      }

      if (!key) {
        return;
      }

      const propertyValue = property.value;
      if (!propertyValue) {
        return;
      }

      if (propertyValue.type === 'Literal') {
        row[key] = propertyValue.value;
      } else if (propertyValue.type === 'ObjectExpression') {
        row[key] = module.exports.parseObject(propertyValue);
      } else if (propertyValue.type === 'ArrayExpression') {
        row[key] = [];

        propertyValue.elements.forEach(element => {
          if (element.type === 'Literal') {
            row[key].push(element.value);
          } else if (element.type === 'ObjectExpression') {
            row[key].push(module.exports.parseObject(element));
          }
        })
      } else if (propertyValue.type === 'UnaryExpression' && propertyValue.operator === '!') {
        if (propertyValue.argument && typeof propertyValue.argument.value !== 'undefined' && ['0', '1'].includes(propertyValue.argument.value.toString())) {
          row[key] = eval(`!${propertyValue.argument.value.toString()}`);
        }
      }
    })

    return row
  },

  createJsonFromObjectExpression: (body, filter, callback) => {
    const items = [];

    try {
      walk.simple(acornLoose.parse(body, {ecmaVersion: 'latest'}), {
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