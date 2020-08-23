require('dotenv').config()

const networks = {
  TEST: 'test',
  DEVELOPMENT: 'development',
  ROPSTEN: 'ropsten'
}

const plasmaContractDev = require('./contracts/development/PlasmaChainManager')
const network = process.env.NETWORK || networks.DEVELOPMENT

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
    case networks.TEST: {
      return 'http://localhost:9545'
    }
    default:
      return 'http://localhost:7545'
  }
}

const config = {
  get port (): number {
    return Number(process.env.PORT) || 3001
  },
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

export default config
