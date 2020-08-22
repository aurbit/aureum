import crypto from 'crypto'
import { BlockHeader, IBlockHeader } from './BlockHeader'

export interface IBlock {
  blockHeader: any
  transactions: string[]
  hash: string
}

export class Block implements IBlock {
  blockHeader: IBlockHeader
  transactions: string[]
  hash: string

  constructor (blockNumber: number, previousHash: string, transactions) {
    const data: string[] = []
    transactions.forEach(tx => data.push(tx.toString(true)))
    this.blockHeader = new BlockHeader(blockNumber, previousHash, data)
    this.transactions = transactions
    this.hash = this.blockHash
  }

  get blockHash (): string {
    return crypto
      .createHash('sha256')
      .update(this.toString())
      .digest('hex')
  }

  public toString (): string {
    let txsHex = ''
    this.transactions.forEach(tx => (txsHex += tx))
    return this.blockHeader.toString(true) + txsHex
  }

  public printBlock () {
    return {
      blockNumber: this.blockHeader.blockNumber,
      previousHash: this.blockHeader.previousHash,
      merkleRoot: this.blockHeader.merkleRoot,
      signature:
        this.blockHeader.sigR + this.blockHeader.sigS + this.blockHeader.sigV,
      transactions: this.transactions.filter(tx => tx.length > 0)
    }
  }
}
