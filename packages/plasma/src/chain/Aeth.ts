import Web3 from 'web3'
import IWeb3 from 'web3/types'
import utils from './utils'
import config from '../config'

export interface IAeth {
  web3: IWeb3
  provider: IWeb3
  plasmaContract: IWeb3
  plasmaOperator: string
  deposit: any
  challengeWithdrawal: any
  startWithdrawal: any
  submitBlockHeader: any
  signBlock: any
  signTransaction: any
  isValidSignature: any
  getDeposits: any
  finalizeWithdrawal: any
  getWithdrawals: any
}

export class Aeth implements IAeth {
  public web3: Web3
  public provider: any
  public plasmaOperator: string
  public plasmaContract: any

  constructor (contractAddress: string, operatorAddress: string) {
    this.provider = new Web3.providers.HttpProvider(config.providerUrl)
    this.plasmaOperator = operatorAddress
    this.web3 = new Web3(this.provider)

    this.plasmaContract = new this.web3.eth.Contract(
      config.plasmaContractArtifacts.abi,
      contractAddress,
      {
        gas: 1000000
      }
    )
  }

  async submitBlockHeader (header: any) {
    let result = await this.plasmaContract.methods
      .submitBlockHeader(header)
      .send({
        from: this.plasmaOperator,
        gas: 600000
      })
    let ev = result.events.HeaderSubmittedEvent.returnValues
    return ev
  }

  async signBlock (message) {
    return await this.web3.eth.sign(message, this.plasmaOperator)
  }

  async signTransaction (message, address) {
    return await this.web3.eth.sign(message, address)
  }

  async isValidSignature (message, signature, address) {
    const hash = await this.web3.eth.accounts.hashMessage(message)
    const signer = await this.web3.eth.accounts.recover(hash, signature)
    return (
      utils.removeHexPrefix(address.toLowerCase()) ==
      utils.removeHexPrefix(signer.toLowerCase())
    )
  }

  async deposit (address, amount) {
    amount = await utils.etherToWei(amount)
    const result = await this.plasmaContract.methods.deposit().send({
      from: address,
      value: amount,
      gas: 300000
    })
    return result
  }

  async getDeposits (blockNumber: number) {
    const depositEvents = await this.plasmaContract.getPastEvents(
      'DepositEvent',
      {
        filter: { blockNumber: blockNumber.toString() },
        fromBlock: 0,
        toBlock: 'latest'
      }
    )

    const deposits: any[] = []
    depositEvents.forEach((ev: any) => deposits.push(ev.returnValues))
    deposits.sort((d1, d2) => d1.ctr - d2.ctr)
    return deposits
  }

  async startWithdrawal (blkNum, txIndex, oIndex, targetTx, proof, from) {
    let result = await this.plasmaContract.methods
      .startWithdrawal(blkNum, txIndex, oIndex, targetTx, proof)
      .send({
        from: from,
        gas: 300000
      })
    let ev = result.events.WithdrawalStartedEvent.returnValues
    console.log(ev)
    return ev.withdrawalId
  }

  async challengeWithdrawal (
    withdrawalId,
    blkNum,
    txIndex,
    oIndex,
    targetTx,
    proof,
    from
  ) {
    const result = await this.plasmaContract.methods
      .challengeWithdrawal(
        withdrawalId,
        blkNum,
        txIndex,
        oIndex,
        targetTx,
        proof
      )
      .send({
        from: from,
        gas: 300000
      })
    return result
  }

  async finalizeWithdrawal (from) {
    const result = await this.plasmaContract.methods.finalizeWithdrawal().send({
      from: from,
      gas: 300000
    })
    if (result.events.WithdrawalCompleteEvent) {
      console.log(result.events.WithdrawalCompleteEvent.returnValues)
      return result
    } else {
      return false
    }
  }

  async getWithdrawals (blockNumber) {
    const withdrawalEvents = await this.plasmaContract.getPastEvents(
      'WithdrawalCompleteEvent',
      {
        filter: { blockNumber: blockNumber.toString() },
        fromBlock: 0,
        toBlock: 'latest'
      }
    )

    return withdrawalEvents.map(ev => ev.returnValues)
  }
}
