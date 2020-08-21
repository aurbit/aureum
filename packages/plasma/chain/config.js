const networks = {
  DEVELOPMENT: 'development',
  ROPSTEN: 'ropsten'
}

const plasmaContractDev = require('../contracts/development/PlasmaChainManager')
const network = process.env.NETWORK || 'development'

const _contract = () => {
  switch (network) {
    case networks.DEVELOPMENT: {
      return plasmaContractDev
    }
    default:
      break
  }
}

const _provider = () => {
  switch (network) {
    case networks.DEVELOPMENT: {
      return 'http://localhost:7545'
    }
    default:
      break
  }
}

module.exports = {
  get plasmaContractArtifacts () {
    const contract = _contract()
    return contract.artifact
  },
  get plasmaContractAddress () {
    const contract = _contract()
    return contract.address
  },
  get plasmaOperatorAddress () {
    const contract = _contract()
    return contract.operator
  },
  get providerUrl () {
    return _provider()
  }
}
