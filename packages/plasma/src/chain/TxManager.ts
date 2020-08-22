import RLP from 'rlp'
import utils from './utils'
import { UTXO, IUTXO } from './UTXO'
import { Transaction, ITransaction } from './Transaction'

export interface ITxManager {
  txPool: ITransaction[]
  utxos: IUTXO[]

  fee: any

  toString: any
  setSignature: any
  TxType: any

  collectTransactions: any
  createTransaction: any

  getPool: any
  getUTXOS: any
}

export class TxManager implements ITxManager {
  txPool: any[]
  utxos: IUTXO[]

  fee: any

  constructor () {
    this.fee = 0.01 //ether

    // TODO hydrate
    this.utxos = []
    this.txPool = []
  }

  setSignature (tx, sig) {
    tx.sig1 = sig
    if (tx.blkNum2 !== 0) {
      tx.sig2 = sig
    }
  }

  get TxType () {
    return {
      NORMAL: 0,
      DEPOSIT: 1,
      WITHDRAW: 2,
      MERGE: 3
    }
  }

  async createTransaction (data, aeth) {
    const index = this.getUTXOByAddress(data.from)
    if (index === -1) {
      throw 'No asset found'
    }
    const blkNum1 = this.utxos[index].blkNum
    const txIndex1 = this.utxos[index].txIndex
    const oIndex1 = this.utxos[index].oIndex

    const newOwner1 = data.to
    const denom1 = utils.etherToWei(data.amount)
    const fee = utils.etherToWei(0.01) // hard-coded fee to 0.01
    if (this.utxos[index].denom < denom1 + fee) {
      throw 'Insufficient funds'
    }
    const remain = this.utxos[index].denom - denom1 - fee
    const newOwner2 = remain > 0 ? data.from : 0
    const denom2 = remain
    const type = this.TxType.NORMAL

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

    const signature = await aeth.signTransaction(tx.toString(false), data.from)
    this.setSignature(tx, signature)

    if (await this.isValidTransaction(tx, aeth)) {
      this.spendUTXO(tx)
      this.txPool.push(tx)
    } else {
      throw 'Invalid transaction'
    }
    return tx
  }

  async createDepositTransactions (deposits) {
    return deposits.map(deposit => {
      const newOwner1 = deposit.from
      const denom1 = parseInt(deposit.amount)
      const type = this.TxType.DEPOSIT

      return new Transaction({ newOwner1, denom1, type })
    })
  }

  createWithdrawalTransactions (withdrawals) {
    return withdrawals.map(withdrawal => {
      const blkNum1 = parseInt(withdrawal.exitBlockNumber)
      const txIndex1 = parseInt(withdrawal.exitTxIndex)
      const oIndex1 = parseInt(withdrawal.exitOIndex)
      const type = this.TxType.WITHDRAW
      return new Transaction({ blkNum1, txIndex1, oIndex1, type })
    })
  }

  getUTXOByAddress = (owner, start = 0) => {
    for (let i = start; i < this.utxos.length; i++) {
      if (this.utxos[i].owner.toLowerCase() === owner.toLowerCase()) {
        return i
      }
    }
    return -1
  }

  getTwoUTXOsByAddress (owner) {
    const index1 = this.getUTXOByAddress(this.utxos, owner)
    const index2 = index1 !== -1 ? this.getUTXOByAddress(owner, index1 + 1) : -1
    return [index1, index2]
  }

  getUTXOByIndex (blkNum, txIndex, oIndex) {
    for (let i = 0; i < this.utxos.length; i++) {
      if (
        this.utxos[i].blkNum === blkNum &&
        this.utxos[i].txIndex === txIndex &&
        this.utxos[i].oIndex === oIndex
      ) {
        return i
      }
    }
    return -1
  }

  createMergeTransaction (owner): any {
    const indexes = this.getTwoUTXOsByAddress(owner)
    if (indexes[0] !== -1 && indexes[1] !== -1) {
      const utxoA = this.utxos[indexes[0]]
      const utxoB = this.utxos[indexes[1]]

      return new Transaction({
        blkNum1: utxoA.blkNum,
        txIndex1: utxoA.txIndex,
        oIndex1: utxoA.oIndex,
        blkNum2: utxoB.blkNum,
        txIndex2: utxoB.txIndex,
        oIndex2: utxoB.oIndex,
        newOwner1: owner,
        denom1: utxoA.denom + utxoB.denom,
        type: this.TxType.MERGE
      })
    } else {
      return null
    }
  }

