"use strict";

let balances;
let cache;
let cacheManager;
let database;
let db;
let priceOracle;
let platforms;
let http;
let tokenCollector;
let addressTransactions;
let polygonAddressTransactions;
let fantomAddressTransactions;
let liquidityTokenCollector;
let priceCollector;
let farmFetcher;
let contractAbiFetcher;
let tokenInfo;
let bscscanRequest;
let cronjobs;
let farmPlatformResolver;
let farmAuto;

let polygonPriceOracle;
let polygonTokenCollector;
let polygonPriceCollector;
let polygonLiquidityTokenCollector;
let polygonCacheManager;
let polygonBalances;
let polygonTokenInfo;
let polygonDb;
let polygonFarmPlatformResolver;
let polygonFarmAuto;
let polygonFarmFetcher;

let fantomPriceOracle;
let fantomTokenCollector;
let fantomPriceCollector;
let fantomLiquidityTokenCollector;
let fantomCacheManager;
let fantomBalances;
let fantomTokenInfo;
let fantomDb;
let fantomFarmPlatformResolver;
let fantomFarmAuto;
let fantomFarmFetcher;
let fantomAdditionalTokenInfo;
let polygonAdditionalTokenInfo;

let stableCollector;

let kccPriceOracle;
let kccTokenCollector;
let kccPriceCollector;
let kccLiquidityTokenCollector;
let kccCacheManager;
let kccBalances;
let kccTokenInfo;
let kccDb;
let kccFarmPlatformResolver;
let kccAddressTransactions;
let kccFarmFetcher;

let harmonyPriceOracle;
let harmonyTokenCollector;
let harmonyPriceCollector;
let harmonyLiquidityTokenCollector;
let harmonyCacheManager;
let harmonyBalances;
let harmonyTokenInfo;
let harmonyDb;
let harmonyFarmPlatformResolver;
let harmonyAddressTransactions;
let harmonyFarmFetcher;

let celoPriceOracle;
let celoTokenCollector;
let celoPriceCollector;
let celoLiquidityTokenCollector;
let celoCacheManager;
let celoBalances;
let celoTokenInfo;
let celoDb;
let celoFarmPlatformResolver;
let celoAddressTransactions;
let celoFarmFetcher;

let moonriverPriceOracle;
let moonriverTokenCollector;
let moonriverPriceCollector;
let moonriverLiquidityTokenCollector;
let moonriverCacheManager;
let moonriverBalances;
let moonriverTokenInfo;
let moonriverDb;
let moonriverFarmPlatformResolver;
let moonriverAddressTransactions;
let moonriverFarmFetcher;

let cronosPriceOracle;
let cronosTokenCollector;
let cronosPriceCollector;
let cronosLiquidityTokenCollector;
let cronosCacheManager;
let cronosBalances;
let cronosTokenInfo;
let cronosDb;
let cronosFarmPlatformResolver;
let cronosAddressTransactions;
let cronosFarmFetcher;

let moonbeamPriceOracle;
let moonbeamTokenCollector;
let moonbeamPriceCollector;
let moonbeamLiquidityTokenCollector;
let moonbeamCacheManager;
let moonbeamBalances;
let moonbeamTokenInfo;
let moonbeamDb;
let moonbeamFarmPlatformResolver;
let moonbeamAddressTransactions;
let moonbeamFarmFetcher;

let priceFetcher;

const Cache = require("timed-cache");
const Sqlite = require("better-sqlite3");
const Http = require("./http");
const Db = require("./db");
const Balances = require("./balances");
const Platforms = require("./platforms/platforms");
const PriceOracle = require("./price_oracle");
const TokenCollector = require("./token/token_collector");
const PriceCollector = require("./token/price_collector");
const cacheManagerInstance = require('cache-manager');
const fsStore = require('cache-manager-fs-hash');
const path = require("path");
const AddressTransactions = require("./token/address_transactions");
const LiquidityTokenCollector = require("./token/liquidity_token_collector");
const FarmFetcher = require("./farm/farm_fetcher");
const ContractAbiFetcher = require("./abi/contract_abi_fetcher");
const TokenInfo = require("./token/token_info");
const BscscanRequest = require("./utils/bscscan_request");
const Cronjobs = require("./cronjobs");
const PolygonPriceOracle = require("./chains/polygon/polygon_price_oracle");
const FantomPriceOracle = require("./chains/fantom/fantom_price_oracle");
const KccPriceOracle = require("./chains/kcc/kcc_price_oracle");
const FarmPlatformResolver = require("./farm/farm_platform_resolver");
const HarmonyPriceOracle = require("./chains/harmony/harmony_price_oracle");
const PriceFetcher = require("./chains/bsc/bsc_price_fetcher");
const CeloPriceOracle = require("./chains/celo/celo_price_oracle");
const MoonriverPriceOracle = require("./chains/moonriver/moonriver_price_oracle");
const CronosPriceOracle = require("./chains/cronos/cronos_price_oracle");
const MoonbeamPriceOracle = require("./chains/moonbeam/moonbeam_price_oracle");
const CrossPlatforms = require("./platforms/cross_platforms");

const FantomAdditionalTokenInfo = require("./chains/fantom/fantom_additional_token_info");
const PolygonAdditionalTokenInfo = require("./chains/polygon/polygon_additional_token_info");

const StableCollector = require("./token/stable_collector");
const StableCollectorChecker = require("./token/stable_collector_checker");

const FarmAuto = require("./farm/farm_auto");

const CommonMasterChef = require("./platforms/common_master_chef");
const FantomPlatformsJson = require("./platforms/fantom/platforms.json");
const MoonbeamPlatformsJson = require("./platforms/moonbeam/platforms.json");
const PolygonPlatformsJson = require("./platforms/polygon/platforms.json");
const MoonriverPlatformsJson = require("./platforms/moonriver/platforms.json");
const KccPlatformsJson = require("./platforms/kcc/platforms.json");

const Pancake = require("./platforms/bsc/pancake/pancake");
const Swamp = require("./platforms/bsc/swamp/swamp");
const Blizzard = require("./platforms/bsc/blizzard/blizzard");
const Hyperjump = require("./platforms/bsc/hyperjump/hyperjump");
const Apeswap = require("./platforms/bsc/apeswap/apeswap");
const Goose = require("./platforms/bsc/goose/goose");
const Cheese = require("./platforms/bsc/cheese/cheese");
const Space = require("./platforms/bsc/space/space");
const Saltswap = require("./platforms/bsc/saltswap/saltswap");
const Mdex = require("./platforms/bsc/mdex/mdex");
const Pandayield = require("./platforms/bsc/pandayield/pandayield");
const Wault = require("./platforms/bsc/wault/wault");
const Cafeswap = require("./platforms/bsc/cafeswap/cafeswap");
const Belt = require("./platforms/bsc/belt/belt");
const Panther = require("./platforms/bsc/panther/panther");
const Jetswap = require("./platforms/bsc/jetswap/jetswap");
const Warden = require("./platforms/bsc/warden/warden");
const Biswap = require("./platforms/bsc/biswap/biswap");
const BiswapAuto = require("./platforms/bsc/biswap/biswap_auto");
const BiswapDecorator = require("./platforms/bsc/biswap/biswap_decorator");
const Theanimal = require("./platforms/bsc/theanimal/theanimal");

const Evodefi = require("./platforms/bsc/evodefi/evodefi");
const Eleven = require("./platforms/bsc/eleven/eleven");
const Coinswap = require("./platforms/bsc/coinswap/coinswap");
const Beefy = require("./platforms/bsc/beefy/beefy");
const Treedefi = require("./platforms/bsc/treedefi/treedefi");
const Farmhero = require("./platforms/bsc/farmhero/farmhero");
const Alpaca = require("./platforms/bsc/alpaca/alpaca");
const Yieldparrot = require("./platforms/bsc/yieldparrot/yieldparrot");
const Alpha = require("./platforms/bsc/alpha/alpha");
const Honeyfarm = require("./platforms/bsc/honeyfarm/honeyfarm");
const Rabbit = require("./platforms/bsc/rabbit/rabbit");
const RabbitDecorator = require("./platforms/bsc/rabbit/rabbit_decorator");
const RabbitDao = require("./platforms/bsc/rabbit/rabbit_dao");
const Cream = require("./platforms/bsc/cream/cream");
const Venus = require("./platforms/bsc/venus/venus");
const Fortress = require("./platforms/bsc/fortress/fortress");
const Fortube = require("./platforms/bsc/fortube/fortube");
const Bakery = require("./platforms/bsc/bakery/bakery");
const Planet = require("./platforms/bsc/planet/planet");
const PlanetLend = require("./platforms/bsc/planet/planet_lend");
const PlanetMaster = require("./platforms/bsc/planet/planet_master");
const Acryptos = require("./platforms/bsc/acryptos/acryptos");
const Pancakebunny = require("./platforms/bsc/pancakebunny/pancakebunny");
const Autofarm = require("./platforms/bsc/autofarm/autofarm");
const Jetfuel = require("./platforms/bsc/jetfuel/jetfuel");
const Ten = require("./platforms/bsc/ten/ten");
const Autoshark = require("./platforms/bsc/autoshark/autoshark");
const Mars = require("./platforms/bsc/mars/mars");
const MarsMasterchef0 = require("./platforms/bsc/mars/mars_masterchef0");
const MarsMasterchef1 = require("./platforms/bsc/mars/mars_masterchef1");
const Atlantis = require("./platforms/bsc/atlantis/atlantis");
const Synapse = require("./platforms/synapse");
const Annex = require("./platforms/bsc/annex/annex");
const Templar = require("./platforms/bsc/templar/templar");
const Nemesis = require("./platforms/bsc/nemesis/nemesis");
const Hunnydao = require("./platforms/bsc/hunnydao/hunnydao");
const Jade = require("./platforms/bsc/jade/jade");
const Unus = require("./platforms/bsc/unus/unus");

const Polycat = require("./platforms/polygon/polycat/polycat");
const Pjetswap = require("./platforms/polygon/pjetswap/pjetswap");
const Pswamp = require("./platforms/polygon/pswamp/pswamp");
const Ppancakebunny = require("./platforms/polygon/ppancakebunny/ppancakebunny");
const Mai = require("./platforms/polygon/mai/mai");
const Pfarmhero = require("./platforms/polygon/pfarmhero/pfarmhero");
const Polycrystal = require("./platforms/polygon/polycrystal/polycrystal");
const Mstable = require("./platforms/polygon/mstable/mstable");
const Dinoswap = require("./platforms/polygon/dinoswap/dinoswap");
const Pbeefy = require("./platforms/polygon/pbeefy/pbeefy");
const Pautofarm = require("./platforms/polygon/pautofarm/pautofarm");
const Dfyn = require("./platforms/polygon/dfyn/dfyn");
const Psushi = require("./platforms/polygon/psushi/psushi");
const Pcurve = require("./platforms/polygon/pcurve/pcurve");
const PolycatCompound = require("./platforms/polygon/polycat/polycat_compound");
const PolycatPaw = require("./platforms/polygon/polycat/polycat_paw");
const PolycatDecorator = require("./platforms/polygon/polycat/polycat_decorator");
const Peleven = require("./platforms/polygon/peleven/peleven");
const Adamant = require("./platforms/polygon/adamant/adamant");
const Quickswap = require("./platforms/polygon/quickswap/quickswap");
const PelevenLeverage = require("./platforms/polygon/peleven/peleven_leverage");
const PelevenDecorator = require("./platforms/polygon/peleven/peleven_decorator");
const Pcream = require("./platforms/polygon/pcream/pcream");
const Pfortube = require("./platforms/polygon/pfortube/pfortube");
const Balancer = require("./platforms/polygon/balancer/balancer");
const Impermax = require("./platforms/polygon/impermax/impermax");
const Paave = require("./platforms/polygon/paave/paave");
const Market = require("./platforms/polygon/market/market");
const MarketPool = require("./platforms/polygon/market/market_pool");
const Patlantis = require("./platforms/polygon/patlantis/patlantis");
const Uniswap = require("./platforms/polygon/uniswap/uniswap");

const Spiritswap = require("./platforms/fantom/spiritswap/spiritswap");
const Liquiddriver = require("./platforms/fantom/liquiddriver/liquiddriver");
const Fbeefy = require("./platforms/fantom/fbeefy/fbeefy");
const Fcurve = require("./platforms/fantom/fcurve/fcurve");
const Ester = require("./platforms/fantom/ester/ester");
const Frankenstein = require("./platforms/fantom/frankenstein/frankenstein");
const Reaper = require("./platforms/fantom/reaper/reaper");
const Fcream = require("./platforms/fantom/fcream/fcream");
const Tarot = require("./platforms/fantom/tarot/tarot");
const Fautofarm = require("./platforms/fantom/fautofarm/fautofarm");
const SpiritswapLend = require("./platforms/fantom/spiritswap/spiritswap_lend");
const SpiritswapDecorator = require("./platforms/fantom/spiritswap/spiritswap_decorator");
const Feleven = require("./platforms/fantom/feleven/feleven");
const Fswamp = require("./platforms/fantom/fswamp/fswamp");
const Beethovenx = require("./platforms/fantom/beethovenx/beethovenx");
const Robovault = require("./platforms/fantom/robovault/robovault");
const Geist = require("./platforms/fantom/geist/geist");
const Grim = require("./platforms/fantom/grim/grim");
const Scream = require("./platforms/fantom/scream/scream");
const Hectordao = require("./platforms/fantom/hectordao/hectordao");
const Fantohm = require("./platforms/fantom/fantohm/fantohm");
const Hundred = require("./platforms/fantom/hundred/hundred");
const Revenant = require("./platforms/fantom/revenant/revenant");
const RevenantMarket = require("./platforms/fantom/revenant/revenant_market");
const RevenantFarm = require("./platforms/fantom/revenant/revenant_farm");
const Luxor = require("./platforms/fantom/luxor/luxor");
const Fyearn = require("./platforms/fantom/fyearn/fyearn");
const Fmarket = require("./platforms/fantom/fmarket/fmarket");
const Fsushi = require("./platforms/fantom/fsushi/fsushi");

const Kuswap = require("./platforms/kcc/kuswap/kuswap");
const Kudex = require("./platforms/kcc/kudex/kudex");
const Kukafe = require("./platforms/kcc/kukafe/kukafe");
const KukafeCompound = require("./platforms/kcc/kukafe/kukafe_compound");
const KukafeDecorator = require("./platforms/kcc/kukafe/kukafe_decorator");
const Boneswap = require("./platforms/kcc/boneswap/boneswap");
const Mojito = require("./platforms/kcc/mojito/mojito");

const Hbeefy = require("./platforms/harmony/hbeefy/hbeefy");
const Hsushi = require("./platforms/harmony/hsushi/hsushi");
const Viper = require("./platforms/harmony/viper/viper");
const Hcurve = require("./platforms/harmony/hcurve/hcurve");
const Artemis = require("./platforms/harmony/artemis/artemis");
const Defikingdoms = require("./platforms/harmony/defikingdoms/defikingdoms");
const Farmersonly = require("./platforms/harmony/farmersonly/farmersonly");
const FarmersonlyFarm = require("./platforms/harmony/farmersonly/farmersonly_farm");
const FarmersonlyCompound = require("./platforms/harmony/farmersonly/farmersonly_compound");
const Openswap = require("./platforms/harmony/openswap/openswap");
const Openswap1 = require("./platforms/harmony/openswap/openswap1");
const Openswap2 = require("./platforms/harmony/openswap/openswap2");
const Tranquil = require("./platforms/harmony/tranquil/tranquil");
const Hautofarm = require("./platforms/harmony/hautofarm/hautofarm");
const Euphoria = require("./platforms/harmony/euphoria/euphoria");
const Hhundred = require("./platforms/harmony/hhundred/hhundred");
const Lootswap = require("./platforms/harmony/lootswap/lootswap");

const Ubeswap = require("./platforms/celo/ubeswap/ubeswap");
const Mobius = require("./platforms/celo/mobius/mobius");
const Csushi = require("./platforms/celo/csushi/csushi");
const Moola = require("./platforms/celo/moola/moola");
const Cbeefy = require("./platforms/celo/cbeefy/cbeefy");
const Cautofarm = require("./platforms/celo/cautofarm/cautofarm");
const Celodex = require("./platforms/celo/celodex/celodex");

