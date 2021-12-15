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
const CrossPlatforms = require("./platforms/cross_platforms");

const FarmAuto = require("./farm/farm_auto");

const Pancake = require("./platforms/bsc/pancake/pancake");
const Swamp = require("./platforms/bsc/swamp/swamp");
const Blizzard = require("./platforms/bsc/blizzard/blizzard");
const Hyperjump = require("./platforms/bsc/hyperjump/hyperjump");
const Slime = require("./platforms/bsc/slime/slime");
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
const Kebab = require("./platforms/bsc/kebab/kebab");
const Polaris = require("./platforms/bsc/polaris/polaris");
const Panther = require("./platforms/bsc/panther/panther");
const Jetswap = require("./platforms/bsc/jetswap/jetswap");
const Warden = require("./platforms/bsc/warden/warden");
const Biswap = require("./platforms/bsc/biswap/biswap");
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
const Qubit = require("./platforms/bsc/qubit/qubit");
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
const Valuedefi = require("./platforms/bsc/valuedefi/valuedefi");
const Jul = require("./platforms/bsc/jul/jul");
const Ten = require("./platforms/bsc/ten/ten");
const Autoshark = require("./platforms/bsc/autoshark/autoshark");
const Mars = require("./platforms/bsc/mars/mars");
const MarsMasterchef0 = require("./platforms/bsc/mars/mars_masterchef0");
const MarsMasterchef1 = require("./platforms/bsc/mars/mars_masterchef1");
const Atlantis = require("./platforms/bsc/atlantis/atlantis");
const Synapse = require("./platforms/synapse");
const Annex = require("./platforms/bsc/annex/annex");

const Pwault = require("./platforms/polygon/pwault/pwault");
const Polycat = require("./platforms/polygon/polycat/polycat");
const Pjetswap = require("./platforms/polygon/pjetswap/pjetswap");
const Polyzap = require("./platforms/polygon/polyzap/polyzap");
const Augury = require("./platforms/polygon/augury/augury");
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
const Papeswap = require("./platforms/polygon/papeswap/papeswap");
const Psushi = require("./platforms/polygon/psushi/psushi");
const Pcurve = require("./platforms/polygon/pcurve/pcurve");
const PolycatCompound = require("./platforms/polygon/polycat/polycat_compound");
const PolycatPaw = require("./platforms/polygon/polycat/polycat_paw");
const PolycatDecorator = require("./platforms/polygon/polycat/polycat_decorator");
const Peleven = require("./platforms/polygon/peleven/peleven");
const Adamant = require("./platforms/polygon/adamant/adamant");
const Quickswap = require("./platforms/polygon/quickswap/quickswap");
const Pearzap = require("./platforms/polygon/pearzap/pearzap");
const PelevenLeverage = require("./platforms/polygon/peleven/peleven_leverage");
const PelevenDecorator = require("./platforms/polygon/peleven/peleven_decorator");
const Pcream = require("./platforms/polygon/pcream/pcream");
const Pfortube = require("./platforms/polygon/pfortube/pfortube");
const Balancer = require("./platforms/polygon/balancer/balancer");
const Impermax = require("./platforms/polygon/impermax/impermax");
const Pcafeswap = require("./platforms/polygon/pcafeswap/pcafeswap");
const Polysage = require("./platforms/polygon/polysage/polysage");
const Paave = require("./platforms/polygon/paave/paave");
const Pfulcrum = require("./platforms/polygon/pfulcrum/pfulcrum");
const Market = require("./platforms/polygon/market/market");
const MarketPool = require("./platforms/polygon/market/market_pool");

const Spookyswap = require("./platforms/fantom/spookyswap/spookyswap");
const Spiritswap = require("./platforms/fantom/spiritswap/spiritswap");
const Liquiddriver = require("./platforms/fantom/liquiddriver/liquiddriver");
const Fbeefy = require("./platforms/fantom/fbeefy/fbeefy");
const Fcurve = require("./platforms/fantom/fcurve/fcurve");
const Ester = require("./platforms/fantom/ester/ester");
const Frankenstein = require("./platforms/fantom/frankenstein/frankenstein");
const Reaper = require("./platforms/fantom/reaper/reaper");
const Fcream = require("./platforms/fantom/fcream/fcream");
const Tarot = require("./platforms/fantom/tarot/tarot");
const Fwaka = require("./platforms/fantom/fwaka/fwaka");
const Fhyperjump = require("./platforms/fantom/fhyperjump/fhyperjump");
const Fautofarm = require("./platforms/fantom/fautofarm/fautofarm");
const SpiritswapLend = require("./platforms/fantom/spiritswap/spiritswap_lend");
const SpiritswapDecorator = require("./platforms/fantom/spiritswap/spiritswap_decorator");
const Feleven = require("./platforms/fantom/feleven/feleven");
const Fjetswap = require("./platforms/fantom/fjetswap/fjetswap");
const Paintswap = require("./platforms/fantom/paintswap/paintswap");
const Fswamp = require("./platforms/fantom/fswamp/fswamp");
const Beethovenx = require("./platforms/fantom/beethovenx/beethovenx");
const Robovault = require("./platforms/fantom/robovault/robovault");
const Morpheus = require("./platforms/fantom/morpheus/morpheus");
const Geist = require("./platforms/fantom/geist/geist");
const Grim = require("./platforms/fantom/grim/grim");
const Zoocoin = require("./platforms/fantom/zoocoin/zoocoin");
const Fpearzap = require("./platforms/fantom/fpearzap/fpearzap");

