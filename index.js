const TruffleContract = require("@truffle/contract");

const sygnumTokenJson = require("./build/contracts/SygnumToken.json");

module.exports = {
  load: (provider) => {
    const contracts = {
      SygnumToken: TruffleContract(sygnumTokenJson),
    };
    Object.values(contracts).forEach((i) => i.setProvider(provider));
    return contracts;
  },
};