const Mautofarm = require("./platforms/moonriver/mautofarm/mautofarm");
const Solarbeam = require("./platforms/moonriver/solarbeam/solarbeam");
const Huckleberry = require("./platforms/moonriver/huckleberry/huckleberry");
const Moonfarm = require("./platforms/moonriver/moonfarm/moonfarm");
const Moonkafe = require("./platforms/moonriver/moonkafe/moonkafe");
const MoonkafeCompound = require("./platforms/moonriver/moonkafe/moonkafe_compound");
const Mbeefy = require("./platforms/moonriver/mbeefy/mbeefy");
const Msushi = require("./platforms/moonriver/msushi/msushi");
const Mtemplar = require("./platforms/moonriver/mtemplar/mtemplar");

const Vvs = require("./platforms/cronos/vvs/vvs");
const VvsDecorator = require("./platforms/cronos/vvs/vvs_decorator");
const VvsAuto = require("./platforms/cronos/vvs/vvs_auto");
const Cronaswap = require("./platforms/cronos/cronaswap/cronaswap");
const Crodex = require("./platforms/cronos/crodex/crodex");
const Crokafe = require("./platforms/cronos/crokafe/crokafe");
const Crautofarm = require("./platforms/cronos/crautofarm/crautofarm");
const Crbeefy = require("./platforms/cronos/crbeefy/crbeefy");
const Crannex = require("./platforms/cronos/crannex/crannex");
const CrannexMasterchef = require("./platforms/cronos/crannex/crannex_masterchef");
const Mmf = require("./platforms/cronos/mmf/mmf");
const Mmo = require("./platforms/cronos/mmf/mmo");
const Tectonic = require("./platforms/cronos/tectonic/tectonic");

const Mbbeefy = require("./platforms/moonbeam/mbbeefy/mbbeefy");

let pancake;
let swamp;
let blizzard;
let hyperjump;
let apeswap;
let goose;
let cheese;
let space;
let saltswap;
let mdex;
let pandayield;
let wault;
let cafeswap;
let belt;
let panther;
let jetswap;
let warden;
let biswap;
let evodefi;
let eleven;
let coinswap;
let beefy;
let treedefi;
let farmhero;
let alpaca;
let yieldparrot;
let alpha;
let honeyfarm;
let rabbit;
let cream;
let venus;
let fortress;
let fortube;
let bakery;
let planet;
let acryptos;
let pancakebunny;
let autofarm;
let jetfuel;
let ten;
let autoshark;
let mars;
let atlantis;
let synapse;
let annex;
let templar;
let nemesis;
let hunnydao;
let jade;
let unus;
let theanimal;

let polycat;
let pjetswap;
let pswamp;
let ppancakebunny;
let mai;
let pfarmhero;
let polycrystal;
let mstable;
let dinoswap;
let pbeefy;
let pautofarm;
let dfyn;
let psushi;
let pcurve;
let polycatCompound;
let polycatPaw;
let polycatDecorator;
let peleven;
let adamant;
let quickswap;
let pelevenLeverage;
let pelevenDecorator;
let pcream;
let pfortube;
let balancer;
let impermax;
let paave;
let psynapse;
let market;
let patlantis;
let uniswap;

let spiritswap;
let spiritswapLend;
let liquiddriver;
let fbeefy;
let fcurve;
let ester;
let frankenstein;
let reaper;
let fcream;
let scream;
let tarot;
let fautofarm;
let spiritswapDecorator;
let feleven;
let fswamp;
let beethovenx;
let robovault;
let geist;
let grim;
let fsynapse;
let hectordao;
let fantohm;
let hundred;
let revenant;
let luxor;
let fyearn;
let fmarket;
let fsushi;

let kuswap;
let kudex;
let kukafe;
let boneswap;
let kukafeCompound;
let kukafeDecorator;
let mojito;

let hbeefy;
let hsushi;
let openswap;
let viper;
let hcurve;
let artemis;
let defikingdoms;
let tranquil;
let hsynapse;
let hautofarm;
let euphoria;
let hhundred;
let lootswap;

let ubeswap;
let mobius;
let csushi;
let moola;
let cbeefy;
let cautofarm;
let celodex;

let mautofarm;
let solarbeam;
let huckleberry;
let farmersonly;
let farmersonlyCompound;
let farmersonlyFarm;
let moonfarm;
let moonkafe;
let moonkafeCompound;
let mbeefy;
let msushi;
let mtemplar;

let vvs;
let cronaswap;
let crodex;
let crokafe;
let crautofarm
let crbeefy;
let crannex;
let mmf;
let tectonic;
let mmo;

let mbbeefy;

let polygonPlatform;
let fantomPlatform;
let kccPlatform;
let harmonyPlatform;
let celoPlatform;
let moonriverPlatform;
let cronosPlatform;
let moonbeamPlatform;

let crossPlatforms;

const _ = require("lodash");
const fs = require("fs");

