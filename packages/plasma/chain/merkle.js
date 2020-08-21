'use strict'

const createKeccakHash = require('keccak')

const Merkle = function (data) {
  this.isReady = false
  this.leaves = data.map(str => this._hash(this._getBuffer(str)))
  this.levels = []
}

Merkle.prototype.makeTree = function () {
  this.isReady = false
  this.levels.unshift(this.leaves)
  while (this.levels[0].length > 1) {
    this.levels.unshift(this._getNextLevel())
  }
  this.isReady = true
}

Merkle.prototype.getRoot = function () {
  return this.isReady ? this.levels[0][0] : null
}

Merkle.prototype.getProof = function (index) {
  let proof = []
  for (let i = this.levels.length - 1; i > 0; i--) {
    let isRightNode = index % 2
    let siblingIndex = isRightNode ? index - 1 : index + 1
    proof.push(new Buffer.alloc(isRightNode ? [0x00] : [0x01]))
    proof.push(this.levels[i][siblingIndex])
    index = Math.floor(index / 2)
  }
  return proof
}

Merkle.prototype._hash = function (value) {
  return createKeccakHash('keccak256')
    .update(value)
    .digest()
}

Merkle.prototype._getBuffer = function (value) {
  return new Buffer.alloc(value, 'hex')
}

Merkle.prototype._getNextLevel = function () {
  let nodes = []
  for (let i = 0; i < this.levels[0].length - 1; i += 2) {
    let left = this.levels[0][i]
    let right = this.levels[0][i + 1]
    nodes.push(this._hash(Buffer.concat([left, right])))
  }
  return nodes
}

module.exports = Merkle
