module.exports = {
  port: 8545,
  providerOptions: {
    total_accounts: 20,
    default_balance_ether: 1000
  },
  skipFiles: ['Migrations.sol'],
};