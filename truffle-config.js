const HDWalletProvider = require("@truffle/hdwallet-provider");
require("dotenv").config();

module.exports = {
  networks: {
    development: {
      host: process.env.BLOCKCHAIN_HOST || "localhost",
      port: process.env.BLOCKCHAIN_PORT || 8545,
      network_id: "*",
      disableConfirmationListener: true,
    },
    ropsten: {
      provider: () => {
        return new HDWalletProvider(process.env.ROPSTEN_MNENOMIC_PHRASE, process.env.ROPSTEN_PROVIDER);
      },
      gasPrice: 10000000000,
      network_id: 3,
    },
    goerli: {
      provider: () => {
        return new HDWalletProvider(process.env.GOERLI_MNENOMIC_PHRASE, process.env.GOERLI_PROVIDER);
      },
      gasPrice: 10000000000,
      network_id: 5,
    },
    mainnet: {
      provider: () => {
        return new HDWalletProvider(process.env.MAINNET_MNENOMIC_PHRASE, process.env.MAINNET_PROVIDER);
      },
      gasPrice: 10000000000,
      network_id: "1",
    },
  },
  plugins: ["solidity-coverage", "verify-on-etherscan"],
  compilers: {
    solc: {
      version: "0.5.12",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200,
        },
      },
    },
  },
  mocha: {
    enableTimeouts: false,
    before_timeout: 600000,
  },
};
