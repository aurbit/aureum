import { expect } from 'chai'
import { exec } from 'child_process'
import fetch from 'node-fetch'
import main from '../chain/main'

import Web3 from 'web3'
import PlasmaChainManager from '../contracts/test/PlasmaChainManager'
import utils from '../chain/utils'

const provider = new Web3.providers.WebsocketProvider('ws://localhost:9545')

const url = `http://localhost:${process.env.HTTP_PORT || 3001}`

describe('Plasma Chain Tests', function () {
  it('TestRpc should provide', async function () {
    expect(provider).is.not.undefined
  })

  it('PlasmaChainManager should be deployed and exported to plasma/contracts', async function () {
    expect(Web3.utils.isAddress(PlasmaChainManager.operator)).is.true
    expect(Web3.utils.isAddress(PlasmaChainManager.address)).is.true
    expect(PlasmaChainManager.artifact.abi).is.not.undefined
    expect(PlasmaChainManager.network).equals('test')
  })
  describe('Utility Tests', function () {
    it('addHexPrefix', async function () {
      const result = await utils.addHexPrefix('Chad')
      expect(result).equals('0xChad')
    })

    it('removeHexPrefix', async function () {
      const result = await utils.removeHexPrefix(PlasmaChainManager.address)
      expect(result).equals(PlasmaChainManager.address.substr(2))
    })

    it('bufferToHex', async function () {
      const newBuffer = await new (Buffer.from as any)('horse poop', 1)
      const toHexNoPre = await utils.bufferToHex(newBuffer, false)
      expect(toHexNoPre).equals('686f72736520706f6f70')
      const toHex = await utils.bufferToHex(newBuffer, true)
      expect(toHex).equals('0x686f72736520706f6f70')
    })

    it('weiToEther', async function () {
      const eth = await utils.weiToEther(1000000000000000000)
      expect(eth).equals(1)
    })

    it('etherToWei', async function () {
      const wei = await utils.etherToWei(1)
      expect(wei).equals(1000000000000000000)
    })
  })

  describe('HttpServer Tests', async function () {
    let server

    before(() => (server = main({ network: 'test' })))

    after(() => server.close())

    it('Should return the blockchain', async function () {
      const result = await fetch(url + '/blocks').then(data => data.json())
      expect(result.length).is.greaterThan(0)
    })

    it('Should deposit eth from main address', async function () {
      const payload = {
        method: 'POST',
        body: { address: PlasmaChainManager.operator, amount: 1 }
      }

      const result = await fetch(url + '/deposit', payload).then(d => d.json())
      console.log(result)
      expect(result)
    })
  })
})