const Kuswap = require("./platforms/kcc/kuswap/kuswap");
const Kudex = require("./platforms/kcc/kudex/kudex");
const Kukafe = require("./platforms/kcc/kukafe/kukafe");
const KukafeCompound = require("./platforms/kcc/kukafe/kukafe_compound");
const KukafeDecorator = require("./platforms/kcc/kukafe/kukafe_decorator");
const Boneswap = require("./platforms/kcc/boneswap/boneswap");
const Scream = require("./platforms/fantom/scream/scream");

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

const Vvs = require("./platforms/cronos/vvs/vvs");
const Cronaswap = require("./platforms/cronos/cronaswap/cronaswap");
const Crodex = require("./platforms/cronos/crodex/crodex");
const Crokafe = require("./platforms/cronos/crokafe/crokafe");
const Crautofarm = require("./platforms/cronos/crautofarm/crautofarm");
const Crbeefy = require("./platforms/cronos/crbeefy/crbeefy");
const Crannex = require("./platforms/cronos/crannex/crannex");
const CrannexMasterchef = require("./platforms/cronos/crannex/crannex_masterchef");
const Mmf = require("./platforms/cronos/mmf/mmf");

let pancake;
let swamp;
let blizzard;
let hyperjump;
let slime;
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
let kebab;
let polaris;
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
let qubit;
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
let valuedefi;
let jul;
let ten;
let autoshark;
let mars;
let atlantis;
let synapse;
let annex;

let pwault;
let polycat;
let pjetswap;
let polyzap;
let augury;
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
let papeswap;
let psushi;
let pcurve;
let polycatCompound;
let polycatPaw;
let polycatDecorator;
let peleven;
let adamant;
let quickswap;
let pearzap;
let pelevenLeverage;
let pelevenDecorator;
let pcream;
let pfortube;
let balancer;
let impermax;
let pcafeswap;
let polysage;
let paave;
let pfulcrum;
let psynapse;
let market;

let spookyswap;
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
let fwaka;
let fhyperjump;
let fautofarm;
let spiritswapDecorator;
let feleven;
let fjetswap;
let paintswap;
let fswamp;
let beethovenx;
let robovault;
let morpheus;
let geist;
let grim;
let zoocoin;
let fpearzap;
let fsynapse;

let kuswap;
let kudex;
let kukafe;
let boneswap;
let kukafeCompound;
let kukafeDecorator;

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

let vvs;
let cronaswap;
let crodex;
let crokafe;
let crautofarm
let crbeefy;
let crannex;
let mmf;

