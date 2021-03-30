const SygnumToken = artifacts.require("SygnumToken");

module.exports = async (deployer) => {
  await deployer.deploy(SygnumToken);
  const token = await SygnumToken.deployed();
};
