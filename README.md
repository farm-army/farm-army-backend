# farm.army - Backend #

Track your farming and pool performance on the Binance Chain, Polygon, Fantom, KuCoin Community Chain, Harmony, Celo, Moonriver

### Platforms ###

Platforms must be self-managed and extract directly from chain contracts. As fallback javascript ast node parsing is allowed to get addresses from pages directly 

 - [src/platforms/bsc](src/platforms/bsc)
 - [src/platforms/poylgon](src/platforms/poylgon)
 - [src/platforms/fantom](src/platforms/fantom)
 - [src/platforms/kcc](src/platforms/kcc)
 - [src/platforms/harmony](src/platforms/harmony)
 - [src/platforms/celo](src/platforms/celo)
 - [src/platforms/moonriver](src/platforms/moonriver)

### Tech Stack ###

 - node.js
 - sqlite

### Business Values ###

 - blockchain data MUST be called aggregated eg with "multicall" or "rpc wrapper" there should not be any direct single contract reading calls
 - blockchain endpoints are slow, so runs should be in parallel with splitting http call to different URLs

### Technical Debt ###

 - Price discovery of a single token; multiple implementations
 - Reduce platform duplicate codes
 - Normalize platform "configuration format" of farms
 - Reduce manually task to generate `farm.json` for some platforms; basically set the breakpoint in foreign platform javascript files (chrome) and dump the JSON configs (mostly all have the same pattern)
 - ...

### Call Stack ###

#### Platforms ####

Platforms need to provide following implementations

 - `getFarms` All farm, vaults, pools should be cached for all calls; should no be cached for background calls this are the data "refreshers"
 - `getAddressFarms(address)` Get possible farms for an address, should be cached longer and should call needed contract values (also its normally the same as the following endpoint)
 - `getYields(address)` Get all address farms with balances, rewards, ... cache can be lower, request should to take too long, else user need to wait long for the overview page
 - `getDetails(address, farm)` Detail information for an address farm; request can to more stuff

### Install ###

```
npm install
sqlite3 db.db < db.sql
```

Optional: to generate new farms / vault of some provide we need the public repo from them.

```
git submodule update --init --recursive
```

Optional: create a config file with custom configuration

```
config.json => config.json.local
```

### Config ###

Additional config parameters 

```
# config.json.local

# add custom / private rpc urls
"MOONRIVER_RPC": "https://foo.rpc,https://foo1.rpc",
"POLYGON_RPC": "https://foo.rpc,https://foo1.rpc",

# additional proxy for web3 rpc calls (for load balancing)
"WEB3_PROXIES": "https://YOUR.proxy:3128,https://YOUR_2.proxy:3128"

# proxy for some http related traffic only (load balancing)
"DEFAULT_PROXY": "https://YOUR_2.proxy:3128",
```

### Start ###

```
node src/index.js
```

### Endpoints ###

### Cross-Chain

```
  /farms
  /yield/:address
```

#### Per Chain

```
  /:chain/farms
  /polygon/farms
  /fantom/farms
  /kcc/farms
  /harmony/farms
  /celo/farms
  /moonyriver/farms
```

```
  /:chain/wallet/:address
```

`:chain`: bsc, polygon, fantom, kcc, harmony, celo, moonriver

```
  /:chain/all/yield/:address
```

### Generate Farm ###


```
node src/command/farm_fetcher.js <masterChefAddress> <chain: bsc (default), polygon>
node src/command/farm_fetcher.js 0x76FCeffFcf5325c6156cA89639b17464ea833ECd
node src/command/farm_fetcher.js 0xC8Bd86E5a132Ac0bf10134e270De06A8Ba317BFe polygon
node src/command/farm_fetcher.js 0x9083EA3756BDE6Ee6f27a6e996806FBD37F6F093 fantom
```

### Farm / Pool Contract ###

Every farm contract should be converted / provided in a common format. Still feature early definition

```
  {
    "id": "pancake_farm_foobar", // required and should be somehow unique and should not change (so no index) 
    "name": "Syrup-BNB", // required
    "token": "syrup-bnb", // optional (fallback on "name" if not given, eg for icon)
    "platform": "pancake", // required
    "earns": ["bake"], // optional (deprecated)
    "earn": [
      {
         "address": "0x1234ABC...",
         "symbol": "foo",
         "decimals": 18
      }
    ], // optional
    "link": "https:\/\/pancakeswap.finance\/farms", // required
    "has_details": true, // optional provide a detail link in frontend
    "notes": ['note_1', 'note_1'] // optional note of the farm; will be join in frontend
    "compound": true|false // optional if auto-compounding
    "leverage": true|false // optional if vault is leveraged
    "chain": "bsc|polygon|kcc|fantom|harmony" the chain for this vault
    tags: ["lend", "borrow", "deprecated"], some custom tags for frontend badges
    "extra": {
      "lpAddress": "0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82", // to given hint about liquity split calculation
      "transactionToken": "0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82", // "in" and "out" transaction token
      "transactionAddress": "0x73feaa1eE314F8c655E354234017bE2193C9E24E" // "from" and "to" transaction
      "pricePerFullShare": 1.0408062780129632, // auto vault yield pools normally just wrap the "lpAddress" with a token which price is increasing; so just the multiplier
      "pricePerFullShareToken": "0xA9936272065e6DDAc9D2453C9a2712B581e9aE1B" // if given the value of "pricePerFullShare" is writting into database for historical data 
    },
    "tvl": {
      "amount": 212497359.08927876, // optional and not used
      "usd": 2832998380.971941 // optional
    },
    "yield": { // yearly values in percent eg 12.12%. apy or apr can be given (TODO: normalize to one)
      "apy": 553.9292024968477,
      "apr": 12.9292024968477,
    },
    actions: [ // web3 actions to directly call via Metamask (web3 providers)
      {
        "method": "deposit" // contract method
        "inputs": [70,0] // method parameters
        "type": "claim_fake" // custom type if known: "claim", "claim_all", "claim_fake", "emergency_withdraw"
        "contract": "0xDbc1A13490deeF9c3C12b44FE77b503c1B061739" // contract address      
      }
    ]
  },
```
