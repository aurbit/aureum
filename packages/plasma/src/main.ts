import { Blockchain } from './chain/Blockchain'
import { Aeth } from './chain/Aeth'
import { TxManager } from './chain/TxManger'
import { Server } from './chain/Server'

import config from './config'

const main = () => {
  const http_port: number = config.port
  const contract_address: string = config.plasmaContractAddress
  const operator_address: string = config.plasmaOperatorAddress
  const aeth = new Aeth(contract_address, operator_address)
  const blockchain = new Blockchain(aeth)
  const txManager = new TxManager()

  new Server(http_port, aeth, blockchain, txManager)
}

main()
