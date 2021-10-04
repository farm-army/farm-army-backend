"use strict";

const Utils = require("../../../utils");
const AstParser = require("../../../utils/ast_parser");
const Web3EthContract = require("web3-eth-contract");
const VAULT_ABI = require("./abi/vault.json");
const BANK_ABI = require("./abi/bank.json");
const _ = require("lodash");

module.exports = class peleven_leverage {
  static OPEN_POSITIONS_CACHE_KEY = 'peleven_leverage_open_positions';

  constructor(priceOracle, tokenCollector, cacheManager, liquidityTokenCollector, farmPlatformResolver) {
    this.priceOracle = priceOracle;
    this.tokenCollector = tokenCollector;
    this.cacheManager = cacheManager;
    this.liquidityTokenCollector = liquidityTokenCollector;
    this.farmPlatformResolver = farmPlatformResolver;
    this.openPositions = {};

    // init data
    setTimeout(async () => {
      const openPositions = await this.cacheManager.get(peleven_leverage.OPEN_POSITIONS_CACHE_KEY);
      this.openPositions = openPositions ? openPositions : {}
    }, 1)

  }

  async getLbAddresses() {
    return [];
  }

  async cachePositions(refresh) {
    const cacheKey = peleven_leverage.OPEN_POSITIONS_CACHE_KEY;
    const cache = await this.cacheManager.get(cacheKey);

    if (!refresh) {
      // re init
      if (Object.keys(this.openPositions).length === 0) {
        this.openPositions = cache;
      }

      return cache;
    }

    const banks = (await this.getLeverageFarms()).banks;

    const currentBankPositions = await Utils.multiCall(banks.map(b => ({
      address: b.address,
      currentPos: new Web3EthContract(BANK_ABI, b.address).methods.nextPositionID(),
    })), this.getChain());

    const openPositions = {};

    for (const currentBankPosition of currentBankPositions) {
      const chunks = _.chunk([...Array(parseInt(currentBankPosition.currentPos)).keys()].slice(1), 500);

      for (let chunk of chunks) {
        (await Utils.multiCall(chunk.map(id => ({
          id: id.toString(),
          positions: new Web3EthContract(BANK_ABI, currentBankPosition.address).methods.positions(id),
        })), this.getChain())).forEach(p => {
          const position = p.positions
          let isOpen = position[2] > 0 && position[1] !== '0x0000000000000000000000000000000000000000';

          if (isOpen) {
            let address = position[1].toLowerCase();

            if (!openPositions[address]) {
              openPositions[address] = [];
            }

            openPositions[address].push([p.id, currentBankPosition.address, position[0], position[1], position[2]])
          }
        });
      }
    }

    this.openPositions = Object.freeze(openPositions);

    return openPositions;
  }

  async getAllPositions(refresh = false) {
    const cacheKey = rabbit.OPEN_POSITIONS_CACHE_KEY;
    const cache = await this.cacheManager.get(cacheKey);

    if (!refresh) {
      // re init
      if (Object.keys(this.openPositions).length === 0) {
        this.openPositions = cache;
      }

      return cache;
    }

    const currentPos = await Utils.multiCall([{
      currentPos: new Web3EthContract(DebtAbi, rabbit.DEBT_ADDRESS).methods.currentPos(),
    }], this.getChain());

    const chunks = _.chunk([...Array(parseInt(currentPos[0].currentPos)).keys()].slice(1), 500);

    const openPositions = {};

    for (let chunk of chunks) {
      let web3EthContract = new Web3EthContract(DebtAbi, rabbit.DEBT_ADDRESS);

      (await Utils.multiCall(chunk.map(id => {
        return {
          id: id.toString(),
          positionInfo: web3EthContract.methods.positionInfo(id),
        }
      }), this.getChain())).forEach(p => {
        const position = p.positionInfo

        let isOpen = position[0] > 0 && position[1] > 0 && position[3] !== '0x0000000000000000000000000000000000000000';

        if (isOpen) {
          let address = position[3].toLowerCase();

          if (!openPositions[address]) {
            openPositions[address] = [];
          }

          openPositions[address].push([p.id, position[0]])
        }
      });
    }

    this.openPositions = openPositions;

    console.log(`${this.getChain()} ${this.getName()}: open position fetched: ${Object.keys(this.openPositions).length}`)

    await this.cacheManager.set(cacheKey, openPositions, {ttl: 60 * 30})

    return openPositions;
  }

  async getLeverageFarms() {
    const cacheKey = `${this.getName()}-v3-farm-info`

    const cache = await this.cacheManager.get(cacheKey)
    if (cache) {
      return cache;
    }

    const files = await Utils.getJavascriptFiles('https://eleven.finance/');

    const banks = [];
    Object.values(files).forEach(f => {
      banks.push(...AstParser.createJsonFromObjectExpression(f, keys => keys.includes('collateralTokens') && keys.includes('minLoanSize') && keys.includes('baseToken')));
    });

    const farms = [];
    Object.values(files).forEach(f => {
      farms.push(...AstParser.createJsonFromObjectExpression(f, keys => keys.includes('vaultAddress') && keys.includes('maxLeverage')));
    });

    const result = {
      banks: banks.filter(f => f.network === 'polygon'),
      farms: farms.filter(f => f.network === 'polygon' && f.isDeprecated !== true),
    }

    await this.cacheManager.set(cacheKey, result, {ttl: 60 * 60})

    return result;
  }

  async getFarms(refresh = false) {
    let cacheKey = `getFarms-v2-${this.getName()}-leverage`;

    if (!refresh) {
      const cacheItem = await this.cacheManager.get(cacheKey)
      if (cacheItem) {
        return cacheItem;
      }
    }

    const laverageFarms = await this.getLeverageFarms();

    const vaultCalls = laverageFarms.farms.map(pool => {
      const vault = new Web3EthContract(VAULT_ABI, pool.vaultAddress);

      return {
        vault: pool.vaultAddress.toLowerCase(),
        pricePerFullShare: vault.methods.getPricePerFullShare(),
        tvl: vault.methods.balance(),
        token: vault.methods.token(),
      };
    });

    const vault = await Utils.multiCallIndexBy("vault", vaultCalls, this.getChain());

    const farms = [];
    laverageFarms.farms.forEach(pool => {
      const vaultElement = vault[pool.vaultAddress.toLowerCase()];
      if (!vaultElement || !vaultElement.token) {
        return;
      }

      const name = pool.name
        .replace(/\s+\w*lp$/i, '')
        .trim();

      const item = {
        id: `${this.getName()}_${pool.vaultAddress}`,
        name: name,
        provider: 'peleven',
        has_details: true,
        raw: Object.freeze({
          pool: pool,
        }),
        extra: {},
        chain: this.getChain(),
        compound: true,
        leverage: true,
        notes: []
      };

      if (pool.maxLeverage) {
        item.notes.push(`${pool.maxLeverage}x`)
      }

      item.extra.transactionToken = vaultElement.token;

      if (this.liquidityTokenCollector.get(item.extra.transactionToken)) {
        item.extra.lpAddress = item.extra.transactionToken
      } else if (pool.name.match(/^([\w]{0,9})-([\w]{0,9})\s*/g)) {
        item.extra.lpAddress = item.extra.transactionToken
      }

      const platform = this.farmPlatformResolver.findMainPlatformNameForTokenAddress(item.extra.transactionToken);
      if (platform) {
        item.platform = platform;
      }

      if (vaultElement && vaultElement.pricePerFullShare) {
        item.extra.pricePerFullShare = vaultElement.pricePerFullShare / 1e18;
      }

      if (vaultElement && vaultElement.tvl) {
        item.tvl = {
          amount: vaultElement.tvl / (10 ** this.tokenCollector.getDecimals(item.extra.transactionToken))
        };

        const price = this.priceOracle.findPrice(item.extra.transactionToken);
        if (price) {
          item.tvl.usd = item.tvl.amount * price;
        }
      }

      farms.push(Object.freeze(item));
    });

    await this.cacheManager.set(cacheKey, farms, {ttl: 60 * 30})

    console.log(`${this.getName()} updated`);

    return farms;
  }

  async getYields(address) {
    return await this.getYieldsInner(address, this.openPositions[address.toLowerCase()] || []);
  }

  async getYieldsInner(address, addressFarms) {
    if (addressFarms.length === 0) {
      return [];
    }

    const farms = await this.getFarms();

    const positionInfos = await Utils.multiCallIndexBy('id', addressFarms.map(position => {
      const [id, bankAddress] = position;

      return {
        id: id.toString(),
        positionInfo: new Web3EthContract(BANK_ABI, bankAddress).methods.positionInfo(id),
      }
    }), this.getChain());

    const results = [];

    const foo = await this.getLeverageFarms();

    addressFarms.forEach(position => {
      const [id, bankAddress, bigfoot, ownerAddress, _debtShare] = position;

      const farm = farms.find(f => {
        return f.raw.pool.borrowOptions.find(opt => opt.contracts.borrow === bigfoot)
      });

      if (!farm) {
        return;
      }

      const positionInfo = positionInfos[id] && positionInfos[id].positionInfo ? positionInfos[id].positionInfo : undefined;
      if (!positionInfo) {
        return;
      }

      const result = {
        farm: farm
      };

      const [borrowToken, debtShare] = Object.values(positionInfo);

      if (borrowToken > 0) {
        const borrow = (farm.raw?.pool?.borrowOptions || []).find(opt => opt?.contracts?.borrow === bigfoot);
        const bank = (foo?.banks || []).find(b => b.id.toLowerCase() === borrow.bankId.toLowerCase());
        if (!bank) {
          return;
        }

        const borrowTokenAddress = this.tokenCollector.getAddressBySymbol(bank.baseToken.toLowerCase());
        if (!borrowTokenAddress) {
          return;
        }

        const amount = (borrowToken - debtShare) / (10 ** this.tokenCollector.getDecimals(borrowTokenAddress));
        result.deposit = {
          symbol: '?',
          amount: amount, // value in borrowToken token
        };

        const price = this.priceOracle.getAddressPrice(borrowTokenAddress);
        if (price) {
          result.deposit.usd = result.deposit.amount * price;

          // reverse lp amount based on the usd price
          const lpPrice = this.priceOracle.findPrice(farm.extra.transactionToken);
          if (lpPrice) {
            result.deposit.amount = result.deposit.usd / lpPrice
          }
        }
      }

      if (result.deposit) {
        results.push(Object.freeze(result));
      }
    })

    return results;
  }

  async getDetails(address, id) {
    const farm = (await this.getFarms()).find(f => f.id === id);
    if (!farm) {
      return {};
    }

    const [yieldFarms] = await Promise.all([
      this.getYieldsInner(address, [farm.id]),
    ]);

    const result = {};

    let lpTokens = [];
    if (yieldFarms[0]) {
      result.farm = yieldFarms[0];
      lpTokens = this.priceOracle.getLpSplits(farm, yieldFarms[0]);
    }

    if (lpTokens && lpTokens.length > 0) {
      result.lpTokens = lpTokens;
    }

    const yieldDetails = Utils.findYieldForDetails(result);
    if (yieldDetails) {
      result.yield = yieldDetails;
    }

    return result;
  }

  getName() {
    return 'peleven_leverage';
  }

  getChain() {
    return 'polygon';
  }
}
