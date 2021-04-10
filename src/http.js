"use strict";

const { performance } = require("perf_hooks");
const express = require("express");
const _ = require("lodash");

module.exports = class Http {
  constructor(priceOracle, platforms, balances, addressTransactions, tokenCollector, liquidityTokenCollector) {
    this.priceOracle = priceOracle;
    this.platforms = platforms;
    this.balances = balances;
    this.addressTransactions = addressTransactions;
    this.tokenCollector = tokenCollector;
    this.liquidityTokenCollector = liquidityTokenCollector;

    this.app = express();
  }

  start(port = 3000) {
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

    app.get("/tokens", async (req, res) => {
      res.json(this.tokenCollector.all());
    });

    app.get("/liquidity-tokens", async (req, res) => {
      res.json(this.liquidityTokenCollector.all());
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

        res.json(await instance.getDetails(address, farmId));
      } catch (e) {
        console.error(e);
        res.status(500).json({ message: e.message });
      }
    });

    app.get("/transactions/:address", async (req, res) => {
      try {
        res.json(await this.addressTransactions.getTransactions(req.params.address));
      } catch (e) {
        console.error(e);
        res.status(500).json({message: e.message});
      }
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

    app.get("/all/yield/:address", async (req, res) => {
      const { address } = req.params;

      let timer = -performance.now();

      const platformResults = await Promise.allSettled([
        this.balances.getAllTokenBalances(address),
        this.balances.getAllLpTokenBalances(address),
        ...this.platforms.getFunctionAwaits("getYields", [address])
      ]);

      timer += performance.now();
      console.log(
        `${new Date().toISOString()}: yield ${address}: ${(
          timer / 1000
        ).toFixed(3)} sec`
      );

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
