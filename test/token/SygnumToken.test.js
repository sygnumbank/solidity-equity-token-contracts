const { load, THREE_HUNDRED_ADDRESS, THREE_HUNDRED_NUMBERS, MINT, BURN, TRANSFER, APPROVAL } = require("@sygnum/solidity-base-contracts");

const { expectRevert, SygnumToken, ZERO_ADDRESS, TWO_ADDRESSES, NAME, SYMBOL, DECIMALS, CATEGORY, CLASS_TOKEN } = require("../common");

const { BaseOperators, TraderOperators, BlockerOperators, Whitelist } = load(SygnumToken.currentProvider);

contract("SygnumToken", ([admin, operator, system, whitelisted, whitelisted1, whitelisted2, frozen, frozen1, notWhitelisted, issuer, attacker]) => {
  beforeEach(async () => {
    this.baseOperators = await BaseOperators.new(admin, { from: admin });
    this.traderOperators = await TraderOperators.new({ from: admin });
    this.blockerOperators = await BlockerOperators.new({ from: admin });

    this.token = await SygnumToken.new(NAME, SYMBOL, DECIMALS, CATEGORY, CLASS_TOKEN, issuer, { from: admin });

    this.whitelist = await Whitelist.new({ from: admin });

    this.CONFISCATE = 5;
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
        describe("token contract", () => {
          beforeEach(async () => {
            await this.token.initializeContractsAndConstructor(
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
              { from: admin }
            );
          });
          describe("contract initialized", () => {
            describe("initialization enforcement", () => {
              it("is initialized", async () => {
                assert.equal(await this.token.isInitialized(), true);
              });
            });
            describe("whitelist", () => {
              it("is set", async () => {
                assert.equal(await this.token.getWhitelistContract(), this.whitelist.address);
              });
            });
            describe("operator contracts", () => {
              it("baseOperators", async () => {
                assert.equal(await this.token.getOperatorsContract(), this.baseOperators.address);
              });
              it("traderOperators", async () => {
                assert.equal(await this.token.getTraderOperatorsContract(), this.traderOperators.address);
              });
              it("blockerOperators", async () => {
                assert.equal(await this.token.getBlockerOperatorsContract(), this.blockerOperators.address);
              });
            });
          });
          context("Role set-up", () => {
            beforeEach(async () => {
              await this.baseOperators.addOperator(operator, { from: admin });
              await this.baseOperators.addSystem(system, { from: admin });
            });
            describe("Whitelist set-up", () => {
              beforeEach(async () => {
                await this.whitelist.batchToggleWhitelist([whitelisted, whitelisted1, whitelisted2, frozen, frozen1], true, { from: operator });
                await this.token.batchToggleFreeze([frozen, frozen1], true, { from: operator });
                this.overflow = MINT + BURN;
              });
              context("mint", () => {
                describe("non-batch", () => {
                  describe("unwhitelisted", () => {
                    describe("non functional", () => {
                      it("revert operator mint for unwhitelisted", async () => {
                        await expectRevert(this.token.mint(notWhitelisted, MINT, { from: operator }), "Whitelistable: account is not whitelisted");
                      });
                      it("revert system mint for unwhitelisted", async () => {
                        await expectRevert(this.token.mint(notWhitelisted, MINT, { from: system }), "Whitelistable: account is not whitelisted");
                      });
                    });
                  });
                  describe("whitelisted", () => {
                    describe("non functional", () => {
                      it("revert self whitelist", async () => {
                        await expectRevert(
                          this.token.mint(whitelisted, MINT, { from: whitelisted }),
                          "Operatorable: caller does not have the operator role nor system"
                        );
                      });
                      it("revert mint 0", async () => {
                        await expectRevert(this.token.mint(whitelisted, 0, { from: operator }), "ERC20Mintable: amount has to be greater than 0");
                      });
                      it("revert mint empty address", async () => {
                        await expectRevert(this.token.mint(ZERO_ADDRESS, MINT, { from: operator }), "Whitelistable: account is not whitelisted"); // Cannot add to whitelist before minting
                      });
                      it("revert attacker mint", async () => {
                        await expectRevert(
                          this.token.mint(whitelisted, MINT, { from: attacker }),
                          "Operatorable: caller does not have the operator role nor system"
                        );
                      });
                    });
                    describe("functional", () => {
                      describe("from operator", () => {
                        beforeEach(async () => {
                          await this.token.mint(whitelisted, MINT, { from: operator });
                          this.blockNum = await web3.eth.getBlockNumber();
                        });
                        describe("normal values updated", () => {
                          it("balance updated", async () => {
                            assert.equal(await this.token.balanceOf(whitelisted), MINT);
                          });
                          it("total supply updated", async () => {
                            assert.equal(await this.token.totalSupply(), MINT);
                          });
                        });
                        describe("snapshot values updated", () => {
                          it("total supply updated", async () => {
                            assert.equal(await this.token.totalSupplyAt(this.blockNum), MINT);
                          });
                          it("snapshot balance updated", async () => {
                            assert.equal(await this.token.balanceOfAt(whitelisted, this.blockNum), MINT);
                          });
                        });
                      });
                      describe("from system", () => {
                        beforeEach(async () => {
                          await this.token.mint(whitelisted, MINT, { from: system });
                          this.blockNum = await web3.eth.getBlockNumber();
                        });
                        describe("normal values updated", () => {
                          it("balance updated", async () => {
                            assert.equal(await this.token.balanceOf(whitelisted), MINT);
                          });
                          it("total supply updated", async () => {
                            assert.equal(await this.token.totalSupply(), MINT);
                          });
                        });
                        describe("snapshot values updated", () => {
                          it("total supply updated", async () => {
                            assert.equal(await this.token.totalSupplyAt(this.blockNum), MINT);
                          });
                          it("snapshot balance updated", async () => {
                            assert.equal(await this.token.balanceOfAt(whitelisted, this.blockNum), MINT);
                          });
                        });
                      });
                    });
                    describe("frozen", () => {
                      describe("functional", () => {
                        describe("from operator", () => {
                          beforeEach(async () => {
                            await this.token.mint(frozen, MINT, { from: operator });
                            this.blockNum = await web3.eth.getBlockNumber();
                          });
                          describe("normal values updated", () => {
                            it("balance updated", async () => {
                              assert.equal(await this.token.balanceOf(frozen), MINT);
                            });
                            it("total supply updated", async () => {
                              assert.equal(await this.token.totalSupply(), MINT);
                            });
                          });
                          describe("snapshot values updated", () => {
                            it("total supply updated", async () => {
                              assert.equal(await this.token.totalSupplyAt(this.blockNum), MINT);
                            });
                            it("snapshot balance updated", async () => {
                              assert.equal(await this.token.balanceOfAt(frozen, this.blockNum), MINT);
                            });
                          });
                        });
                      });
                      describe("non-functional", () => {
                        it("revert system mint frozen", async () => {
                          await expectRevert(this.token.mint(frozen, MINT, { from: system }), "SygnumToken: Account must not be frozen if system calling.");
                        });
                      });
                    });
                    describe("paused", () => {
                      beforeEach(async () => {
                        await this.token.pause({ from: operator });
                      });
                      describe("non-functional", async () => {
                        it("revert minting", async () => {
                          await expectRevert(this.token.mint(whitelisted, MINT, { from: operator }), "Pausable: paused");
                        });
                      });
                      describe("functional", async () => {
                        describe("unpaused then mint", () => {
                          beforeEach(async () => {
                            await this.token.unpause({ from: operator });
                          });
                          describe("can mint again", () => {
                            beforeEach(async () => {
                              await this.token.mint(whitelisted, MINT, { from: operator });
                              this.blockNum = await web3.eth.getBlockNumber();
                            });
                            describe("normal values updated", () => {
                              it("balance updated", async () => {
                                assert.equal(await this.token.balanceOf(whitelisted), MINT);
                              });
                              it("total supply updated", async () => {
                                assert.equal(await this.token.totalSupply(), MINT);
                              });
                            });
                            describe("snapshot values updated", () => {
                              it("total supply updated", async () => {
                                assert.equal(await this.token.totalSupplyAt(this.blockNum), MINT);
                              });
                              it("snapshot balance updated", async () => {
                                assert.equal(await this.token.balanceOfAt(whitelisted, this.blockNum), MINT);
                              });
                            });
                          });
                        });
                      });
                    });
                  });
                }); // end of non-batch
                describe("batch", () => {
                  beforeEach(async () => {
                    await this.whitelist.batchToggleWhitelist(TWO_ADDRESSES, true, { from: operator });
                  });
                  describe("non-functional", () => {
                    it("revert address count and value count not equal", async () => {
                      await expectRevert(this.token.batchMint(TWO_ADDRESSES, [MINT], { from: operator }), "SygnumToken: values and recipients are not equal.");
                    });
                    it("revert mint to over 256 addresses", async () => {
                      await expectRevert(
                        this.token.batchMint(THREE_HUNDRED_ADDRESS, THREE_HUNDRED_NUMBERS, { from: operator }),
                        "SygnumToken: batch count is greater than BATCH_LIMIT."
                      );
                    });
                  });
                  describe("functional", () => {
                    describe("batch mint 2 addresses", () => {
                      beforeEach(async () => {
                        await this.token.batchMint(TWO_ADDRESSES, [MINT, MINT], { from: operator });
                        this.blockNum = await web3.eth.getBlockNumber();
                      });
                      describe("normal values updated", () => {
                        it("first address balance updated", async () => {
                          assert.equal(await this.token.balanceOf(TWO_ADDRESSES[0]), MINT);
                        });
                        it("second address balance updated", async () => {
                          assert.equal(await this.token.balanceOf(TWO_ADDRESSES[1]), MINT);
                        });
                        it("total supply updated", async () => {
                          assert.equal(await this.token.totalSupply(), MINT + MINT);
                        });
                      });
                      describe("snapshot values updated", () => {
                        it("total supply updated", async () => {
                          assert.equal(await this.token.totalSupplyAt(this.blockNum), MINT + MINT);
                        });
                        it("first address snapshot balance updated", async () => {
                          assert.equal(await this.token.balanceOfAt(TWO_ADDRESSES[0], this.blockNum), MINT);
                        });
                        it("second address snapshot balance updated", async () => {
                          assert.equal(await this.token.balanceOfAt(TWO_ADDRESSES[1], this.blockNum), MINT);
                        });
                      });
                    });
                  });
                }); // end of batch
              }); // End of mint
              context("burnable", () => {
                beforeEach(async () => {
                  await this.token.batchMint([whitelisted, frozen], [MINT, MINT], { from: operator });
                });
                describe("burnFor", () => {
                  describe("non-batch", () => {
                    describe("whitelisted/unwhitelisted", () => {
                      describe("non-functional", () => {
                        it("revert unwhitelisted", async () => {
                          await expectRevert(this.token.burnFor(notWhitelisted, BURN, { from: operator }), "Whitelistable: account is not whitelisted");
                        });
                        it("revert from attacker", async () => {
                          await expectRevert(this.token.burnFor(whitelisted, BURN, { from: attacker }), "Operatorable: caller does not have the operator role");
                        });
                        it("revert for empty address", async () => {
                          await expectRevert(this.token.burnFor(ZERO_ADDRESS, BURN, { from: operator }), "Whitelistable: account is not whitelisted");
                        });
                        it("revert for over burn balance", async () => {
                          await expectRevert(this.token.burnFor(whitelisted, this.overflow, { from: operator }), "ERC20: burn amount exceeds balance");
                        });
                        it("revert system burnFor", async () => {
                          await expectRevert(this.token.burnFor(whitelisted, BURN, { from: system }), "Operatorable: caller does not have the operator role");
                        });
                      });
                      describe("functional", () => {
                        describe("from operator", () => {
                          beforeEach(async () => {
                            await this.token.burnFor(whitelisted, BURN, { from: operator });
                            this.blockNum = await web3.eth.getBlockNumber();
                          });
                          describe("normal values updated", () => {
                            it("balance updated", async () => {
                              assert.equal(await this.token.balanceOf(whitelisted), MINT - BURN);
                            });
                            it("total supply updated", async () => {
                              assert.equal(await this.token.totalSupply(), MINT + MINT - BURN);
                            });
                          });
                          describe("snapshot values updated", () => {
                            it("total supply updated", async () => {
                              assert.equal(await this.token.totalSupplyAt(this.blockNum), MINT + MINT - BURN);
                            });
                            it("snapshot balance updated", async () => {
                              assert.equal(await this.token.balanceOfAt(whitelisted, this.blockNum), MINT - BURN);
                            });
                          });
                        });
                      });
                    });
                    describe("frozen", () => {
                      describe("non-functional", () => {
                        it("revert system burnFor frozen", async () => {
                          await expectRevert(this.token.burnFor(frozen, BURN, { from: system }), "Operatorable: caller does not have the operator role");
                        });
                      });
                      describe("functional", () => {
                        describe("from operator", () => {
                          beforeEach(async () => {
                            await this.token.burnFor(frozen, BURN, { from: operator });
                            this.blockNum = await web3.eth.getBlockNumber();
                          });
                          describe("normal values updated", () => {
                            it("balance updated", async () => {
                              assert.equal(await this.token.balanceOf(frozen), MINT - BURN);
                            });
                            it("total supply updated", async () => {
                              assert.equal(await this.token.totalSupply(), MINT + MINT - BURN);
                            });
                          });
                          describe("snapshot values updated", () => {
                            it("total supply updated", async () => {
                              assert.equal(await this.token.totalSupplyAt(this.blockNum), MINT + MINT - BURN);
                            });
                            it("snapshot balance updated", async () => {
                              assert.equal(await this.token.balanceOfAt(frozen, this.blockNum), MINT - BURN);
                            });
                          });
                        });
                      });
                    });
                    describe("paused", () => {
                      beforeEach(async () => {
                        await this.token.pause({ from: operator });
                      });
                      describe("non-functional", () => {
                        describe("revert operator burnFor", () => {
                          beforeEach(async () => {
                            await expectRevert(this.token.burnFor(frozen, BURN, { from: operator }), "Pausable: paused.");
                          });
                        });
                      });
                    });
                  }); // end of non-batch
                  describe("batch", () => {
                    describe("whitelist", () => {
                      beforeEach(async () => {
                        await this.whitelist.batchToggleWhitelist(TWO_ADDRESSES, true, { from: operator });
                      });
                      describe("minted", () => {
                        beforeEach(async () => {
                          await this.token.batchMint(TWO_ADDRESSES, [MINT, MINT], { from: operator });
                        });
                        describe("non-functional", () => {
                          it("revert address count and value count not equal", async () => {
                            await expectRevert(
                              this.token.batchBurnFor(TWO_ADDRESSES, [BURN], { from: operator }),
                              "SygnumToken: values and recipients are not equal."
                            );
                          });
                          it("revert burnFor over 256 addresses", async () => {
                            await expectRevert(
                              this.token.batchBurnFor(THREE_HUNDRED_ADDRESS, THREE_HUNDRED_NUMBERS, { from: operator }),
                              "SygnumToken: batch count is greater than BATCH_LIMIT"
                            );
                          });
                        });
                        describe("functional", () => {
                          describe("batch burnFor 2 addresses", () => {
                            beforeEach(async () => {
                              await this.token.batchBurnFor(TWO_ADDRESSES, [BURN, BURN], { from: operator });
                              this.blockNum = await web3.eth.getBlockNumber();
                            });
                            describe("normal values updated", () => {
                              it("first address balance updated", async () => {
                                assert.equal(await this.token.balanceOf(TWO_ADDRESSES[0]), MINT - BURN);
                              });
                              it("second address balance updated", async () => {
                                assert.equal(await this.token.balanceOf(TWO_ADDRESSES[1]), MINT - BURN);
                              });
                            });
                            describe("snapshot values updated", () => {
                              it("total supply updated", async () => {
                                assert.equal(await this.token.totalSupplyAt(this.blockNum), MINT * 4 - BURN * 2);
                              });
                              it("first address snapshot balance updated", async () => {
                                assert.equal(await this.token.balanceOfAt(TWO_ADDRESSES[0], this.blockNum), MINT - BURN);
                              });
                              it("second address snapshot balance updated", async () => {
                                assert.equal(await this.token.balanceOfAt(TWO_ADDRESSES[1], this.blockNum), MINT - BURN);
                              });
                            });
                          });
                        });
                      });
                    });
                  }); // end of batch
                }); // End of burnFor
                describe("burn", () => {
                  describe("non-functional", () => {
                    it("revert for over burn balance", async () => {
                      await expectRevert(this.token.burn(this.overflow, { from: whitelisted }), "ERC20: burn amount exceeds balance");
                    });
                    it("revert for notWhitelisted", async () => {
                      await expectRevert(this.token.burn(BURN, { from: notWhitelisted }), "Whitelistable: account is not whitelisted");
                    });
                    it("revert for frozen whitelisted ", async () => {
                      await expectRevert(this.token.burn(BURN, { from: frozen }), "SygnumToken: Account must not be frozen");
                    });
                    describe("paused", () => {
                      beforeEach(async () => {
                        await this.token.pause({ from: operator });
                      });
                      it("revert when paused", async () => {
                        await expectRevert(this.token.burn(BURN, { from: whitelisted }), "Pausable: paused");
                      });
                    });
                    describe("functional", () => {
                      describe("burn from whitelisted", () => {
                        beforeEach(async () => {
                          await this.token.burn(BURN, { from: whitelisted });
                          this.blockNum = await web3.eth.getBlockNumber();
                        });
                        describe("normal values updated", () => {
                          it("balance updated", async () => {
                            assert.equal(await this.token.balanceOf(whitelisted), MINT - BURN);
                          });
                        });
                        describe("snapshot values updated", () => {
                          it("snapshot balance updated", async () => {
                            assert.equal(await this.token.balanceOfAt(whitelisted, this.blockNum), MINT - BURN);
                          });
                        });
                      });
                    });
                  });
                }); // End of burn
              }); // End of burnable
              context("confiscate", () => {
                beforeEach(async () => {
                  await this.token.batchMint([whitelisted, whitelisted1, frozen, frozen1], [MINT, MINT, MINT, MINT], { from: operator });
                });
                describe("unwhitelisted", async () => {
                  describe("non-batch", async () => {
                    describe("non-functional", async () => {
                      it("revert confiscate from nonwhitelisted address to whitelisted", async () => {
                        await expectRevert(
                          this.token.confiscate(notWhitelisted, whitelisted, this.CONFISCATE, { from: operator }),
                          "Whitelistable: account is not whitelisted"
                        );
                      });
                      it("revert confiscate from whitelisted address to nonwhitelisted", async () => {
                        await expectRevert(
                          this.token.confiscate(whitelisted, notWhitelisted, this.CONFISCATE, { from: operator }),
                          "Whitelistable: account is not whitelisted"
                        );
                      });
                      it("revert confiscate from non-operator", async () => {
                        await expectRevert(
                          this.token.confiscate(whitelisted, whitelisted2, this.CONFISCATE, { from: admin }),
                          "Operatorable: caller does not have the operator role"
                        );
                      });
                      it("revert confiscate not enough balance", async () => {
                        await expectRevert(
                          this.token.confiscate(whitelisted2, whitelisted, this.CONFISCATE, { from: operator }),
                          "ERC20: transfer amount exceeds balance"
                        );
                      });
                      describe("when paused", async () => {
                        beforeEach(async () => {
                          await this.token.pause({ from: operator });
                        });
                        it("revert confiscate when paused", async () => {
                          await expectRevert(this.token.confiscate(whitelisted, whitelisted2, this.CONFISCATE, { from: operator }), "Pausable: paused");
                        });
                      });
                    });
                    describe("functional", async () => {
                      describe("confiscate from operator", () => {
                        beforeEach(async () => {
                          await this.token.confiscate(whitelisted, whitelisted2, this.CONFISCATE, { from: operator });
                          this.blockNum = await web3.eth.getBlockNumber();
                        });
                        describe("normal values updated", () => {
                          it("balance updated", async () => {
                            assert.equal(await this.token.balanceOf(whitelisted2), this.CONFISCATE);
                          });
                        });
                        describe("snapshot values updated", () => {
                          it("snapshot balance updated", async () => {
                            assert.equal(await this.token.balanceOfAt(whitelisted2, this.blockNum), this.CONFISCATE);
                          });
                        });
                      });
                    });
                  });
                  describe("non-batch", async () => {
                    describe("non-functional", async () => {
                      it("revert confiscatees and values not equal", async () => {
                        await expectRevert(
                          this.token.batchConfiscate(TWO_ADDRESSES, TWO_ADDRESSES, [MINT], { from: operator }),
                          "SygnumToken: confiscatees, recipients and values are not equal."
                        );
                      });
                      it("revert receivers and values not equal", async () => {
                        await expectRevert(
                          this.token.batchConfiscate(TWO_ADDRESSES, [TWO_ADDRESSES[0]], [MINT, MINT], { from: operator }),
                          "SygnumToken: confiscatees, recipients and values are not equal."
                        );
                      });
                      it("revert confiscate to over 256 addresses", async () => {
                        await expectRevert(
                          this.token.batchConfiscate(THREE_HUNDRED_ADDRESS, THREE_HUNDRED_ADDRESS, THREE_HUNDRED_NUMBERS, { from: operator }),
                          "SygnumToken: batch count is greater than BATCH_LIMIT"
                        );
                      });
                    });
                    describe("functional", () => {
                      describe("confiscate batch 2 addresses", () => {
                        beforeEach(async () => {
                          await this.whitelist.batchToggleWhitelist(TWO_ADDRESSES, true, { from: operator });
                        });
                        describe("when whitelisted", () => {
                          beforeEach(async () => {
                            await this.token.batchConfiscate([whitelisted, whitelisted1], TWO_ADDRESSES, [this.CONFISCATE, this.CONFISCATE], {
                              from: operator,
                            });
                            this.blockNum = await web3.eth.getBlockNumber();
                          });
                          describe("normal values updated", () => {
                            it("first address balance updated", async () => {
                              assert.equal(await this.token.balanceOf(whitelisted), MINT - this.CONFISCATE);
                            });
                            it("second address balance updated", async () => {
                              assert.equal(await this.token.balanceOf(whitelisted1), MINT - this.CONFISCATE);
                            });
                          });
                          describe("snapshot values updated", () => {
                            it("first snapshot balance updated", async () => {
                              assert.equal(await this.token.balanceOfAt(whitelisted, this.blockNum), MINT - this.CONFISCATE);
                            });
                            it("second snapshot balance updated", async () => {
                              assert.equal(await this.token.balanceOfAt(whitelisted1, this.blockNum), MINT - this.CONFISCATE);
                            });
                          });
                        });
                      });
                    });
                  });
                });
              });
              context("transfer", () => {
                beforeEach(async () => {
                  await this.token.batchMint([whitelisted, whitelisted1, frozen, frozen1], [MINT, MINT, MINT, MINT], { from: operator });
                });
                describe("unwhitelisted", async () => {
                  describe("non-functional", async () => {
                    it("revert whitelisted transfer to notWhitelisted", async () => {
                      await expectRevert(this.token.transfer(notWhitelisted, TRANSFER, { from: whitelisted }), "Whitelistable: account is not whitelisted");
                    });
                  });
                });
                describe("whitelisted", async () => {
                  describe("non-functional", async () => {
                    it("revert transfer to empty address", async () => {
                      await expectRevert(this.token.transfer(ZERO_ADDRESS, TRANSFER, { from: whitelisted }), "Whitelistable: account is not whitelisted");
                    });
                    it("revert transfer more than balance", async () => {
                      await expectRevert(this.token.transfer(whitelisted1, MINT + TRANSFER, { from: whitelisted }), "ERC20: transfer amount exceeds balance");
                    });
                  });
                  describe("functional", async () => {
                    describe("whitelist transfer to whitelist", () => {
                      beforeEach(async () => {
                        await this.token.transfer(whitelisted1, TRANSFER, { from: whitelisted });
                        this.blockNum = await web3.eth.getBlockNumber();
                      });
                      describe("normal values updated", () => {
                        it("sender balance updated", async () => {
                          assert.equal(await this.token.balanceOf(whitelisted), MINT - TRANSFER);
                        });
                        it("receiver balance updated", async () => {
                          assert.equal(await this.token.balanceOf(whitelisted1), MINT + TRANSFER);
                        });
                      });
                      describe("snapshot values updated", () => {
                        it("sender snapshot balance updated", async () => {
                          assert.equal(await this.token.balanceOfAt(whitelisted, this.blockNum), MINT - TRANSFER);
                        });
                        it("receiver snapshot balance updated", async () => {
                          assert.equal(await this.token.balanceOfAt(whitelisted1, this.blockNum), MINT + TRANSFER);
                        });
                      });
                      describe("and transfer back", () => {
                        beforeEach(async () => {
                          await this.token.transfer(whitelisted, TRANSFER, { from: whitelisted1 });
                        });
                        it("sender balance updated", async () => {
                          assert.equal(await this.token.balanceOf(whitelisted), MINT);
                        });
                        it("receiver balance updated", async () => {
                          assert.equal(await this.token.balanceOf(whitelisted1), MINT);
                        });
                      });
                    });
                  });
                });
                describe("frozen", async () => {
                  describe("non-functional", () => {
                    it("revert whitelist transfer to frozen", async () => {
                      await expectRevert(this.token.transfer(frozen, TRANSFER, { from: whitelisted }), "Freezable: account is frozen");
                    });
                    it("revert frozen transfer to whitelisted", async () => {
                      await expectRevert(this.token.transfer(whitelisted, TRANSFER, { from: frozen }), "Freezable: account is frozen");
                    });
                    it("revert frozen transfer to frozen", async () => {
                      await expectRevert(this.token.transfer(frozen1, TRANSFER, { from: frozen }), "Freezable: account is frozen");
                    });
                  });
                });
                describe("pause", async () => {
                  beforeEach(async () => {
                    await this.token.pause({ from: operator });
                  });
                  it("revert all transfers", async () => {
                    await expectRevert(this.token.transfer(whitelisted1, TRANSFER, { from: whitelisted }), "Pausable: paused");
                  });
                });
              }); // End of transfer
              context("approval/allowances/transferFrom/burnFrom", () => {
                beforeEach(async () => {
                  await this.token.batchMint([whitelisted, frozen, frozen1], [MINT, MINT, MINT], { from: operator });
                });
                describe("approval", async () => {
                  describe("non-functional", () => {
                    describe("non-whitelisted", async () => {
                      it("revert notWhitelisted approval to whitelisted", async () => {
                        await expectRevert(this.token.approve(whitelisted, APPROVAL, { from: notWhitelisted }), "Whitelistable: account is not whitelisted");
                      });
                      it("revert whitelisted approval to notWhitelisted", async () => {
                        await expectRevert(this.token.approve(notWhitelisted, APPROVAL, { from: whitelisted }), "Whitelistable: account is not whitelisted");
                      });
                      it("revert whitelisted approval to notWhitelisted", async () => {
                        await expectRevert(this.token.approve(notWhitelisted, APPROVAL, { from: whitelisted }), "Whitelistable: account is not whitelisted");
                      });
                    });
                    describe("frozen", async () => {
                      it("revert whitelisted approve frozen", async () => {
                        await expectRevert(this.token.approve(frozen, APPROVAL, { from: whitelisted }), "Freezable: account is frozen");
                      });
                      it("revert frozen approve whitelisted", async () => {
                        await expectRevert(this.token.approve(whitelisted, APPROVAL, { from: frozen }), "Freezable: account is frozen");
                      });
                      it("revert frozen approve frozen", async () => {
                        await expectRevert(this.token.approve(frozen1, APPROVAL, { from: frozen }), "Freezable: account is frozen");
                      });
                    });
                    it("revert empty address spender", async () => {
                      await expectRevert(this.token.approve(ZERO_ADDRESS, APPROVAL, { from: whitelisted }), "Whitelistable: account is not whitelisted");
                    });
                    describe("paused approval", () => {
                      beforeEach(async () => {
                        await this.token.pause({ from: operator });
                      });
                      it("revert approve when paused", async () => {
                        await expectRevert(this.token.approve(whitelisted2, APPROVAL, { from: whitelisted }), "Pausable: paused");
                      });
                    });
                  });
                  describe("functional", () => {
                    describe("whitelist to whitelist", () => {
                      beforeEach(async () => {
                        await this.token.approve(whitelisted, APPROVAL, { from: whitelisted1 });
                      });
                      it("allowance updated", async () => {
                        assert.equal(await this.token.allowance(whitelisted1, whitelisted), APPROVAL);
                      });
                    });
                  });
                  describe("increaseAllowance", () => {
                    beforeEach(async () => {
                      await this.token.approve(whitelisted, APPROVAL, { from: whitelisted1 });
                    });
                    describe("non-functional", () => {
                      describe("non-whitelisted", async () => {
                        it("revert notWhitelisted increase allowance to whitelisted", async () => {
                          await expectRevert(
                            this.token.increaseAllowance(whitelisted, APPROVAL, { from: notWhitelisted }),
                            "Whitelistable: account is not whitelisted"
                          );
                        });
                        it("revert whitelisted increase allowance to notWhitelisted", async () => {
                          await expectRevert(
                            this.token.increaseAllowance(notWhitelisted, APPROVAL, { from: whitelisted }),
                            "Whitelistable: account is not whitelisted"
                          );
                        });
                      });
                      describe("frozen", async () => {
                        it("revert whitelist increase frozen", async () => {
                          await expectRevert(this.token.increaseAllowance(frozen, APPROVAL, { from: whitelisted }), "Freezable: account is frozen");
                        });
                        it("revert frozen increase whitelisted", async () => {
                          await expectRevert(this.token.increaseAllowance(whitelisted, APPROVAL, { from: frozen }), "Freezable: account is frozen");
                        });
                        it("revert frozen increase frozen", async () => {
                          await expectRevert(this.token.increaseAllowance(frozen1, APPROVAL, { from: frozen }), "Freezable: account is frozen");
                        });
                      });
                      it("revert empty address", async () => {
                        await expectRevert(
                          this.token.increaseAllowance(ZERO_ADDRESS, APPROVAL, { from: whitelisted1 }),
                          "Whitelistable: account is not whitelisted"
                        );
                      });
                      describe("paused increaseAllowance", () => {
                        beforeEach(async () => {
                          await this.token.pause({ from: operator });
                        });
                        it("revert increaseAllowance when paused", async () => {
                          await expectRevert(this.token.increaseAllowance(whitelisted, APPROVAL, { from: whitelisted1 }), "Pausable: paused");
                        });
                      });
                    });
                    describe("functional", () => {
                      describe("increase allowance", () => {
                        beforeEach(async () => {
                          await this.token.increaseAllowance(whitelisted, APPROVAL, { from: whitelisted1 });
                        });
                        it("allowance updated", async () => {
                          assert.equal(await this.token.allowance(whitelisted1, whitelisted), APPROVAL + APPROVAL);
                        });
                      });
                    });
                  }); // end of increaseAllowance
                  describe("decreaseAllowance", () => {
                    beforeEach(async () => {
                      await this.token.approve(whitelisted, APPROVAL, { from: whitelisted1 });
                    });
                    describe("non-functional", () => {
                      describe("non-whitelisted", async () => {
                        it("revert notWhitelisted decrease allowance to whitelisted", async () => {
                          await expectRevert(
                            this.token.decreaseAllowance(whitelisted, APPROVAL, { from: notWhitelisted }),
                            "Whitelistable: account is not whitelisted"
                          );
                        });
                        it("revert whitelisted decrease allowance to notWhitelisted", async () => {
                          await expectRevert(
                            this.token.decreaseAllowance(notWhitelisted, APPROVAL, { from: whitelisted }),
                            "Whitelistable: account is not whitelisted"
                          );
                        });
                      });
                      describe("frozen", async () => {
                        it("revert whitelist decrease frozen", async () => {
                          await expectRevert(this.token.decreaseAllowance(frozen, APPROVAL, { from: whitelisted }), "Freezable: account is frozen");
                        });
                        it("revert frozen decrease whitelisted", async () => {
                          await expectRevert(this.token.decreaseAllowance(whitelisted, APPROVAL, { from: frozen }), "Freezable: account is frozen");
                        });
                        it("revert frozen decrease frozen", async () => {
                          await expectRevert(this.token.decreaseAllowance(frozen1, APPROVAL, { from: frozen }), "Freezable: account is frozen");
                        });
                      });
                      it("revert empty address", async () => {
                        await expectRevert(
                          this.token.decreaseAllowance(ZERO_ADDRESS, APPROVAL, { from: whitelisted1 }),
                          "Whitelistable: account is not whitelisted"
                        );
                      });
                      it("revert overflow transferFrom", async () => {
                        await expectRevert(
                          this.token.transferFrom(whitelisted1, whitelisted2, this.overflow, { from: whitelisted }),
                          "ERC20: transfer amount exceeds balance"
                        );
                      });
                      describe("paused decreaseAllowance", () => {
                        beforeEach(async () => {
                          await this.token.pause({ from: operator });
                        });
                        it("revert decreaseAllowance when paused", async () => {
                          await expectRevert(this.token.decreaseAllowance(whitelisted1, APPROVAL, { from: whitelisted }), "Pausable: paused");
                        });
                      });
                    });
                    describe("functional", () => {
                      describe("decrease allowance", () => {
                        beforeEach(async () => {
                          await this.token.decreaseAllowance(whitelisted, APPROVAL, { from: whitelisted1 });
                        });
                        it("allowance updated", async () => {
                          assert.equal(await this.token.allowance(whitelisted1, whitelisted), APPROVAL - APPROVAL);
                        });
                      });
                    });
                  }); // end of decreaseAllowance
                  describe("transferFrom/burnFrom", () => {
                    describe("mint balance", () => {
                      beforeEach(async () => {
                        await this.token.mint(whitelisted1, MINT, { from: operator });
                      });
                      describe("approve balance", () => {
                        beforeEach(async () => {
                          await this.token.approve(whitelisted, APPROVAL, { from: whitelisted1 });
                        });
                        describe("transferFrom", () => {
                          describe("non-functional", () => {
                            describe("frozen", async () => {
                              it("revert whitelisted transferFrom to frozen", async () => {
                                await expectRevert(
                                  this.token.transferFrom(whitelisted1, frozen, APPROVAL, { from: whitelisted }),
                                  "Freezable: account is frozen"
                                );
                              });
                              describe("when frozen", () => {
                                beforeEach(async () => {
                                  await this.token.toggleFreeze(whitelisted, true, { from: operator });
                                });
                                it("revert frozen transferFrom to whitelisted", async () => {
                                  await expectRevert(
                                    this.token.transferFrom(whitelisted1, whitelisted2, APPROVAL, { from: whitelisted }),
                                    "Freezable: account is frozen"
                                  );
                                });
                              });
                            });
                            describe("non whitelisted", async () => {
                              it("revert nonwhitelisted transferFrom to whitelisted", async () => {
                                await expectRevert(
                                  this.token.transferFrom(notWhitelisted, whitelisted2, APPROVAL, { from: whitelisted }),
                                  "Whitelistable: account is not whitelisted"
                                );
                              });
                              it("revert nonwhitelisted transferFrom to whitelisted", async () => {
                                await expectRevert(
                                  this.token.transferFrom(whitelisted1, whitelisted, APPROVAL, { from: notWhitelisted }),
                                  "Whitelistable: account is not whitelisted"
                                );
                              });
                              it("revert nonwhitelisted transferFrom to whitelisted", async () => {
                                await expectRevert(
                                  this.token.transferFrom(whitelisted, whitelisted1, APPROVAL, { from: notWhitelisted }),
                                  "Whitelistable: account is not whitelisted"
                                );
                              });
                            });
                            describe("empty", async () => {
                              it("revert empty address sender", async () => {
                                await expectRevert(
                                  this.token.transferFrom(ZERO_ADDRESS, whitelisted2, APPROVAL, { from: whitelisted }),
                                  "Whitelistable: account is not whitelisted"
                                );
                              });
                              it("revert empty address recipient", async () => {
                                await expectRevert(
                                  this.token.transferFrom(whitelisted1, ZERO_ADDRESS, APPROVAL, { from: whitelisted }),
                                  "Whitelistable: account is not whitelisted"
                                );
                              });
                            });
                            it("revert overflow transferFrom", async () => {
                              await expectRevert(
                                this.token.transferFrom(whitelisted1, whitelisted2, this.overflow, { from: whitelisted }),
                                "ERC20: transfer amount exceeds balance"
                              );
                            });
                            describe("paused transferFrom", async () => {
                              beforeEach(async () => {
                                await this.token.pause({ from: operator });
                              });
                              it("revert all when paused", async () => {
                                await expectRevert(this.token.transferFrom(whitelisted1, whitelisted2, APPROVAL, { from: whitelisted }), "Pausable: paused");
                              });
                            });
                          });
                          describe("functional", () => {
                            describe("whitelisted transferFrom to whitelisted", () => {
                              beforeEach(async () => {
                                await this.token.transferFrom(whitelisted1, whitelisted2, APPROVAL, { from: whitelisted });
                                this.blockNum = await web3.eth.getBlockNumber();
                              });
                              describe("normal values updated", () => {
                                it("balance updated", async () => {
                                  assert.equal(await this.token.balanceOf(whitelisted2), APPROVAL);
                                });
                              });
                              describe("snapshot values updated", () => {
                                it("snapshot balance updated", async () => {
                                  assert.equal(await this.token.balanceOfAt(whitelisted2, this.blockNum), APPROVAL);
                                });
                              });
                            });
                          });
                        }); // end of transferFrom
                        describe("burnFrom", () => {
                          describe("non-functional", () => {
                            it("revert nonwhitelisted burnFrom to whitelisted", async () => {
                              await expectRevert(this.token.burnFrom(whitelisted, BURN, { from: notWhitelisted }), "Whitelistable: account is not whitelisted");
                            });
                            it("revert whitelisted burnFrom to frozen", async () => {
                              await expectRevert(this.token.burnFrom(frozen, BURN, { from: whitelisted }), "Freezable: account is frozen");
                            });
                            it("revert frozen transferFrom to whitelisted", async () => {
                              await expectRevert(this.token.burnFrom(whitelisted, APPROVAL, { from: frozen }), "Freezable: account is frozen");
                            });
                            it("revert overflow burnFrom", async () => {
                              await expectRevert(this.token.burnFrom(whitelisted1, this.overflow, { from: whitelisted }), "ERC20: burn amount exceeds balance");
                            });
                            it("revert empty address ", async () => {
                              await expectRevert(
                                this.token.burnFrom(ZERO_ADDRESS, this.overflow, { from: whitelisted }),
                                "Whitelistable: account is not whitelisted"
                              );
                            });
                            describe("paused burnFrom", async () => {
                              beforeEach(async () => {
                                await this.token.pause({ from: operator });
                              });
                              it("revert all when paused", async () => {
                                await expectRevert(this.token.burnFrom(whitelisted1, BURN, { from: whitelisted }), "Pausable: paused");
                              });
                            });
                          });
                          describe("functional", () => {
                            describe("whitelisted burnFrom to whitelisted", () => {
                              beforeEach(async () => {
                                await this.token.burnFrom(whitelisted1, BURN, { from: whitelisted });
                                this.blockNum = await web3.eth.getBlockNumber();
                              });
                              describe("normal values updated", () => {
                                it("allowance updated", async () => {
                                  assert.equal(await this.token.allowance(whitelisted1, whitelisted), APPROVAL - BURN);
                                });
                                it("balance updated", async () => {
                                  assert.equal(await this.token.balanceOf(whitelisted1), MINT - BURN);
                                });
                              });
                              describe("snapshot values updated", () => {
                                it("snapshot balance updated", async () => {
                                  assert.equal(await this.token.balanceOfAt(whitelisted1, this.blockNum), MINT - BURN);
                                });
                              });
                            });
                          });
                        }); // end of burnFrom
                      });
                    });
                  });
                }); // end of approval
              }); // approval/allowances/transferFrom
            });
          });
        });
      });
    });
  });
});
