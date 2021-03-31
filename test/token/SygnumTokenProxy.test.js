const { load, MINT } = require("@sygnum/solidity-base-contracts");
const {
  getAdmin,
  getImplementation,
  encodeCall,
  expectEvent,
  expectRevert,
  assertRevert,
  SygnumToken,
  SygnumTokenV1,
  SygnumTokenProxy,
  ZERO_ADDRESS,
  NAME,
  SYMBOL,
  DECIMALS,
  CATEGORY,
  CLASS_TOKEN,
} = require("../common");

const { BaseOperators, TraderOperators, BlockerOperators, Whitelist } = load(SygnumToken.currentProvider);

contract("SygnumTokenProxy", ([owner, admin, operator, issuer, proxyAdmin, proxyAdminNew, attacker, whitelisted, newAddress]) => {
  beforeEach(async () => {
    this.baseOperators = await BaseOperators.new(admin, { from: admin });
    this.traderOperators = await TraderOperators.new({ from: admin });
    this.blockerOperators = await BlockerOperators.new({ from: admin });
    this.whitelist = await Whitelist.new({ from: admin });

    this.tokenImpl = await SygnumToken.new({ from: admin });
    this.tokenImplV1 = await SygnumTokenV1.new({ from: admin });

    this.initializeDataV1 = encodeCall("initV1", ["bool"], [true]);
  });

  context("contract initialization", () => {
    describe("operator contracts", () => {
      beforeEach(async () => {
        await this.traderOperators.initialize(this.baseOperators.address, { from: admin });
        await this.blockerOperators.initialize(this.baseOperators.address, { from: admin });
      });
      describe("whitelist contract", () => {
        beforeEach(async () => {
          await this.whitelist.initialize(this.baseOperators.address, { from: admin });
        });
        context("Role set-up", () => {
          beforeEach(async () => {
            await this.baseOperators.addOperator(operator, { from: admin });
          });
          context("proxy initialized", () => {
            beforeEach(async () => {
              const initializeData = encodeCall(
                "initializeContractsAndConstructor",
                ["string", "string", "uint8", "bytes4", "string", "address", "address", "address", "address", "address"],
                [
                  NAME,
                  SYMBOL,
                  DECIMALS,
                  CATEGORY,
                  CLASS_TOKEN,
                  issuer,
                  this.baseOperators.address,
                  this.whitelist.address,
                  this.traderOperators.address,
                  this.blockerOperators.address,
                ]
              );

              this.proxy = await SygnumTokenProxy.new(this.tokenImpl.address, proxyAdmin, initializeData, { from: owner });
              this.token = await SygnumToken.at(this.proxy.address);
            });
            context("deployed proxy", () => {
              describe("has implementation set", () => {
                it("check implementation set", async () => {
                  assert.equal(await getImplementation(this.proxy), this.tokenImpl.address.toLowerCase());
                });
              });
              context("change admin", () => {
                it("admin set", async () => {
                  assert.equal(await getAdmin(this.proxy), proxyAdmin.toLowerCase());
                });
                describe("change admin", () => {
                  describe("non-functional", () => {
                    it("revert from admin", async () => {
                      await assertRevert(this.proxy.changeAdmin(proxyAdminNew, { from: admin }));
                    });
                    it("revert from attacker", async () => {
                      await assertRevert(this.proxy.changeAdmin(proxyAdminNew, { from: attacker }));
                    });
                    it("revert when new admin empty address", async () => {
                      await expectRevert(this.proxy.changeAdmin(ZERO_ADDRESS, { from: proxyAdmin }), "Cannot change the admin of a proxy to the zero address.");
                    });
                  });
                  describe("functional", () => {
                    beforeEach(async () => {
                      ({ logs: this.logs } = await this.proxy.changeAdmin(proxyAdminNew, { from: proxyAdmin }));
                    });
                    it("admin set", async () => {
                      assert.equal(await getAdmin(this.proxy), proxyAdminNew.toLowerCase());
                    });
                    it("emits a AdminChanged event", () => {
                      expectEvent.inLogs(this.logs, "AdminChanged", { previousAdmin: proxyAdmin, newAdmin: proxyAdminNew });
                    });
                  });
                });
              });
              context("upgradability", () => {
                describe("upgrade to", () => {
                  describe("non-functional", () => {
                    it("revert empty implementation address", async () => {
                      await expectRevert(
                        this.proxy.upgradeTo(ZERO_ADDRESS, { from: proxyAdmin }),
                        "Cannot set a proxy implementation to a non-contract address."
                      );
                    });
                    it("revert from attacker", async () => {
                      await assertRevert(this.proxy.upgradeTo(this.tokenImplV1.address, { from: attacker }));
                    });
                  });
                  describe("functional", () => {
                    beforeEach(async () => {
                      await this.proxy.upgradeTo(this.tokenImplV1.address, { from: proxyAdmin });
                    });
                    it("new implementation set", async () => {
                      assert.equal(await getImplementation(this.proxy), this.tokenImplV1.address.toLowerCase());
                    });
                  });
                });
                describe("upgrade and call", () => {
                  describe("non-functional", () => {
                    it("reverts from token admin", async () => {
                      await assertRevert(this.proxy.upgradeToAndCall(this.tokenImplV1.address, this.initializeDataV1, { from: admin }));
                    });
                    it("reverts when implementation empty address", async () => {
                      await assertRevert(this.proxy.upgradeToAndCall(ZERO_ADDRESS, this.initializeDataV1, { from: admin }));
                    });
                    describe("reverts when initialized", () => {
                      beforeEach(async () => {
                        await this.proxy.upgradeToAndCall(this.tokenImplV1.address, this.initializeDataV1, { from: proxyAdmin });
                        this.token = await SygnumTokenV1.at(this.proxy.address);
                      });
                      it("reverts when re-initializing", async () => {
                        await expectRevert(this.token.initV1(true, { from: admin }), "SygnumTokenV1: already initialized");
                      });
                    });
                  });
                  describe("functional", () => {
                    beforeEach(async () => {
                      await this.proxy.upgradeToAndCall(this.tokenImplV1.address, this.initializeDataV1, { from: proxyAdmin });
                    });
                    it("new implementation set", async () => {
                      assert.equal(await getImplementation(this.proxy), this.tokenImplV1.address.toLowerCase());
                    });
                  });
                });
              });
              context("delegate call initial implementation", () => {
                context("when whitelisted", () => {
                  beforeEach(async () => {
                    await this.whitelist.toggleWhitelist(whitelisted, true, { from: operator });
                  });
                  context("minting", () => {
                    describe("non-functional", () => {
                      it("revert from proxy admin", async () => {
                        await expectRevert(this.token.mint(whitelisted, MINT, { from: proxyAdmin }), "Cannot call fallback function from the proxy admin.");
                      });
                      it("revert from attacker", async () => {
                        await expectRevert(
                          this.token.mint(whitelisted, MINT, { from: attacker }),
                          "Operatorable: caller does not have the operator role nor system"
                        );
                      });
                    });
                    describe("functional", () => {
                      beforeEach(async () => {
                        await this.token.mint(whitelisted, MINT, { from: operator });
                      });
                      it("minted balance set", async () => {
                        assert.equal(await this.token.balanceOf(whitelisted), MINT);
                      });
                      describe("upgrade to and calls", () => {
                        beforeEach(async () => {
                          await this.proxy.upgradeToAndCall(this.tokenImplV1.address, this.initializeDataV1, { from: proxyAdmin });
                        });
                        it("implementation set", async () => {
                          assert.equal(await getImplementation(this.proxy), this.tokenImplV1.address.toLowerCase());
                        });
                        describe("token pointer updated", () => {
                          beforeEach(async () => {
                            this.token = await SygnumTokenV1.at(this.proxy.address);
                          });
                          it("pointer address updated", () => {
                            assert.equal(this.token.address, this.proxy.address);
                          });
                          describe("ensure old data valid", () => {
                            it("balance consistent", async () => {
                              assert.equal(await this.token.balanceOf(whitelisted), MINT);
                            });
                            it("bool consistent", async () => {
                              assert.equal(await this.token.newBool(), true);
                            });
                          });
                          describe("new logic", () => {
                            beforeEach(async () => {
                              await this.token.setNewAddress(owner);
                            });
                            it("new variable from new functionality set", async () => {
                              assert.equal(await this.token.newAddress(), owner);
                            });
                            describe("ensure old functionality still operational", () => {
                              beforeEach(async () => {
                                await this.token.mint(whitelisted, MINT, { from: operator });
                              });
                              it("balance set", async () => {
                                assert.equal(await this.token.balanceOf(whitelisted), MINT + MINT);
                              });
                            });
                          });
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
});
