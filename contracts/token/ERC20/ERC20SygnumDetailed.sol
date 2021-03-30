/**
 * @title ERC20SygnumDetailed
 * @author Team 3301 <team3301@sygnum.com>
 * @dev ERC20 Standard Token with additional details and role set.
 */

pragma solidity 0.5.12;

import "./ERC20Detailed.sol";
import "@sygnum/solidity-base-contracts/contracts/role/base/Operatorable.sol";

contract ERC20SygnumDetailed is ERC20Detailed, Operatorable {
    bytes4 private _category;
    string private _class;
    address private _issuer;

    event NameUpdated(address issuer, string name, address token);
    event SymbolUpdated(address issuer, string symbol, address token);
    event CategoryUpdated(address issuer, bytes4 category, address token);
    event ClassUpdated(address issuer, string class, address token);
    event IssuerUpdated(address issuer, address newIssuer, address token);

    /**
     * @dev Sets the values for `name`, `symbol`, `decimals`, `category`, `class` and `issuer`. All are
     *  mutable apart from `issuer`, which is immutable.
     * @param name string
     * @param symbol string
     * @param decimals uint8
     * @param category bytes4
     * @param class string
     * @param issuer address
     */
    function _setDetails(
        string memory name,
        string memory symbol,
        uint8 decimals,
        bytes4 category,
        string memory class,
        address issuer
    ) internal {
        _name = name;
        _symbol = symbol;
        _decimals = decimals;
        _category = category;
        _class = class;
        _issuer = issuer;
    }

    /**
     * @dev Returns the category of the token.
     */
    function category() public view returns (bytes4) {
        return _category;
    }

    /**
     * @dev Returns the class of the token.
     */
    function class() public view returns (string memory) {
        return _class;
    }

    /**
     * @dev Returns the issuer of the token.
     */
    function issuer() public view returns (address) {
        return _issuer;
    }

    /**
     * @dev Updates the name of the token, only callable by Sygnum operator.
     * @param name_ The new name.
     */
    function updateName(string memory name_) public onlyOperator {
        _name = name_;
        emit NameUpdated(msg.sender, _name, address(this));
    }

    /**
     * @dev Updates the symbol of the token, only callable by Sygnum operator.
     * @param symbol_ The new symbol.
     */
    function updateSymbol(string memory symbol_) public onlyOperator {
        _symbol = symbol_;
        emit SymbolUpdated(msg.sender, symbol_, address(this));
    }

    /**
     * @dev Updates the category of the token, only callable by Sygnum operator.
     * @param category_ The new cateogry.
     */
    function updateCategory(bytes4 category_) public onlyOperator {
        _category = category_;
        emit CategoryUpdated(msg.sender, _category, address(this));
    }

    /**
     * @dev Updates the class of the token, only callable by Sygnum operator.
     * @param class_ The new class.
     */
    function updateClass(string memory class_) public onlyOperator {
        _class = class_;
        emit ClassUpdated(msg.sender, _class, address(this));
    }

    /**
     * @dev Updates issuer ownership, only callable by Sygnum operator.
     * @param issuer_ The new issuer.
     */
    function updateIssuer(address issuer_) public onlyOperator {
        _issuer = issuer_;
        emit IssuerUpdated(msg.sender, _issuer, address(this));
    }
}
