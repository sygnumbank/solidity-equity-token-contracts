/**
 * @title ERC20Detailed
 * @author OpenZeppelin-Solidity = "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol", and rmeoval
 *  of IERC20 due to " contract binary not set. Can't deploy new instance.
 * This contract may be abstract, not implement an abstract parent's methods completely
 * or not invoke an inherited contract's constructor correctly"
 */

pragma solidity 0.5.12;

/**
 * @dev Optional functions from the ERC20 standard.
 */
contract ERC20Detailed {
    string internal _name;
    string internal _symbol;
    uint8 internal _decimals;

    /**
     * @dev Returns the name of the token.
     */
    function name() public view returns (string memory) {
        return _name;
    }

    /**
     * @dev Returns the symbol of the token, usually a shorter version of the
     * name.
     */
    function symbol() public view returns (string memory) {
        return _symbol;
    }

    /**
     * @dev Returns the number of decimals used to get its user representation.
     * For example, if `decimals` equals `2`, a balance of `505` tokens should
     * be displayed to a user as `5,05` (`505 / 10 ** 2`).
     *
     * Tokens usually opt for a value of 18, imitating the relationship between
     * Ether and Wei.
     *
     * > Note that this information is only used for _display_ purposes: it in
     * no way affects any of the arithmetic of the contract, including
     * `IERC20.balanceOf` and `IERC20.transfer`.
     */
    function decimals() public view returns (uint8) {
        return _decimals;
    }
}
