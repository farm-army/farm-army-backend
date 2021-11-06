
# Browser extraction: remove ABI 

```
const foo = {}; Object.entries(JSON.parse(JSON.stringify(temp2))).forEach(f => { foo[f[0]] = {ADDRESS: f[1].ADDRESS} ; } ); JSON.stringify(foo);
```