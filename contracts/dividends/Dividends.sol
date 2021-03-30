/**
 * @title Dividends
 * @author Team 3301 <team3301@sygnum.com>
 * @notice Dividends payout.
 */

pragma solidity 0.5.12;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "@sygnum/solidity-base-contracts/contracts/helpers/Pausable.sol";

import "../token/SygnumToken.sol";

// solhint-disable max-line-length
contract Dividends is Pausable {
    using SafeMath for uint256;

    uint256 public constant YEARS = 5;
    uint256 public constant RECLAIM_TIME = YEARS * 365 days;

    address payable public wallet;
    address public issuer;

    /**
     * @dev This is the internal counter which keeps track of the available dividends within each different payout token.
     * Address 0 is used for ether balances
     **/
    mapping(address => uint256) public balances;

    SygnumToken public sygToken;
    Dividend[] public dividends;

    event DividendDeposited(
        address indexed depositor,
        uint256 dividendIndex,
        uint256 blockNumber,
        uint256 amount,
        bool isERC20
    );
    event DividendClaimed(address indexed claimer, uint256 dividendIndex, uint256 amount, bool isERC20);
    event DividendRecycled(address indexed recycler, uint256 dividendIndex, uint256 amount);
    event WalletUpdated(address indexed issuer, address indexed oldWallet, address indexed newWallet);

    /** MODIFIERS */
    modifier validDividendIndex(uint256 _dividendIndex) {
        require(_dividendIndex < dividends.length, "invalid index");
        _;
    }

    modifier onlyValidAddress(address _address) {
        require(_address != address(0), "invalid address");
        _;
    }

    modifier onlyIssuer() {
        require(msg.sender == issuer, "sender is not issuer");
        _;
    }

    /**
     * @dev initialize dividend contract with the Sygnum Token contract address, issuer associated, and baseOperators contract address.
     * @param _sygToken Address of the Sygnum Token.
     * @param _issuer Address of the associated issuer to the Sygnum Token.
     * @param _baseOperators Address of baseOperators address.
     */
    constructor(
        address _sygToken,
        address payable _issuer,
        address _baseOperators
    ) public onlyValidAddress(_sygToken) onlyValidAddress(_issuer) onlyValidAddress(_baseOperators) {
        sygToken = SygnumToken(_sygToken);
        wallet = _issuer;
        issuer = _issuer;
        super.initialize(_baseOperators);
    }

    /**
     * @dev allows issuer to set a new wallet for reclaiming dividends
     * @param _wallet New wallet address.
     */
    function updateWallet(address payable _wallet) external onlyIssuer onlyValidAddress(_wallet) {
        emit WalletUpdated(msg.sender, wallet, _wallet);
        wallet = _wallet;
    }

    /**
     * @dev deposit payoutDividend tokens (ERC20) into this contract
     * @param _blockNumber uint256 Block height at which users' balances will be snapshot
     * @param _exDividendDate uint256 Ex dividend date
     * @param _recordDate uint256 Date when dividend was recorded
     * @param _payoutDate uint256 Date when dividends will be able to be claimed
     * @param _amount uint256 total amount of the ERC20 tokens deposited to payout to all token holders as of
     *   previous block from when this function is included
     * @param _payoutToken ERC20 address of the token used for payout the current dividend
     * @return uint256 dividendIndex index the dividend struct on the array
     */
    function depositERC20Dividend(
        uint256 _blockNumber,
        uint256 _exDividendDate,
        uint256 _recordDate,
        uint256 _payoutDate,
        uint256 _amount,
        address _payoutToken
    ) public onlyIssuer whenNotPaused onlyValidAddress(_payoutToken) returns (uint256 dividendIndex) {
        require(_amount > 0, "dividend amount !> 0");
        require(_payoutDate > getNow(), "payoutDate !> now");
        require(_blockNumber > block.number, "blockNum !> block.number");

        require(
            ERC20(_payoutToken).balanceOf(address(this)) >= balances[_payoutToken].add(_amount),
            "issuer has not transferred amount"
        );

        uint256 supplyAtTimeOfDividend = sygToken.totalSupplyAt(_blockNumber);
        balances[_payoutToken] = balances[_payoutToken].add(_amount);

        dividendIndex = createDividend(
            _blockNumber,
            _exDividendDate,
            _recordDate,
            _payoutDate,
            _amount,
            supplyAtTimeOfDividend,
            _payoutToken,
            true
        );
    }

    /**
     * @dev deposit payoutDividend, in ether, into this contract
     * @param _blockNumber uint256 Block height at which users' balances will be snapshot
     * @param _exDividendDate uint256 Ex dividend date
     * @param _recordDate uint256 Date when dividend was recorded
     * @param _payoutDate uint256 Date when dividends will be able to be claimed
     * @param _amount uint256 total amount of the ether deposited to payout to all token holders as of
     *   previous block from when this function is included
     * @return uint256 dividendIndex index the dividend struct on the array
     */
    function depositEtherDividend(
        uint256 _blockNumber,
        uint256 _exDividendDate,
        uint256 _recordDate,
        uint256 _payoutDate,
        uint256 _amount
    ) public payable onlyIssuer whenNotPaused returns (uint256 dividendIndex) {
        require(_amount > 0, "amount must be greater than 0");
        require(msg.value == _amount, "ether sent != _amount");
        require(_payoutDate > getNow(), "payoutDate !> now");
        require(_blockNumber > block.number, "blockNum !> block.number");

        uint256 supplyAtTimeOfDividend = sygToken.totalSupplyAt(_blockNumber);
        balances[address(0)] = balances[address(0)].add(_amount);

        dividendIndex = createDividend(
            _blockNumber,
            _exDividendDate,
            _recordDate,
            _payoutDate,
            _amount,
            supplyAtTimeOfDividend,
            address(0),
            false
        );
    }

    /**
     * @dev Sygnum token holder to claim their share of dividends at a specific divident index
     *      handles both ether and ERC20 token payouts
     * @param _dividendIndex uint256 current index of the dividend to claim for msg.sender
     */
    function claimDividend(uint256 _dividendIndex) public whenNotPaused validDividendIndex(_dividendIndex) {
        Dividend storage dividend = dividends[_dividendIndex];
        require(getNow() >= dividend.payoutDate, "too soon");
        require(dividend.claimed[msg.sender] == false, "already claimed");
        require(dividend.recycled == false, "already recycled");
        require(getNow() < (dividend.payoutDate).add(RECLAIM_TIME), "time lapsed");

        uint256 balance = sygToken.balanceOfAt(msg.sender, dividend.blockNumber);

        require(balance > 0, "no dividends owed");

        uint256 claimAmount = balance.mul(dividend.amount).div(dividend.totalSupply);
        dividend.claimed[msg.sender] = true;
        dividend.amountRemaining = dividend.amountRemaining.sub(claimAmount);
        balances[dividend.payoutToken] = balances[dividend.payoutToken].sub(claimAmount);

        if (dividend.isERC20Payout) {
            ERC20 payoutToken = ERC20(dividend.payoutToken);
            payoutToken.transfer(msg.sender, claimAmount);
        } else {
            msg.sender.transfer(claimAmount);
        }

        emit DividendClaimed(msg.sender, _dividendIndex, claimAmount, dividend.isERC20Payout);
    }

    /**
     * @dev get dividend info at index
     * @param _index uint256 Index of dividend in memory
     * @return uint256, uint256, uint256, uint256, uint256, uint256, address, bool, uint256, bool
     */
    function getDividend(uint256 _index)
        public
        view
        validDividendIndex(_index)
        returns (
            uint256,
            uint256,
            uint256,
            uint256,
            uint256,
            uint256,
            address,
            bool,
            uint256,
            bool
        )
    {
        Dividend memory result = dividends[_index];
        return (
            result.blockNumber,
            result.exDividendDate,
            result.recordDate,
            result.payoutDate,
            result.amount,
            result.totalSupply,
            result.payoutToken,
            result.isERC20Payout,
            result.amountRemaining,
            result.recycled
        );
    }

    /**
     * @dev onlyIssuer to recycle remaining amount to the specified wallet address stored on contract
     * @param _dividendIndex unint256 index of the dividend to recycle
     */
    function recycleDividend(uint256 _dividendIndex)
        public
        onlyIssuer
        whenNotPaused
        validDividendIndex(_dividendIndex)
    {
        Dividend storage dividend = dividends[_dividendIndex];
        uint256 remainingAmount = dividend.amountRemaining;

        require(dividend.recycled == false, "already recycled");
        require(remainingAmount > 0, "nothing to recycle");
        require(getNow() >= (dividend.payoutDate).add(RECLAIM_TIME), "too soon");

        dividends[_dividendIndex].recycled = true;
        balances[dividend.payoutToken] = balances[dividend.payoutToken].sub(remainingAmount);
        dividend.amountRemaining = 0;

        if (dividend.isERC20Payout) {
            ERC20(dividend.payoutToken).transfer(wallet, remainingAmount);
        } else {
            wallet.transfer(remainingAmount);
        }

        emit DividendRecycled(msg.sender, _dividendIndex, remainingAmount);
    }

    /*** INTERNAL/PRIVATE ***/
    /**
     * @notice this creates a new dividend record that appends to the dividends array
     * @param _blockNumber uint256 Block height at which users' balances will be snapshot
     * @param _exDividendDate uint256 Ex dividend date
     * @param _recordDate uint256 Date when dividend was recorded
     * @param _payoutDate uint256 Date when dividends will be able to be claimed
     * @param _amount uint256 total amount of the ether deposited to payout to all token holders as of
     *   previous block from when this function is included
     * @param _totalSupply uint256 Total token supply at the time the dividend was created
     * @param _payoutToken address Address of the ERC20 token that will be used for dividends payout
     * @param _isERC20Payout bool If false, dividends will be in Ether
     * @return uint256 dividendIndex
     */
    function createDividend(
        uint256 _blockNumber,
        uint256 _exDividendDate,
        uint256 _recordDate,
        uint256 _payoutDate,
        uint256 _amount,
        uint256 _totalSupply,
        address _payoutToken,
        bool _isERC20Payout
    ) internal returns (uint256 dividendIndex) {
        dividends.push(
            Dividend(
                _blockNumber,
                _exDividendDate,
                _recordDate,
                _payoutDate,
                _amount,
                _totalSupply,
                _payoutToken,
                _isERC20Payout,
                _amount,
                false
            )
        );

        dividendIndex = dividends.length.sub(1);
        emit DividendDeposited(msg.sender, dividendIndex, _blockNumber, _amount, _isERC20Payout);
    }

    /**
     * @dev use function to get timestamp to avoid excessive comments to disable solhint
     * @return uint256
     */
    function getNow() internal view returns (uint256) {
        // solhint-disable-next-line
        return block.timestamp;
    }

    struct Dividend {
        uint256 blockNumber; // (Mandatory) block number used to check balance against
        uint256 exDividendDate; // (Optional) On (or after) this date the security trades without its dividend
        uint256 recordDate; // (Optional) This is the date on which the company looks at its records to see who the token holders are (~=blockNumber)
        uint256 payoutDate; // (Mandatory) This is the date when payouts can be claimed
        uint256 amount; // (Mandatory) total amount of the payout
        uint256 totalSupply; // (Mandatory) total supply of the Sygnum Token at dividend instantiation
        address payoutToken; // (Optional) allow each dividend period the flexibility for a different ERC20 token - can be address(0x0)
        bool isERC20Payout; // (Mandatory) marks if this dividend is paid out in ether or ERC20
        uint256 amountRemaining; // amount remaining to be paid out
        bool recycled; // marks if dividend has been clawed back by the company
        mapping(address => bool) claimed; // marks address as claimed once claimed has succeeded
    }
}
