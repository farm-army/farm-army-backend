
# Context

https://app.alpacafinance.org
https://raw.githubusercontent.com/alpaca-finance/alpaca-contract/master/.mainnet.json

https://api.thegraph.com/subgraphs/name/alpaca-finance/alpagraph

# Leverage Positions
0xXXXXXXXX = your address
{"operationName":"GetPositions","variables":{"owner":"0xXXXXXXXX"},"query":"query GetPositions($owner: String) {\n  positions(where: {owner: $owner}, orderBy: createdAt, orderDirection: desc) {\n    id\n    worker\n    owner\n    debtShare\n    vaultAddress\n    posID\n    liquidatedTxHash\n    left\n    posVal\n    __typename\n  }\n}\n"}
