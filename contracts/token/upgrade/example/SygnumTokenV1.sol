/**
 * @title SygnumTokenV1
 * @author Team 3301 <team3301@sygnum.com>
 * @dev Standard contract to display upgradability usability.  This is an example contract,
 *      that will not be used in production, to show how upgradability will be utilized.
 */
pragma solidity 0.5.12;

import "../../SygnumToken.sol";

contract SygnumTokenV1 is SygnumToken {
    bool public newBool;
    address public newAddress;
    bool public initializedV1;

    // changed back to public for tests
    function initV1(bool _newBool) public {
        require(!initializedV1, "SygnumTokenV1: already initialized");
        newBool = _newBool;
        initializedV1 = true;
    }

    function setNewAddress(address _newAddress) public {
        newAddress = _newAddress;
    }
}
