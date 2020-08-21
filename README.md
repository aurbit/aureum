## Aureum Ethereum Plasma Chain

![Standard Js](https://cdn.rawgit.com/feross/standard/master/badge.svg)

Aureum is a Layer 2 solution for Ethereum. Plasma consists of three major parts:

1. Plasma chain: A simple proof-of-authority chain where the actual transactions take place.
2. Plasma contract: A smart contract deployed on root chain which handles the deposits and withdrawals for the child chain (plasma chain).
3. Ethereum blockchain: The root chain which only records the block headers of the plasma chain.

The complete cycle of interacting with plasma is made up of three stages.

### Deposit

Participants deposit to the plasma contract on the root chain. Then the operator at the plasma chain will construct a deposit transaction according to the contract event when building a new block.

### Transact

Participants could transact with each other on the plasma chain without notifying the root chain. Only when every block is created by the operator, it will submit the block header to the plasma contract on the root chain.

### Withdraw

A withdrawal is initiated by calling the plasma contract. After creating a withdrawal, user needs to wait 7 days for other participants to challenge it. If anyone could prove the given withdrawal that has been spent later on the plasma chain, the withdrawal will be canceled. Otherwise, after 7 days and without any other withdrawals with higher priority, user could withdraw his funds back to the root chain.

## Getting Started

```
npm i
npm run bootstrap
npm link
```

Start a local root chain:

```
npm run chain
```

Compile and deploy the plasma manager contract:

```
npm run migrate
```

The contract artifacts, operator address and contract addresses will be exported to the plasma package automatically. Start the plasma chain with:

```
npm run plasma
```

## HTTP API

### Block related

#### Get blockchain

Get the whole blockchain.

##### Parameter

None

##### Sample

```
curl http://localhost:3001/blocks
```

#### Mine blocks

Miner mines a new block.

##### Parameter

None

##### Sample

```
curl -X POST http://localhost:3001/mineBlock
```

### Getting ETH onto the Plasma Chain

You must first deplosit ETH into the PlasmaChainManager Contract on the root chain. In a new terminal:

```
npm run console
```

Next, deposit ETH to the PlasmaChainManager contract:

```
(development)> var plasma = new PlasmaChainManager(PlasmaChainManager.address)
(development)> var accounts = await web3.eth.getAccounts()
(development)> plasma.deposit({ from: accounts[0], value: web3.utils.toWei('1', 'ether'), gas: 300000 })
```

### Plasma Chain Transaction related

The following is a simplifed API that allows for the movement of ETH around on the Plasma chain.

#### Create an Aureum transaction

Create a transaction to other participants. User could specify at most two UTXOs to spend. Also note that the units used in field `amount` is ether.

##### Parameter

| Name   | Type    | Required | Description               |
| ------ | ------- | -------- | ------------------------- |
| from   | Address | Yes      | Transfer funds from whom  |
| to     | Address | Yes      | Transfer funds to whom    |
| amount | Decimal | Yes      | How much ether (in ether) |

```bash
curl -H "Content-type:application/json" --data '{"from": "0x627306090abaB3A6e1400e9345bC60c78a8BEf57", "to": "0x3B0bA3134Ac12Cc065d4dBa498a60cba5Ef16098", "amount": 2}' http://localhost:3001/transact
```

### Deposit related

#### Deposit

Deposit funds to Plasma smart contract.

##### Parameter

| Name    | Type    | Required | Description               |
| ------- | ------- | -------- | ------------------------- |
| address | Address | Yes      | Deposit from whom         |
| amount  | Integer | Yes      | How much funds to deposit |

```bash
curl -H "Content-type:application/json" --data '{"address": "0x627306090abaB3A6e1400e9345bC60c78a8BEf57", "amount": 1}' http://localhost:3001/deposit
```

### Withdrawal related

#### Create withdrawal

Create a new withdrawal.

##### Parameter

| Name    | Type    | Required | Description                                     |
| ------- | ------- | -------- | ----------------------------------------------- |
| blkNum  | Integer | Yes      | The position of the UTXO user wants to withdraw |
| txIndex | Integer | Yes      | The position of the UTXO user wants to withdraw |
| oIndex  | Integer | Yes      | The position of the UTXO user wants to withdraw |
| from    | Address | Yes      | The owner of the UTXO                           |

```bash
curl -H "Content-type:application/json" --data '{"blkNum": 3, "txIndex": 1, "oIndex": 0, "from": "0x627306090abaB3A6e1400e9345bC60c78a8BEf57"}' http://localhost:3001/withdraw/create
```

#### Challenge withdrawal

Create a withdrawal challenge.

##### Parameter

| Name         | Type    | Required | Description                                      |
| ------------ | ------- | -------- | ------------------------------------------------ |
| withdrawalId | Integer | Yes      | The withdrawal ID user wants to challenge        |
| blkNum       | Integer | Yes      | The position of the UTXO user wants to challenge |
| txIndex      | Integer | Yes      | The position of the UTXO user wants to challenge |
| oIndex       | Integer | Yes      | The position of the UTXO user wants to challenge |
| from         | Address | Yes      | The owner of the UTXO                            |

```bash
curl -H "Content-type:application/json" --data '{"withdrawalId": 4000000000, "blkNum": 4, "txIndex": 2, "oIndex": 1, "from": "0x857470E5FBa91EE27fa1B84F838ae8220ac91aB8"}' http://localhost:3001/withdraw/challenge
```

#### Finalize withdrawal

Finalize withdrawals manually.

##### Parameter

| Name | Type    | Required | Description                               |
| ---- | ------- | -------- | ----------------------------------------- |
| from | Address | Yes      | Who initiates the withdrawal finalization |

```bash
curl -H "Content-type:application/json" --data '{"from": "0x857470E5FBa91EE27fa1B84F838ae8220ac91aB8"}' http://localhost:3001/withdraw/finalize
```
