pragma solidity ^0.4.19;

import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/PlasmaChainManager.sol";

contract TestPlasmaManager {
    function testTrue() public {
        Assert.equal(uint256(1), uint256(1), "plzzzz");
    }

    function testContractInitState() public {
        PlasmaChainManager plasma = PlasmaChainManager(
            DeployedAddresses.PlasmaChainManager()
        );
        Assert.equal(
            plasma.lastBlockNumber(),
            uint256(0),
            "lastBlockNumber should be initiated with 0"
        );
        Assert.equal(
            plasma.txCounter(),
            uint256(0),
            "txCounter should be initiated with 0"
        );
    }
}
