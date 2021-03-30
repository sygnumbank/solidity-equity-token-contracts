/**
 * @title ProxyDeployer
 * @author Team 3301 <team3301@sygnum.com>
 * @dev Library to deploy a proxy instance for a Sygnum.
 */

pragma solidity 0.5.12;

import "../token/SygnumTokenProxy.sol";

library ProxyDeployer {
    /**
     * @dev Deploy the proxy instance and initialize it
     * @param _tokenImplementation Address of the logic contract
     * @param _proxyAdmin Address of the admin for the proxy
     * @param _data Bytecode needed for initialization
     * @return address New instance address
     */
    function deployTokenProxy(
        address _tokenImplementation,
        address _proxyAdmin,
        bytes memory _data
    ) public returns (address) {
        SygnumTokenProxy proxy = new SygnumTokenProxy(_tokenImplementation, _proxyAdmin, _data);
        return address(proxy);
    }
}
