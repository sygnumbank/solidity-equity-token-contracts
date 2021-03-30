/**
 * @title TokenDeployer
 * @author Team 3301 <team3301@sygnum.com>
 * @dev Library to deploy and initialize a new instance of Sygnum Equity Token.
 * This is commonly used by a TokenFactory to automatically deploy and configure
 */

pragma solidity 0.5.12;

import "../token/SygnumToken.sol";

library TokenDeployer {
    /**
     * @dev Initialize a token contracts.
     * @param _proxy Address of the proxy
     * @param _name Name of the token
     * @param _symbol Strandard ticker of the token
     * @param _decimals Number of decimals
     * @param _category Category of the token contact
     * @param _class Class of the token contact
     * @param _issuer Issuer of the token contact
     * @param _baseOperators Address of the base operator role contract
     * @param _whitelist Address of the whitelist contract
     * @param _traderOperators Address of the trader operator role contract
     * @param _blockerOperators Address of the blocker operator role contract
     */
    function initializeToken(
        address _proxy,
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        bytes4 _category,
        string memory _class,
        address _issuer,
        address _baseOperators,
        address _whitelist,
        address _traderOperators,
        address _blockerOperators
    ) public {
        SygnumToken(_proxy).initializeContractsAndConstructor(
            _name,
            _symbol,
            _decimals,
            _category,
            _class,
            _issuer,
            _baseOperators,
            _whitelist,
            _traderOperators,
            _blockerOperators
        );
    }
}
