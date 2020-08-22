import express from 'express'
import bodyParser from 'body-parser'
import morgan from 'morgan'

import { IAeth } from './Aeth'
import { IBlockchain } from './Blockchain'
import { ITxManager } from './TxManager'

export interface IServer {
  txManager: ITxManager
  blockchain: IBlockchain
  aeth: IAeth
}

export class Server implements IServer {
  http_port: number
  aeth: IAeth
  blockchain: IBlockchain
  txManager: ITxManager
  app: any

  constructor (
    http_port: number,
    aeth: IAeth,
    blockchain: IBlockchain,
    txManaer: ITxManager
  ) {
    this.http_port = http_port
    this.aeth = aeth
    this.blockchain = blockchain
    this.txManager = txManaer
    this.app = express()
    this.logging()

    this.buildRoutes()
  }

  buildRoutes (): void {
    this.app.use(bodyParser.json())

    // Block related
    this.app.get('/blocks', (req, res) => {
      res.send(JSON.stringify(this.blockchain.blocks.map(b => b.printBlock())))
    })
    this.app.post('/mineBlock', async (req, res) => {
      try {
        const newBlock = await this.blockchain.generateNextBlock()
        res.send(JSON.stringify(newBlock.printBlock()))
      } catch (e) {
        console.log(e)
        res.send(JSON.stringify(e))
      }
    })

    // Transaction related
    this.app.post('/transact', async (req, res) => {
      try {
        const rawTx = await this.txManager.createTransaction(
          req.body,
          this.aeth
        )
        console.log('New transaction created: ' + JSON.stringify(rawTx))
        res.send(JSON.stringify(rawTx.toString(true)))
      } catch (err) {
        res.send(JSON.stringify(err))
      }
    })

    // Deposit related
    this.app.post('/deposit', async (req, res) => {
      try {
        const result = await this.aeth.deposit(
          req.body.address,
          req.body.amount
        )
        res.status(200).send(result)
      } catch (err) {
        res.status(500).send(JSON.stringify(err))
      }
    })

    // Withdrawal related
    this.app.post('/withdraw/create', async (req, res) => {
      try {
        const p = this.blockchain.getTransactionProofInBlock(
          req.body.blkNum,
          req.body.txIndex
        )
        const withdrawalId = await this.aeth.startWithdrawal(
          req.body.blkNum,
          req.body.txIndex,
          req.body.oIndex,
          p.tx,
          p.proof,
          req.body.from
        )
        res.send(withdrawalId)
      } catch (err) {
        res.send(JSON.stringify(err))
      }
    })

    this.app.post('/withdraw/challenge', async (req, res) => {
      try {
        const p = this.blockchain.getTransactionProofInBlock(
          req.body.blkNum,
          req.body.txIndex
        )
        await this.aeth.challengeWithdrawal(
          req.body.withdrawalId,
          req.body.blkNum,
          req.body.txIndex,
          req.body.oIndex,
          p.tx,
          p.proof,
          req.body.from
        )
        res.send()
      } catch (err) {
        res.send(JSON.stringify(err))
      }
    })
    this.app.post('/withdraw/finalize', async (req, res) => {
      try {
        const result = await this.aeth.finalizeWithdrawal(req.body.from)
        res.send(result)
      } catch (err) {
        res.send(JSON.stringify(err))
      }
    })

    // Debug function
    this.app.get('/utxo', (req, res) => {
      try {
        res.send(this.txManager.getUTXOS())
      } catch (err) {
        res.send(JSON.stringify(err))
      }
    })
    this.app.get('/pool', (req, res) => {
      try {
        res.send(this.txManager.getPool)
      } catch (err) {
        res.send(JSON.stringify(err))
      }
    })

    this.app.listen(this.http_port, () =>
      console.log('Aureum Plasma Server on port: ' + this.http_port)
    )
  }

  logging (): void {
    this.app.use(
      morgan(function (tokens, req, res) {
        return [
          tokens.date('web'),
          tokens.method(req, res),
          tokens.url(req, res),
          tokens.status(req, res),
          tokens.res(req, res, 'content-length'),
          '-',
          tokens['response-time'](req, res),
          'ms'
        ].join(' ')
      })
    )
  }
}