module.exports = {
  Utils: require("./utils"),

  CONFIG: _.merge(
    JSON.parse(fs.readFileSync(path.resolve(__dirname, "../config.json"), "utf8")),
    fs.existsSync(path.resolve(__dirname, "../config.json.local")) ? JSON.parse(fs.readFileSync(path.resolve(__dirname, "../config.json.local"), "utf8")) : {}
  ),

  getDatabase() {
    if (database) {
      return database;
    }

    const myDb = Sqlite(path.resolve(__dirname, '../var/db.db'));
    myDb.pragma("journal_mode = WAL");
    myDb.pragma("SYNCHRONOUS = 1;");
    myDb.pragma("LOCKING_MODE = EXCLUSIVE;");

    return (database = myDb);
  },

  getCronjobs() {
    if (cronjobs) {
      return cronjobs;
    }

    return (cronjobs = new Cronjobs(
      this.getPlatforms(),
      this.getPriceOracle(),
      this.getPolygonPlatforms(),
      this.getPolygonPriceOracle(),
      this.getFantomPlatforms(),
      this.getFantomPriceOracle(),
      this.getFarmPlatformResolver(),
      this.getPolygonFarmPlatformResolver(),
      this.getFantomFarmPlatformResolver(),
      this.getFantomAdditionalTokenInfo(),
      this.getKccPlatforms(),
      this.getKccPriceOracle(),
      this.getKccFarmPlatformResolver(),
      this.getHarmonyPlatforms(),
      this.getHarmonyPriceOracle(),
      this.getHarmonyFarmPlatformResolver(),
      this.getCeloPlatforms(),
      this.getCeloPriceOracle(),
      this.getCeloFarmPlatformResolver(),
      this.getMoonriverPlatforms(),
      this.getMoonriverPriceOracle(),
      this.getMoonriverFarmPlatformResolver(),
      this.getCronosPlatforms(),
      this.getCronosPriceOracle(),
      this.getCronosFarmPlatformResolver(),
      this.getMoonbeamPlatforms(),
      this.getMoonbeamPriceOracle(),
      this.getMoonbeamFarmPlatformResolver(),
    ));
  },

  getFarmAuto() {
    if (farmAuto) {
      return farmAuto;
    }

    return (farmAuto = new FarmAuto(
      this.getPriceOracle(),
      this.getFarmFetcher(),
      this.getTokenCollector(),
      this.getCacheManager(),
      'bsc'
    ));
  },

  getPolygonFarmAuto() {
    if (polygonFarmAuto) {
      return polygonFarmAuto;
    }

    return (polygonFarmAuto = new FarmAuto(
      this.getPolygonPriceOracle(),
      this.getPolygonFarmFetcher(),
      this.getPolygonTokenCollector(),
      this.getPolygonCacheManager(),
      'polygon'
    ));
  },

  getFantomFarmAuto() {
    if (fantomFarmAuto) {
      return fantomFarmAuto;
    }

    return (fantomFarmAuto = new FarmAuto(
      this.getFantomPriceOracle(),
      this.getFantomFarmFetcher(),
      this.getFantomTokenCollector(),
      this.getFantomCacheManager(),
      'fantom'
    ));
  },

  getPriceOracle() {
    if (priceOracle) {
      return priceOracle;
    }

    return (priceOracle = new PriceOracle(
      this.getTokenCollector(),
      this.getLiquidityTokenCollector(),
      this.getPriceCollector(),
      this.getCacheManager(),
      this.getPriceFetcher(),
    ));
  },

  getPolygonPriceOracle() {
    if (polygonPriceOracle) {
      return polygonPriceOracle;
    }

    return (polygonPriceOracle = new PolygonPriceOracle(
      this.getPolygonTokenCollector(),
      this.getPolygonLiquidityTokenCollector(),
      this.getPolygonPriceCollector(),
      this.getPolygonCacheManager(),
      this.getPriceFetcher(),
    ));
  },

  getFantomPriceOracle() {
    if (fantomPriceOracle) {
      return fantomPriceOracle;
    }

    return (fantomPriceOracle = new FantomPriceOracle(
      this.getFantomTokenCollector(),
      this.getFantomLiquidityTokenCollector(),
      this.getFantomPriceCollector(),
      this.getFantomCacheManager(),
      this.getPriceFetcher(),
    ));
  },

  getKccPriceOracle() {
    if (kccPriceOracle) {
      return kccPriceOracle;
    }

    return (kccPriceOracle = new KccPriceOracle(
      this.getKccTokenCollector(),
      this.getKccLiquidityTokenCollector(),
      this.getKccPriceCollector(),
      this.getKccCacheManager(),
      this.getPriceFetcher(),
    ));
  },

  getHarmonyPriceOracle() {
    if (harmonyPriceOracle) {
      return harmonyPriceOracle;
    }

    return (harmonyPriceOracle = new HarmonyPriceOracle(
      this.getHarmonyTokenCollector(),
      this.getHarmonyLiquidityTokenCollector(),
      this.getHarmonyPriceCollector(),
      this.getHarmonyCacheManager(),
      this.getPriceFetcher(),
    ));
  },

  getCeloPriceOracle() {
    if (celoPriceOracle) {
      return celoPriceOracle;
    }

    return (celoPriceOracle = new CeloPriceOracle(
      this.getCeloTokenCollector(),
      this.getCeloLiquidityTokenCollector(),
      this.getCeloPriceCollector(),
      this.getCeloCacheManager(),
      this.getPriceFetcher(),
    ));
  },
  
  getMoonriverPriceOracle() {
    if (moonriverPriceOracle) {
      return moonriverPriceOracle;
    }

    return (moonriverPriceOracle = new MoonriverPriceOracle(
      this.getMoonriverTokenCollector(),
      this.getMoonriverLiquidityTokenCollector(),
      this.getMoonriverPriceCollector(),
      this.getMoonriverCacheManager(),
      this.getPriceFetcher(),
    ));
  },
  
  getCronosPriceOracle() {
    if (cronosPriceOracle) {
      return cronosPriceOracle;
    }

    return (cronosPriceOracle = new CronosPriceOracle(
      this.getCronosTokenCollector(),
      this.getCronosLiquidityTokenCollector(),
      this.getCronosPriceCollector(),
      this.getCronosCacheManager(),
      this.getPriceFetcher(),
    ));
  },
  
  getMoonbeamPriceOracle() {
    if (moonbeamPriceOracle) {
      return moonbeamPriceOracle;
    }

    return (moonbeamPriceOracle = new MoonbeamPriceOracle(
      this.getMoonbeamTokenCollector(),
      this.getMoonbeamLiquidityTokenCollector(),
      this.getMoonbeamPriceCollector(),
      this.getMoonbeamCacheManager(),
      this.getPriceFetcher(),
    ));
  },
  
  getPriceFetcher() {
    if (priceFetcher) {
      return priceFetcher;
    }

    return (priceFetcher = new PriceFetcher(
      this.getCacheManager(),
    ));
  },

  getFarmPlatformResolver() {
    if (farmPlatformResolver) {
      return farmPlatformResolver;
    }

    return (farmPlatformResolver = new FarmPlatformResolver(
      this.getCacheManager(),
    ));
  },

  getPolygonFarmPlatformResolver() {
    if (polygonFarmPlatformResolver) {
      return polygonFarmPlatformResolver;
    }

    return (polygonFarmPlatformResolver = new FarmPlatformResolver(
      this.getPolygonCacheManager(),
    ));
  },

  getFantomFarmPlatformResolver() {
    if (fantomFarmPlatformResolver) {
      return fantomFarmPlatformResolver;
    }

    return (fantomFarmPlatformResolver = new FarmPlatformResolver(
      this.getFantomCacheManager(),
    ));
  },

  getKccFarmPlatformResolver() {
    if (kccFarmPlatformResolver) {
      return kccFarmPlatformResolver;
    }

    return (kccFarmPlatformResolver = new FarmPlatformResolver(
      this.getKccCacheManager(),
    ));
  },

  getHarmonyFarmPlatformResolver() {
    if (harmonyFarmPlatformResolver) {
      return harmonyFarmPlatformResolver;
    }

    return (harmonyFarmPlatformResolver = new FarmPlatformResolver(
      this.getHarmonyCacheManager(),
    ));
  },

  getCeloFarmPlatformResolver() {
    if (celoFarmPlatformResolver) {
      return celoFarmPlatformResolver;
    }

    return (celoFarmPlatformResolver = new FarmPlatformResolver(
      this.getCeloCacheManager(),
    ));
  },

  getMoonriverFarmPlatformResolver() {
    if (moonriverFarmPlatformResolver) {
      return moonriverFarmPlatformResolver;
    }

    return (moonriverFarmPlatformResolver = new FarmPlatformResolver(
      this.getMoonriverCacheManager(),
    ));
  },
  
  getCronosFarmPlatformResolver() {
    if (cronosFarmPlatformResolver) {
      return cronosFarmPlatformResolver;
    }

    return (cronosFarmPlatformResolver = new FarmPlatformResolver(
      this.getCronosCacheManager(),
    ));
  },

  getMoonbeamFarmPlatformResolver() {
    if (moonbeamFarmPlatformResolver) {
      return moonbeamFarmPlatformResolver;
    }

    return (moonbeamFarmPlatformResolver = new FarmPlatformResolver(
      this.getMoonbeamCacheManager(),
    ));
  },
  
  getPlatforms() {
    if (platforms) {
      return platforms;
    }

    let folder = path.resolve(__dirname, "./platforms");
    return (platforms = new Platforms(
        [
          this.getPancake(),
          this.getBeefy(),
          this.getSwamp(),
          this.getBlizzard(),
          this.getHyperjump(),
          this.getApeswap(),
          this.getGoose(),
          this.getCheese(),
          this.getSpace(),
          this.getSaltswap(),
          this.getMdex(),
          this.getPandayield(),
          this.getWault(),
          this.getCafeswap(),
          this.getBelt(),
          this.getPanther(),
          this.getJetswap(),
          this.getWarden(),
          this.getBiswap(),
          this.getEvodefi(),
          this.getEleven(),
          this.getCoinswap(),
          this.getTreedefi(),
          this.getFarmhero(),
          this.getAlpaca(),
          this.getYieldparrot(),
          this.getAlpha(),
          this.getHoneyfarm(),
          this.getRabbit(),
          this.getCream(),
          this.getVenus(),
          this.getFortress(),
          this.getFortube(),
          this.getBakery(),
          this.getPlanet(),
          this.getAcryptos(),
          this.getPancakebunny(),
          this.getAutofarm(),
          this.getJetfuel(),
          this.getTen(),
          this.getAutoshark(),
          this.getMars(),
          this.getAtlantis(),
          this.getSynapse(),
          this.getAnnex(),
          this.getTemplar(),
          this.getNemesis(),
          this.getHunnydao(),
          this.getJade(),
          this.getUnus(),
          this.getTheanimal(),
        ],
        this.getCache(),
        this.getPriceOracle(),
        this.getTokenCollector(),
        folder
    ));
  },

  getPolygonPlatforms() {
    if (polygonPlatform) {
      return polygonPlatform;
    }

    const auto = PolygonPlatformsJson
      .filter(i => i.type === 'common_master_chef')
      .map(i => new CommonMasterChef(
        this.getPolygonCacheManager(),
        this.getPolygonPriceOracle(),
        this.getPolygonTokenCollector(),
        this.getPolygonLiquidityTokenCollector(),
        this.getPolygonFarmFetcher(),
        _.merge(_.cloneDeep(i), {'chain': 'polygon'}),
      ));

    return (polygonPlatform = new Platforms(
      [
        this.getPolycatDecorator(),
        this.getPjetswap(),
        this.getPswamp(),
        this.getPpancakebunny(),
        this.getMai(),
        this.getPfarmhero(),
        this.getPolycrystal(),
        this.getMstable(),
        this.getDinoswap(),
        this.getPbeefy(),
        this.getPautofarm(),
        this.getDfyn(),
        this.getPsushi(),
        this.getPcurve(),
        this.getPelevenDecorator(),
        this.getAdamant(),
        this.getQuickswap(),
        this.getPcream(),
        this.getPfortube(),
        this.getBalancer(),
        this.getImpermax(),
        this.getPaave(),
        this.getPSynapse(),
        this.getMarket(),
        this.getPatlantis(),
        this.getUniswap(),
        ...auto
      ],
      this.getCache(),
      this.getPolygonPriceOracle(),
      this.getPolygonTokenCollector(),
    ));
  },

  getFantomPlatforms() {
    if (fantomPlatform) {
      return fantomPlatform;
    }

    const auto = FantomPlatformsJson
      .filter(i => i.type === 'common_master_chef')
      .map(i => new CommonMasterChef(
        this.getFantomCacheManager(),
        this.getFantomPriceOracle(),
        this.getFantomTokenCollector(),
        this.getFantomLiquidityTokenCollector(),
        this.getFantomFarmFetcher(),
        _.merge(_.cloneDeep(i), {'chain': 'fantom'}),
      ))

    return (fantomPlatform = new Platforms(
      [
        this.getSpiritswapDecorator(),
        this.getLiquiddriver(),
        this.getFbeefy(),
        this.getFcurve(),
        this.getEster(),
        this.getFrankenstein(),
        this.getReaper(),
        this.getFcream(),
        this.getScream(),
        this.getTarot(),
        this.getFautofarm(),
        this.getFeleven(),
        this.getFswamp(),
        this.getBeethovenx(),
        this.getRobovault(),
        this.getGeist(),
        this.getGrim(),
        this.getFSynapse(),
        this.getHectordao(),
        this.getFantohm(),
        this.getHundred(),
        this.getRevenant(),
        this.getLuxor(),
        this.getFyearn(),
        this.getFmarket(),
        this.getFsushi(),
        ...auto
      ],
      this.getCache(),
      this.getFantomPriceOracle(),
      this.getFantomTokenCollector(),
    ));
  },

  getKccPlatforms() {
    if (kccPlatform) {
      return kccPlatform;
    }

    const auto = KccPlatformsJson
      .filter(i => i.type === 'common_master_chef')
      .map(i => new CommonMasterChef(
        this.getKccCacheManager(),
        this.getKccPriceOracle(),
        this.getKccTokenCollector(),
        this.getKccLiquidityTokenCollector(),
        this.getKccFarmFetcher(),
        _.merge(_.cloneDeep(i), {'chain': 'kcc'}),
      ));

    return (kccPlatform = new Platforms(
      [
        this.getKuswap(),
        this.getKudex(),
        this.getKukafeDecorator(),
        this.getBoneswap(),
        this.getMojito(),
        ...auto
      ],
      this.getCache(),
      this.getKccPriceOracle(),
      this.getKccTokenCollector(),
    ));
  },

  getMoonriverPlatforms() {
    if (moonriverPlatform) {
      return moonriverPlatform;
    }

    const auto = MoonriverPlatformsJson
      .filter(i => i.type === 'common_master_chef')
      .map(i => new CommonMasterChef(
        this.getMoonriverCacheManager(),
        this.getMoonriverPriceOracle(),
        this.getMoonriverTokenCollector(),
        this.getMoonriverLiquidityTokenCollector(),
        this.getMoonriverFarmFetcher(),
        _.merge(_.cloneDeep(i), {'chain': 'moonriver'}),
      ));

    return (moonriverPlatform = new Platforms(
      [
        this.getMautofarm(),
        this.getSolarbeam(),
        this.getHuckleberry(),
        this.getMoonfarm(),
        this.getMoonkafe(),
        this.getMbeefy(),
        this.getMsushi(),
        this.getMtemplar(),
        ...auto
      ],
      this.getCache(),
      this.getMoonriverPriceOracle(),
      this.getMoonriverTokenCollector(),
    ));
  },

  getMoonbeamPlatforms() {
    if (moonbeamPlatform) {
      return moonbeamPlatform;
    }

    const auto = MoonbeamPlatformsJson
      .filter(i => i.type === 'common_master_chef')
      .map(i => new CommonMasterChef(
        this.getMoonbeamCacheManager(),
        this.getMoonbeamPriceOracle(),
        this.getMoonbeamTokenCollector(),
        this.getMoonbeamLiquidityTokenCollector(),
        this.getMoonbeamFarmFetcher(),
        _.merge(_.cloneDeep(i), {'chain': 'moonbeam'}),
      ));

    return (moonbeamPlatform = new Platforms(
      [
        this.getMbbeefy(),
        ...auto
      ],
      this.getCache(),
      this.getMoonbeamPriceOracle(),
      this.getMoonbeamTokenCollector(),
    ));
  },

  getCronosPlatforms() {
    if (cronosPlatform) {
      return cronosPlatform;
    }

    return (cronosPlatform = new Platforms(
      [
        this.getVvs(),
        this.getCronaswap(),
        this.getCrodex(),
        this.getCrokafe(),
        this.getCrautofarm(),
        this.getCrbeefy(),
        this.getCrannex(),
        this.getMmf(),
        this.getMmo(),
        this.getTectonic(),
      ],
      this.getCache(),
      this.getCronosPriceOracle(),
      this.getCronosTokenCollector(),
    ));
  },
  
  getHarmonyPlatforms() {
    if (harmonyPlatform) {
      return harmonyPlatform;
    }

    return (harmonyPlatform = new Platforms(
      [
        this.getHbeefy(),
        this.getHsushi(),
        this.getOpenswap(),
        this.getViper(),
        this.getHcurve(),
        this.getArtemis(),
        this.getDefikingdoms(),
        this.getFarmersonly(),
        this.getTranquil(),
        this.getHSynapse(),
        this.getHautofarm(),
        this.getEuphoria(),
        this.getHhundred(),
        this.getLootswap(),
      ],
      this.getCache(),
      this.getHarmonyPriceOracle(),
      this.getHarmonyTokenCollector(),
    ));
  },

  getCeloPlatforms() {
    if (celoPlatform) {
      return celoPlatform;
    }

    return (celoPlatform = new Platforms(
      [
        this.getUbeswap(),
        this.getMobius(),
        this.getCsushi(),
        this.getMoola(),
        this.getCbeefy(),
        this.getCautofarm(),
        this.getCelodex(),
      ],
      this.getCache(),
      this.getCeloPriceOracle(),
      this.getCeloTokenCollector(),
    ));
  },

  getCrossPlatforms() {
    if (crossPlatforms) {
      return crossPlatforms;
    }

    return (crossPlatforms = new CrossPlatforms(
      [
        this.getPlatforms(),
        this.getPolygonPlatforms(),
        this.getFantomPlatforms(),
        this.getHarmonyPlatforms(),
        this.getCeloPlatforms(),
        this.getKccPlatforms(),
        this.getMoonriverPlatforms(),
        this.getMoonbeamPlatforms(),
      ],
    ));
  },

  getPancake() {
    if (pancake) {
      return pancake;
    }

    return (pancake = new Pancake(
      this.getPriceOracle(),
      this.getTokenCollector(),
      this.getFarmFetcher(),
      this.getCacheManager(),
      this.getLiquidityTokenCollector(),
    ));
  },

  getSwamp() {
    if (swamp) {
      return swamp;
    }

    return (swamp = new Swamp(
      this.getCacheManager(),
      this.getPriceOracle(),
      this.getTokenCollector(),
      this.getFarmFetcher(),
      this.getCacheManager(),
    ));
  },

  getPolycat() {
    if (polycat) {
      return polycat;
    }

    return (polycat = new Polycat(
      this.getPolygonCacheManager(),
      this.getPolygonPriceOracle(),
      this.getPolygonTokenCollector(),
      this.getPolygonFarmFetcher(),
      this.getPolygonCacheManager(),
    ));
  },

  getPolycatPaw() {
    if (polycatPaw) {
      return polycatPaw;
    }

    return (polycatPaw = new PolycatPaw(
      this.getPolygonCacheManager(),
      this.getPolygonPriceOracle(),
      this.getPolygonTokenCollector(),
      this.getPolygonFarmFetcher(),
      this.getPolygonCacheManager(),
    ));
  },

  getPjetswap() {
    if (pjetswap) {
      return pjetswap;
    }

    return (pjetswap = new Pjetswap(
      this.getPolygonCacheManager(),
      this.getPolygonPriceOracle(),
      this.getPolygonTokenCollector(),
      this.getPolygonFarmFetcher(),
      this.getPolygonCacheManager(),
    ));
  },

  getPolycatCompound() {
    if (polycatCompound) {
      return polycatCompound;
    }

    return (polycatCompound = new PolycatCompound(
      this.getPolygonCacheManager(),
      this.getPolygonPriceOracle(),
      this.getPolygonTokenCollector(),
      this.getPolygonFarmFetcher(),
      this.getPolygonCacheManager(),
      this.getPolygonFarmPlatformResolver(),
    ));
  },

  getPolycatDecorator() {
    if (polycatDecorator) {
      return polycatDecorator;
    }

    return (polycatDecorator = new PolycatDecorator(
      this.getPolycat(),
      this.getPolycatCompound(),
      this.getPolycatPaw(),
    ));
  },

  getPswamp() {
    if (pswamp) {
      return pswamp;
    }

    return (pswamp = new Pswamp(
      this.getPolygonCacheManager(),
      this.getPolygonPriceOracle(),
      this.getPolygonTokenCollector(),
      this.getPolygonFarmFetcher(),
      this.getPolygonCacheManager(),
    ));
  },

  getFswamp() {
    if (fswamp) {
      return fswamp;
    }

    return (fswamp = new Fswamp(
      this.getFantomCacheManager(),
      this.getFantomPriceOracle(),
      this.getFantomTokenCollector(),
      this.getFantomFarmFetcher(),
      this.getFantomCacheManager(),
    ));
  },

  getViper() {
    if (viper) {
      return viper;
    }

    return (viper = new Viper(
      this.getHarmonyCacheManager(),
      this.getHarmonyPriceOracle(),
      this.getHarmonyTokenCollector(),
      this.getHarmonyFarmFetcher(),
      this.getHarmonyCacheManager(),
    ));
  },

  getHcurve() {
    if (hcurve) {
      return hcurve;
    }

    return (hcurve = new Hcurve(
      this.getHarmonyCacheManager(),
      this.getHarmonyPriceOracle(),
      this.getHarmonyTokenCollector(),
    ));
  },

  getArtemis() {
    if (artemis) {
      return artemis;
    }

    return (artemis = new Artemis(
      this.getHarmonyCacheManager(),
      this.getHarmonyPriceOracle(),
      this.getHarmonyTokenCollector(),
      this.getHarmonyFarmFetcher(),
      this.getHarmonyCacheManager(),
    ));
  },

  getDefikingdoms() {
    if (defikingdoms) {
      return defikingdoms;
    }

    return (defikingdoms = new Defikingdoms(
      this.getHarmonyCacheManager(),
      this.getHarmonyPriceOracle(),
      this.getHarmonyTokenCollector(),
      this.getHarmonyFarmFetcher(),
      this.getHarmonyCacheManager(),
    ));
  },

  getPancakebunny() {
    if (pancakebunny) {
      return pancakebunny;
    }

    return (pancakebunny = new Pancakebunny(
      this.getCacheManager(),
      this.getPriceOracle(),
      this.getTokenCollector(),
    ));
  },

  getPpancakebunny() {
    if (ppancakebunny) {
      return ppancakebunny;
    }

    return (ppancakebunny = new Ppancakebunny(
      this.getPolygonCacheManager(),
      this.getPolygonPriceOracle(),
      this.getPolygonTokenCollector(),
    ));
  },

  getMai() {
    if (mai) {
      return mai;
    }

    return (mai = new Mai(
      this.getPolygonCacheManager(),
      this.getPolygonPriceOracle(),
      this.getPolygonTokenCollector(),
      this.getPolygonFarmFetcher(),
      this.getPolygonCacheManager(),
    ));
  },

  getPfarmhero() {
    if (pfarmhero) {
      return pfarmhero;
    }

    return (pfarmhero = new Pfarmhero(
      this.getPolygonCacheManager(),
      this.getPolygonPriceOracle(),
      this.getPolygonTokenCollector(),
      this.getPolygonFarmFetcher(),
      this.getPolygonCacheManager(),
    ));
  },

  getPolycrystal() {
    if (polycrystal) {
      return polycrystal;
    }

    return (polycrystal = new Polycrystal(
      this.getPolygonCacheManager(),
      this.getPolygonPriceOracle(),
      this.getPolygonTokenCollector(),
      this.getPolygonFarmFetcher(),
      this.getPolygonCacheManager(),
    ));
  },

  getDinoswap() {
    if (dinoswap) {
      return dinoswap;
    }

    return (dinoswap = new Dinoswap(
      this.getPolygonCacheManager(),
      this.getPolygonPriceOracle(),
      this.getPolygonTokenCollector(),
      this.getPolygonFarmFetcher(),
      this.getPolygonCacheManager(),
    ));
  },

  getPsushi() {
    if (psushi) {
      return psushi;
    }

    return (psushi = new Psushi(
      this.getPolygonCacheManager(),
      this.getPolygonPriceOracle(),
      this.getPolygonTokenCollector(),
      this.getPolygonLiquidityTokenCollector(),
      this.getPolygonFarmFetcher(),
      this.getPolygonCacheManager(),
    ));
  },

  getFsushi() {
    if (fsushi) {
      return fsushi;
    }

    return (fsushi = new Fsushi(
      this.getFantomCacheManager(),
      this.getFantomPriceOracle(),
      this.getFantomTokenCollector(),
      this.getFantomLiquidityTokenCollector(),
      this.getFantomFarmFetcher(),
      this.getFantomCacheManager(),
    ));
  },

  getHsushi() {
    if (hsushi) {
      return hsushi;
    }

    return (hsushi = new Hsushi(
      this.getHarmonyCacheManager(),
      this.getHarmonyPriceOracle(),
      this.getHarmonyTokenCollector(),
      this.getHarmonyLiquidityTokenCollector(),
      this.getHarmonyFarmFetcher(),
      this.getHarmonyCacheManager(),
    ));
  },

  getOpenswap() {
    if (openswap) {
      return openswap;
    }

    return (openswap = new Openswap(
      new Openswap1(
        this.getHarmonyCacheManager(),
        this.getHarmonyPriceOracle(),
        this.getHarmonyTokenCollector(),
        this.getHarmonyFarmFetcher(),
        this.getHarmonyCacheManager(),
      ),
      new Openswap2(
        this.getHarmonyCacheManager(),
        this.getHarmonyPriceOracle(),
        this.getHarmonyTokenCollector(),
        this.getHarmonyFarmFetcher(),
        this.getHarmonyCacheManager(),
      )
    ));
  },

  getPcurve() {
    if (pcurve) {
      return pcurve;
    }

    return (pcurve = new Pcurve(
      this.getPolygonCacheManager(),
      this.getPolygonPriceOracle(),
      this.getPolygonTokenCollector(),
    ));
  },

  getPbeefy() {
    if (pbeefy) {
      return pbeefy;
    }

    return (pbeefy = new Pbeefy(
      this.getPolygonCacheManager(),
      this.getPolygonPriceOracle(),
      this.getPolygonTokenCollector(),
      this.getPolygonLiquidityTokenCollector(),
    ));
  },

  getAutofarm() {
    if (autofarm) {
      return autofarm;
    }

    return (autofarm = new Autofarm(
      this.getCacheManager(),
      this.getPriceOracle(),
      this.getLiquidityTokenCollector(),
    ));
  },

  getJetfuel() {
    if (jetfuel) {
      return jetfuel;
    }

    return (jetfuel = new Jetfuel(
      this.getCacheManager(),
      this.getPriceOracle(),
    ));
  },

  getTen() {
    if (ten) {
      return ten;
    }

    return (ten = new Ten(
      this.getCacheManager(),
      this.getPriceOracle(),
      this.getTokenCollector(),
      this.getFarmFetcher(),
      this.getCacheManager(),
      this.getFarmPlatformResolver(),
      this.getLiquidityTokenCollector(),
    ));
  },

  getMars() {
    if (mars) {
      return mars;
    }

    return (mars = new Mars(
      new MarsMasterchef0(
        this.getCacheManager(),
        this.getPriceOracle(),
        this.getTokenCollector(),
        this.getFarmFetcher(),
        this.getCacheManager(),
        this.getFarmPlatformResolver(),
        this.getLiquidityTokenCollector(),
      ),
      new MarsMasterchef1(
        this.getCacheManager(),
        this.getPriceOracle(),
        this.getTokenCollector(),
        this.getFarmFetcher(),
        this.getCacheManager(),
        this.getFarmPlatformResolver(),
        this.getLiquidityTokenCollector(),
      ),
    ));
  },

  getAtlantis() {
    if (atlantis) {
      return atlantis;
    }

    return (atlantis = new Atlantis(
      this.getPriceOracle(),
      this.getTokenCollector(),
      this.getCacheManager(),
      this.getLiquidityTokenCollector(),
      this.getFarmPlatformResolver(),
    ));
  },

  getPatlantis() {
    if (patlantis) {
      return patlantis;
    }

    return (patlantis = new Patlantis(
      this.getPolygonPriceOracle(),
      this.getPolygonTokenCollector(),
      this.getPolygonCacheManager(),
      this.getPolygonLiquidityTokenCollector(),
      this.getPolygonFarmPlatformResolver(),
    ));
  },

  getMarket() {
    if (market) {
      return market;
    }

    return (market = new Market(
      new MarketPool(
        this.getPolygonPriceOracle(),
        this.getPolygonTokenCollector(),
        this.getPolygonCacheManager(),
        this.getPolygonLiquidityTokenCollector(),
        this.getPolygonFarmPlatformResolver(),
        this.getPolygonAdditionalTokenInfo(),
        5,
        '0x5BeB233453d3573490383884Bd4B9CbA0663218a',
        'polygon',
        'market',
      ),
      new MarketPool(
        this.getPolygonPriceOracle(),
        this.getPolygonTokenCollector(),
        this.getPolygonCacheManager(),
        this.getPolygonLiquidityTokenCollector(),
        this.getPolygonFarmPlatformResolver(),
        this.getPolygonAdditionalTokenInfo(),
        3,
        '0x296233b4f2FEf1Ce7977340cEb3cec4CbE3ada42',
        'polygon',
        'market',
      ),
    ));
  },

  getFmarket() {
    if (fmarket) {
      return fmarket;
    }

    // https://fantom.market.xyz/api/getAllPools
    return (fmarket = new Fmarket(
      new MarketPool(
        this.getFantomPriceOracle(),
        this.getFantomTokenCollector(),
        this.getFantomCacheManager(),
        this.getFantomLiquidityTokenCollector(),
        this.getFantomFarmPlatformResolver(),
        this.getFantomAdditionalTokenInfo(),
        0,
        '0x4D261478F0a17F0035Fdc3B98724ECaEC1C974B8',
        'fantom',
        'fmarket',
      ),
      new MarketPool(
        this.getFantomPriceOracle(),
        this.getFantomTokenCollector(),
        this.getFantomCacheManager(),
        this.getFantomLiquidityTokenCollector(),
        this.getFantomFarmPlatformResolver(),
        this.getFantomAdditionalTokenInfo(),
        2,
        '0x3f16B195069eeb489D12243F57E20fBBf4A916EC',
        'fantom',
        'fmarket',
      ),
      new MarketPool(
        this.getFantomPriceOracle(),
        this.getFantomTokenCollector(),
        this.getFantomCacheManager(),
        this.getFantomLiquidityTokenCollector(),
        this.getFantomFarmPlatformResolver(),
        this.getFantomAdditionalTokenInfo(),
        3,
        '0xe778b28b450cBEC40Ce4db67F049E3e62be84FD6',
        'fantom',
        'fmarket',
      ),
      new MarketPool(
        this.getFantomPriceOracle(),
        this.getFantomTokenCollector(),
        this.getFantomCacheManager(),
        this.getFantomLiquidityTokenCollector(),
        this.getFantomFarmPlatformResolver(),
        this.getFantomAdditionalTokenInfo(),
        4,
        '0xB117fB27518F3c85A6Ea54509BBC9e104b4b3F0c',
        'fantom',
        'fmarket',
      ),
      new MarketPool(
        this.getFantomPriceOracle(),
        this.getFantomTokenCollector(),
        this.getFantomCacheManager(),
        this.getFantomLiquidityTokenCollector(),
        this.getFantomFarmPlatformResolver(),
        this.getFantomAdditionalTokenInfo(),
        5,
        '0x718f883605209e9eD50D8c73d735a5E9AE8DfE4b',
        'fantom',
        'fmarket',
      ),
      new MarketPool(
        this.getFantomPriceOracle(),
        this.getFantomTokenCollector(),
        this.getFantomCacheManager(),
        this.getFantomLiquidityTokenCollector(),
        this.getFantomFarmPlatformResolver(),
        this.getFantomAdditionalTokenInfo(),
        6,
        '0xD2FA932784F2dAE4DDF6eCd3a5578Fa9a95De559',
        'fantom',
        'fmarket',
      ),
      new MarketPool(
        this.getFantomPriceOracle(),
        this.getFantomTokenCollector(),
        this.getFantomCacheManager(),
        this.getFantomLiquidityTokenCollector(),
        this.getFantomFarmPlatformResolver(),
        this.getFantomAdditionalTokenInfo(),
        8,
        '0x4aaEDb7e2F5C5470A89e7B9aFc583072322D7f6a',
        'fantom',
        'fmarket',
      ),
    ));
  },

  getAnnex() {
    if (annex) {
      return annex;
    }

    return (annex = new Annex(
      this.getPriceOracle(),
      this.getTokenCollector(),
      this.getCacheManager(),
      this.getLiquidityTokenCollector(),
      this.getFarmPlatformResolver(),
    ));
  },

  getTemplar() {
    if (templar) {
      return templar;
    }

    return (templar = new Templar(
      this.getPriceOracle(),
      this.getTokenCollector(),
      this.getCacheManager(),
      this.getLiquidityTokenCollector(),
      this.getFarmPlatformResolver(),
    ));
  },

  getNemesis() {
    if (nemesis) {
      return nemesis;
    }

    return (nemesis = new Nemesis(
      this.getPriceOracle(),
      this.getTokenCollector(),
      this.getCacheManager(),
      this.getLiquidityTokenCollector(),
      this.getFarmPlatformResolver(),
    ));
  },

  getHunnydao() {
    if (hunnydao) {
      return hunnydao;
    }

    return (hunnydao = new Hunnydao(
      this.getPriceOracle(),
      this.getTokenCollector(),
      this.getCacheManager(),
      this.getLiquidityTokenCollector(),
      this.getFarmPlatformResolver(),
    ));
  },

  getJade() {
    if (jade) {
      return jade;
    }

    return (jade = new Jade(
      this.getPriceOracle(),
      this.getTokenCollector(),
      this.getCacheManager(),
      this.getLiquidityTokenCollector(),
      this.getFarmPlatformResolver(),
    ));
  },

  getUnus() {
    if (unus) {
      return unus;
    }

    return (unus = new Unus(
      this.getPriceOracle(),
      this.getTokenCollector(),
      this.getCacheManager(),
      this.getLiquidityTokenCollector(),
      this.getFarmPlatformResolver(),
    ));
  },

  getMtemplar() {
    if (mtemplar) {
      return mtemplar;
    }

    return (mtemplar = new Mtemplar(
      this.getMoonriverPriceOracle(),
      this.getMoonriverTokenCollector(),
      this.getMoonriverCacheManager(),
      this.getMoonriverLiquidityTokenCollector(),
      this.getMoonriverFarmPlatformResolver(),
    ));
  },

  getTranquil() {
    if (tranquil) {
      return tranquil;
    }

    return (tranquil = new Tranquil(
      this.getHarmonyPriceOracle(),
      this.getHarmonyTokenCollector(),
      this.getHarmonyCacheManager(),
      this.getHarmonyLiquidityTokenCollector(),
      this.getHarmonyFarmPlatformResolver(),
    ));
  },

  getFarmersonly() {
    if (farmersonly) {
      return farmersonly;
    }

    return (farmersonly = new Farmersonly(
      this.getFarmersonlyCompound(),
      this.getFarmersonlyFarm(),
    ));
  },

  getFarmersonlyCompound() {
    if (farmersonlyCompound) {
      return farmersonlyCompound;
    }

    return (farmersonlyCompound = new FarmersonlyCompound(
      this.getHarmonyCacheManager(),
      this.getHarmonyPriceOracle(),
      this.getHarmonyTokenCollector(),
      this.getHarmonyFarmFetcher(),
      this.getHarmonyCacheManager(),
      this.getHarmonyFarmPlatformResolver(),
      this.getHarmonyLiquidityTokenCollector(),
    ));
  },

  getFarmersonlyFarm() {
    if (farmersonlyFarm) {
      return farmersonlyFarm;
    }

    return (farmersonlyFarm = new FarmersonlyFarm(
      this.getHarmonyCacheManager(),
      this.getHarmonyPriceOracle(),
      this.getHarmonyTokenCollector(),
      this.getHarmonyLiquidityTokenCollector(),
      this.getHarmonyFarmFetcher(),
      this.getHarmonyCacheManager(),
    ));
  },

  getPautofarm() {
    if (pautofarm) {
      return pautofarm;
    }

    return (pautofarm = new Pautofarm(
      this.getPolygonCacheManager(),
      this.getPolygonPriceOracle(),
      this.getPolygonLiquidityTokenCollector(),
    ));
  },

  getHautofarm() {
    if (hautofarm) {
      return hautofarm;
    }

    return (hautofarm = new Hautofarm(
      this.getHarmonyCacheManager(),
      this.getHarmonyPriceOracle(),
      this.getHarmonyLiquidityTokenCollector(),
    ));
  },

  getFautofarm() {
    if (fautofarm) {
      return fautofarm;
    }

    return (fautofarm = new Fautofarm(
      this.getFantomCacheManager(),
      this.getFantomPriceOracle(),
      this.getFantomLiquidityTokenCollector(),
    ));
  },

  getMautofarm() {
    if (mautofarm) {
      return mautofarm;
    }

    return (mautofarm = new Mautofarm(
      this.getMoonriverCacheManager(),
      this.getMoonriverPriceOracle(),
      this.getMoonriverLiquidityTokenCollector(),
    ));
  },

  getSolarbeam() {
    if (solarbeam) {
      return solarbeam;
    }

    return (solarbeam = new Solarbeam(
      this.getMoonriverCacheManager(),
      this.getMoonriverPriceOracle(),
      this.getMoonriverTokenCollector(),
      this.getMoonriverFarmFetcher(),
      this.getMoonriverCacheManager(),
    ));
  },

  getMoonfarm() {
    if (moonfarm) {
      return moonfarm;
    }

    return (moonfarm = new Moonfarm(
      this.getMoonriverCacheManager(),
      this.getMoonriverPriceOracle(),
      this.getMoonriverTokenCollector(),
      this.getMoonriverFarmFetcher(),
      this.getMoonriverCacheManager(),
    ));
  },

  getHuckleberry() {
    if (huckleberry) {
      return huckleberry;
    }

    return (huckleberry = new Huckleberry(
      this.getMoonriverCacheManager(),
      this.getMoonriverPriceOracle(),
      this.getMoonriverTokenCollector(),
      this.getMoonriverFarmFetcher(),
      this.getMoonriverCacheManager(),
    ));
  },

  getDfyn() {
    if (dfyn) {
      return dfyn;
    }

    return (dfyn = new Dfyn(
      this.getPolygonCacheManager(),
      this.getPolygonPriceOracle(),
      this.getPolygonTokenCollector(),
    ));
  },

  getMstable() {
    if (mstable) {
      return mstable;
    }

    return (mstable = new Mstable(
      this.getCacheManager(),
      this.getPolygonPriceOracle(),
      this.getPolygonTokenCollector(),
    ));
  },

  getSpiritswap() {
    if (spiritswap) {
      return spiritswap;
    }

    return (spiritswap = new Spiritswap(
      this.getFantomCacheManager(),
      this.getFantomPriceOracle(),
      this.getFantomTokenCollector(),
      this.getFantomFarmFetcher(),
      this.getFantomCacheManager(),
    ));
  },

  getSpiritswapLend() {
    if (spiritswapLend) {
      return spiritswapLend;
    }

    return (spiritswapLend = new SpiritswapLend(
      this.getFantomPriceOracle(),
      this.getFantomTokenCollector(),
      this.getFantomCacheManager(),
      this.getFantomLiquidityTokenCollector(),
      this.getFantomFarmPlatformResolver(),
    ));
  },

  getSpiritswapDecorator() {
    if (spiritswapDecorator) {
      return spiritswapDecorator;
    }

    return (spiritswapDecorator = new SpiritswapDecorator(
      this.getSpiritswap(),
      this.getSpiritswapLend(),
    ));
  },

  getLiquiddriver() {
    if (liquiddriver) {
      return liquiddriver;
    }

    return (liquiddriver = new Liquiddriver(
      this.getFantomCacheManager(),
      this.getFantomPriceOracle(),
      this.getFantomTokenCollector(),
      this.getFantomLiquidityTokenCollector(),
      this.getFantomFarmFetcher(),
      this.getFantomCacheManager(),
    ));
  },

  getFbeefy() {
    if (fbeefy) {
      return fbeefy;
    }

    return (fbeefy = new Fbeefy(
      this.getFantomCacheManager(),
      this.getFantomPriceOracle(),
      this.getFantomTokenCollector(),
      this.getFantomLiquidityTokenCollector(),
    ));
  },

  getCbeefy() {
    if (cbeefy) {
      return cbeefy;
    }

    return (cbeefy = new Cbeefy(
      this.getCeloCacheManager(),
      this.getCeloPriceOracle(),
      this.getCeloTokenCollector(),
      this.getCeloLiquidityTokenCollector(),
    ));
  },

  getCautofarm() {
    if (cautofarm) {
      return cautofarm;
    }

    return (cautofarm = new Cautofarm(
      this.getMoonriverCacheManager(),
      this.getMoonriverPriceOracle(),
      this.getMoonriverLiquidityTokenCollector(),
    ));
  },

  getCelodex() {
    if (celodex) {
      return celodex;
    }

    return (celodex = new Celodex(
      this.getCeloCacheManager(),
      this.getCeloPriceOracle(),
      this.getCeloTokenCollector(),
      this.getCeloFarmFetcher(),
      this.getCeloCacheManager(),
    ));
  },

  getFcurve() {
    if (fcurve) {
      return fcurve;
    }

    return (fcurve = new Fcurve(
      this.getFantomCacheManager(),
      this.getFantomPriceOracle(),
      this.getFantomTokenCollector(),
    ));
  },

  getEster() {
    if (ester) {
      return ester;
    }

    return (ester = new Ester(
      this.getFantomCacheManager(),
      this.getFantomPriceOracle(),
      this.getFantomTokenCollector(),
      this.getFantomFarmFetcher(),
      this.getFantomCacheManager(),
      this.getFantomFarmPlatformResolver(),
      this.getFantomLiquidityTokenCollector(),
    ));
  },

  getFrankenstein() {
    if (frankenstein) {
      return frankenstein;
    }

    return (frankenstein = new Frankenstein(
      this.getFantomCacheManager(),
      this.getFantomPriceOracle(),
      this.getFantomTokenCollector(),
      this.getFantomFarmFetcher(),
      this.getFantomCacheManager(),
      this.getFantomFarmPlatformResolver(),
      this.getFantomLiquidityTokenCollector(),
    ));
  },

  getReaper() {
    if (reaper) {
      return reaper;
    }

    return (reaper = new Reaper(
      this.getFantomPriceOracle(),
      this.getFantomTokenCollector(),
      this.getFantomFarmFetcher(),
      this.getFantomCacheManager(),
      this.getFantomLiquidityTokenCollector(),
      this.getFantomFarmPlatformResolver(),
    ));
  },

  getEvodefi() {
    if (evodefi) {
      return evodefi;
    }

    return (evodefi = new Evodefi(
      this.getCacheManager(),
      this.getPriceOracle(),
      this.getTokenCollector(),
      this.getFarmFetcher(),
      this.getCacheManager(),
    ));
  },

  getEleven() {
    if (eleven) {
      return eleven;
    }

    return (eleven = new Eleven(
      this.getCacheManager(),
      this.getPriceOracle(),
      this.getTokenCollector(),
      this.getFarmFetcher(),
      this.getCacheManager(),
      this.getLiquidityTokenCollector(),
    ));
  },

  getPelevenDecorator() {
    if (pelevenDecorator) {
      return pelevenDecorator;
    }

    return (pelevenDecorator = new PelevenDecorator(
      this.getPeleven(),
      this.getPelevenLeverage(),
    ));
  },

  getPeleven() {
    if (peleven) {
      return peleven;
    }

    return (peleven = new Peleven(
      this.getPolygonCacheManager(),
      this.getPolygonPriceOracle(),
      this.getPolygonTokenCollector(),
      this.getPolygonFarmFetcher(),
      this.getPolygonCacheManager(),
      this.getPolygonLiquidityTokenCollector(),
    ));
  },

  getPelevenLeverage() {
    if (pelevenLeverage) {
      return pelevenLeverage;
    }

    return (pelevenLeverage = new PelevenLeverage(
      this.getPolygonPriceOracle(),
      this.getPolygonTokenCollector(),
      this.getPolygonCacheManager(),
      this.getPolygonLiquidityTokenCollector(),
      this.getPolygonFarmPlatformResolver(),
    ));
  },

  getFeleven() {
    if (feleven) {
      return feleven;
    }

    return (feleven = new Feleven(
      this.getFantomCacheManager(),
      this.getFantomPriceOracle(),
      this.getFantomTokenCollector(),
      this.getFantomFarmFetcher(),
      this.getFantomCacheManager(),
      this.getFantomLiquidityTokenCollector(),
    ));
  },

  getAdamant() {
    if (adamant) {
      return adamant;
    }

    return (adamant = new Adamant(
      this.getPolygonCacheManager(),
      this.getPolygonPriceOracle(),
      this.getPolygonTokenCollector(),
      this.getPolygonFarmPlatformResolver(),
    ));
  },

  getQuickswap() {
    if (quickswap) {
      return quickswap;
    }

    return (quickswap = new Quickswap(
      this.getPolygonCacheManager(),
      this.getPolygonPriceOracle(),
      this.getPolygonTokenCollector(),
      this.getPolygonLiquidityTokenCollector(),
    ));
  },

  getCrodex() {
    if (crodex) {
      return crodex;
    }

    return (crodex = new Crodex(
      this.getCronosCacheManager(),
      this.getCronosPriceOracle(),
      this.getCronosTokenCollector(),
      this.getCronosLiquidityTokenCollector(),
    ));
  },

  getBlizzard() {
    if (blizzard) {
      return blizzard;
    }

    return (blizzard = new Blizzard(
      this.getCacheManager(),
      this.getPriceOracle(),
      this.getTokenCollector(),
      this.getFarmFetcher(),
      this.getCacheManager(),
    ));
  },

  getHyperjump() {
    if (hyperjump) {
      return hyperjump;
    }

    return (hyperjump = new Hyperjump(
      this.getCacheManager(),
      this.getPriceOracle(),
      this.getTokenCollector(),
      this.getFarmFetcher(),
      this.getCacheManager(),
    ));
  },

  getApeswap() {
    if (apeswap) {
      return apeswap;
    }

    return (apeswap = new Apeswap(
      this.getCacheManager(),
      this.getPriceOracle(),
      this.getTokenCollector(),
      this.getFarmFetcher(),
      this.getCacheManager(),
    ));
  },

  getGoose() {
    if (goose) {
      return goose;
    }

    return (goose = new Goose(
      this.getCacheManager(),
      this.getPriceOracle(),
      this.getTokenCollector(),
      this.getFarmFetcher(),
      this.getCacheManager(),
    ));
  },

  getCheese() {
    if (cheese) {
      return cheese;
    }

    return (cheese = new Cheese(
      this.getCacheManager(),
      this.getPriceOracle(),
      this.getTokenCollector(),
      this.getFarmFetcher(),
      this.getCacheManager(),
    ));
  },

  getMdex() {
    if (mdex) {
      return mdex;
    }

    return (mdex = new Mdex(
      this.getPriceOracle(),
      this.getTokenCollector(),
      this.getFarmFetcher(),
      this.getCacheManager(),
    ));
  },

  getSpace() {
    if (space) {
      return space;
    }

    return (space = new Space(
      this.getCacheManager(),
      this.getPriceOracle(),
      this.getTokenCollector(),
      this.getFarmFetcher(),
      this.getCacheManager(),
    ));
  },

  getPandayield() {
    if (pandayield) {
      return pandayield;
    }

    return (pandayield = new Pandayield(
      this.getCacheManager(),
      this.getPriceOracle(),
      this.getTokenCollector(),
      this.getFarmFetcher(),
      this.getCacheManager(),
    ));
  },

  getCafeswap() {
    if (cafeswap) {
      return cafeswap;
    }

    return (cafeswap = new Cafeswap(
      this.getCacheManager(),
      this.getPriceOracle(),
      this.getTokenCollector(),
      this.getFarmFetcher(),
      this.getCacheManager(),
    ));
  },

  getBelt() {
    if (belt) {
      return belt;
    }

    return (belt = new Belt(
      this.getCacheManager(),
      this.getPriceOracle(),
      this.getTokenCollector(),
      this.getFarmFetcher(),
      this.getCacheManager(),
    ));
  },

  getSaltswap() {
    if (saltswap) {
      return saltswap;
    }

    return (saltswap = new Saltswap(
      this.getCacheManager(),
      this.getPriceOracle(),
      this.getTokenCollector(),
      this.getFarmFetcher(),
      this.getCacheManager(),
    ));
  },

  getWault() {
    if (wault) {
      return wault;
    }

    return (wault = new Wault(
      this.getCacheManager(),
      this.getPriceOracle(),
      this.getTokenCollector(),
      this.getFarmFetcher(),
      this.getCacheManager(),
    ));
  },

  getPanther() {
    if (panther) {
      return panther;
    }

    return (panther = new Panther(
      this.getCacheManager(),
      this.getPriceOracle(),
      this.getTokenCollector(),
      this.getFarmFetcher(),
      this.getCacheManager(),
    ));
  },

  getWarden() {
    if (warden) {
      return warden;
    }

    return (warden = new Warden(
      this.getCacheManager(),
      this.getPriceOracle(),
      this.getTokenCollector(),
      this.getFarmFetcher(),
      this.getCacheManager(),
    ));
  },

  getTheanimal() {
    if (theanimal) {
      return theanimal;
    }

    return (theanimal = new Theanimal(
      this.getCacheManager(),
      this.getPriceOracle(),
      this.getTokenCollector(),
      this.getFarmFetcher(),
      this.getCacheManager(),
    ));
  },

  getBiswap() {
    if (biswap) {
      return biswap;
    }

    const biswapAuto = new BiswapAuto(
      this.getPriceOracle(),
      this.getTokenCollector(),
      this.getCacheManager(),
      this.getContractAbiFetcher(),
    );

    const masterchef = new Biswap(
      this.getCacheManager(),
      this.getPriceOracle(),
      this.getTokenCollector(),
      this.getLiquidityTokenCollector(),
      this.getFarmFetcher(),
      this.getCacheManager(),
    );

    return (biswap = new BiswapDecorator(
      masterchef,
      biswapAuto,
    ));
  },

  getHoneyfarm() {
    if (honeyfarm) {
      return honeyfarm;
    }

    return (honeyfarm = new Honeyfarm(
      this.getCacheManager(),
      this.getPriceOracle(),
      this.getTokenCollector(),
      this.getFarmFetcher(),
      this.getCacheManager(),
    ));
  },

  getCoinswap() {
    if (coinswap) {
      return coinswap;
    }

    return (coinswap = new Coinswap(
      this.getCacheManager(),
      this.getPriceOracle(),
      this.getTokenCollector(),
      this.getFarmFetcher(),
      this.getCacheManager(),
    ));
  },

  getTreedefi() {
    if (treedefi) {
      return treedefi;
    }

    return (treedefi = new Treedefi(
      this.getCacheManager(),
      this.getPriceOracle(),
      this.getTokenCollector(),
      this.getFarmFetcher(),
      this.getCacheManager(),
    ));
  },

  getAutoshark() {
    if (autoshark) {
      return autoshark;
    }

    return (autoshark = new Autoshark(
      this.getCacheManager(),
      this.getPriceOracle(),
      this.getTokenCollector(),
      this.getFarmFetcher(),
      this.getCacheManager(),
    ));
  },

  getFarmhero() {
    if (farmhero) {
      return farmhero;
    }

    return (farmhero = new Farmhero(
      this.getCacheManager(),
      this.getPriceOracle(),
      this.getTokenCollector(),
      this.getFarmFetcher(),
      this.getCacheManager(),
    ));
  },

  getBeefy() {
    if (beefy) {
      return beefy;
    }

    return (beefy = new Beefy(
      this.getCacheManager(),
      this.getPriceOracle(),
      this.getTokenCollector(),
      this.getLiquidityTokenCollector(),
    ));
  },

  getAlpaca() {
    if (alpaca) {
      return alpaca;
    }

    return (alpaca = new Alpaca(
      this.getCacheManager(),
      this.getPriceOracle(),
      this.getTokenCollector(),
      this.getLiquidityTokenCollector(),
      this.getFarmPlatformResolver(),
    ));
  },

  getAlpha() {
    if (alpha) {
      return alpha;
    }

    return (alpha = new Alpha(
      this.getCacheManager(),
      this.getPriceOracle(),
      this.getFarmPlatformResolver(),
      this.getTokenCollector(),
    ));
  },

  getRabbit() {
    if (rabbit) {
      return rabbit;
    }

    const rabbit1 = new Rabbit(
      this.getPriceOracle(),
      this.getTokenCollector(),
      this.getCacheManager(),
      this.getLiquidityTokenCollector(),
      this.getFarmPlatformResolver(),
    );

    const rabbitDao = new RabbitDao(
      this.getPriceOracle(),
      this.getTokenCollector(),
      this.getCacheManager(),
      this.getLiquidityTokenCollector(),
      this.getFarmPlatformResolver(),
    );

    return (rabbit = new RabbitDecorator(rabbit1, rabbitDao));
  },

  getCream() {
    if (cream) {
      return cream;
    }

    return (cream = new Cream(
      this.getPriceOracle(),
      this.getTokenCollector(),
      this.getCacheManager(),
      this.getLiquidityTokenCollector(),
      this.getFarmPlatformResolver(),
    ));
  },

  getPcream() {
    if (pcream) {
      return pcream;
    }

    return (pcream = new Pcream(
      this.getPolygonPriceOracle(),
      this.getPolygonTokenCollector(),
      this.getPolygonCacheManager(),
      this.getPolygonLiquidityTokenCollector(),
      this.getPolygonFarmPlatformResolver(),
    ));
  },

  getScream() {
    if (scream) {
      return scream;
    }

    return (scream = new Scream(
      this.getFantomPriceOracle(),
      this.getFantomTokenCollector(),
      this.getFantomCacheManager(),
      this.getFantomLiquidityTokenCollector(),
      this.getFantomFarmPlatformResolver(),
    ));
  },

  getHundred() {
    if (hundred) {
      return hundred;
    }

    return (hundred = new Hundred(
      this.getFantomPriceOracle(),
      this.getFantomTokenCollector(),
      this.getFantomCacheManager(),
      this.getFantomLiquidityTokenCollector(),
      this.getFantomFarmPlatformResolver(),
    ));
  },

  getHhundred() {
    if (hhundred) {
      return hhundred;
    }

    return (hhundred = new Hhundred(
      this.getHarmonyPriceOracle(),
      this.getHarmonyTokenCollector(),
      this.getHarmonyCacheManager(),
      this.getHarmonyLiquidityTokenCollector(),
      this.getHarmonyFarmPlatformResolver(),
    ));
  },

  getLootswap() {
    if (lootswap) {
      return lootswap;
    }

    return (lootswap = new Lootswap(
      this.getHarmonyCacheManager(),
      this.getHarmonyPriceOracle(),
      this.getHarmonyTokenCollector(),
      this.getHarmonyFarmFetcher(),
      this.getHarmonyCacheManager(),
    ));
  },

  getRevenant() {
    if (revenant) {
      return revenant;
    }

    const farm = new RevenantFarm(
      this.getFantomPriceOracle(),
      this.getFantomTokenCollector(),
      this.getFantomCacheManager(),
      this.getFantomLiquidityTokenCollector(),
      this.getFantomFarmPlatformResolver(),
    );

    const market = new RevenantMarket(
      this.getFantomPriceOracle(),
      this.getFantomTokenCollector(),
      this.getFantomCacheManager(),
      this.getFantomLiquidityTokenCollector(),
      this.getFantomAdditionalTokenInfo(),
    );

    return (revenant = new Revenant(
      farm,
      market,
    ));
  },

  getHectordao() {
    if (hectordao) {
      return hectordao;
    }

    return (hectordao = new Hectordao(
      this.getFantomPriceOracle(),
      this.getFantomTokenCollector(),
      this.getFantomCacheManager(),
      this.getFantomLiquidityTokenCollector(),
      this.getFantomFarmPlatformResolver(),
    ));
  },

  getLuxor() {
    if (luxor) {
      return luxor;
    }

    return (luxor = new Luxor(
      this.getFantomPriceOracle(),
      this.getFantomTokenCollector(),
      this.getFantomCacheManager(),
      this.getFantomLiquidityTokenCollector(),
      this.getFantomFarmPlatformResolver(),
    ));
  },

  getFyearn() {
    if (fyearn) {
      return fyearn;
    }

    return (fyearn = new Fyearn(
      this.getFantomPriceOracle(),
      this.getFantomTokenCollector(),
      this.getFantomCacheManager(),
      this.getFantomLiquidityTokenCollector(),
    ));
  },

  getFantohm() {
    if (fantohm) {
      return fantohm;
    }

    return (fantohm = new Fantohm(
      this.getFantomPriceOracle(),
      this.getFantomTokenCollector(),
      this.getFantomCacheManager(),
      this.getFantomLiquidityTokenCollector(),
      this.getFantomFarmPlatformResolver(),
    ));
  },

  getBalancer() {
    if (balancer) {
      return balancer;
    }

    return (balancer = new Balancer(
      this.getPolygonCacheManager(),
      this.getPolygonPriceOracle(),
      this.getPolygonTokenCollector(),
    ));
  },

  getBeethovenx() {
    if (beethovenx) {
      return beethovenx;
    }

    return (beethovenx = new Beethovenx(
      this.getFantomCacheManager(),
      this.getFantomPriceOracle(),
      this.getFantomTokenCollector(),
      this.getFantomFarmFetcher(),
    ));
  },

  getRobovault() {
    if (robovault) {
      return robovault;
    }

    return (robovault = new Robovault(
      this.getFantomCacheManager(),
      this.getFantomPriceOracle(),
      this.getFantomTokenCollector(),
    ));
  },

  getGeist() {
    if (geist) {
      return geist;
    }

    return (geist = new Geist(
      this.getFantomCacheManager(),
      this.getFantomPriceOracle(),
      this.getFantomTokenCollector(),
    ));
  },

  getGrim() {
    if (grim) {
      return grim;
    }

    return (grim = new Grim(
      this.getFantomCacheManager(),
      this.getFantomPriceOracle(),
      this.getFantomTokenCollector(),
      this.getFantomLiquidityTokenCollector(),
    ));
  },

  getFcream() {
    if (fcream) {
      return fcream;
    }

    return (fcream = new Fcream(
      this.getFantomPriceOracle(),
      this.getFantomTokenCollector(),
      this.getFantomCacheManager(),
      this.getFantomLiquidityTokenCollector(),
      this.getFantomFarmPlatformResolver(),
    ));
  },

  getTarot() {
    if (tarot) {
      return tarot;
    }

    return (tarot = new Tarot(
      this.getFantomPriceOracle(),
      this.getFantomTokenCollector(),
      this.getFantomCacheManager(),
      this.getFantomLiquidityTokenCollector(),
      this.getFantomFarmPlatformResolver(),
      module.exports.CONFIG['DEFAULT_PROXY'] || undefined,
    ));
  },

  getImpermax() {
    if (impermax) {
      return impermax;
    }

    return (impermax = new Impermax(
      this.getPolygonPriceOracle(),
      this.getPolygonTokenCollector(),
      this.getPolygonCacheManager(),
      this.getPolygonLiquidityTokenCollector(),
      this.getPolygonFarmPlatformResolver(),
    ));
  },

  getPaave() {
    if (paave) {
      return paave;
    }

    return (paave = new Paave(
      this.getPolygonCacheManager(),
      this.getPolygonPriceOracle(),
      this.getPolygonTokenCollector(),
    ));
  },

  getVenus() {
    if (venus) {
      return venus;
    }

    return (venus = new Venus(
      this.getPriceOracle(),
      this.getTokenCollector(),
      this.getCacheManager(),
      this.getLiquidityTokenCollector(),
      this.getFarmPlatformResolver(),
    ));
  },

  getFortress() {
    if (fortress) {
      return fortress;
    }

    return (fortress = new Fortress(
      this.getPriceOracle(),
      this.getTokenCollector(),
      this.getCacheManager(),
      this.getLiquidityTokenCollector(),
      this.getFarmPlatformResolver(),
    ));
  },

  getBakery() {
    if (bakery) {
      return bakery;
    }

    return (bakery = new Bakery(
      this.getPriceOracle(),
      this.getCacheManager(),
      this.getTokenCollector(),
      this.getLiquidityTokenCollector(),
    ));
  },

  getFortube() {
    if (fortube) {
      return fortube;
    }

    return (fortube = new Fortube(
      this.getPriceOracle(),
      this.getTokenCollector(),
      this.getCacheManager(),
      this.getLiquidityTokenCollector(),
      this.getFarmPlatformResolver(),
    ));
  },

  getPfortube() {
    if (pfortube) {
      return pfortube;
    }

    return (pfortube = new Pfortube(
      this.getPolygonPriceOracle(),
      this.getPolygonTokenCollector(),
      this.getPolygonCacheManager(),
      this.getPolygonLiquidityTokenCollector(),
      this.getPolygonFarmPlatformResolver(),
    ));
  },

  getYieldparrot() {
    if (yieldparrot) {
      return yieldparrot;
    }

    return (yieldparrot = new Yieldparrot(
      this.getCacheManager(),
      this.getPriceOracle(),
      this.getTokenCollector(),
      this.getFarmFetcher(),
      this.getCacheManager(),
      this.getFarmPlatformResolver(),
      this.getLiquidityTokenCollector(),
    ));
  },

  getPlanet() {
    if (planet) {
      return planet;
    }

    return (planet = new Planet(
      new PlanetMaster(
        this.getCacheManager(),
        this.getPriceOracle(),
        this.getTokenCollector(),
        this.getFarmFetcher(),
        this.getCacheManager(),
        this.getFarmPlatformResolver(),
        this.getLiquidityTokenCollector(),
      ),
      new PlanetLend(
        this.getPriceOracle(),
        this.getTokenCollector(),
        this.getCacheManager(),
        this.getLiquidityTokenCollector(),
        this.getFarmPlatformResolver(),
      )
    ));
  },

  getAcryptos() {
    if (acryptos) {
      return acryptos;
    }

    return (acryptos = new Acryptos(
      this.getCacheManager(),
      this.getPriceOracle(),
      this.getTokenCollector(),
    ));
  },

  getJetswap() {
    if (jetswap) {
      return jetswap;
    }

    return (jetswap = new Jetswap(
      this.getCacheManager(),
      this.getPriceOracle(),
      this.getTokenCollector(),
      this.getFarmFetcher(),
      this.getCacheManager(),
    ));
  },

  getKuswap() {
    if (kuswap) {
      return kuswap;
    }

    return (kuswap = new Kuswap(
      this.getKccCacheManager(),
      this.getKccPriceOracle(),
      this.getKccTokenCollector(),
      this.getKccFarmFetcher(),
      this.getKccCacheManager(),
      this.getKccFarmPlatformResolver(),
    ));
  },

  getKudex() {
    if (kudex) {
      return kudex;
    }

    return (kudex = new Kudex(
      this.getKccCacheManager(),
      this.getKccPriceOracle(),
      this.getKccTokenCollector(),
      this.getKccFarmFetcher(),
      this.getKccCacheManager(),
      this.getKccFarmPlatformResolver(),
    ));
  },

  getKukafeDecorator() {
    if (kukafeDecorator) {
      return kukafeDecorator;
    }

    return (kukafeDecorator = new KukafeDecorator(
      this.getKukafe(),
      this.getKukafeCompound(),
    ));
  },

  getKukafe() {
    if (kukafe) {
      return kukafe;
    }

    return (kukafe = new Kukafe(
      this.getKccCacheManager(),
      this.getKccPriceOracle(),
      this.getKccTokenCollector(),
      this.getKccFarmFetcher(),
      this.getKccCacheManager(),
      this.getKccFarmPlatformResolver(),
    ));
  },

  getKukafeCompound() {
    if (kukafeCompound) {
      return kukafeCompound;
    }

    return (kukafeCompound = new KukafeCompound(
      this.getKccPriceOracle(),
      this.getKccTokenCollector(),
      this.getKccFarmFetcher(),
      this.getKccCacheManager(),
      this.getKccFarmPlatformResolver(),
    ));
  },

  getMoonkafe() {
    if (moonkafe) {
      return moonkafe;
    }

    return (moonkafe = new Moonkafe(
      this.getMoonkafeCompound(),
    ));
  },

  getMoonkafeCompound() {
    if (moonkafeCompound) {
      return moonkafeCompound;
    }

    return (moonkafeCompound = new MoonkafeCompound(
      this.getMoonriverPriceOracle(),
      this.getMoonriverTokenCollector(),
      this.getMoonriverFarmFetcher(),
      this.getMoonriverCacheManager(),
      this.getMoonriverFarmPlatformResolver(),
    ));
  },

  getCrokafe() {
    if (crokafe) {
      return crokafe;
    }

    return (crokafe = new Crokafe(
      this.getCronosPriceOracle(),
      this.getCronosTokenCollector(),
      this.getCronosFarmFetcher(),
      this.getCronosCacheManager(),
      this.getCronosFarmPlatformResolver(),
    ));
  },

  getCrautofarm() {
    if (crautofarm) {
      return crautofarm;
    }

    return (crautofarm = new Crautofarm(
      this.getCronosCacheManager(),
      this.getCronosPriceOracle(),
      this.getCronosLiquidityTokenCollector(),
    ));
  },

  getCrbeefy() {
    if (crbeefy) {
      return crbeefy;
    }

    return (crbeefy = new Crbeefy(
      this.getCronosCacheManager(),
      this.getCronosPriceOracle(),
      this.getCronosTokenCollector(),
      this.getCronosLiquidityTokenCollector(),
    ));
  },

  getCrannex() {
    if (crannex) {
      return crannex;
    }

    return (crannex = new Crannex(
      new CrannexMasterchef(
        this.getCronosCacheManager(),
        this.getCronosPriceOracle(),
        this.getCronosTokenCollector(),
        this.getCronosLiquidityTokenCollector(),
        this.getCronosFarmFetcher(),
        this.getCronosCacheManager(),
      )
    ));
  },

  getBoneswap() {
    if (boneswap) {
      return boneswap;
    }

    return (boneswap = new Boneswap(
      this.getKccCacheManager(),
      this.getKccPriceOracle(),
      this.getKccTokenCollector(),
      this.getKccFarmFetcher(),
      this.getKccCacheManager(),
      this.getKccFarmPlatformResolver(),
    ));
  },

  getMojito() {
    if (mojito) {
      return mojito;
    }

    return (mojito = new Mojito(
      this.getKccCacheManager(),
      this.getKccPriceOracle(),
      this.getKccTokenCollector(),
      this.getKccFarmFetcher(),
      this.getKccCacheManager(),
      this.getKccFarmPlatformResolver(),
    ));
  },

  getHbeefy() {
    if (hbeefy) {
      return hbeefy;
    }

    return (hbeefy = new Hbeefy(
      this.getHarmonyCacheManager(),
      this.getHarmonyPriceOracle(),
      this.getHarmonyTokenCollector(),
      this.getHarmonyLiquidityTokenCollector(),
    ));
  },

  getMbeefy() {
    if (mbeefy) {
      return mbeefy;
    }

    return (mbeefy = new Mbeefy(
      this.getMoonriverCacheManager(),
      this.getMoonriverPriceOracle(),
      this.getMoonriverTokenCollector(),
      this.getMoonriverLiquidityTokenCollector(),
    ));
  },

  getUbeswap() {
    if (ubeswap) {
      return ubeswap;
    }

    return (ubeswap = new Ubeswap(
      this.getCeloCacheManager(),
      this.getCeloPriceOracle(),
      this.getCeloTokenCollector(),
      this.getCeloLiquidityTokenCollector(),
    ));
  },

  getMobius() {
    if (mobius) {
      return mobius;
    }

    return (mobius = new Mobius(
      this.getCeloCacheManager(),
      this.getCeloPriceOracle(),
      this.getCeloTokenCollector(),
      this.getCeloLiquidityTokenCollector(),
    ));
  },

  getCsushi() {
    if (csushi) {
      return csushi;
    }

    return (csushi = new Csushi(
      this.getCeloCacheManager(),
      this.getCeloPriceOracle(),
      this.getCeloTokenCollector(),
      this.getCeloLiquidityTokenCollector(),
      this.getCeloFarmFetcher(),
      this.getCeloCacheManager(),
    ));
  },

  getMbbeefy() {
    if (mbbeefy) {
      return mbbeefy;
    }

    return (mbbeefy = new Mbbeefy(
      this.getMoonbeamCacheManager(),
      this.getMoonbeamPriceOracle(),
      this.getMoonbeamTokenCollector(),
      this.getMoonbeamLiquidityTokenCollector(),
    ));
  },

  getMsushi() {
    if (msushi) {
      return msushi;
    }

    return (msushi = new Msushi(
      this.getMoonriverCacheManager(),
      this.getMoonriverPriceOracle(),
      this.getMoonriverTokenCollector(),
      this.getMoonriverLiquidityTokenCollector(),
      this.getMoonriverFarmFetcher(),
      this.getMoonriverCacheManager(),
    ));
  },

  getEuphoria() {
    if (euphoria) {
      return euphoria;
    }

    return (euphoria = new Euphoria(
      this.getHarmonyPriceOracle(),
      this.getHarmonyTokenCollector(),
      this.getHarmonyCacheManager(),
      this.getHarmonyLiquidityTokenCollector(),
      this.getHarmonyFarmPlatformResolver(),
    ));
  },

  getVvs() {
    if (vvs) {
      return vvs;
    }

    const masterchef = new Vvs(
      this.getCronosCacheManager(),
      this.getCronosPriceOracle(),
      this.getCronosTokenCollector(),
      this.getCronosLiquidityTokenCollector(),
      this.getCronosFarmFetcher(),
      this.getCronosCacheManager(),
    );

    const auto = new VvsAuto(
      this.getCronosPriceOracle(),
      this.getCronosTokenCollector(),
      this.getCronosCacheManager(),
      this.getContractAbiFetcher(),
    );

    return (vvs = new VvsDecorator(
      masterchef,
      auto
    ));
  },

  getMmf() {
    if (mmf) {
      return mmf;
    }

    return (mmf = new Mmf(
      this.getCronosCacheManager(),
      this.getCronosPriceOracle(),
      this.getCronosTokenCollector(),
      this.getCronosLiquidityTokenCollector(),
      this.getCronosFarmFetcher(),
      this.getCronosCacheManager(),
    ));
  },

  getMmo() {
    if (mmo) {
      return mmo;
    }

    return (mmo = new Mmo(
      this.getCronosCacheManager(),
      this.getCronosPriceOracle(),
      this.getCronosTokenCollector(),
      this.getCronosLiquidityTokenCollector(),
    ));
  },

  getTectonic() {
    if (tectonic) {
      return tectonic;
    }

    return (tectonic = new Tectonic(
      this.getCronosPriceOracle(),
      this.getCronosTokenCollector(),
      this.getCronosCacheManager(),
      this.getCronosLiquidityTokenCollector(),
      this.getCronosFarmPlatformResolver(),
    ));
  },

  getCronaswap() {
    if (cronaswap) {
      return cronaswap;
    }

    return (cronaswap = new Cronaswap(
      this.getCronosCacheManager(),
      this.getCronosPriceOracle(),
      this.getCronosTokenCollector(),
      this.getCronosLiquidityTokenCollector(),
      this.getCronosFarmFetcher(),
      this.getCronosCacheManager(),
    ));
  },

  getSynapse() {
    if (synapse) {
      return synapse;
    }

    return (synapse = new Synapse(
      this.getCacheManager(),
      this.getPriceOracle(),
      this.getTokenCollector(),
      this.getFarmFetcher(),
      this.getCacheManager(),
      'synapse',
      'bsc',
      '0x8F5BBB2BB8c2Ee94639E55d5F41de9b4839C1280',
    ));
  },

  getPSynapse() {
    if (psynapse) {
      return psynapse;
    }

    return (psynapse = new Synapse(
      this.getPolygonCacheManager(),
      this.getPolygonPriceOracle(),
      this.getPolygonTokenCollector(),
      this.getPolygonFarmFetcher(),
      this.getPolygonCacheManager(),
      'psynapse',
      'polygon',
      '0x7875Af1a6878bdA1C129a4e2356A3fD040418Be5',
    ));
  },

  getFSynapse() {
    if (fsynapse) {
      return fsynapse;
    }

    return (fsynapse = new Synapse(
      this.getFantomCacheManager(),
      this.getFantomPriceOracle(),
      this.getFantomTokenCollector(),
      this.getFantomFarmFetcher(),
      this.getFantomCacheManager(),
      'fsynapse',
      'fantom',
      '0xaed5b25be1c3163c907a471082640450f928ddfe',
    ));
  },

  getHSynapse() {
    if (hsynapse) {
      return hsynapse;
    }

    return (hsynapse = new Synapse(
      this.getHarmonyCacheManager(),
      this.getHarmonyPriceOracle(),
      this.getHarmonyTokenCollector(),
      this.getHarmonyFarmFetcher(),
      this.getHarmonyCacheManager(),
      'hsynapse',
      'harmony',
      '0xaed5b25be1c3163c907a471082640450f928ddfe',
    ));
  },

  getMoola() {
    if (moola) {
      return moola;
    }

    return (moola = new Moola(
      this.getCeloCacheManager(),
      this.getCeloPriceOracle(),
      this.getCeloTokenCollector(),
    ));
  },

  getUniswap() {
    if (uniswap) {
      return uniswap;
    }

    return (uniswap = new Uniswap(
      this.getPolygonCacheManager(),
      this.getPolygonPriceOracle(),
      this.getPolygonTokenCollector(),
    ));
  },

  getCache() {
    if (cache) {
      return cache;
    }

    return (cache = new Cache());
  },

  getAddressTransactions() {
    if (addressTransactions) {
      return addressTransactions;
    }

    return (addressTransactions = new AddressTransactions(
      this.getPlatforms(),
      this.getUserCacheManager(),
      this.getBscscanRequest(),
      this.getLiquidityTokenCollector(),
      this.getTokenCollector(),
      this.getPriceCollector(),
    ));
  },

  getPolygonAddressTransactions() {
    if (polygonAddressTransactions) {
      return polygonAddressTransactions;
    }

    return (polygonAddressTransactions = new AddressTransactions(
      this.getPolygonPlatforms(),
      this.getUserCacheManager(),
      this.getBscscanRequest(),
      this.getPolygonLiquidityTokenCollector(),
      this.getPolygonTokenCollector(),
      this.getPolygonPriceCollector(),
    ));
  },

  getFantomAddressTransactions() {
    if (fantomAddressTransactions) {
      return fantomAddressTransactions;
    }

    return (fantomAddressTransactions = new AddressTransactions(
      this.getFantomPlatforms(),
      this.getUserCacheManager(),
      this.getBscscanRequest(),
      this.getFantomLiquidityTokenCollector(),
      this.getFantomTokenCollector(),
      this.getFantomPriceCollector(),
    ));
  },

  getKccAddressTransactions() {
    if (kccAddressTransactions) {
      return kccAddressTransactions;
    }

    return (kccAddressTransactions = new AddressTransactions(
      this.getKccPlatforms(),
      this.getUserCacheManager(),
      this.getBscscanRequest(),
      this.getKccLiquidityTokenCollector(),
      this.getKccTokenCollector(),
      this.getKccPriceCollector(),
    ));
  },

  getHarmonyAddressTransactions() {
    if (harmonyAddressTransactions) {
      return harmonyAddressTransactions;
    }

    return (harmonyAddressTransactions = new AddressTransactions(
      this.getHarmonyPlatforms(),
      this.getUserCacheManager(),
      this.getBscscanRequest(),
      this.getHarmonyLiquidityTokenCollector(),
      this.getHarmonyTokenCollector(),
      this.getHarmonyPriceCollector(),
    ));
  },

  getCeloAddressTransactions() {
    if (celoAddressTransactions) {
      return celoAddressTransactions;
    }

    return (celoAddressTransactions = new AddressTransactions(
      this.getCeloPlatforms(),
      this.getUserCacheManager(),
      this.getBscscanRequest(),
      this.getCeloLiquidityTokenCollector(),
      this.getCeloTokenCollector(),
      this.getCeloPriceCollector(),
    ));
  },

  getMoonriverAddressTransactions() {
    if (moonriverAddressTransactions) {
      return moonriverAddressTransactions;
    }

    return (moonriverAddressTransactions = new AddressTransactions(
      this.getMoonriverPlatforms(),
      this.getUserCacheManager(),
      this.getBscscanRequest(),
      this.getMoonriverLiquidityTokenCollector(),
      this.getMoonriverTokenCollector(),
      this.getMoonriverPriceCollector(),
    ));
  },
  
  getCronosAddressTransactions() {
    if (cronosAddressTransactions) {
      return cronosAddressTransactions;
    }

    return (cronosAddressTransactions = new AddressTransactions(
      this.getCronosPlatforms(),
      this.getUserCacheManager(),
      this.getBscscanRequest(),
      this.getCronosLiquidityTokenCollector(),
      this.getCronosTokenCollector(),
      this.getCronosPriceCollector(),
    ));
  },

  getMoonbeamAddressTransactions() {
    if (moonbeamAddressTransactions) {
      return moonbeamAddressTransactions;
    }

    return (moonbeamAddressTransactions = new AddressTransactions(
      this.getMoonbeamPlatforms(),
      this.getUserCacheManager(),
      this.getBscscanRequest(),
      this.getMoonbeamLiquidityTokenCollector(),
      this.getMoonbeamTokenCollector(),
      this.getMoonbeamPriceCollector(),
    ));
  },

  getLiquidityTokenCollector() {
    if (liquidityTokenCollector) {
      return liquidityTokenCollector;
    }

    return (liquidityTokenCollector = new LiquidityTokenCollector(
      this.getCacheManager(),
      new StableCollectorChecker(this.getStableCollector(), 'bsc'),
    ));
  },

  getPolygonLiquidityTokenCollector() {
    if (polygonLiquidityTokenCollector) {
      return polygonLiquidityTokenCollector;
    }

    return (polygonLiquidityTokenCollector = new LiquidityTokenCollector(
      this.getPolygonCacheManager(),
      new StableCollectorChecker(this.getStableCollector(), 'polygon'),
    ));
  },

  getFantomLiquidityTokenCollector() {
    if (fantomLiquidityTokenCollector) {
      return fantomLiquidityTokenCollector;
    }

    return (fantomLiquidityTokenCollector = new LiquidityTokenCollector(
      this.getFantomCacheManager(),
      new StableCollectorChecker(this.getStableCollector(), 'fantom'),
    ));
  },

  getKccLiquidityTokenCollector() {
    if (kccLiquidityTokenCollector) {
      return kccLiquidityTokenCollector;
    }

    return (kccLiquidityTokenCollector = new LiquidityTokenCollector(
      this.getKccCacheManager(),
      new StableCollectorChecker(this.getStableCollector(), 'kcc'),
    ));
  },

  getHarmonyLiquidityTokenCollector() {
    if (harmonyLiquidityTokenCollector) {
      return harmonyLiquidityTokenCollector;
    }

    return (harmonyLiquidityTokenCollector = new LiquidityTokenCollector(
      this.getHarmonyCacheManager(),
      new StableCollectorChecker(this.getStableCollector(), 'harmony'),
    ));
  },

  getCeloLiquidityTokenCollector() {
    if (celoLiquidityTokenCollector) {
      return celoLiquidityTokenCollector;
    }

    return (celoLiquidityTokenCollector = new LiquidityTokenCollector(
      this.getCeloCacheManager(),
      new StableCollectorChecker(this.getStableCollector(), 'celo'),
    ));
  },

  getMoonriverLiquidityTokenCollector() {
    if (moonriverLiquidityTokenCollector) {
      return moonriverLiquidityTokenCollector;
    }

    return (moonriverLiquidityTokenCollector = new LiquidityTokenCollector(
      this.getMoonriverCacheManager(),
      new StableCollectorChecker(this.getStableCollector(), 'moonriver'),
    ));
  },
  
  getCronosLiquidityTokenCollector() {
    if (cronosLiquidityTokenCollector) {
      return cronosLiquidityTokenCollector;
    }

    return (cronosLiquidityTokenCollector = new LiquidityTokenCollector(
      this.getCronosCacheManager(),
      new StableCollectorChecker(this.getStableCollector(), 'cronos'),
    ));
  },

  getMoonbeamLiquidityTokenCollector() {
    if (moonbeamLiquidityTokenCollector) {
      return moonbeamLiquidityTokenCollector;
    }

    return (moonbeamLiquidityTokenCollector = new LiquidityTokenCollector(
      this.getMoonbeamCacheManager(),
      new StableCollectorChecker(this.getStableCollector(), 'moonbeam'),
    ));
  },
  
  getCacheManager() {
    if (cacheManager) {
      return cacheManager;
    }

    const cacheDir = path.resolve(__dirname, '../var/cache')

    const diskCache = cacheManagerInstance.caching({
      ignoreCacheErrors: true,
      store: fsStore,
      options: {
        path: cacheDir,
        ttl: 60 * 60 * 24 * 30,
        subdirs: true,
        zip: false,
      }
    });

    const fn = diskCache.get;

    diskCache.get = async (...args) => {
      try {
        return await fn(...args);
      } catch (e) {
        console.error('error fetching cache: ', JSON.stringify(args))
      }

      return undefined
    }

    return cacheManager = diskCache;
  },

  getPolygonCacheManager() {
    if (polygonCacheManager) {
      return polygonCacheManager;
    }

    const cacheDir = path.resolve(__dirname, '../var/cache_polygon')

    const diskCache = cacheManagerInstance.caching({
      store: fsStore,
      options: {
        path: cacheDir,
        ttl: 60 * 60 * 24 * 30,
        subdirs: true,
        zip: false,
      }
    });

    const fn = diskCache.get;

    diskCache.get = async (...args) => {
      try {
        return await fn(...args);
      } catch (e) {
        console.error('error fetching cache: ', JSON.stringify(args))
      }

      return undefined
    }

    return polygonCacheManager = diskCache;
  },

  getFantomCacheManager() {
    if (fantomCacheManager) {
      return fantomCacheManager;
    }

    const cacheDir = path.resolve(__dirname, '../var/cache_fantom')

    const diskCache = cacheManagerInstance.caching({
      ignoreCacheErrors: true,
      store: fsStore,
      options: {
        path: cacheDir,
        ttl: 60 * 60 * 24 * 30,
        subdirs: true,
        zip: false,
      }
    });

    const fn = diskCache.get;

    diskCache.get = async (...args) => {
      try {
        return await fn(...args);
      } catch (e) {
        console.error('error fetching cache: ', JSON.stringify(args))
      }

      return undefined
    }

    return fantomCacheManager = diskCache;
  },

  getKccCacheManager() {
    if (kccCacheManager) {
      return kccCacheManager;
    }

    const cacheDir = path.resolve(__dirname, '../var/cache_kcc')

    const diskCache = cacheManagerInstance.caching({
      ignoreCacheErrors: true,
      store: fsStore,
      options: {
        path: cacheDir,
        ttl: 60 * 60 * 24 * 30,
        subdirs: true,
        zip: false,
      }
    });

    const fn = diskCache.get;

    diskCache.get = async (...args) => {
      try {
        return await fn(...args);
      } catch (e) {
        console.error('error fetching cache: ', JSON.stringify(args))
      }

      return undefined
    }

    return kccCacheManager = diskCache;
  },

  getHarmonyCacheManager() {
    if (harmonyCacheManager) {
      return harmonyCacheManager;
    }

    const cacheDir = path.resolve(__dirname, '../var/cache_harmony')

    const diskCache = cacheManagerInstance.caching({
      ignoreCacheErrors: true,
      store: fsStore,
      options: {
        path: cacheDir,
        ttl: 60 * 60 * 24 * 30,
        subdirs: true,
        zip: false,
      }
    });

    const fn = diskCache.get;

    diskCache.get = async (...args) => {
      try {
        return await fn(...args);
      } catch (e) {
        console.error('error fetching cache: ', JSON.stringify(args))
      }

      return undefined
    }

    return harmonyCacheManager = diskCache;
  },

  getCeloCacheManager() {
    if (celoCacheManager) {
      return celoCacheManager;
    }

    const cacheDir = path.resolve(__dirname, '../var/cache_celo')

    const diskCache = cacheManagerInstance.caching({
      ignoreCacheErrors: true,
      store: fsStore,
      options: {
        path: cacheDir,
        ttl: 60 * 60 * 24 * 30,
        subdirs: true,
        zip: false,
      }
    });

    const fn = diskCache.get;

    diskCache.get = async (...args) => {
      try {
        return await fn(...args);
      } catch (e) {
        console.error('error fetching cache: ', JSON.stringify(args))
      }

      return undefined
    }

    return celoCacheManager = diskCache;
  },

  getMoonriverCacheManager() {
    if (moonriverCacheManager) {
      return moonriverCacheManager;
    }

    const cacheDir = path.resolve(__dirname, '../var/cache_moonriver')

    const diskCache = cacheManagerInstance.caching({
      ignoreCacheErrors: true,
      store: fsStore,
      options: {
        path: cacheDir,
        ttl: 60 * 60 * 24 * 30,
        subdirs: true,
        zip: false,
      }
    });

    const fn = diskCache.get;

    diskCache.get = async (...args) => {
      try {
        return await fn(...args);
      } catch (e) {
        console.error('error fetching cache: ', JSON.stringify(args))
      }

      return undefined
    }

    return moonriverCacheManager = diskCache;
  },

  getCronosCacheManager() {
    if (cronosCacheManager) {
      return cronosCacheManager;
    }

    const cacheDir = path.resolve(__dirname, '../var/cache_cronos')

    const diskCache = cacheManagerInstance.caching({
      ignoreCacheErrors: true,
      store: fsStore,
      options: {
        path: cacheDir,
        ttl: 60 * 60 * 24 * 30,
        subdirs: true,
        zip: false,
      }
    });

    const fn = diskCache.get;

    diskCache.get = async (...args) => {
      try {
        return await fn(...args);
      } catch (e) {
        console.error('error fetching cache: ', JSON.stringify(args))
      }

      return undefined
    }

    return cronosCacheManager = diskCache;
  },

  getMoonbeamCacheManager() {
    if (moonbeamCacheManager) {
      return moonbeamCacheManager;
    }

    const cacheDir = path.resolve(__dirname, '../var/cache_moonbeam')

    const diskCache = cacheManagerInstance.caching({
      ignoreCacheErrors: true,
      store: fsStore,
      options: {
        path: cacheDir,
        ttl: 60 * 60 * 24 * 30,
        subdirs: true,
        zip: false,
      }
    });

    const fn = diskCache.get;

    diskCache.get = async (...args) => {
      try {
        return await fn(...args);
      } catch (e) {
        console.error('error fetching cache: ', JSON.stringify(args))
      }

      return undefined
    }

    return moonbeamCacheManager = diskCache;
  },
  
  getUserCacheManager() {
    if (cacheManager) {
      return cacheManager;
    }

    const cacheDir = path.resolve(__dirname, '../var/cache')

    const diskCache = cacheManagerInstance.caching({
      ignoreCacheErrors: true,
      store: fsStore,
      options: {
        path: cacheDir,
        ttl: 60 * 60 * 3,
        subdirs: true,
        zip: false,
      }
    });

    const fn = diskCache.get;

    diskCache.get = async (...args) => {
      try {
        return await fn(...args);
      } catch (e) {
        console.error('error fetching cache: ', JSON.stringify(args))
      }

      return undefined
    }

    return cacheManager = diskCache;
  },

  getBalances() {
    if (balances) {
      return balances;
    }

    return (balances = new Balances(
      this.getCacheManager(),
      this.getPriceOracle(),
      this.getTokenCollector(),
      this.getLiquidityTokenCollector(),
      'bsc'
    ));
  },

  getPolygonBalances() {
    if (polygonBalances) {
      return polygonBalances;
    }

    return (polygonBalances = new Balances(
      this.getPolygonCacheManager(),
      this.getPolygonPriceOracle(),
      this.getPolygonTokenCollector(),
      this.getPolygonLiquidityTokenCollector(),
      'polygon'
    ));
  },

  getFantomBalances() {
    if (fantomBalances) {
      return fantomBalances;
    }

    return (fantomBalances = new Balances(
      this.getFantomCacheManager(),
      this.getFantomPriceOracle(),
      this.getFantomTokenCollector(),
      this.getFantomLiquidityTokenCollector(),
      'fantom'
    ));
  },

  getKccBalances() {
    if (kccBalances) {
      return kccBalances;
    }

    return (kccBalances = new Balances(
      this.getKccCacheManager(),
      this.getKccPriceOracle(),
      this.getKccTokenCollector(),
      this.getKccLiquidityTokenCollector(),
      'kcc'
    ));
  },

  getHarmonyBalances() {
    if (harmonyBalances) {
      return harmonyBalances;
    }

    return (harmonyBalances = new Balances(
      this.getHarmonyCacheManager(),
      this.getHarmonyPriceOracle(),
      this.getHarmonyTokenCollector(),
      this.getHarmonyLiquidityTokenCollector(),
      'harmony'
    ));
  },

  getCeloBalances() {
    if (celoBalances) {
      return celoBalances;
    }

    return (celoBalances = new Balances(
      this.getCeloCacheManager(),
      this.getCeloPriceOracle(),
      this.getCeloTokenCollector(),
      this.getCeloLiquidityTokenCollector(),
      'celo'
    ));
  },

  getMoonriverBalances() {
    if (moonriverBalances) {
      return moonriverBalances;
    }

    return (moonriverBalances = new Balances(
      this.getMoonriverCacheManager(),
      this.getMoonriverPriceOracle(),
      this.getMoonriverTokenCollector(),
      this.getMoonriverLiquidityTokenCollector(),
      'moonriver'
    ));
  },
  
  getCronosBalances() {
    if (cronosBalances) {
      return cronosBalances;
    }

    return (cronosBalances = new Balances(
      this.getCronosCacheManager(),
      this.getCronosPriceOracle(),
      this.getCronosTokenCollector(),
      this.getCronosLiquidityTokenCollector(),
      'cronos'
    ));
  },

  getMoonbeamBalances() {
    if (moonbeamBalances) {
      return moonbeamBalances;
    }

    return (moonbeamBalances = new Balances(
      this.getMoonbeamCacheManager(),
      this.getMoonbeamPriceOracle(),
      this.getMoonbeamTokenCollector(),
      this.getMoonbeamLiquidityTokenCollector(),
      'moonbeam'
    ));
  },
  
  getTokenCollector() {
    if (tokenCollector) {
      return tokenCollector;
    }

    return (tokenCollector = new TokenCollector(this.getCacheManager(), 'bsc'));
  },

  getPolygonTokenCollector() {
    if (polygonTokenCollector) {
      return polygonTokenCollector;
    }

    return (polygonTokenCollector = new TokenCollector(this.getPolygonCacheManager(), 'polygon'));
  },

  getFantomTokenCollector() {
    if (fantomTokenCollector) {
      return fantomTokenCollector;
    }

    return (fantomTokenCollector = new TokenCollector(this.getFantomCacheManager(), 'fantom'));
  },

  getKccTokenCollector() {
    if (kccTokenCollector) {
      return kccTokenCollector;
    }

    return (kccTokenCollector = new TokenCollector(this.getKccCacheManager(), 'kcc'));
  },

  getHarmonyTokenCollector() {
    if (harmonyTokenCollector) {
      return harmonyTokenCollector;
    }

    return (harmonyTokenCollector = new TokenCollector(this.getHarmonyCacheManager(), 'harmony'));
  },

  getCeloTokenCollector() {
    if (celoTokenCollector) {
      return celoTokenCollector;
    }

    return (celoTokenCollector = new TokenCollector(this.getCeloCacheManager(), 'celo'));
  },

  getMoonriverTokenCollector() {
    if (moonriverTokenCollector) {
      return moonriverTokenCollector;
    }

    return (moonriverTokenCollector = new TokenCollector(this.getMoonriverCacheManager(), 'moonriver'));
  },
  
  getCronosTokenCollector() {
    if (cronosTokenCollector) {
      return cronosTokenCollector;
    }

    return (cronosTokenCollector = new TokenCollector(this.getCronosCacheManager(), 'cronos'));
  },

  getMoonbeamTokenCollector() {
    if (moonbeamTokenCollector) {
      return moonbeamTokenCollector;
    }

    return (moonbeamTokenCollector = new TokenCollector(this.getMoonbeamCacheManager(), 'Moonbeam'));
  },
  
  getPriceCollector() {
    if (priceCollector) {
      return priceCollector;
    }

    return (priceCollector = new PriceCollector(this.getCacheManager()));
  },

  getPolygonPriceCollector() {
    if (polygonPriceCollector) {
      return polygonPriceCollector;
    }

    return (polygonPriceCollector = new PriceCollector(this.getPolygonCacheManager()));
  },

  getFantomPriceCollector() {
    if (fantomPriceCollector) {
      return fantomPriceCollector;
    }

    return (fantomPriceCollector = new PriceCollector(this.getFantomCacheManager()));
  },

  getKccPriceCollector() {
    if (kccPriceCollector) {
      return kccPriceCollector;
    }

    return (kccPriceCollector = new PriceCollector(this.getKccCacheManager()));
  },

  getHarmonyPriceCollector() {
    if (harmonyPriceCollector) {
      return harmonyPriceCollector;
    }

    return (harmonyPriceCollector = new PriceCollector(this.getHarmonyCacheManager()));
  },

  getCeloPriceCollector() {
    if (celoPriceCollector) {
      return celoPriceCollector;
    }

    return (celoPriceCollector = new PriceCollector(this.getCeloCacheManager()));
  },

  getMoonriverPriceCollector() {
    if (moonriverPriceCollector) {
      return moonriverPriceCollector;
    }

    return (moonriverPriceCollector = new PriceCollector(this.getMoonriverCacheManager()));
  },
  
  getCronosPriceCollector() {
    if (cronosPriceCollector) {
      return cronosPriceCollector;
    }

    return (cronosPriceCollector = new PriceCollector(this.getCronosCacheManager()));
  },

  getMoonbeamPriceCollector() {
    if (moonbeamPriceCollector) {
      return moonbeamPriceCollector;
    }

    return (moonbeamPriceCollector = new PriceCollector(this.getMoonbeamCacheManager()));
  },
  
  getDb() {
    if (db) {
      return db;
    }

    return (db = new Db(
      this.getDatabase(),
      this.getPriceOracle(),
      this.getPlatforms(),
      this.getPriceCollector(),
      this.getLiquidityTokenCollector(),
    ));
  },

  getPolygonDb() {
    if (polygonDb) {
      return polygonDb;
    }

    return (polygonDb = new Db(
      this.getDatabase(),
      this.getPolygonPriceOracle(),
      this.getPolygonPlatforms(),
      this.getPolygonPriceCollector(),
      this.getPolygonLiquidityTokenCollector(),
    ));
  },

  getFantomDb() {
    if (fantomDb) {
      return fantomDb;
    }

    return (fantomDb = new Db(
      this.getDatabase(),
      this.getFantomPriceOracle(),
      this.getFantomPlatforms(),
      this.getFantomPriceCollector(),
      this.getFantomLiquidityTokenCollector(),
    ));
  },

  getKccDb() {
    if (kccDb) {
      return kccDb;
    }

    return (kccDb = new Db(
      this.getDatabase(),
      this.getKccPriceOracle(),
      this.getKccPlatforms(),
      this.getKccPriceCollector(),
      this.getKccLiquidityTokenCollector(),
    ));
  },

  getHarmonyDb() {
    if (harmonyDb) {
      return harmonyDb;
    }

    return (harmonyDb = new Db(
      this.getDatabase(),
      this.getHarmonyPriceOracle(),
      this.getHarmonyPlatforms(),
      this.getHarmonyPriceCollector(),
      this.getHarmonyLiquidityTokenCollector(),
    ));
  },

  getCeloDb() {
    if (celoDb) {
      return celoDb;
    }

    return (celoDb = new Db(
      this.getDatabase(),
      this.getCeloPriceOracle(),
      this.getCeloPlatforms(),
      this.getCeloPriceCollector(),
      this.getCeloLiquidityTokenCollector(),
    ));
  },

  getMoonriverDb() {
    if (moonriverDb) {
      return moonriverDb;
    }

    return (moonriverDb = new Db(
      this.getDatabase(),
      this.getMoonriverPriceOracle(),
      this.getMoonriverPlatforms(),
      this.getMoonriverPriceCollector(),
      this.getMoonriverLiquidityTokenCollector(),
    ));
  },
  
  getCronosDb() {
    if (cronosDb) {
      return cronosDb;
    }

    return (cronosDb = new Db(
      this.getDatabase(),
      this.getCronosPriceOracle(),
      this.getCronosPlatforms(),
      this.getCronosPriceCollector(),
      this.getCronosLiquidityTokenCollector(),
    ));
  },

  getMoonbeamDb() {
    if (moonbeamDb) {
      return moonbeamDb;
    }

    return (moonbeamDb = new Db(
      this.getDatabase(),
      this.getMoonbeamPriceOracle(),
      this.getMoonbeamPlatforms(),
      this.getMoonbeamPriceCollector(),
      this.getMoonbeamLiquidityTokenCollector(),
    ));
  },
    
  getHttp() {
    if (http) {
      return http;
    }

    return (http = new Http(
      module.exports.CONFIG,
      this.getPriceOracle(),
      this.getPlatforms(),
      this.getPolygonPlatforms(),
      this.getFantomPlatforms(),
      this.getKccPlatforms(),
      this.getHarmonyPlatforms(),
      this.getCeloPlatforms(),
      this.getMoonriverPlatforms(),
      this.getCronosPlatforms(),
      this.getMoonbeamPlatforms(),
      this.getCrossPlatforms(),
      this.getBalances(),
      this.getAddressTransactions(),
      this.getPolygonAddressTransactions(),
      this.getFantomAddressTransactions(),
      this.getTokenCollector(),
      this.getLiquidityTokenCollector(),
      this.getTokenInfo(),
      this.getFarmAuto(),
      this.getPolygonPriceOracle(),
      this.getPolygonLiquidityTokenCollector(),
      this.getPolygonTokenCollector(),
      this.getPolygonBalances(),
      this.getPolygonTokenInfo(),
      this.getPolygonFarmAuto(),
      this.getFantomPriceOracle(),
      this.getFantomLiquidityTokenCollector(),
      this.getFantomTokenCollector(),
      this.getFantomBalances(),
      this.getFantomTokenInfo(),
      this.getFantomFarmAuto(),
      this.getKccPriceOracle(),
      this.getKccLiquidityTokenCollector(),
      this.getKccTokenCollector(),
      this.getKccBalances(),
      this.getKccTokenInfo(),
      this.getKccAddressTransactions(),
      this.getHarmonyPriceOracle(),
      this.getHarmonyLiquidityTokenCollector(),
      this.getHarmonyTokenCollector(),
      this.getHarmonyBalances(),
      this.getHarmonyTokenInfo(),
      this.getHarmonyAddressTransactions(),
      this.getCeloPriceOracle(),
      this.getCeloLiquidityTokenCollector(),
      this.getCeloTokenCollector(),
      this.getCeloBalances(),
      this.getCeloTokenInfo(),
      this.getCeloAddressTransactions(),
      this.getMoonriverPriceOracle(),
      this.getMoonriverLiquidityTokenCollector(),
      this.getMoonriverTokenCollector(),
      this.getMoonriverBalances(),
      this.getMoonriverTokenInfo(),
      this.getMoonriverAddressTransactions(),
      this.getCronosPriceOracle(),
      this.getCronosLiquidityTokenCollector(),
      this.getCronosTokenCollector(),
      this.getCronosBalances(),
      this.getCronosTokenInfo(),
      this.getCronosAddressTransactions(),

      this.getMoonbeamPriceOracle(),
      this.getMoonbeamLiquidityTokenCollector(),
      this.getMoonbeamTokenCollector(),
      this.getMoonbeamBalances(),
      this.getMoonbeamTokenInfo(),
      this.getMoonbeamAddressTransactions(),
    ));
  },

  getFarmFetcher() {
    if (farmFetcher) {
      return farmFetcher;
    }

    return (farmFetcher = new FarmFetcher(
      this.getContractAbiFetcher(),
      this.getTokenCollector(),
    ));
  },

  getPolygonFarmFetcher() {
    if (polygonFarmFetcher) {
      return polygonFarmFetcher;
    }

    return (polygonFarmFetcher = new FarmFetcher(
      this.getContractAbiFetcher(),
      this.getPolygonTokenCollector(),
    ));
  },

  getFantomFarmFetcher() {
    if (fantomFarmFetcher) {
      return fantomFarmFetcher;
    }

    return (fantomFarmFetcher = new FarmFetcher(
      this.getContractAbiFetcher(),
      this.getFantomTokenCollector(),
    ));
  },

  getKccFarmFetcher() {
    if (kccFarmFetcher) {
      return kccFarmFetcher;
    }

    return (kccFarmFetcher = new FarmFetcher(
      this.getContractAbiFetcher(),
      this.getKccTokenCollector(),
    ));
  },

  getHarmonyFarmFetcher() {
    if (harmonyFarmFetcher) {
      return harmonyFarmFetcher;
    }

    return (harmonyFarmFetcher = new FarmFetcher(
      this.getContractAbiFetcher(),
      this.getHarmonyTokenCollector(),
    ));
  },

  getCeloFarmFetcher() {
    if (celoFarmFetcher) {
      return celoFarmFetcher;
    }

    return (celoFarmFetcher = new FarmFetcher(
      this.getContractAbiFetcher(),
      this.getCeloTokenCollector(),
    ));
  },

  getMoonriverFarmFetcher() {
    if (moonriverFarmFetcher) {
      return moonriverFarmFetcher;
    }

    return (moonriverFarmFetcher = new FarmFetcher(
      this.getContractAbiFetcher(),
      this.getMoonriverTokenCollector(),
    ));
  },
  
  getCronosFarmFetcher() {
    if (cronosFarmFetcher) {
      return cronosFarmFetcher;
    }

    return (cronosFarmFetcher = new FarmFetcher(
      this.getContractAbiFetcher(),
      this.getCronosTokenCollector(),
    ));
  },

  getMoonbeamFarmFetcher() {
    if (moonbeamFarmFetcher) {
      return moonbeamFarmFetcher;
    }

    return (moonbeamFarmFetcher = new FarmFetcher(
      this.getContractAbiFetcher(),
      this.getMoonbeamTokenCollector(),
    ));
  },
  
  getContractAbiFetcher() {
    if (contractAbiFetcher) {
      return contractAbiFetcher;
    }

    return (contractAbiFetcher = new ContractAbiFetcher(
      this.getBscscanRequest(),
      this.getCacheManager(),
      path.resolve(__dirname, '../var/contracts')
    ));
  },

  getTokenInfo() {
    if (tokenInfo) {
      return tokenInfo;
    }

    return (tokenInfo = new TokenInfo(
      this.getCacheManager(),
      this.getTokenCollector(),
      this.getLiquidityTokenCollector(),
      this.getPriceCollector(),
      this.getDb(),
    ));
  },

  getPolygonTokenInfo() {
    if (polygonTokenInfo) {
      return polygonTokenInfo;
    }

    return (polygonTokenInfo = new TokenInfo(
      this.getPolygonCacheManager(),
      this.getPolygonTokenCollector(),
      this.getPolygonLiquidityTokenCollector(),
      this.getPolygonPriceCollector(),
      this.getPolygonDb(),
    ));
  },

  getFantomTokenInfo() {
    if (fantomTokenInfo) {
      return fantomTokenInfo;
    }

    return (fantomTokenInfo = new TokenInfo(
      this.getFantomCacheManager(),
      this.getFantomTokenCollector(),
      this.getFantomLiquidityTokenCollector(),
      this.getFantomPriceCollector(),
      this.getFantomDb(),
    ));
  },

  getKccTokenInfo() {
    if (kccTokenInfo) {
      return kccTokenInfo;
    }

    return (kccTokenInfo = new TokenInfo(
      this.getKccCacheManager(),
      this.getKccTokenCollector(),
      this.getKccLiquidityTokenCollector(),
      this.getKccPriceCollector(),
      this.getKccDb(),
    ));
  },

  getHarmonyTokenInfo() {
    if (harmonyTokenInfo) {
      return harmonyTokenInfo;
    }

    return (harmonyTokenInfo = new TokenInfo(
      this.getHarmonyCacheManager(),
      this.getHarmonyTokenCollector(),
      this.getHarmonyLiquidityTokenCollector(),
      this.getHarmonyPriceCollector(),
      this.getHarmonyDb(),
    ));
  },

  getCeloTokenInfo() {
    if (celoTokenInfo) {
      return celoTokenInfo;
    }

    return (celoTokenInfo = new TokenInfo(
      this.getCeloCacheManager(),
      this.getCeloTokenCollector(),
      this.getCeloLiquidityTokenCollector(),
      this.getCeloPriceCollector(),
      this.getCeloDb(),
    ));
  },

  getMoonriverTokenInfo() {
    if (moonriverTokenInfo) {
      return moonriverTokenInfo;
    }

    return (moonriverTokenInfo = new TokenInfo(
      this.getMoonriverCacheManager(),
      this.getMoonriverTokenCollector(),
      this.getMoonriverLiquidityTokenCollector(),
      this.getMoonriverPriceCollector(),
      this.getMoonriverDb(),
    ));
  },
  
  getCronosTokenInfo() {
    if (cronosTokenInfo) {
      return cronosTokenInfo;
    }

    return (cronosTokenInfo = new TokenInfo(
      this.getCronosCacheManager(),
      this.getCronosTokenCollector(),
      this.getCronosLiquidityTokenCollector(),
      this.getCronosPriceCollector(),
      this.getCronosDb(),
    ));
  },

  getMoonbeamTokenInfo() {
    if (moonbeamTokenInfo) {
      return moonbeamTokenInfo;
    }

    return (moonbeamTokenInfo = new TokenInfo(
      this.getMoonbeamCacheManager(),
      this.getMoonbeamTokenCollector(),
      this.getMoonbeamLiquidityTokenCollector(),
      this.getMoonbeamPriceCollector(),
      this.getMoonbeamDb(),
    ));
  },

  getFantomAdditionalTokenInfo() {
    if (fantomAdditionalTokenInfo) {
      return fantomAdditionalTokenInfo;
    }

    return (fantomAdditionalTokenInfo = new FantomAdditionalTokenInfo(
      this.getFantomCacheManager(),
      this.getFantomTokenCollector(),
      this.getFantomLiquidityTokenCollector(),
      this.getFantomPriceCollector(),
      this.getFantomPriceOracle(),
      this.getFbeefy(),
      this.getFyearn(),
      this.getRobovault(),
    ));
  },

  getPolygonAdditionalTokenInfo() {
    if (polygonAdditionalTokenInfo) {
      return polygonAdditionalTokenInfo;
    }

    return (polygonAdditionalTokenInfo = new PolygonAdditionalTokenInfo(
      this.getPolygonCacheManager(),
      this.getPolygonTokenCollector(),
      this.getPolygonLiquidityTokenCollector(),
      this.getPolygonPriceCollector(),
      this.getPolygonPriceOracle(),
    ));
  },

  getStableCollector() {
    if (stableCollector) {
      return stableCollector;
    }

    return (stableCollector = new StableCollector(
      this.getCacheManager(),
      this.getPriceFetcher(),
    ));
  },

  getBscscanRequest() {
    if (bscscanRequest) {
      return bscscanRequest;
    }

    return (bscscanRequest = new BscscanRequest(
      module.exports.CONFIG['BSCSCAN_API_KEY'] || '',
      module.exports.CONFIG['POLYGONSCAN_API_KEY'] || '',
      module.exports.CONFIG['FANTOMSCAN_API_KEY'] || '',
      module.exports.CONFIG['CELOSCAN_API_KEY'] || '',
      module.exports.CONFIG['CRONOSSCAN_API_KEY'] || '',
    ));
  },
};