  async isValidTransaction (tx, aeth) {
    if (tx.type !== this.TxType.NORMAL) {
      return true
    }

    let denom = 0
    if (tx.blkNum1 !== 0) {
      const message = tx.toString(false)
      const index = this.getUTXOByIndex(tx.blkNum1, tx.txIndex1, tx.oIndex1)
      if (
        index !== -1 &&
        (await aeth.isValidSignature(message, tx.sig1, this.utxos[index].owner))
      ) {
        denom += this.utxos[index].denom
      } else {
        return false
      }
    }
    if (tx.blkNum2 !== 0) {
      const message = tx.toString(false)
      const index = this.getUTXOByIndex(tx.blkNum2, tx.txIndex2, tx.oIndex2)
      if (
        index !== -1 ||
        (await aeth.isValidSignature(message, tx.sig2, this.utxos[index].owner))
      ) {
        denom += this.utxos[index].denom
      } else {
        return false
      }
    }
    return denom === tx.denom1 + tx.denom2 + tx.fee
  }

  spendUTXO (tx) {
    if (tx.blkNum1 !== 0) {
      const index = this.getUTXOByIndex(tx.blkNum1, tx.txIndex1, tx.oIndex1)
      if (index !== -1) {
        this.utxos.splice(index, 1)
      }
    }
    if (tx.blkNum2 !== 0) {
      const index = this.getUTXOByIndex(tx.blkNum2, tx.txIndex2, tx.oIndex2)
      if (index !== -1) {
        this.utxos.splice(index, 1)
      }
    }
  }

  createUTXO (blkNum, tx, txIndex) {
    if (tx.newOwner1 !== 0 && tx.denom1 !== 0) {
      this.utxos.push(
        new UTXO({ blkNum, txIndex, owner: tx.newOwner1, denom: tx.denom1 })
      )
    }
    if (tx.newOwner2 !== 0 && tx.denom2 !== 0) {
      this.utxos.push(
        new UTXO({ blkNum, txIndex, owner: tx.newOwner2, denom: tx.denom2 })
      )
    }
  }

  async collectTransactions (blkNum, deposits, withdrawals) {
    const txs: any[] = []

    if (deposits.length > 0) {
      const depositTxs = await this.createDepositTransactions(deposits)
      for (let i = 0; i < depositTxs.length; i++) {
        const tx: any = depositTxs[i]
        this.createUTXO(blkNum, tx, txs.length)
        txs.push(tx.toString(true))

        const mergeTx = await this.createMergeTransaction(tx.newOwner1)
        if (mergeTx !== null) {
          this.spendUTXO(mergeTx)
          this.createUTXO(blkNum, mergeTx, txs.length)
          txs.push(mergeTx.toString(true))
        }
      }
    }

    if (withdrawals.length > 0) {
      const withdrawalTxs = await this.createWithdrawalTransactions(withdrawals)
      for (let i = 0; i < withdrawalTxs.length; i++) {
        const tx = withdrawalTxs[i]
        this.spendUTXO(tx)
        txs.push(tx.toString(true))
      }
    }

    for (let i = 0; i < this.txPool.length; i++) {
      const tx = this.txPool[i]
      this.createUTXO(blkNum, tx, txs.length)
      txs.push(tx.toString(true))
      this.txPool.splice(i, 1)

      const mergeTx1 = await this.createMergeTransaction(tx.newOwner1)
      if (mergeTx1 !== null) {
        this.spendUTXO(mergeTx1)
        this.createUTXO(blkNum, mergeTx1, txs.length)
        txs.push(mergeTx1.toString(true))
      }
      const mergeTx2 = await this.createMergeTransaction(tx.newOwner2)
      if (mergeTx2 !== null) {
        this.spendUTXO(mergeTx2)
        this.createUTXO(blkNum, mergeTx2, txs.length)
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
    for (let i = len; i < 256; i++) {
      txs.push('')
    }

    return txs
  }

  get getUTXOS () {
    return this.utxos
  }

  get getPool () {
    return this.txPool
  }
}
