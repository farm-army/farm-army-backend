const services = require('../services');

void async function main() {
  if (!process.argv[2]) {
    console.log('invalid masterchef address parameter: need eg: 0x73feaa1eE314F8c655E354234017bE2193C9E24E')
    process.exit()
  }

  switch (process.argv[3] || 'bsc') {
    case 'polygon':
      console.log(JSON.stringify(await services.getPolygonFarmFetcher().fetchForMasterChef(process.argv[2], process.argv[3])));
      break;
    case 'fantom':
      console.log(JSON.stringify(await services.getFantomFarmFetcher().fetchForMasterChef(process.argv[2], process.argv[3])));
      break;
    case 'kcc':
      console.log(JSON.stringify(await services.getKccFarmFetcher().fetchForMasterChef(process.argv[2], process.argv[3])));
      break;
    case 'harmony':
      console.log(JSON.stringify(await services.getHarmonyFarmFetcher().fetchForMasterChef(process.argv[2], process.argv[3])));
      break;
    case 'celo':
      console.log(JSON.stringify(await services.getCeloFarmFetcher().fetchForMasterChef(process.argv[2], process.argv[3])));
      break;
    case 'moonriver':
      console.log(JSON.stringify(await services.getMoonriverFarmFetcher().fetchForMasterChef(process.argv[2], process.argv[3])));
      break;
    case 'cronos':
      console.log(JSON.stringify(await services.getCronosFarmFetcher().fetchForMasterChef(process.argv[2], process.argv[3])));
      break;
    case 'bsc':
    default:
      console.log(JSON.stringify(await services.getFarmFetcher().fetchForMasterChef(process.argv[2], process.argv[3])));
  }

  //process.exit()
}()
