import utils from './utils'
import { Merkle } from './Merkle'

export interface IBlockHeader {
  toString: any
  blockNumber: number
  previousHash: string
  merkle: any
  merkleRoot: any
  sigR: any
  sigS: any
  sigV: any
}

export class BlockHeader implements IBlockHeader {
  blockNumber: number
  previousHash: string
  merkle: any
  merkleRoot: string
  sigR: any
  sigS: any
  sigV: any

  constructor (blockNumber, previousHash, data) {
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

  setSignature (signature) {
    const sig = utils.removeHexPrefix(signature)
    const sigR = sig.substring(0, 64)
    const sigS = sig.substring(64, 128)
    let sigV = parseInt(sig.substring(128, 130), 16)
    if (sigV < 27) {
      sigV += 27
    }
    this.sigR = sigR
    this.sigS = sigS
    this.sigV = sigV.toString(16).padStart(2, '0')
  }

  toString (includingSig) {
    const blkNumHexString = this.blockNumber.toString(16).padStart(64, '0')
    let rawBlockHeader = blkNumHexString + this.previousHash + this.merkleRoot
    if (includingSig) {
      rawBlockHeader += this.sigR + this.sigS + this.sigV
    }
    return rawBlockHeader
  }
}
