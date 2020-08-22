export interface IUTXO {
  blkNum: number
  txIndex: number
  oIndex: number
  owner: string
  denom: any
}

export class UTXO {
  blkNum: number
  txIndex: number
  oIndex: number
  owner: string
  denom: any

  constructor (args) {
    this.blkNum = args?.blkNum
    this.txIndex = args?.txIndex
    this.oIndex = args?.oIndex
    this.owner = args?.owner
    this.denom = args?.denom
  }
}
