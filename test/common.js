const { BN, constants, expectEvent, expectRevert, time } = require("@openzeppelin/test-helpers");
const { encodeCall } = require("zos-lib");
const { assertRevert, expectThrow, getAdmin, getImplementation, getTxEvents } = require("./tools");
const { THREE_HUNDRED_ADDRESS, THREE_HUNDRED_NUMBERS } = require("./threeHundred");

const { ZERO_ADDRESS } = constants;

/* token */
const SygnumToken = artifacts.require("SygnumToken");
const SygnumTokenProxy = artifacts.require("SygnumTokenProxy");
/* ├──/upgrade/example */
const SygnumTokenV1 = artifacts.require("SygnumTokenV1");

/* mocks */
const ERC20SygnumDetailedMock = artifacts.require("ERC20SygnumDetailedMock");

/* dividends */
const Dividends = artifacts.require("Dividends");

/* factory */
const TokenFactory = artifacts.require("TokenFactory");
const ProxyDeployer = artifacts.require("ProxyDeployer");
const TokenDeployer = artifacts.require("TokenDeployer");

/* role */
const NAME = "sygnum";
const SYMBOL = "syg";
const DECIMALS = 18;
const CATEGORY = "0x74657374";
const CLASS_TOKEN = "A";

const ONE_ETHER = web3.utils.toWei("1", "ether");
const TWO_ETHER = web3.utils.toWei("2", "ether");
const TWO_ADDRESSES = ["0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb49", "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb42"];

module.exports = {
  BN,
  constants,
  expectEvent,
  expectRevert,
  time,
  ZERO_ADDRESS,
  TWO_ADDRESSES,
  assertRevert,
  expectThrow,
  getAdmin,
  getImplementation,
  getTxEvents,
  encodeCall,
  SygnumToken,
  SygnumTokenV1,
  SygnumTokenProxy,
  ERC20SygnumDetailedMock,
  Dividends,
  TokenFactory,
  ProxyDeployer,
  TokenDeployer,
  THREE_HUNDRED_ADDRESS,
  THREE_HUNDRED_NUMBERS,
  NAME,
  SYMBOL,
  DECIMALS,
  CATEGORY,
  CLASS_TOKEN,
  ONE_ETHER,
  TWO_ETHER,
};
