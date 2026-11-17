// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {BellRegistry} from "../src/BellRegistry.sol";

/// Deploy:
///   OWNER=0x... KEEPER=0x... forge script script/Deploy.s.sol --rpc-url robinhood --broadcast --private-key <deployer key>
/// OWNER controls the keeper (keep it in a hardware or cold wallet). KEEPER is the hot key the site uses to seal.
contract Deploy is Script {
    function run() external returns (BellRegistry reg) {
        address owner = vm.envAddress("OWNER");
        address keeper = vm.envAddress("KEEPER");
        vm.startBroadcast();
        reg = new BellRegistry(owner, keeper);
        vm.stopBroadcast();
        console2.log("BellRegistry", address(reg));
        console2.log("owner", owner);
        console2.log("keeper", keeper);
    }
}
