const services = require('../services');

void async function main() {
  if (!process.argv[2]) {
    console.log('invalid masterchef address parameter: need eg: 0x73feaa1eE314F8c655E354234017bE2193C9E24E')
    process.exit()
  }

  console.log(await services.getFarmFetcher().fetchForMasterChef(process.argv[2]))
  process.exit()
}()
