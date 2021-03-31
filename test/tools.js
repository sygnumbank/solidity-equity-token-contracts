const abiDecoder = require("abi-decoder");

async function assertRevert(promise) {
  try {
    await promise;
    assert.fail("Expected revert not received");
  } catch (error) {
    const revertFound = error.message.search("revert") >= 0;
    assert(revertFound, `Expected "revert", got ${error} instead`);
  }
}

async function expectThrow(promise) {
  try {
    await promise;
  } catch (error) {
    // TODO: Check jump destination to destinguish between a throw
    //       and an actual invalid jump.
    const invalidOpcode = error.message.search("invalid opcode") >= 0;
    // TODO: When we contract A calls contract B, and B throws, instead
    //       of an 'invalid jump', we get an 'out of gas' error. How do
    //       we distinguish this from an actual out of gas event? (The
    //       testrpc log actually show an 'invalid jump' event.)
    const outOfGas = error.message.search("out of gas") >= 0;
    const revert = error.message.search("revert") >= 0;
    assert(invalidOpcode || outOfGas || revert, `Expected throw, got '${error}' instead`);
    return;
  }
  assert.fail("Expected throw not received");
}

async function getAdmin(proxy) {
  const adminSlot = "0x10d6a54a4754c8869d6886b5f5d7fbfa5b4522237ea5c60d11bc4e7a1ff9390b";
  const adm = web3.eth.getStorageAt(proxy.address, adminSlot);
  return adm;
}

async function getImplementation(proxy) {
  const implSlot = "0x7050c9e0f4ca769c69bd3a8ef740bc37934f8e2c036e5a723fd8ee048ed3f8c3";
  const impl = web3.eth.getStorageAt(proxy.address, implSlot);
  return impl;
}

function getTxEvents(tx, event, abi) {
  abiDecoder.addABI(abi);
  if (
    tx.logs.filter((e) => {
      return e && e.event === event;
    }).length
  ) {
    return tx.logs.filter((e) => {
      return e && e.event === event;
    });
  }
  const decodedLogs = abiDecoder.decodeLogs(tx.logs);
  return decodedLogs
    .filter((e) => {
      return e && e.name === event;
    })
    .map((e) => {
      return {
        ...e,
        event: e.name,
        args: e.events.reduce((a, r) => {
          // eslint-disable-next-line no-param-reassign
          a[r.name] = r.value;
          return a;
        }, {}),
      };
    });
}

module.exports = {
  assertRevert,
  getAdmin,
  getImplementation,
  getTxEvents,
  expectThrow,
};
