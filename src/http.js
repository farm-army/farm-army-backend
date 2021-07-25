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
    balances,
    addressTransactions,
    tokenCollector,
    liquidityTokenCollector,
    tokenInfo,
    polygonPriceOracle,
    polygonLiquidityTokenCollector,
    polygonTokenCollector,
    polygonBalances,
    polygonTokenInfo,
    fantomPriceOracle,
    fantomLiquidityTokenCollector,
    fantomTokenCollector,
    fantomBalances,
    fantomTokenInfo
  ) {
    this.priceOracle = priceOracle;
    this.platforms = platforms;
    this.platformsPolygon = platformsPolygon;
    this.platformsFantom = platformsFantom;
    this.balances = balances;
    this.addressTransactions = addressTransactions;
    this.tokenCollector = tokenCollector;
    this.liquidityTokenCollector = liquidityTokenCollector;
    this.tokenInfo = tokenInfo;

    this.polygonPriceOracle = polygonPriceOracle;
    this.polygonLiquidityTokenCollector = polygonLiquidityTokenCollector;
    this.polygonTokenCollector = polygonTokenCollector;
    this.polygonBalances = polygonBalances;
    this.polygonTokenInfo = polygonTokenInfo;

    this.fantomPriceOracle = fantomPriceOracle;
    this.fantomLiquidityTokenCollector = fantomLiquidityTokenCollector;
    this.fantomTokenCollector = fantomTokenCollector;
    this.fantomBalances = fantomBalances;
    this.fantomTokenInfo = fantomTokenInfo;

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

    app.get("/prices", async (req, res) => {
      res.json(this.priceOracle.getAllPrices());
    });

    app.get("/polygon/prices", async (req, res) => {
      res.json(this.polygonPriceOracle.getAllPrices());
    });

    app.get("/fantom/prices", async (req, res) => {
      res.json(this.fantomPriceOracle.getAllPrices());
    });

    app.get("/token/:address", async (req, res) => {
      const {address} = req.params;

      let timer = -performance.now();
      res.json(await this.tokenInfo.getTokenInfo(address));
      timer += performance.now();
      console.log(`bsc: ${new Date().toISOString()}: token ${address} - ${(timer / 1000).toFixed(3)} sec`);
    });

    app.get("/polygon/token/:address", async (req, res) => {
      const {address} = req.params;

      let timer = -performance.now();
      res.json(await this.polygonTokenInfo.getTokenInfo(address));
      timer += performance.now();
      console.log(`polygon: ${new Date().toISOString()}: token ${address} - ${(timer / 1000).toFixed(3)} sec`);
    });

    app.get("/fantom/token/:address", async (req, res) => {
      const {address} = req.params;

      let timer = -performance.now();
      res.json(await this.fantomTokenInfo.getTokenInfo(address));
      timer += performance.now();
      console.log(`fantom: ${new Date().toISOString()}: token ${address} - ${(timer / 1000).toFixed(3)} sec`);
    });

    app.get("/tokens", async (req, res) => {
      res.json(this.tokenCollector.all());
    });

    app.get("/polygon/tokens", async (req, res) => {
      res.json(this.polygonTokenCollector.all());
    });

    app.get("/fantom/tokens", async (req, res) => {
      res.json(this.fantomTokenCollector.all());
    });

    app.get("/liquidity-tokens", async (req, res) => {
      res.json(this.liquidityTokenCollector.all());
    });

    app.get("/polygon/liquidity-tokens", async (req, res) => {
      res.json(this.polygonLiquidityTokenCollector.all());
    });


    app.get("/fantom/liquidity-tokens", async (req, res) => {
      res.json(this.fantomLiquidityTokenCollector.all());
    });

    app.get("/details/:address/:farm_id", async (req, res) => {
      try {
        const farmId = req.params.farm_id;
        const { address } = req.params;

        const [platformName] = farmId.split("_");

        const instance = this.platforms.getPlatformByName(platformName);
        if (!instance) {
          res.status(404).json({ message: "not found" });
          return;
        }

        let timer = -performance.now();
        res.json(await instance.getDetails(address, farmId));

        timer += performance.now();
        console.log(`bsc: ${new Date().toISOString()}: detail ${address} - ${farmId} - ${(timer / 1000).toFixed(3)} sec`);

      } catch (e) {
        console.error(e);
        res.status(500).json({ message: e.message });
      }
    });

    app.get("/polygon/details/:address/:farm_id", async (req, res) => {
      try {
        const farmId = req.params.farm_id;
        const {address} = req.params;

        const [platformName] = farmId.split("_");

        const instance = this.platformsPolygon.getPlatformByName(platformName);
        if (!instance) {
          res.status(404).json({message: "not found"});
          return;
        }

        let timer = -performance.now();
        res.json(await instance.getDetails(address, farmId));

        timer += performance.now();
        console.log(`polygon: ${new Date().toISOString()}: detail ${address} - ${farmId} - ${(timer / 1000).toFixed(3)} sec`);

      } catch (e) {
        console.error(e);
        res.status(500).json({message: e.message});
      }
    });

    app.get("/fantom/details/:address/:farm_id", async (req, res) => {
      try {
        const farmId = req.params.farm_id;
        const {address} = req.params;

        const [platformName] = farmId.split("_");

        const instance = this.platformsFantom.getPlatformByName(platformName);
        if (!instance) {
          res.status(404).json({message: "not found"});
          return;
        }

        let timer = -performance.now();
        res.json(await instance.getDetails(address, farmId));

        timer += performance.now();
        console.log(`fantom: ${new Date().toISOString()}: detail ${address} - ${farmId} - ${(timer / 1000).toFixed(3)} sec`);

      } catch (e) {
        console.error(e);
        res.status(500).json({message: e.message});
      }
    });

    app.get("/transactions/:address", async (req, res) => {
      let timer = -performance.now();
      let address = req.params.address;

      try {
        res.json(await this.addressTransactions.getTransactions(address, 'bsc'));
      } catch (e) {
        console.error(e);
        res.status(500).json({message: e.message});
      }

      timer += performance.now();
      console.log(`bsc: ${new Date().toISOString()}: transactions ${address} - ${(timer / 1000).toFixed(3)} sec`);
    });

    app.get("/polygon/transactions/:address", async (req, res) => {
      let timer = -performance.now();
      let address = req.params.address;

      try {
        res.json(await this.addressTransactions.getTransactions(address, 'polygon'));
      } catch (e) {
        console.error(e);
        res.status(500).json({message: e.message});
      }

      timer += performance.now();
      console.log(`polygon: ${new Date().toISOString()}: transactions ${address} - ${(timer / 1000).toFixed(3)} sec`);
    });

    app.get("/fantom/transactions/:address", async (req, res) => {
      let timer = -performance.now();
      let address = req.params.address;

      try {
        res.json(await this.addressTransactions.getTransactions(address, 'fantom'));
      } catch (e) {
        console.error(e);
        res.status(500).json({message: e.message});
      }

      timer += performance.now();
      console.log(`fantom: ${new Date().toISOString()}: transactions ${address} - ${(timer / 1000).toFixed(3)} sec`);
    });

    app.get("/farms", async (req, res) => {
      const items = await Promise.all(
        await this.platforms.getFunctionAwaits("getFarms")
      );

      const result = items.flat().map(f => {
        const item = _.cloneDeep(f);
        delete item.raw;
        return item;
      });

      res.json(result);
    });

    app.get("/polygon/farms", async (req, res) => {
      const items = await Promise.all(
        await this.platformsPolygon.getFunctionAwaits("getFarms")
      );

      const result = items.flat().map(f => {
        const item = _.cloneDeep(f);
        delete item.raw;
        return item;
      });

      res.json(result);
    });

    app.get("/fantom/farms", async (req, res) => {
      const items = await Promise.all(
        await this.platformsFantom.getFunctionAwaits("getFarms")
      );

      const result = items.flat().map(f => {
        const item = _.cloneDeep(f);
        delete item.raw;
        return item;
      });

      res.json(result);
    });

    app.get("/yield/:address", async (req, res) => {
      if (!req.query.p) {
        res.status(400).json({error: 'missing "p" query parameter'});
        return;
      }

      let timer = -performance.now();
      const { address } = req.params;

      let platforms = _.uniq(req.query.p.split(',').filter(e => e.match(/^[\w]+$/g)));
      if (platforms.length === 0) {
        res.json({});
        return;
      }

      let functionAwaitsForPlatforms = this.platforms.getFunctionAwaitsForPlatforms(platforms, 'getYields', [address]);

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
      console.log(`bsc: ${new Date().toISOString()}: yield ${address} - ${platforms.join(',')}: ${(timer / 1000).toFixed(3)} sec`);

      res.json(response);
    });

    app.get("/polygon/yield/:address", async (req, res) => {
      if (!req.query.p) {
        res.status(400).json({error: 'missing "p" query parameter'});
        return;
      }

      let timer = -performance.now();
      const {address} = req.params;

      let platforms = _.uniq(req.query.p.split(',').filter(e => e.match(/^[\w]+$/g)));
      if (platforms.length === 0) {
        res.json({});
        return;
      }

      let functionAwaitsForPlatforms = this.platformsPolygon.getFunctionAwaitsForPlatforms(platforms, 'getYields', [address]);

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
      console.log(`polygon: ${new Date().toISOString()}: yield ${address} - ${platforms.join(',')}: ${(timer / 1000).toFixed(3)} sec`);

      res.json(response);
    });

    app.get("/fantom/yield/:address", async (req, res) => {
      if (!req.query.p) {
        res.status(400).json({error: 'missing "p" query parameter'});
        return;
      }

      let timer = -performance.now();
      const {address} = req.params;

      let platforms = _.uniq(req.query.p.split(',').filter(e => e.match(/^[\w]+$/g)));
      if (platforms.length === 0) {
        res.json({});
        return;
      }

      let functionAwaitsForPlatforms = this.platformsFantom.getFunctionAwaitsForPlatforms(platforms, 'getYields', [address]);

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
      console.log(`fantom: ${new Date().toISOString()}: yield ${address} - ${platforms.join(',')}: ${(timer / 1000).toFixed(3)} sec`);

      res.json(response);
    });

    app.get("/wallet/:address", async (req, res) => {
      let timer = -performance.now();
      const { address } = req.params;

      const [tokens, liquidityPools] = await Promise.allSettled([
        this.balances.getAllTokenBalances(address),
        this.balances.getAllLpTokenBalances(address)
      ]);

      timer += performance.now();
      console.log(`bsc: ${new Date().toISOString()}: wallet ${address} - ${(timer / 1000).toFixed(3)} sec`);

      res.json({
        tokens: tokens.value ? tokens.value : [],
        liquidityPools: liquidityPools.value ? liquidityPools.value : [],
      });
    });

    app.get("/polygon/wallet/:address", async (req, res) => {
      let timer = -performance.now();
      const {address} = req.params;

      const [tokens, liquidityPools] = await Promise.allSettled([
        this.polygonBalances.getAllTokenBalances(address),
        this.polygonBalances.getAllLpTokenBalances(address)
      ]);

      timer += performance.now();
      console.log(`polygon: ${new Date().toISOString()}: wallet ${address} - ${(timer / 1000).toFixed(3)} sec`);

      res.json({
        tokens: tokens.value ? tokens.value : [],
        liquidityPools: liquidityPools.value ? liquidityPools.value : [],
      });
    });

    app.get("/fantom/wallet/:address", async (req, res) => {
      let timer = -performance.now();
      const {address} = req.params;

      const [tokens, liquidityPools] = await Promise.allSettled([
        this.fantomBalances.getAllTokenBalances(address),
        this.fantomBalances.getAllLpTokenBalances(address)
      ]);

      timer += performance.now();
      console.log(`fantom: ${new Date().toISOString()}: wallet ${address} - ${(timer / 1000).toFixed(3)} sec`);

      res.json({
        tokens: tokens.value ? tokens.value : [],
        liquidityPools: liquidityPools.value ? liquidityPools.value : [],
      });
    });

    app.get("/all/yield/:address", async (req, res) => {
      const { address } = req.params;

      let timer = -performance.now();

      const platformResults = await Promise.allSettled([
        this.balances.getAllTokenBalances(address),
        this.balances.getAllLpTokenBalances(address),
        ...this.platforms.getFunctionAwaits("getYields", [address])
      ]);

      timer += performance.now();
      console.log(`bsc: ${new Date().toISOString()}: yield ${address}: ${(timer / 1000).toFixed(3)} sec`);

      const response = {};

      if (platformResults[0].status === "fulfilled") {
        response.wallet = platformResults[0].value;
        response.balances = await this.balances.getBalancesFormFetched(response.wallet);
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
