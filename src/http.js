"use strict";

const { performance } = require("perf_hooks");
const express = require("express");
const _ = require("lodash");
const timeout = require('connect-timeout');

module.exports = class Http {
  constructor(
    priceOracle,
    platforms,
    platformsPolygon,
    platformsFantom,
    platformsKcc,
    platformsHarmony,
    balances,
    addressTransactions,
    polygonAddressTransactions,
    fantomAddressTransactions,
    tokenCollector,
    liquidityTokenCollector,
    tokenInfo,
    autoFarm,
    polygonPriceOracle,
    polygonLiquidityTokenCollector,
    polygonTokenCollector,
    polygonBalances,
    polygonTokenInfo,
    polygonAutoFarm,
    fantomPriceOracle,
    fantomLiquidityTokenCollector,
    fantomTokenCollector,
    fantomBalances,
    fantomTokenInfo,
    fantomAutoFarm,
    kccPriceOracle,
    kccLiquidityTokenCollector,
    kccTokenCollector,
    kccBalances,
    kccTokenInfo,
    harmonyPriceOracle,
    harmonyLiquidityTokenCollector,
    harmonyTokenCollector,
    harmonyBalances,
    harmonyTokenInfo
  ) {
    this.chains = {};

    this.priceOracle = priceOracle;
    this.platforms = platforms;
    this.platformsPolygon = platformsPolygon;
    this.platformsFantom = platformsFantom;
    this.platformsKcc = platformsKcc;
    this.balances = balances;

    this.addressTransactions = addressTransactions;
    this.polygonAddressTransactions = polygonAddressTransactions;
    this.fantomAddressTransactions = fantomAddressTransactions;

    this.tokenCollector = tokenCollector;
    this.liquidityTokenCollector = liquidityTokenCollector;
    this.tokenInfo = tokenInfo;

    this.chains.bsc = {
      platforms: platforms,
      priceOracle: priceOracle,
      liquidityTokenCollector: liquidityTokenCollector,
      tokenCollector: tokenCollector,
      balances: balances,
      tokenInfo: tokenInfo,
      addressTransactions: addressTransactions,
      autoFarm: autoFarm,
    }

    this.polygonPriceOracle = polygonPriceOracle;
    this.polygonLiquidityTokenCollector = polygonLiquidityTokenCollector;
    this.polygonTokenCollector = polygonTokenCollector;
    this.polygonBalances = polygonBalances;
    this.polygonTokenInfo = polygonTokenInfo;
    this.chains.polygon = {
      platforms: platformsPolygon,
      priceOracle: polygonPriceOracle,
      liquidityTokenCollector: polygonLiquidityTokenCollector,
      tokenCollector: polygonTokenCollector,
      balances: polygonBalances,
      tokenInfo: polygonTokenInfo,
      addressTransactions: polygonAddressTransactions,
      autoFarm: polygonAutoFarm,
    }

    this.fantomPriceOracle = fantomPriceOracle;
    this.fantomLiquidityTokenCollector = fantomLiquidityTokenCollector;
    this.fantomTokenCollector = fantomTokenCollector;
    this.fantomBalances = fantomBalances;
    this.fantomTokenInfo = fantomTokenInfo;
    this.chains.fantom = {
      platforms: platformsFantom,
      priceOracle: fantomPriceOracle,
      liquidityTokenCollector: fantomLiquidityTokenCollector,
      tokenCollector: fantomTokenCollector,
      balances: fantomBalances,
      tokenInfo: fantomTokenInfo,
      addressTransactions: fantomAddressTransactions,
      autoFarm: fantomAutoFarm,
    }

    this.kccPriceOracle = kccPriceOracle;
    this.kccLiquidityTokenCollector = kccLiquidityTokenCollector;
    this.kccTokenCollector = kccTokenCollector;
    this.kccBalances = kccBalances;
    this.kccTokenInfo = kccTokenInfo;
    this.chains.kcc = {
      platforms: platformsKcc,
      priceOracle: kccPriceOracle,
      liquidityTokenCollector: kccLiquidityTokenCollector,
      tokenCollector: kccTokenCollector,
      balances: kccBalances,
      tokenInfo: kccTokenInfo,
      addressTransactions: {}, // not supported
      autoFarm: {}, // not supported
    }

    this.chains.harmony = {
      platforms: platformsHarmony,
      priceOracle: harmonyPriceOracle,
      liquidityTokenCollector: harmonyLiquidityTokenCollector,
      tokenCollector: harmonyTokenCollector,
      balances: harmonyBalances,
      tokenInfo: harmonyTokenInfo,
      addressTransactions: {}, // not supported
      autoFarm: {}, // not supported
    }

    this.app = express();
  }

  start(port = 3000) {
    this.app.use(timeout('25s'));

    this.routes();

    this.app.listen(port, "127.0.0.1", () => {
      console.log(`Listening at http://127.0.0.1:${port} @env:(${process.env.NODE_ENV ? process.env.NODE_ENV : 'n/a'})`);
    });
  }

  routes() {
    const { app } = this;

    app.get("/:chain/prices", async (req, res) => {
      const {chain} = req.params;
      const priceOracle = this.chains[chain].priceOracle;
      res.json(priceOracle.getAllPrices());
    });

    app.get("/:chain/autofarm", async (req, res) => {
      let timer = -performance.now();

      if (!req.query.masterchef) {
        res.status(400).json({error: 'missing "masterchef" query parameter'});
        return;
      }

      const {chain} = req.params;

      try {
        res.json(await this.chains[chain].autoFarm.getAutoAddressFarms(req.query.masterchef, req.query.address));
      } catch (e) {
        res.status(400).json({error: e.message});
      }

      timer += performance.now();
      console.log(`${chain}: ${new Date().toISOString()}: autofarm masterchef ${req.query.masterchef} - ${(timer / 1000).toFixed(3)} sec`);
    });

    app.get("/:chain/token/:address", async (req, res) => {
      const {chain, address} = req.params;
      const tokenInfo = this.chains[chain].tokenInfo;

      let timer = -performance.now();
      res.json(await tokenInfo.getTokenInfo(address));
      timer += performance.now();
      console.log(`${chain}: ${new Date().toISOString()}: token ${address} - ${(timer / 1000).toFixed(3)} sec`);
    });

    app.get("/:chain/tokens", async (req, res) => {
      const {chain} = req.params;
      const tokenCollector = this.chains[chain].tokenCollector;
      res.json(tokenCollector.all());
    });

    app.get("/:chain/liquidity-tokens", async (req, res) => {
      const {chain} = req.params;
      const liquidityTokenCollector = this.chains[chain].liquidityTokenCollector;
      res.json(liquidityTokenCollector.all());
    });

    app.get("/:chain/details/:address/:farm_id", async (req, res) => {
      const {address, chain} = req.params;

      try {
        const farmId = req.params.farm_id;

        const [platformName] = farmId.split("_");

        const platformsChain = this.chains[chain].platforms;

        const instance = platformsChain.getPlatformByName(platformName);
        if (!instance) {
          res.status(404).json({message: "not found"});
          return;
        }

        let timer = -performance.now();
        res.json(await instance.getDetails(address, farmId));

        timer += performance.now();
        console.log(`${chain}: ${new Date().toISOString()}: detail ${address} - ${farmId} - ${(timer / 1000).toFixed(3)} sec`);

      } catch (e) {
        console.error(e);
        res.status(500).json({message: e.message});
      }
    });

    app.get("/:chain/transactions/:address", async (req, res) => {
      const {address, chain} = req.params;

      let timer = -performance.now();

      let addressTransactions = this.chains[chain].addressTransactions;

      try {
        res.json(await addressTransactions.getTransactions(address, chain));
      } catch (e) {
        console.error(e);
        res.status(500).json({message: e.message});
      }

      timer += performance.now();
      console.log(`${chain}: ${new Date().toISOString()}: transactions ${address} - ${(timer / 1000).toFixed(3)} sec`);
    });

    app.get("/:chain/farms", async (req, res) => {
      const {chain} = req.params;

      let platformsChain = this.chains[chain].platforms;

      const items = (await Promise.allSettled(
        await platformsChain.getFunctionAwaits("getFarms")
      )).filter(i => i.value).map(i => i.value);

      const result = items.flat().map(f => {
        const item = _.cloneDeep(f);
        delete item.raw;
        return item;
      });

      res.json(result);
    });

    app.get("/:chain/yield/:address", async (req, res) => {
      if (!req.query.p) {
        res.status(400).json({error: 'missing "p" query parameter'});
        return;
      }

      let timer = -performance.now();
      const {address, chain} = req.params;

      let platforms = _.uniq(req.query.p.split(',').filter(e => e.match(/^[\w]+$/g)));
      if (platforms.length === 0) {
        res.json({});
        return;
      }

      let platformsChain = this.chains[chain].platforms;

      let functionAwaitsForPlatforms = platformsChain.getFunctionAwaitsForPlatforms(platforms, 'getYields', [address]);

      const awaits = await Promise.allSettled([...functionAwaitsForPlatforms]);

      const response = {}
      awaits.forEach(v => {
        if (!v.value) {
          console.error(v);
          return;
        }

        v.value.forEach(vault => {
          const item = _.cloneDeep(vault);
          delete item.farm.raw;

          if (!response[vault.farm.provider]) {
            response[vault.farm.provider] = [];
          }

          response[vault.farm.provider].push(item);
        });
      });

      timer += performance.now();
      console.log(`${chain}: ${new Date().toISOString()}: yield ${address} - ${platforms.join(',')}: ${(timer / 1000).toFixed(3)} sec`);

      res.json(response);
    });

    app.get("/:chain/wallet/:address", async (req, res) => {
      let timer = -performance.now();
      const {address, chain} = req.params;

      let chainBalances = this.chains[chain].balances;

      const [tokens, liquidityPools] = await Promise.allSettled([
        chainBalances.getAllTokenBalances(address),
        chainBalances.getAllLpTokenBalances(address)
      ]);

      timer += performance.now();
      console.log(`${chain}: ${new Date().toISOString()}: wallet ${address} - ${(timer / 1000).toFixed(3)} sec`);

      res.json({
        tokens: tokens.value ? tokens.value : [],
        liquidityPools: liquidityPools.value ? liquidityPools.value : [],
      });
    });

    app.get("/:chain/all/yield/:address", async (req, res) => {
      const {address, chain} = req.params;

      let timer = -performance.now();

      let chainBalances = this.chains[chain].balances;
      let platformsChain = this.chains[chain].platforms;

      const platformResults = await Promise.allSettled([
        chainBalances.getAllTokenBalances(address),
        chainBalances.getAllLpTokenBalances(address),
        ...platformsChain.getFunctionAwaits("getYields", [address])
      ]);

      timer += performance.now();
      console.log(`${chain}: ${new Date().toISOString()}: yield ${address}: ${(timer / 1000).toFixed(3)} sec`);

      const response = {};

      if (platformResults[0].status === "fulfilled") {
        response.wallet = platformResults[0].value;
        response.balances = await chainBalances.getBalancesFormFetched(response.wallet);
      }

      if (platformResults[1].status === "fulfilled") {
        response.liquidityPools = platformResults[1].value;
      }

      const platformsResult = {};
      platformResults.slice(2).forEach(v => {
        if (v.value) {
          v.value.forEach(vault => {
            if (!platformsResult[vault.farm.provider]) {
              platformsResult[vault.farm.provider] = [];
            }

            const item = _.cloneDeep(vault);
            delete item.farm.raw;

            platformsResult[vault.farm.provider].push(item);
          });
        } else {
          console.error(v);
        }
      });

      response.platforms = platformsResult;

      res.json(response);
    });
  }
};
