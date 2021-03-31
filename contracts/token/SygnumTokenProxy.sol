/**
 * @title SygnumTokenProxy
 * @author Team 3301 <team3301@sygnum.com>
 * @dev Proxies SygnumToken calls and enables SygnumToken upgradability.
 */
pragma solidity 0.5.12;

import "zos-lib/contracts/upgradeability/AdminUpgradeabilityProxy.sol";

contract SygnumTokenProxy is AdminUpgradeabilityProxy {
    /* solhint-disable no-empty-blocks */
    constructor(
        address implementation,
        address proxyOwnerAddr,
        bytes memory data
    ) public AdminUpgradeabilityProxy(implementation, proxyOwnerAddr, data) {}
    /* solhint-enable no-empty-blocks */
}
