import createKeccakHash from 'keccak'

export interface IMerkle {
  isReady: boolean
  leaves: any[]
  levels: any[]
}
export class Merkle implements IMerkle {
  isReady: boolean
  leaves: any[]
  levels: any[]

  constructor (data) {
    this.isReady = false
    this.leaves = data.map(str => this._hash(this._getBuffer(str)))
    this.levels = []
  }

  makeTree () {
    this.isReady = false
    this.levels.unshift(this.leaves)
    while (this.levels[0].length > 1) {
      this.levels.unshift(this._getNextLevel())
    }
    this.isReady = true
  }

  getRoot () {
    return this.isReady ? this.levels[0][0] : null
  }

  getProof (index) {
    const proof: Buffer[] = []
    for (let i = this.levels.length - 1; i > 0; i--) {
      let isRightNode: any = index % 2
      let siblingIndex: any = isRightNode ? index - 1 : index + 1
      let newProof = new (Buffer.from as any)(isRightNode ? 0x00 : 0x01)
      proof.push(newProof)
      proof.push(this.levels[i][siblingIndex])
      index = Math.floor(index / 2)
    }
    return proof
  }

  private _hash (value): string {
    return createKeccakHash('keccak256')
      .update(value)
      .digest()
  }

  private _getBuffer (value) {
    return new (Buffer.from as any)(value, 'hex')
  }

  private _getNextLevel () {
    let nodes: string[] = []
    for (let i = 0; i < this.levels[0].length - 1; i += 2) {
      let left = this.levels[0][i]
      let right = this.levels[0][i + 1]
      let nextLevel: Buffer = Buffer.concat([left, right])
      nodes.push(this._hash(nextLevel))
    }
    return nodes
  }
}
