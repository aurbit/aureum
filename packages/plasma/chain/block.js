'use strict'

const crypto = require('crypto')
const tx = require('./transaction')
const utils = require('./utils')
const Merkle = require('./merkle')

const Block = function (blockNumber, previousHash, transactions) {
  const data = []
  transactions.forEach(tx => data.push(tx.toString(true)))

  this.blockHeader = new BlockHeader(blockNumber, previousHash, data)
  this.transactions = transactions
}

Block.prototype.hash = function () {
  return crypto
    .createHash('sha256')
    .update(this.toString())
    .digest('hex')
}

Block.prototype.toString = function () {
  const txsHex = ''
  this.transactions.forEach(tx => (txsHex += tx))
  return this.blockHeader.toString(true) + txsHex
}

Block.prototype.printBlock = function () {
  return {
    blockNumber: this.blockHeader.blockNumber,
    previousHash: this.blockHeader.previousHash,
    merkleRoot: this.blockHeader.merkleRoot,
    signature:
      this.blockHeader.sigR + this.blockHeader.sigS + this.blockHeader.sigV,
    transactions: this.transactions.filter(tx => tx.length > 0)
  }
}

const BlockHeader = function (blockNumber, previousHash, data) {
  this.blockNumber = blockNumber // 32 bytes
  this.previousHash = previousHash // 32 bytes
  if (blockNumber == 0) {
    this.merkle = null
    this.merkleRoot = ''
  } else {
    this.merkle = new Merkle(data)
    this.merkle.makeTree()
    this.merkleRoot = utils.bufferToHex(this.merkle.getRoot(), false) // 32 bytes
  }
  this.sigR = '' // 32 bytes
  this.sigS = '' // 32 bytes
  this.sigV = '' // 1 byte
}

BlockHeader.prototype.setSignature = function (signature) {
  const sig = utils.removeHexPrefix(signature)
  const sigR = sig.substring(0, 64)
  const sigS = sig.substring(64, 128)
  const sigV = parseInt(sig.substring(128, 130), 16)
  if (sigV < 27) {
    sigV += 27
  }
  this.sigR = sigR
  this.sigS = sigS
  this.sigV = sigV.toString(16).padStart(2, '0')
}

BlockHeader.prototype.toString = function (includingSig) {
  const blkNumHexString = this.blockNumber.toString(16).padStart(64, '0')
  const rawBlockHeader = blkNumHexString + this.previousHash + this.merkleRoot
  if (includingSig) {
    rawBlockHeader += this.sigR + this.sigS + this.sigV
  }
  return rawBlockHeader
}

const getGenesisBlock = () => {
  // Create a hard coded genesis block.
  return new Block(
    0,
    '46182d20ccd7006058f3e801a1ff3de78b740b557bba686ced70f8e3d8a009a6',
    []
  )
}

const blockchain = [getGenesisBlock()]

const generateNextBlock = async geth => {
  const previousBlock = getLatestBlock()
  const previousHash = previousBlock.hash
  const nextIndex = previousBlock.blockHeader.blockNumber + 1

  // Query contract past event for deposits / withdrawals and collect transactions.
  const deposits = await geth.getDeposits(nextIndex - 1)
  const withdrawals = await geth.getWithdrawals(nextIndex - 1)
  const transactions = await tx.collectTransactions(
    nextIndex,
    deposits,
    withdrawals
  )

  const newBlock = await new Block(nextIndex, previousHash, transactions)

  // Operator signs the new block.
  const messageToSign = utils.addHexPrefix(newBlock.blockHeader.toString(false))

  const signature = await geth.signBlock(messageToSign)

  newBlock.blockHeader.setSignature(signature)

  // Submit the block header to plasma contract.
  const hexPrefixHeader = utils.addHexPrefix(
    newBlock.blockHeader.toString(true)
  )
  await geth.submitBlockHeader(hexPrefixHeader)

  // Add the new block to blockchain.
  console.log('New block added.')
  console.log(newBlock.printBlock())
  blockchain.push(newBlock)

  return newBlock
}

const getTransactionProofInBlock = (blockNumber, txIndex) => {
  const block = getBlock(blockNumber)
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

const getLatestBlock = () => blockchain[blockchain.length - 1]
const getBlocks = () => blockchain
const getBlock = index => blockchain[index]

module.exports = {
  getLatestBlock,
  getBlocks,
  generateNextBlock,
  getTransactionProofInBlock
}
