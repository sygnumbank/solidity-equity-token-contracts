pragma solidity ^0.5.0;

import "../token/ERC20/ERC20SygnumDetailed.sol";

contract ERC20SygnumDetailedMock is ERC20SygnumDetailed {
    function setDetails(
        string memory name,
        string memory symbol,
        uint8 decimals,
        bytes4 category,
        string memory class,
        address issuer
    ) public {
        _setDetails(name, symbol, decimals, category, class, issuer);
    }
}
