Error.stackTraceLimit = 30;

"use strict";

const services = require("./services");

async function farmUpdater() {
  (await Promise.allSettled([
    Promise.all(services.getPlatforms().getFunctionAwaits('getFarms', [true])),
    Promise.all(services.getPolygonPlatforms().getFunctionAwaits('getFarms', [true])),
    Promise.all(services.getFantomPlatforms().getFunctionAwaits('getFarms', [true])),
    Promise.all(services.getKccPlatforms().getFunctionAwaits('getFarms', [true])),
    Promise.all(services.getHarmonyPlatforms().getFunctionAwaits('getFarms', [true])),
    Promise.all(services.getCeloPlatforms().getFunctionAwaits('getFarms', [true])),
    Promise.all(services.getMoonriverPlatforms().getFunctionAwaits('getFarms', [true])),
  ])).forEach(p => {
    if (p.status !== 'fulfilled') {
      console.error('farmUpdater error', p.reason)
    }
  });
}

async function priceUpdater() {
  (await Promise.allSettled([
    services.getCronjobs().cronInterval(),
    services.getCronjobs().polygonCronInterval(),
    services.getCronjobs().fantomCronInterval(),
    services.getCronjobs().kccCronInterval(),
    services.getCronjobs().harmonyCronInterval(),
    services.getCronjobs().celoCronInterval(),
    services.getCronjobs().moonriverCronInterval(),
  ])).forEach(p => {
    if (p.status !== 'fulfilled') {
      console.error('priceUpdater error', p.reason)
    }
  });
}

// warmup
setTimeout(async () => {
  setInterval(async () => {
    await priceUpdater();
  }, 1000 * 60 * 5);

  console.log('application init started')
  await priceUpdater();

  console.log("\x1b[32m" + "price init done" + "\x1b[0m");

  await farmUpdater();
  console.log("\x1b[32m" + "farms init done" + "\x1b[0m");

  services.getHttp().start(process.argv[2] || 3000)
}, 1);

// farm update interval
setInterval(async () => {
  await farmUpdater();

  // collecting farm data to have historically data
  (await Promise.allSettled([
    services.getDb().updateFarmPrices(),
    services.getDb().updateAddressMaps(),
    services.getDb().updateLpInfoMaps(),

    services.getPolygonDb().updateFarmPrices(),
    services.getPolygonDb().updateAddressMaps(),
    services.getPolygonDb().updateLpInfoMaps(),

    services.getFantomDb().updateFarmPrices(),
    services.getFantomDb().updateAddressMaps(),
    services.getFantomDb().updateLpInfoMaps(),

    services.getKccDb().updateFarmPrices(),
    services.getKccDb().updateAddressMaps(),
    services.getKccDb().updateLpInfoMaps(),

    services.getHarmonyDb().updateFarmPrices(),
    services.getHarmonyDb().updateAddressMaps(),
    services.getHarmonyDb().updateLpInfoMaps(),

    services.getCeloDb().updateFarmPrices(),
    services.getCeloDb().updateAddressMaps(),
    services.getCeloDb().updateLpInfoMaps(),

    services.getMoonriverDb().updateFarmPrices(),
    services.getMoonriverDb().updateAddressMaps(),
    services.getMoonriverDb().updateLpInfoMaps(),
  ])).forEach(p => {
    if (p.status !== 'fulfilled') {
      console.error('farm update interval error', p.reason)
    }
  });

  await services.getCronjobs().cronPlatforms();
}, 1000 * 60 * 7);


// internal jobs
setTimeout(async () => {
  await services.getPelevenLeverage().cachePositions(true)
}, 1070 * 60);

setInterval(async () => {
  await services.getPelevenLeverage().cachePositions(true)
}, 1050 * 60 * 16);
