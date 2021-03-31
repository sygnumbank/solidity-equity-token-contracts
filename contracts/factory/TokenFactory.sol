/**
 * @title TokenFactory
 * @author Team 3301 <team3301@sygnum.com>
 * @dev Token factory to be used by operators to deploy arbitrary Sygnum Equity Token.
 */

pragma solidity 0.5.12;

import "@sygnum/solidity-base-contracts/contracts/helpers/Initializable.sol";
import "@sygnum/solidity-base-contracts/contracts/role/base/Operatorable.sol";

import "./ProxyDeployer.sol";
import "./TokenDeployer.sol";

contract TokenFactory is Initializable, Operatorable {
    address public whitelist;
    address public proxyAdmin;
    address public implementation;
    address public traderOperators;
    address public blockerOperators;

    event UpdatedWhitelist(address indexed whitelist);
    event UpdatedTraderOperators(address indexed traderOperators);
    event UpdatedBlockerOperators(address indexed blockerOperators);
    event UpdatedProxyAdmin(address indexed proxyAdmin);
    event UpdatedImplementation(address indexed implementation);
    event NewTokenDeployed(address indexed issuer, address token, address proxy);

    /**
     * @dev Initialization instead of constructor, called once. Sets BaseOperators contract through pausable contract
     * resulting in use of Operatorable contract within this contract.
     * @param _baseOperators BaseOperators contract address.
     * @param _traderOperators TraderOperators contract address.
     * @param _blockerOperators BlockerOperators contract address.
     * @param _whitelist Whitelist contract address.
     */
    function initialize(
        address _baseOperators,
        address _traderOperators,
        address _blockerOperators,
        address _whitelist,
        address _implementation,
        address _proxyAdmin
    ) public initializer {
        require(_baseOperators != address(0), "TokenFactory: _baseOperators cannot be set to an empty address");
        require(_traderOperators != address(0), "TokenFactory: _traderOperators cannot be set to an empty address");
        require(_blockerOperators != address(0), "TokenFactory: _blockerOperators cannot be set to an empty address");
        require(_whitelist != address(0), "TokenFactory: _whitelist cannot be set to an empty address");
        require(_implementation != address(0), "TokenFactory: _implementation cannot be set to an empty address");
        require(_proxyAdmin != address(0), "TokenFactory: _proxyAdmin cannot be set to an empty address");
        traderOperators = _traderOperators;
        blockerOperators = _blockerOperators;
        whitelist = _whitelist;
        proxyAdmin = _proxyAdmin;
        implementation = _implementation;

        super.initialize(_baseOperators);
    }

    /**
     * @dev allows operator, system or relay to launch a new token with a new name, symbol, decimals, category, and issuer.
     * Defaults to using whitelist stored in this contract. If _whitelist is address(0), else it will use
     * _whitelist as the param to pass into the new token's constructor upon deployment
     * @param _name string
     * @param _symbol string
     * @param _decimals uint8
     * @param _category bytes4
     * @param _class string
     * @param _issuer address
     * @param _whitelist address
     */
    function newToken(
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        bytes4 _category,
        string memory _class,
        address _issuer,
        address _whitelist
    ) public onlyOperatorOrSystemOrRelay returns (address, address) {
        address whitelistAddress;
        _whitelist == address(0) ? whitelistAddress = whitelist : whitelistAddress = _whitelist;
        address baseOperators = getOperatorsContract();

        address proxy = ProxyDeployer.deployTokenProxy(implementation, proxyAdmin, "");

        TokenDeployer.initializeToken(
            proxy,
            _name,
            _symbol,
            _decimals,
            _category,
            _class,
            _issuer,
            baseOperators,
            whitelistAddress,
            traderOperators,
            blockerOperators
        );

        emit NewTokenDeployed(_issuer, implementation, proxy);
        return (implementation, proxy);
    }

    /**
     * @dev updates the whitelist to be used for future generated tokens
     * @param _whitelist address
     */
    function updateWhitelist(address _whitelist) public onlyOperator {
        require(_whitelist != address(0), "TokenFactory: _whitelist cannot be set to an empty address");
        whitelist = _whitelist;
        emit UpdatedWhitelist(whitelist);
    }

    /**
     * @dev updates the traderOperators contract address to be used for future generated tokens
     * @param _traderOperators address
     */
    function updateTraderOperators(address _traderOperators) public onlyOperator {
        require(_traderOperators != address(0), "TokenFactory: _traderOperators cannot be set to an empty address");
        traderOperators = _traderOperators;
        emit UpdatedTraderOperators(_traderOperators);
    }

    /**
     * @dev updates the blockerOperators contract address to be used for future generated tokens
     * @param _blockerOperators address
     */
    function updateBlockerOperators(address _blockerOperators) public onlyOperator {
        require(_blockerOperators != address(0), "TokenFactory: _blockerOperators cannot be set to an empty address");
        blockerOperators = _blockerOperators;
        emit UpdatedBlockerOperators(_blockerOperators);
    }

    /**
     * @dev update the implementation address used when deploying proxy contracts
     * @param _implementation address
     */
    function updateImplementation(address _implementation) public onlyOperator {
        require(_implementation != address(0), "TokenFactory: _implementation cannot be set to an empty address");
        implementation = _implementation;
        emit UpdatedImplementation(implementation);
    }

    /**
     * @dev update the proxy admin address used when deploying proxy contracts
     * @param _proxyAdmin address
     */
    function updateProxyAdmin(address _proxyAdmin) public {
        require(_proxyAdmin != address(0), "TokenFactory: _proxyAdmin cannot be set to an empty address");
        require(msg.sender == proxyAdmin, "TokenFactory: caller not proxy admin");
        proxyAdmin = _proxyAdmin;
        emit UpdatedProxyAdmin(proxyAdmin);
    }
}
