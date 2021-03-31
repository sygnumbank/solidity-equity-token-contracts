/**
 * @title SygnumToken
 * @author Team 3301 <team3301@sygnum.com>
 * @notice ERC20 token with additional features.
 */

pragma solidity 0.5.12;

import "./ERC20/ERC20SygnumDetailed.sol";
import "@sygnum/solidity-base-contracts/contracts/helpers/ERC20/ERC20Whitelist.sol";
import "@sygnum/solidity-base-contracts/contracts/helpers/ERC20/ERC20Pausable.sol";
import "@sygnum/solidity-base-contracts/contracts/helpers/ERC20/ERC20Mintable.sol";
import "@sygnum/solidity-base-contracts/contracts/helpers/ERC20/ERC20Burnable.sol";
import "@sygnum/solidity-base-contracts/contracts/helpers/ERC20/ERC20Freezable.sol";
import "@sygnum/solidity-base-contracts/contracts/helpers/ERC20/ERC20Destroyable.sol";
import "@sygnum/solidity-base-contracts/contracts/helpers/ERC20/ERC20Snapshot.sol";
import "@sygnum/solidity-base-contracts/contracts/helpers/ERC20/ERC20Tradeable.sol";
import "@sygnum/solidity-base-contracts/contracts/helpers/ERC20/ERC20Blockable.sol";

contract SygnumToken is
    ERC20Snapshot,
    ERC20SygnumDetailed,
    ERC20Pausable,
    ERC20Mintable,
    ERC20Whitelist,
    ERC20Tradeable,
    ERC20Blockable,
    ERC20Burnable,
    ERC20Freezable,
    ERC20Destroyable
{
    event Minted(address indexed minter, address indexed account, uint256 value);
    event Burned(address indexed burner, uint256 value);
    event BurnedFor(address indexed burner, address indexed account, uint256 value);
    event Confiscated(address indexed account, uint256 amount, address indexed receiver);

    uint16 internal constant BATCH_LIMIT = 256;

    /**
     * @dev Initialize contracts.
     * @param _baseOperators Base operators contract address.
     * @param _whitelist Whitelist contract address.
     * @param _traderOperators Trader operators contract address.
     * @param _blockerOperators Blocker operators contract address.
     */
    function initializeContractsAndConstructor(
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
    ) public initializer {
        super.initialize(_baseOperators);
        _setWhitelistContract(_whitelist);
        _setTraderOperatorsContract(_traderOperators);
        _setBlockerOperatorsContract(_blockerOperators);
        _setDetails(_name, _symbol, _decimals, _category, _class, _issuer);
    }

    /**
     * @dev Burn.
     * @param _amount Amount of tokens to burn.
     */
    function burn(uint256 _amount) public {
        require(!isFrozen(msg.sender), "SygnumToken: Account must not be frozen.");
        super._burn(msg.sender, _amount);
        emit Burned(msg.sender, _amount);
    }

    /**
     * @dev BurnFor.
     * @param _account Address to burn tokens for.
     * @param _amount Amount of tokens to burn.
     */
    function burnFor(address _account, uint256 _amount) public {
        super._burnFor(_account, _amount);
        emit BurnedFor(msg.sender, _account, _amount);
    }

    /**
     * @dev BurnFrom.
     * @param _account Address to burn tokens from.
     * @param _amount Amount of tokens to burn.
     */
    function burnFrom(address _account, uint256 _amount) public {
        super._burnFrom(_account, _amount);
        emit Burned(_account, _amount);
    }

    /**
     * @dev Mint.
     * @param _account Address to mint tokens to.
     * @param _amount Amount to mint.
     */
    function mint(address _account, uint256 _amount) public {
        if (isSystem(msg.sender)) {
            require(!isFrozen(_account), "SygnumToken: Account must not be frozen if system calling.");
        }
        super._mint(_account, _amount);
        emit Minted(msg.sender, _account, _amount);
    }

    /**
     * @dev Confiscate.
     * @param _confiscatee Account to confiscate funds from.
     * @param _receiver Account to transfer confiscated funds to.
     * @param _amount Amount of tokens to confiscate.
     */
    function confiscate(
        address _confiscatee,
        address _receiver,
        uint256 _amount
    ) public onlyOperator whenNotPaused whenWhitelisted(_receiver) whenWhitelisted(_confiscatee) {
        super._confiscate(_confiscatee, _receiver, _amount);
        emit Confiscated(_confiscatee, _amount, _receiver);
    }

    /**
     * @dev Batch burn for.
     * @param _amounts Array of all values to burn.
     * @param _accounts Array of all addresses to burn from.
     */
    function batchBurnFor(address[] memory _accounts, uint256[] memory _amounts) public {
        require(_accounts.length == _amounts.length, "SygnumToken: values and recipients are not equal.");
        require(_accounts.length <= BATCH_LIMIT, "SygnumToken: batch count is greater than BATCH_LIMIT.");
        for (uint256 i = 0; i < _accounts.length; i++) {
            burnFor(_accounts[i], _amounts[i]);
        }
    }

    /**
     * @dev Batch mint.
     * @param _accounts Array of all addresses to mint to.
     * @param _amounts Array of all values to mint.
     */
    function batchMint(address[] memory _accounts, uint256[] memory _amounts) public {
        require(_accounts.length == _amounts.length, "SygnumToken: values and recipients are not equal.");
        require(_accounts.length <= BATCH_LIMIT, "SygnumToken: batch count is greater than BATCH_LIMIT.");
        for (uint256 i = 0; i < _accounts.length; i++) {
            mint(_accounts[i], _amounts[i]);
        }
    }

    /**
     * @dev Batch confiscate to a maximum of 256 addresses.
     * @param _confiscatees array of addresses whose funds are being confiscated
     * @param _receivers array of addresses who's receiving the funds
     * @param _values array of values of funds being confiscated
     */
    function batchConfiscate(
        address[] memory _confiscatees,
        address[] memory _receivers,
        uint256[] memory _values
    ) public returns (bool) {
        require(
            _confiscatees.length == _values.length && _receivers.length == _values.length,
            "SygnumToken: confiscatees, recipients and values are not equal."
        );
        require(_confiscatees.length <= BATCH_LIMIT, "SygnumToken: batch count is greater than BATCH_LIMIT.");
        for (uint256 i = 0; i < _confiscatees.length; i++) {
            confiscate(_confiscatees[i], _receivers[i], _values[i]);
        }
    }
}
