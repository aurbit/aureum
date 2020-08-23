const PlasmaChainManager = artifacts.require('./PlasmaChainManager')
const MinHeapLib = artifacts.require('./MinHeapLib')
const ArrayLib = artifacts.require('./ArrayLib')
const RLP = artifacts.require('./RLP')
const exporter = require('../utils/exporter')

module.exports = async (deployer, network, accounts) => {
  const minHeapLib = await deployer.deploy(MinHeapLib)
  const arrayLib = await deployer.deploy(ArrayLib)
  const rlp = await deployer.deploy(RLP)

  await deployer.link(MinHeapLib, PlasmaChainManager)
  await deployer.link(ArrayLib, PlasmaChainManager)
  await deployer.link(RLP, PlasmaChainManager)

  const plasmaChainManager = await deployer.deploy(
    PlasmaChainManager,
    7 * 86400,
    14 * 86400
  )

  await exporter(
    'PlasmaChainManager',
    plasmaChainManager.address,
    network,
    accounts[0]
  )
}
