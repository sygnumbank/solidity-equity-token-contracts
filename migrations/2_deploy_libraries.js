const ProxyDeployer = artifacts.require("ProxyDeployer");
const TokenDeployer = artifacts.require("TokenDeployer");
const TokenFactory = artifacts.require("TokenFactory");

module.exports = async (deployer) => {
  // DEPLOY LIBRARIES
  const proxyDeployer = await deployer.deploy(ProxyDeployer);
  const tokenDeployer = await deployer.deploy(TokenDeployer);
  // LINK LIBRARIES
  await deployer.link(ProxyDeployer, TokenFactory);
  await deployer.link(TokenDeployer, TokenFactory);
};
