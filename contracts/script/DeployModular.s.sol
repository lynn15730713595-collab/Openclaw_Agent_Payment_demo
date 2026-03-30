// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/ModularAccount.sol";

contract DeployModular is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);

        address owner = vm.addr(pk);
        
        // 部署模块化账户 (内置会话密钥管理)
        ModularAccount account = new ModularAccount(owner);
        console2.log("ModularAccount:", address(account));
        
        // 充值测试资金
        (bool success, ) = address(account).call{value: 0.05 ether}("");
        require(success, "failed to fund account");
        console2.log("Funded account with 0.05 ETH");

        vm.stopBroadcast();

        console2.log("\n=== Deployment Complete ===");
        console2.log("Copy to .env:");
        console2.log("ACCOUNT_ADDRESS=%s", address(account));
        console2.log("MERCHANT_ADDRESS=<your merchant EOA>");
    }
}
