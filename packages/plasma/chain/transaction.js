'use strict'

const RLP = require('rlp')
const utils = require('./utils')

const Transaction = function ({
  blkNum1,
  txIndex1,
  oIndex1,
  sig1,
  blkNum2,
  txIndex2,
  oIndex2,
  sig2,
  newOwner1,
  denom1,
  newOwner2,
  denom2,
  fee,
  type
}) {
  // first input
  this.blkNum1 = blkNum1 || 0
  this.txIndex1 = txIndex1 || 0
  this.oIndex1 = oIndex1 || 0
  this.sig1 = sig1 || 0

  // second input
  this.blkNum2 = blkNum2 || 0
  this.txIndex2 = txIndex2 || 0
  this.oIndex2 = oIndex2 || 0
  this.sig2 = sig2 || 0

  // outputs
  this.newOwner1 = newOwner1 || 0
  this.denom1 = denom1 || 0
  this.newOwner2 = newOwner2 || 0
  this.denom2 = denom2 || 0

  this.fee = fee || 0
  this.type = type || new Error('Tx type reqired.')
}

Transaction.prototype.encode = function (includingSig) {
  const data = [
    this.blkNum1,
    this.txIndex1,
    this.oIndex1,
    this.blkNum2,
    this.txIndex2,
    this.oIndex2,
    this.newOwner1,
    this.denom1,
    this.newOwner2,
    this.denom2,
    this.fee
  ]
  if (includingSig) {
    data.push(this.sig1)
    data.push(this.sig2)
  }
  return RLP.encode(data)
}

Transaction.prototype.toString = function (includingSig) {
  return utils.bufferToHex(this.encode(includingSig), false)
}

Transaction.prototype.setSignature = function (sig) {
  this.sig1 = sig
  if (this.blkNum2 !== 0) {
    this.sig2 = sig
  }
}

const UTXO = function ({ blkNum, txIndex, oIndex, owner, denom }) {
  this.blkNum = blkNum
  this.txIndex = txIndex
  this.oIndex = oIndex
  this.owner = owner
  this.denom = denom
}

const TxType = {
  NORMAL: 0,
  DEPOSIT: 1,
  WITHDRAW: 2,
  MERGE: 3
}

const txPool = []
const utxo = []

const createDepositTransactions = deposits => {
  return deposits.map(deposit => {
    const newOwner1 = deposit.from
    const denom1 = parseInt(deposit.amount)
    const type = TxType.DEPOSIT

    return new Transaction({ newOwner1, denom1, type })
  })
}

const createWithdrawalTransactions = withdrawals => {
  return withdrawals.map(withdrawal => {
    const blkNum1 = parseInt(withdrawal.exitBlockNumber)
    const txIndex1 = parseInt(withdrawal.exitTxIndex)
    const oIndex1 = parseInt(withdrawal.exitOIndex)
    const type = TxType.WITHDRAW
    return new Transaction({ blkNum1, txIndex1, oIndex1, type })
  })
}

const createMergeTransaction = owner => {
  const indexes = getTwoUTXOsByAddress(owner)
  if (indexes[0] !== -1 && indexes[1] !== -1) {
    const utxoA = utxo[indexes[0]]
    const utxoB = utxo[indexes[1]]

    return new Transaction({
      blkNum1: utxoA.blkNum,
      txIndex1: utxoA.txIndex,
      oIndex1: utxoA.oIndex,
      blkNum2: utxoB.blkNum,
      txIndex2: utxoB.txIndex,
      oIndex2: utxoB.oIndex,
      newOwner1: owner,
      denom1: utxoA.denom + utxoB.denom,
      type: TxType.MERGE
    })
  } else {
    return null
  }
}

const createTransaction = async (data, geth) => {
  const index = getUTXOByAddress(data.from)
  if (index === -1) {
    throw 'No asset found'
  }
  const blkNum1 = utxo[index].blkNum
  const txIndex1 = utxo[index].txIndex
  const oIndex1 = utxo[index].oIndex

  const newOwner1 = data.to
  const denom1 = utils.etherToWei(data.amount)
  const fee = utils.etherToWei(0.01) // hard-coded fee to 0.01
  if (utxo[index].denom < denom1 + fee) {
    throw 'Insufficient funds'
  }
  const remain = utxo[index].denom - denom1 - fee
  const newOwner2 = remain > 0 ? data.from : 0
  const denom2 = remain
  const type = TxType.NORMAL

  const tx = new Transaction({
    blkNum1,
    txIndex1,
    oIndex1,
    newOwner1,
    denom1,
    newOwner2,
    denom2,
    fee,
    type
  })
  const signature = await geth.signTransaction(tx.toString(false), data.from)
  tx.setSignature(signature)

  if (await isValidTransaction(tx, geth)) {
    spendUTXO(tx)
    txPool.push(tx)
  } else {
    throw 'Invalid transaction'
  }
  return tx
}

