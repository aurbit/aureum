import { Blockchain } from './Blockchain'
import { Aeth } from './Aeth'
import { TxManager } from './TxManager'
import { HttpServer } from './HttpServer'

import config from '../config'

const main = args => {
  const http_port: number = config.port
  const contract_address: string = config.plasmaContractAddress
  const operator_address: string = config.plasmaOperatorAddress
  const aeth = new Aeth(contract_address, operator_address)
  const blockchain = new Blockchain(aeth)
  const txManager = new TxManager()

  const server = new HttpServer(
    http_port,
    aeth,
    blockchain,
    txManager,
    args?.network
  )
  return server
}

export default main
