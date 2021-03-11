// run both
// patch out typescript error: eg by just remove the translation key related imports


import farms from '../../../remotes/pancake-frontend/src/config/constants/farms'
console.log(JSON.stringify(farms))

console.log('-------------')

import pools from '../../../remotes/pancake-frontend/src/config/constants/pools'
console.log(JSON.stringify(pools))
