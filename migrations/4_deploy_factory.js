const TokenFactory = artifacts.require("TokenFactory");
const SygnumToken = artifacts.require("SygnumToken");

const {
  BASE_OPERATORS_CONTRACT_ADDRESS,
  BLOCKER_OPERATORS_CONTRACT_ADDRESS,
  TRADER_OPERATORS_CONTRACT_ADDRESS,
  WHITELIST_CONTRACT_ADDRESS,
  PROXY_ADMIN,
} = require("../config/deployment");

module.exports = async (deployer) => {
  // DEPLOY TOKEN FACTORY
  await deployer.deploy(TokenFactory);

  const tokenFactory = await TokenFactory.deployed();

  const token = await SygnumToken.deployed();
  const tokenAddress = token.address;

  // INITIALIZE
  await tokenFactory.initialize(
    BASE_OPERATORS_CONTRACT_ADDRESS,
    TRADER_OPERATORS_CONTRACT_ADDRESS,
    BLOCKER_OPERATORS_CONTRACT_ADDRESS,
    WHITELIST_CONTRACT_ADDRESS,
    tokenAddress,
    PROXY_ADMIN
  );
};