const getUTXOByAddress = (owner, start = 0) => {
  for (const i = start; i < utxo.length; i++) {
    if (utxo[i].owner.toLowerCase() === owner.toLowerCase()) {
      return i
    }
  }
  return -1
}

const getTwoUTXOsByAddress = owner => {
  const index1 = getUTXOByAddress(owner)
  const index2 = index1 !== -1 ? getUTXOByAddress(owner, index1 + 1) : -1
  return [index1, index2]
}

const getUTXOByIndex = (blkNum, txIndex, oIndex) => {
  for (const i = 0; i < utxo.length; i++) {
    if (
      utxo[i].blkNum === blkNum &&
      utxo[i].txIndex === txIndex &&
      utxo[i].oIndex === oIndex
    ) {
      return i
    }
  }
  return -1
}

const isValidTransaction = async (tx, geth) => {
  if (tx.type !== TxType.NORMAL) {
    return true
  }

  const denom = 0
  if (tx.blkNum1 !== 0) {
    const message = tx.toString(false)
    const index = getUTXOByIndex(tx.blkNum1, tx.txIndex1, tx.oIndex1)
    if (
      index !== -1 &&
      (await geth.isValidSignature(message, tx.sig1, utxo[index].owner))
    ) {
      denom += utxo[index].denom
    } else {
      return false
    }
  }
  if (tx.blkNum2 !== 0) {
    const message = tx.toString(false)
    const index = getUTXOByIndex(tx.blkNum2, tx.txIndex2, tx.oIndex2)
    if (
      index !== -1 ||
      (await geth.isValidSignature(message, tx.sig2, utxo[index].owner))
    ) {
      denom += utxo[index].denom
    } else {
      return false
    }
  }
  return denom === tx.denom1 + tx.denom2 + tx.fee
}

const spendUTXO = tx => {
  if (tx.blkNum1 !== 0) {
    const index = getUTXOByIndex(tx.blkNum1, tx.txIndex1, tx.oIndex1)
    if (index !== -1) {
      utxo.splice(index, 1)
    }
  }
  if (tx.blkNum2 !== 0) {
    const index = getUTXOByIndex(tx.blkNum2, tx.txIndex2, tx.oIndex2)
    if (index !== -1) {
      utxo.splice(index, 1)
    }
  }
}

const createUTXO = (blkNum, tx, txIndex) => {
  if (tx.newOwner1 !== 0 && tx.denom1 !== 0) {
    utxo.push(
      new UTXO({ blkNum, txIndex, owner: tx.newOwner1, denom: tx.denom1 })
    )
  }
  if (tx.newOwner2 !== 0 && tx.denom2 !== 0) {
    utxo.push(
      new UTXO({ blkNum, txIndex, owner: tx.newOwner2, denom: tx.denom2 })
    )
  }
}

const collectTransactions = async (blkNum, deposits, withdrawals) => {
  const txs = []

  if (deposits.length > 0) {
    console.log('Deposit transactions found.')
    console.log(deposits)
    const depositTxs = await createDepositTransactions(deposits)
    for (const i = 0; i < depositTxs.length; i++) {
      const tx = depositTxs[i]
      createUTXO(blkNum, tx, txs.length)
      txs.push(tx.toString(true))

      const mergeTx = await createMergeTransaction(tx.newOwner1)
      if (mergeTx !== null) {
        spendUTXO(mergeTx)
        createUTXO(blkNum, mergeTx, txs.length)
        txs.push(mergeTx.toString(true))
      }
    }
  }

  if (withdrawals.length > 0) {
    console.log('Withdrawals detected.')
    console.log(withdrawals)
    const withdrawalTxs = await createWithdrawalTransactions(withdrawals)
    for (const i = 0; i < withdrawalTxs.length; i++) {
      const tx = withdrawalTxs[i]
      spendUTXO(tx)
      txs.push(tx.toString(true))
    }
  }

  for (const i = 0; i < txPool.length; i++) {
    const tx = txPool[i]
    createUTXO(blkNum, tx, txs.length)
    txs.push(tx.toString(true))
    txPool.splice(i, 1)

    const mergeTx1 = await createMergeTransaction(tx.newOwner1)
    if (mergeTx1 !== null) {
      spendUTXO(mergeTx1)
      createUTXO(blkNum, mergeTx1, txs.length)
      txs.push(mergeTx1.toString(true))
    }
    const mergeTx2 = await createMergeTransaction(tx.newOwner2)
    if (mergeTx2 !== null) {
      spendUTXO(mergeTx2)
      createUTXO(blkNum, mergeTx2, txs.length)
      txs.push(mergeTx2.toString(true))
    }

    // Limit transactions per block to power of 2 on purpose for the
    // convenience of building Merkle tree.
    if (txs.length >= 256) {
      break
    }
  }

  // Fill empty string if transactions are less than 256.
  const len = txs.length
  for (const i = len; i < 256; i++) {
    txs.push('')
  }

  return txs
}

const getUTXO = () => {
  return utxo
}

const getPool = () => {
  return txPool
}

module.exports = { createTransaction, collectTransactions, getUTXO, getPool }
