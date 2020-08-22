import utils from './utils'
import { TxManager, ITxManager } from './TxManger'

import { IAeth } from './Aeth'
import { Block, IBlock } from './Block'

export interface IBlockchain {
  aeth: IAeth
  txManager: ITxManager
  blockchain: IBlock[]

  getBlock: any
  blocks: any
  latestBlock: any
  generateNextBlock: any
  getTransactionProofInBlock: any
}

export class Blockchain implements IBlockchain {
  aeth: IAeth
  blockchain: IBlock[]
  txManager: ITxManager

  constructor (aeth: IAeth) {
    this.aeth = aeth
    this.blockchain = [this.genesisBlock]
    this.txManager = new TxManager()
  }

  async generateNextBlock () {
    const previousBlock = this.latestBlock
    const previousHash = previousBlock.hash
    const nextIndex = previousBlock.blockHeader.blockNumber + 1

    // Get all past transactions
    const deposits = await this.aeth.getDeposits(nextIndex - 1)
    const withdrawals = await this.aeth.getWithdrawals(nextIndex - 1)
    const transactions = await this.txManager.collectTransactions(
      nextIndex,
      deposits,
      withdrawals
    )

    const newBlock: IBlock = await new Block(
      nextIndex,
      previousHash,
      transactions
    )

    // Operator signs the new block.
    const messageToSign = utils.addHexPrefix(
      newBlock.blockHeader.toString(false)
    )
    const signature = await this.aeth.signBlock(messageToSign)
    newBlock.blockHeader.setSignature(signature)

    // Submit the block header to plasma contract.
    const hexPrefixHeader = utils.addHexPrefix(
      newBlock.blockHeader.toString(true)
    )
    await this.aeth.submitBlockHeader(hexPrefixHeader)

    // Add the new block to blockchain.
    this.blockchain.push(newBlock)
    return newBlock
  }

  get genesisBlock (): IBlock {
    return new Block(0, 'And the vast space was calm yet vibrant.', [])
  }

  getTransactionProofInBlock (blockNumber: number, txIndex: number) {
    const block = this.getBlock(blockNumber)
    const tx = utils.addHexPrefix(block.transactions[txIndex])
    const proof = utils.bufferToHex(
      Buffer.concat(block.blockHeader.merkle.getProof(txIndex)),
      true
    )
    return {
      root: block.blockHeader.merkleRoot,
      tx: tx,
      proof: proof
    }
  }

  get latestBlock (): IBlock {
    return this.blockchain[this.blockchain.length - 1]
  }

  get blocks (): IBlock[] {
    return this.blockchain
  }

  public getBlock (index: number): IBlock {
    return this.blockchain[index]
  }
}
