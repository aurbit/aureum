import * as RLP from 'rlp'
import utils from './utils'

export interface ITransaction {
  // first input
  blkNum1: number
  txIndex1: number
  oIndex1: number
  sig1: any

  // second input
  blkNum2: number
  txIndex2: number
  oIndex2: number
  sig2: any

  //outputs
  newOwner1: any
  denom1: any
  newOwner2: any
  denom2: any

  type: string
  fee: any

  encode: any
  toString: any
}

export class Transaction implements ITransaction {
  blkNum1: number
  txIndex1: number
  oIndex1: number
  sig1: any

  blkNum2: number
  txIndex2: number
  oIndex2: number
  sig2: any

  newOwner1: any
  denom1: any
  newOwner2: any
  denom2: any
  type: string
  fee: any

  constructor (args) {
    this.blkNum1 = args?.blkNum1 || 0
    this.txIndex1 = args?.txIndex1 || 0
    this.oIndex1 = args?.oIndex1 || 0
    this.sig1 = args?.sig1 || 0

    this.blkNum2 = args?.blkNum2 || 0
    this.txIndex2 = args?.txIndex2 || 0
    this.oIndex2 = args?.oIndex2 || 0
    this.sig2 = args?.sig2 || 0

    this.newOwner1 = args?.newOwner1 || 0
    this.denom1 = args?.denom1 || 0
    this.newOwner2 = args?.newOwner2 || 0
    this.denom2 = args?.denom2 || 0

    this.fee = args?.fee || 0.01
    this.type = args?.type || new Error('Tx type reqired.')
  }

  encode (includingSig) {
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

  toString (includingSig) {
    return utils.bufferToHex(this.encode(includingSig), false)
  }
}