let polygonPlatform;
let fantomPlatform;
let kccPlatform;
let harmonyPlatform;
let celoPlatform;
let moonriverPlatform;
let cronosPlatform;

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
          this.getSlime(),
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
          this.getKebab(),
          this.getPolaris(),
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
          this.getQubit(),
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
          this.getValuedefi(),
          this.getJul(),
          this.getTen(),
          this.getAutoshark(),
          this.getMars(),
          this.getAtlantis(),
          this.getSynapse(),
          this.getAnnex(),
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

    return (polygonPlatform = new Platforms(
      [
        this.getPwault(),
        this.getPolycatDecorator(),
        this.getPjetswap(),
        this.getPolyzap(),
        this.getAugury(),
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
        this.getPapeswap(),
        this.getPsushi(),
        this.getPcurve(),
        this.getPelevenDecorator(),
        this.getAdamant(),
        this.getQuickswap(),
        this.getPearzap(),
        this.getPcream(),
        this.getPfortube(),
        this.getBalancer(),
        this.getImpermax(),
        this.getPcafeswap(),
        this.getPolysage(),
        this.getPaave(),
        this.getPfulcrum(),
        this.getPSynapse(),
        this.getMarket(),
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

    return (fantomPlatform = new Platforms(
      [
        this.getSpookyswap(),
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
        this.getFwaka(),
        this.getFhyperjump(),
        this.getFautofarm(),
        this.getFeleven(),
        this.getFjetswap(),
        this.getPaintswap(),
        this.getFswamp(),
        this.getBeethovenx(),
        this.getRobovault(),
        this.getMorpheus(),
        this.getGeist(),
        this.getGrim(),
        this.getZoocoin(),
        this.getFpearzap(),
        this.getFSynapse(),
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

    return (kccPlatform = new Platforms(
      [
        this.getKuswap(),
        this.getKudex(),
        this.getKukafeDecorator(),
        this.getBoneswap(),
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

    return (moonriverPlatform = new Platforms(
      [
        this.getMautofarm(),
        this.getSolarbeam(),
        this.getHuckleberry(),
        this.getMoonfarm(),
        this.getMoonkafe(),
        this.getMbeefy(),
        this.getMsushi(),
      ],
      this.getCache(),
      this.getMoonriverPriceOracle(),
      this.getMoonriverTokenCollector(),
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

  getPwault() {
    if (pwault) {
      return pwault;
    }

    return (pwault = new Pwault(
      this.getPolygonCacheManager(),
      this.getPolygonPriceOracle(),
      this.getPolygonTokenCollector(),
      this.getPolygonFarmFetcher(),
      this.getPolygonCacheManager(),
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

  getFjetswap() {
    if (fjetswap) {
      return fjetswap;
    }

    return (fjetswap = new Fjetswap(
      this.getFantomCacheManager(),
      this.getFantomPriceOracle(),
      this.getFantomTokenCollector(),
      this.getFantomFarmFetcher(),
      this.getFantomCacheManager(),
    ));
  },

  getPaintswap() {
    if (paintswap) {
      return paintswap;
    }

    return (paintswap = new Paintswap(
      this.getFantomCacheManager(),
      this.getFantomPriceOracle(),
      this.getFantomTokenCollector(),
      this.getFantomFarmFetcher(),
      this.getFantomCacheManager(),
    ));
  },

  getPolyzap() {
    if (polyzap) {
      return polyzap;
    }

    return (polyzap = new Polyzap(
      this.getPolygonCacheManager(),
      this.getPolygonPriceOracle(),
      this.getPolygonTokenCollector(),
      this.getPolygonFarmFetcher(),
      this.getPolygonCacheManager(),
    ));
  },

  getPearzap() {
    if (pearzap) {
      return pearzap;
    }

    return (pearzap = new Pearzap(
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

  getAugury() {
    if (augury) {
      return augury;
    }

    return (augury = new Augury(
      this.getPolygonCacheManager(),
      this.getPolygonPriceOracle(),
      this.getPolygonTokenCollector(),
      this.getPolygonFarmFetcher(),
      this.getPolygonCacheManager(),
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

  getPapeswap() {
    if (papeswap) {
      return papeswap;
    }

    return (papeswap = new Papeswap(
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
      this.getPolygonFarmFetcher(),
      this.getPolygonCacheManager(),
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
    ));
  },

  getAutofarm() {
    if (autofarm) {
      return autofarm;
    }

    return (autofarm = new Autofarm(
      this.getCacheManager(),
      this.getPriceOracle(),
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

  getValuedefi() {
    if (valuedefi) {
      return valuedefi;
    }

    return (valuedefi = new Valuedefi(
      this.getCacheManager(),
      this.getPriceOracle(),
    ));
  },

  getJul() {
    if (jul) {
      return jul;
    }

    return (jul = new Jul(
      this.getCacheManager(),
      this.getPriceOracle(),
      this.getTokenCollector(),
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
      ),
      new MarsMasterchef1(
        this.getCacheManager(),
        this.getPriceOracle(),
        this.getTokenCollector(),
        this.getFarmFetcher(),
        this.getCacheManager(),
        this.getFarmPlatformResolver(),
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
        5,
        '0x5BeB233453d3573490383884Bd4B9CbA0663218a'
      ),
      new MarketPool(
        this.getPolygonPriceOracle(),
        this.getPolygonTokenCollector(),
        this.getPolygonCacheManager(),
        this.getPolygonLiquidityTokenCollector(),
        this.getPolygonFarmPlatformResolver(),
        3,
        '0x296233b4f2FEf1Ce7977340cEb3cec4CbE3ada42'
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
    ));
  },

  getHautofarm() {
    if (hautofarm) {
      return hautofarm;
    }

    return (hautofarm = new Hautofarm(
      this.getHarmonyCacheManager(),
      this.getHarmonyPriceOracle(),
    ));
  },

  getFautofarm() {
    if (fautofarm) {
      return fautofarm;
    }

    return (fautofarm = new Fautofarm(
      this.getFantomCacheManager(),
      this.getFantomPriceOracle(),
    ));
  },

  getMautofarm() {
    if (mautofarm) {
      return mautofarm;
    }

    return (mautofarm = new Mautofarm(
      this.getMoonriverCacheManager(),
      this.getMoonriverPriceOracle(),
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

  getSpookyswap() {
    if (spookyswap) {
      return spookyswap;
    }

    return (spookyswap = new Spookyswap(
      this.getFantomCacheManager(),
      this.getFantomPriceOracle(),
      this.getFantomTokenCollector(),
      this.getFantomFarmFetcher(),
      this.getFantomCacheManager(),
    ));
  },

  getFwaka() {
    if (fwaka) {
      return fwaka;
    }

    return (fwaka = new Fwaka(
      this.getFantomCacheManager(),
      this.getFantomPriceOracle(),
      this.getFantomTokenCollector(),
      this.getFantomFarmFetcher(),
      this.getFantomCacheManager(),
    ));
  },

  getFhyperjump() {
    if (fhyperjump) {
      return fhyperjump;
    }

    return (fhyperjump = new Fhyperjump(
      this.getFantomCacheManager(),
      this.getFantomPriceOracle(),
      this.getFantomTokenCollector(),
      this.getFantomFarmFetcher(),
      this.getFantomCacheManager(),
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
    ));
  },

  getCautofarm() {
    if (cautofarm) {
      return cautofarm;
    }

    return (cautofarm = new Cautofarm(
      this.getMoonriverCacheManager(),
      this.getMoonriverPriceOracle(),
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

  getPolaris() {
    if (polaris) {
      return polaris;
    }

    return (polaris = new Polaris(
      this.getCacheManager(),
      this.getPriceOracle(),
      this.getTokenCollector(),
      this.getFarmFetcher(),
      this.getCacheManager(),
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

  getSlime() {
    if (slime) {
      return slime;
    }

    return (slime = new Slime(
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

  getKebab() {
    if (kebab) {
      return kebab;
    }

    return (kebab = new Kebab(
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

  getBiswap() {
    if (biswap) {
      return biswap;
    }

    return (biswap = new Biswap(
      this.getCacheManager(),
      this.getPriceOracle(),
      this.getTokenCollector(),
      this.getFarmFetcher(),
      this.getCacheManager(),
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

    return (rabbit = new Rabbit(
      this.getPriceOracle(),
      this.getTokenCollector(),
      this.getCacheManager(),
      this.getLiquidityTokenCollector(),
      this.getFarmPlatformResolver(),
    ));
  },

  getQubit() {
    if (qubit) {
      return qubit;
    }

    return (qubit = new Qubit(
      this.getPriceOracle(),
      this.getTokenCollector(),
      this.getCacheManager(),
      this.getLiquidityTokenCollector(),
      this.getFarmPlatformResolver(),
    ));
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

  getMorpheus() {
    if (morpheus) {
      return morpheus;
    }

    return (morpheus = new Morpheus(
      this.getFantomCacheManager(),
      this.getFantomPriceOracle(),
      this.getFantomTokenCollector(),
      this.getFantomFarmFetcher(),
      this.getFantomCacheManager(),
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
    ));
  },

  getZoocoin() {
    if (zoocoin) {
      return zoocoin;
    }

    return (zoocoin = new Zoocoin(
      this.getFantomCacheManager(),
      this.getFantomPriceOracle(),
      this.getFantomTokenCollector(),
      this.getFantomFarmFetcher(),
      this.getFantomCacheManager(),
    ));
  },

  getFpearzap() {
    if (fpearzap) {
      return fpearzap;
    }

    return (fpearzap = new Fpearzap(
      this.getFantomCacheManager(),
      this.getFantomPriceOracle(),
      this.getFantomTokenCollector(),
      this.getFantomFarmFetcher(),
      this.getFantomCacheManager(),
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

  getPcafeswap() {
    if (pcafeswap) {
      return pcafeswap;
    }

    return (pcafeswap = new Pcafeswap(
      this.getPolygonCacheManager(),
      this.getPolygonPriceOracle(),
      this.getPolygonTokenCollector(),
      this.getPolygonFarmFetcher(),
      this.getPolygonCacheManager(),
    ));
  },

  getPolysage() {
    if (polysage) {
      return polysage;
    }

    return (polysage = new Polysage(
      this.getPolygonCacheManager(),
      this.getPolygonPriceOracle(),
      this.getPolygonTokenCollector(),
      this.getPolygonFarmFetcher(),
      this.getPolygonCacheManager(),
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

  getPfulcrum() {
    if (pfulcrum) {
      return pfulcrum;
    }

    return (pfulcrum = new Pfulcrum(
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

  getHbeefy() {
    if (hbeefy) {
      return hbeefy;
    }

    return (hbeefy = new Hbeefy(
      this.getHarmonyCacheManager(),
      this.getHarmonyPriceOracle(),
      this.getHarmonyTokenCollector(),
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
      this.getCeloFarmFetcher(),
      this.getCeloCacheManager(),
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
      this.getMoonriverFarmFetcher(),
      this.getMoonriverCacheManager(),
    ));
  },

  getVvs() {
    if (vvs) {
      return vvs;
    }

    return (vvs = new Vvs(
      this.getCronosCacheManager(),
      this.getCronosPriceOracle(),
      this.getCronosTokenCollector(),
      this.getCronosFarmFetcher(),
      this.getCronosCacheManager(),
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
      this.getCronosFarmFetcher(),
      this.getCronosCacheManager(),
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

  getLiquidityTokenCollector() {
    if (liquidityTokenCollector) {
      return liquidityTokenCollector;
    }

    return (liquidityTokenCollector = new LiquidityTokenCollector(
      this.getCacheManager(),
    ));
  },

  getPolygonLiquidityTokenCollector() {
    if (polygonLiquidityTokenCollector) {
      return polygonLiquidityTokenCollector;
    }

    return (polygonLiquidityTokenCollector = new LiquidityTokenCollector(
      this.getPolygonCacheManager(),
    ));
  },

  getFantomLiquidityTokenCollector() {
    if (fantomLiquidityTokenCollector) {
      return fantomLiquidityTokenCollector;
    }

    return (fantomLiquidityTokenCollector = new LiquidityTokenCollector(
      this.getFantomCacheManager(),
    ));
  },

  getKccLiquidityTokenCollector() {
    if (kccLiquidityTokenCollector) {
      return kccLiquidityTokenCollector;
    }

    return (kccLiquidityTokenCollector = new LiquidityTokenCollector(
      this.getKccCacheManager(),
    ));
  },

  getHarmonyLiquidityTokenCollector() {
    if (harmonyLiquidityTokenCollector) {
      return harmonyLiquidityTokenCollector;
    }

    return (harmonyLiquidityTokenCollector = new LiquidityTokenCollector(
      this.getHarmonyCacheManager(),
    ));
  },

  getCeloLiquidityTokenCollector() {
    if (celoLiquidityTokenCollector) {
      return celoLiquidityTokenCollector;
    }

    return (celoLiquidityTokenCollector = new LiquidityTokenCollector(
      this.getCeloCacheManager(),
    ));
  },

  getMoonriverLiquidityTokenCollector() {
    if (moonriverLiquidityTokenCollector) {
      return moonriverLiquidityTokenCollector;
    }

    return (moonriverLiquidityTokenCollector = new LiquidityTokenCollector(
      this.getMoonriverCacheManager(),
    ));
  },
  
  getCronosLiquidityTokenCollector() {
    if (cronosLiquidityTokenCollector) {
      return cronosLiquidityTokenCollector;
    }

    return (cronosLiquidityTokenCollector = new LiquidityTokenCollector(
      this.getCronosCacheManager(),
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
    
  getHttp() {
    if (http) {
      return http;
    }

    return (http = new Http(
      this.getPriceOracle(),
      this.getPlatforms(),
      this.getPolygonPlatforms(),
      this.getFantomPlatforms(),
      this.getKccPlatforms(),
      this.getHarmonyPlatforms(),
      this.getCeloPlatforms(),
      this.getMoonriverPlatforms(),
      this.getCronosPlatforms(),
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
  
  getContractAbiFetcher() {
    if (contractAbiFetcher) {
      return contractAbiFetcher;
    }

    return (contractAbiFetcher = new ContractAbiFetcher(
      this.getBscscanRequest(),
      this.getCacheManager(),
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
  
  getBscscanRequest() {
    if (bscscanRequest) {
      return bscscanRequest;
    }

    return (bscscanRequest = new BscscanRequest(
      module.exports.CONFIG['BSCSCAN_API_KEY'] || '',
      module.exports.CONFIG['POLYGONSCAN_API_KEY'] || '',
      module.exports.CONFIG['FANTOMSCAN_API_KEY'] || '',
      module.exports.CONFIG['CELOSCAN_API_KEY'] || '',
    ));
  },
};
