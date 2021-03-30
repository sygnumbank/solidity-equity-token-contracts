const { expect } = require("chai");
const SolidityBaseContracts = require("@sygnum/solidity-base-contracts");
const { BN, expectRevert, getTxEvents, SygnumToken, Dividends, ONE_ETHER, TWO_ETHER, ZERO_ADDRESS, time, CATEGORY } = require("../common");
const cnf = require("../../config/sygnum-token.json");

const { BaseOperators, BlockerOperators, TraderOperators, Whitelist } = SolidityBaseContracts.load(SygnumToken.currentProvider);

contract("dividends", ([admin, operator, system, issuer, wallet, attacker, investor1, investor2, investor3]) => {
  beforeEach(async () => {
    this.baseOperators = await BaseOperators.new(admin, { from: admin });
    this.traderOperators = await TraderOperators.new({ from: admin });
    this.blockerOperators = await BlockerOperators.new({ from: admin });

    this.whitelist = await Whitelist.new({ from: admin });

    this.sygnumToken = await SygnumToken.new({ from: admin });
    this.payoutToken = await SygnumToken.new({ from: admin });
    this.anotherPayoutToken = await SygnumToken.new({ from: admin });
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
            await this.sygnumToken.initializeContractsAndConstructor(
              cnf.name_1,
              cnf.symbol_1,
              cnf.decimals,
              CATEGORY,
              cnf.class_1,
              issuer,
              this.baseOperators.address,
              this.whitelist.address,
              this.traderOperators.address,
              this.blockerOperators.address,
              { from: admin }
            );
            await this.payoutToken.initializeContractsAndConstructor(
              cnf.name_2,
              cnf.symbol_2,
              cnf.decimals,
              CATEGORY,
              cnf.class_2,
              issuer,
              this.baseOperators.address,
              this.whitelist.address,
              this.traderOperators.address,
              this.blockerOperators.address,
              { from: admin }
            );
            await this.anotherPayoutToken.initializeContractsAndConstructor(
              cnf.name_3,
              cnf.symbol_3,
              cnf.decimals,
              CATEGORY,
              cnf.class_3,
              issuer,
              this.baseOperators.address,
              this.whitelist.address,
              this.traderOperators.address,
              this.blockerOperators.address,
              { from: admin }
            );
          });
          describe("role assignment", () => {
            describe("operator assignment", () => {
              beforeEach(async () => {
                await this.baseOperators.addOperator(operator, { from: admin });
              });
              it("operator assigned", async () => {
                assert.equal(await this.baseOperators.isOperator(operator), true);
              });
              describe("system assignment", () => {
                beforeEach(async () => {
                  await this.baseOperators.addSystem(system, { from: admin });
                });
                it("system assigned", async () => {
                  assert.equal(await this.baseOperators.isSystem(system), true);
                });
                context("dividend deployment", () => {
                  it("revert empty sygnum token address", async () => {
                    await expectRevert(Dividends.new(ZERO_ADDRESS, issuer, this.baseOperators.address), "invalid address");
                  });
                  it("revert empty issuer address", async () => {
                    await expectRevert(Dividends.new(this.sygnumToken.address, ZERO_ADDRESS, this.baseOperators.address), "invalid address");
                  });
                  it("revert empty baseOperators address", async () => {
                    await expectRevert(Dividends.new(this.sygnumToken.address, issuer, ZERO_ADDRESS), "invalid address");
                  });
                  describe("deployed", async () => {
                    beforeEach(async () => {
                      this.dividends = await Dividends.new(this.sygnumToken.address, issuer, this.baseOperators.address);
                    });
                    it("token set", async () => {
                      assert.equal(await this.dividends.sygToken(), this.sygnumToken.address, "token not set");
                    });
                    it("wallet set", async () => {
                      assert.equal(await this.dividends.wallet(), issuer, "wallet not set");
                    });
                    it("issuer set", async () => {
                      assert.equal(await this.dividends.issuer(), issuer, "issuer not set");
                    });
                    it("base operators set", async () => {
                      assert.equal(await this.dividends.getOperatorsContract(), this.baseOperators.address, "base operators not set");
                    });
                    describe("update wallet", () => {
                      it("revert from attacker", async () => {
                        await expectRevert(this.dividends.updateWallet(wallet, { from: attacker }), "sender is not issuer");
                      });
                      it("revert empty address", async () => {
                        await expectRevert(this.dividends.updateWallet(ZERO_ADDRESS, { from: issuer }), "invalid address");
                      });
                      describe("successful update", () => {
                        beforeEach(async () => {
                          await this.dividends.updateWallet(wallet, { from: issuer });
                        });
                        it("wallet updated", async () => {
                          assert.equal(await this.dividends.wallet(), wallet, "wallet not updated");
                        });
                      });
                    });
                    describe("whitelist accounts", () => {
                      beforeEach(async () => {
                        await this.whitelist.batchToggleWhitelist([this.dividends.address, issuer, investor1, investor2, investor3], true, { from: operator });
                      });
                      describe("mint sygnum tokens", () => {
                        beforeEach(async () => {
                          this.mint = 100;
                          await this.sygnumToken.batchMint([investor1, investor2, investor3], [this.mint, this.mint, this.mint], { from: system });
                        });
                        it("balance updated", async () => {
                          assert.equal(await this.sygnumToken.balanceOf(investor1), this.mint, "balance not updated");
                        });
                        describe("mint payout tokens", () => {
                          beforeEach(async () => {
                            await this.payoutToken.mint(issuer, this.mint, { from: system });
                            await this.anotherPayoutToken.mint(issuer, this.mint, { from: system });
                          });
                          it("payout one balance updated", async () => {
                            assert.equal(await this.payoutToken.balanceOf(issuer), this.mint, "balance not updated");
                          });
                          it("payout two balance updated", async () => {
                            assert.equal((await this.anotherPayoutToken.balanceOf(issuer)).toString(), this.mint, "balance not updated");
                          });
                          describe("deposit requirements", () => {
                            beforeEach(async () => {
                              this.timestamp = await time.latest();
                              this.blocknumber = (await web3.eth.getBlockNumber()) + 10;
                              this.exDate = this.timestamp;
                              this.recordDate = this.timestamp;
                              this.payoutDate = this.timestamp.add(time.duration.days(1));
                              this.amount = 30;
                            });
                            describe("erc20 deposit", () => {
                              it("revert when called by attacker", async () => {
                                await expectRevert(
                                  this.dividends.depositERC20Dividend(
                                    this.blocknumber,
                                    this.exDate,
                                    this.recordDate,
                                    this.payoutDate,
                                    this.amount,
                                    this.payoutToken.address,
                                    { from: attacker }
                                  ),
                                  "sender is not issuer"
                                );
                              });
                              describe("from issuer", () => {
                                it("revert empty payout token", async () => {
                                  await expectRevert(
                                    this.dividends.depositERC20Dividend(
                                      this.blocknumber,
                                      this.exDate,
                                      this.recordDate,
                                      this.payoutDate,
                                      this.amount,
                                      ZERO_ADDRESS,
                                      { from: issuer }
                                    ),
                                    "invalid address"
                                  );
                                });
                                it("revert amount == 0", async () => {
                                  await expectRevert(
                                    this.dividends.depositERC20Dividend(
                                      this.blocknumber,
                                      this.exDate,
                                      this.recordDate,
                                      this.payoutDate,
                                      0,
                                      this.payoutToken.address,
                                      { from: issuer }
                                    ),
                                    "dividend amount !> 0"
                                  );
                                });
                                it("revert payout date < current time", async () => {
                                  await expectRevert(
                                    this.dividends.depositERC20Dividend(
                                      this.blocknumber,
                                      this.exDate,
                                      this.recordDate,
                                      0,
                                      this.amount,
                                      this.payoutToken.address,
                                      { from: issuer }
                                    ),
                                    "payoutDate !> now"
                                  );
                                });
                                it("revert block number < current block number", async () => {
                                  await expectRevert(
                                    this.dividends.depositERC20Dividend(
                                      0,
                                      this.exDate,
                                      this.recordDate,
                                      this.payoutDate,
                                      this.amount,
                                      this.payoutToken.address,
                                      { from: issuer }
                                    ),
                                    "blockNum !> block.number"
                                  );
                                });
                                it("revert issuer not transferred funds", async () => {
                                  await expectRevert(
                                    this.dividends.depositERC20Dividend(
                                      this.blocknumber,
                                      this.exDate,
                                      this.recordDate,
                                      this.payoutDate,
                                      this.amount,
                                      this.payoutToken.address,
                                      { from: issuer }
                                    ),
                                    "issuer has not transferred amount"
                                  );
                                });
                                describe("transfer funds", () => {
                                  beforeEach(async () => {
                                    await this.payoutToken.transfer(this.dividends.address, this.amount, { from: issuer });
                                  });
                                  it("balance updated dividends", async () => {
                                    assert.equal(await this.payoutToken.balanceOf(this.dividends.address), this.amount, "balance not updated");
                                  });
                                  describe("successful erc20 deposit", () => {
                                    beforeEach(async () => {
                                      const tx = await this.dividends.depositERC20Dividend(
                                        this.blocknumber,
                                        this.exDate,
                                        this.recordDate,
                                        this.payoutDate,
                                        this.amount,
                                        this.payoutToken.address,
                                        { from: issuer }
                                      );
                                      this.dividendIndex = getTxEvents(tx, "DividendDeposited", this.dividends.abi)[0].args.dividendIndex.toString();
                                      this.storage = await this.dividends.getDividend(this.dividendIndex);
                                    });
                                    it("block number set", async () => {
                                      assert.equal(this.storage[0], this.blocknumber, "block number not updated");
                                    });
                                    it("exDividendDate", async () => {
                                      expect(this.storage[1]).to.be.bignumber.equal(this.exDate);
                                    });
                                    it("record date not set", async () => {
                                      expect(this.storage[2]).to.be.bignumber.equal(this.recordDate);
                                    });
                                    it("payout date set", async () => {
                                      assert.equal(this.storage[3].toString(), this.payoutDate.toString(), "payout date not updated");
                                    });
                                    it("amount set", async () => {
                                      assert.equal(this.storage[4], this.amount, "amount not updated");
                                    });
                                    it("current supply set", async () => {
                                      assert.equal(this.storage[5].toString(), this.mint * 3, "current supply not updated");
                                    });
                                    it("payout token set", async () => {
                                      assert.equal(this.storage[6], this.payoutToken.address, "payout token not updated");
                                    });
                                    it("ERC20 payout set", async () => {
                                      assert.equal(this.storage[7], true, "erc20 payout not updated");
                                    });
                                    it("revert recycle dividends, nothing to recycle", async () => {
                                      await expectRevert(this.dividends.recycleDividend(0, { from: issuer }), "too soon"); // TODO OR nothing to recycle
                                    });
                                    describe("collect dividends", () => {
                                      it("revert when too soon", async () => {
                                        await expectRevert(this.dividends.claimDividend(this.dividendIndex, { from: investor1 }), "too soon");
                                      });
                                      it("revert on invalid index", async () => {
                                        await expectRevert(this.dividends.claimDividend(this.dividendIndex + 1, { from: investor1 }), "invalid index");
                                      });
                                      describe("time travel", () => {
                                        beforeEach(async () => {
                                          await time.advanceBlockTo(this.blocknumber);
                                          await time.increaseTo(this.storage[3]);
                                        });
                                        it("revert on attacker", async () => {
                                          await expectRevert(this.dividends.claimDividend(this.dividendIndex, { from: attacker }), "no dividends owed");
                                        });
                                        describe("claim investor1", () => {
                                          beforeEach(async () => {
                                            this.balance = await this.payoutToken.balanceOf(investor1);
                                            const tx = await this.dividends.claimDividend(this.dividendIndex, { from: investor1 });
                                            this.claimedDividend = getTxEvents(tx, "DividendClaimed", this.dividends.abi)[0].args;
                                            this.storage = await this.dividends.getDividend(this.dividendIndex);
                                          });
                                          it("balance updated", async () => {
                                            const newBalance = await this.payoutToken.balanceOf(investor1);
                                            assert.equal(
                                              this.balance.add(this.claimedDividend.amount).toString(),
                                              newBalance.toString(),
                                              "dividends not payed out"
                                            );
                                          });
                                          it("remaining amount updated", async () => {
                                            assert.equal(
                                              this.storage[8].add(this.claimedDividend.amount).toString(),
                                              this.storage[4].toString(),
                                              "remaining amount not correct"
                                            );
                                          });
                                          it("balance lower or equal than liquidity", async () => {
                                            assert.equal(
                                              (await this.payoutToken.balanceOf(this.dividends.address)).toString(),
                                              this.storage[8].toString(),
                                              "funds not available"
                                            );
                                          });
                                          it("revert on second claim", async () => {
                                            await expectRevert(this.dividends.claimDividend(this.dividendIndex, { from: investor1 }), "already claimed");
                                          });
                                          it("revert on early recycle", async () => {
                                            await expectRevert(this.dividends.recycleDividend(this.dividendIndex, { from: issuer }), "too soon");
                                          });
                                          describe("fast forward 5 years", () => {
                                            beforeEach(async () => {
                                              await time.increaseTo(this.storage[3].add(new BN(5 * 366 * 24 * 60 * 60)));
                                            });
                                            it("revert on time lapse", async () => {
                                              await expectRevert(this.dividends.claimDividend(this.dividendIndex, { from: investor2 }), "time lapsed");
                                            });
                                            describe("recycling", () => {
                                              beforeEach(async () => {
                                                this.balance = await this.payoutToken.balanceOf(issuer);
                                                const tx = await this.dividends.recycleDividend(this.dividendIndex, { from: issuer });
                                                this.recycledDividend = getTxEvents(tx, "DividendRecycled", this.dividends.abi)[0].args;
                                              });
                                              it("balance updated", async () => {
                                                const newBalance = await this.payoutToken.balanceOf(issuer);
                                                assert.equal(
                                                  this.balance.add(this.recycledDividend.amount).toString(),
                                                  newBalance.toString(),
                                                  "remaining funds not recycled"
                                                );
                                              });
                                              it("remaining amount equals recycled amount", async () => {
                                                assert.equal(this.storage[8].toString(), this.recycledDividend.amount.toString(), "funds have disappeared");
                                              });
                                              it("remaining amount equals recycled amount", async () => {
                                                assert.equal(
                                                  (await this.payoutToken.balanceOf(this.dividends.address)).toString(),
                                                  0,
                                                  "funds still available in contract"
                                                );
                                              });
                                              it("revert on recycle twice", async () => {
                                                await expectRevert(this.dividends.recycleDividend(this.dividendIndex, { from: issuer }), "already recycled");
                                              });
                                              it("revert on already recycled", async () => {
                                                await expectRevert(this.dividends.claimDividend(this.dividendIndex, { from: investor2 }), "already recycled");
                                              });
                                            });
                                          });
                                        });
                                        describe("claim all", () => {
                                          beforeEach(async () => {
                                            this.balance = await this.payoutToken.balanceOf(this.dividends.address);
                                            const tx1 = await this.dividends.claimDividend(this.dividendIndex, { from: investor1 });
                                            const tx2 = await this.dividends.claimDividend(this.dividendIndex, { from: investor2 });
                                            const tx3 = await this.dividends.claimDividend(this.dividendIndex, { from: investor3 });
                                            this.storage = await this.dividends.getDividend(this.dividendIndex);
                                            this.claimedDividend1 = getTxEvents(tx1, "DividendClaimed", this.dividends.abi)[0].args;
                                            this.claimedDividend2 = getTxEvents(tx2, "DividendClaimed", this.dividends.abi)[0].args;
                                            this.claimedDividend3 = getTxEvents(tx3, "DividendClaimed", this.dividends.abi)[0].args;
                                          });
                                          it("claim amount should be fair", async () => {
                                            const balance = await this.sygnumToken.balanceOfAt(investor3, this.blocknumber);
                                            assert.equal(
                                              this.claimedDividend3.amount.toString(),
                                              balance.mul(this.storage[4]).div(this.storage[5]).toString(),
                                              "dividends is not fair"
                                            );
                                          });
                                          it("remaining amount should be 0 or a fraction due to rounding", async () => {
                                            assert.equal(this.storage[8].lt(new BN(2)), true, "dividends were not fully claimed");
                                          });
                                          it("available balance should be consistent", async () => {
                                            const balance = await this.dividends.balances(this.payoutToken.address);
                                            assert.equal(balance.toString(), this.storage[8].toString(), "remaining dividends are not consistent");
                                          });
                                          describe("fast forward 5 years", () => {
                                            beforeEach(async () => {
                                              await time.increaseTo(this.storage[3].add(new BN(5 * 366 * 24 * 60 * 60)));
                                            });
                                            describe("recycle", () => {
                                              beforeEach(async () => {
                                                this.balance = await this.payoutToken.balanceOf(issuer);
                                                this.rounding = this.storage[8];
                                                if (!this.rounding.eq(new BN("0"))) {
                                                  const tx = await this.dividends.recycleDividend(this.dividendIndex, { from: issuer });
                                                  this.recycledDividend = getTxEvents(tx, "DividendRecycled", this.dividends.abi)[0].args;
                                                }
                                                this.storage = await this.dividends.getDividend(this.dividendIndex);
                                              });
                                              it("remaining amount should be recycled or revert on recycle", async () => {
                                                if (!this.rounding.eq(new BN("0"))) {
                                                  assert.equal(this.storage[9], true, "dividends were not recycled");
                                                } else {
                                                  await expectRevert(
                                                    this.dividends.recycleDividend(this.dividendIndex, { from: issuer }),
                                                    "nothing to recycle"
                                                  );
                                                }
                                              });
                                              it("remaining amount for dividend should be ", async () => {
                                                assert.equal(this.storage[8].toString(), "0", "remaining dividends are not 0");
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
                            describe("ether deposit", () => {
                              it("revert when called by attacker", async () => {
                                await expectRevert(
                                  this.dividends.depositEtherDividend(this.blocknumber, this.exDate, this.recordDate, this.payoutDate, ONE_ETHER, {
                                    value: ONE_ETHER,
                                    from: attacker,
                                  }),
                                  "sender is not issuer"
                                );
                              });
                              it("revert when amount is equal to zero", async () => {
                                await expectRevert(
                                  this.dividends.depositEtherDividend(this.blocknumber, this.exDate, this.recordDate, this.payoutDate, 0, {
                                    value: 0,
                                    from: issuer,
                                  }),
                                  "amount must be greater than 0"
                                );
                              });
                              it("revert when amount is not equal to value", async () => {
                                await expectRevert(
                                  this.dividends.depositEtherDividend(this.blocknumber, this.exDate, this.recordDate, this.payoutDate, ONE_ETHER, {
                                    value: TWO_ETHER,
                                    from: issuer,
                                  }),
                                  "ether sent != _amount"
                                );
                              });
                              it("revert payout date < current time", async () => {
                                await expectRevert(
                                  this.dividends.depositEtherDividend(this.blocknumber, this.exDate, this.recordDate, 0, ONE_ETHER, {
                                    value: ONE_ETHER,
                                    from: issuer,
                                  }),
                                  "payoutDate !> now"
                                );
                              });
                              it("revert blocknumber < current block number", async () => {
                                await expectRevert(
                                  this.dividends.depositEtherDividend(0, this.exDate, this.recordDate, this.payoutDate, ONE_ETHER, {
                                    value: ONE_ETHER,
                                    from: issuer,
                                  }),
                                  "blockNum !> block.number"
                                );
                              });
                              describe("successful ether deposit", async () => {
                                beforeEach(async () => {
                                  const tx = await this.dividends.depositEtherDividend(
                                    this.blocknumber,
                                    this.exDate,
                                    this.recordDate,
                                    this.payoutDate,
                                    ONE_ETHER,
                                    { value: ONE_ETHER, from: issuer }
                                  );
                                  this.dividendIndex = getTxEvents(tx, "DividendDeposited", this.dividends.abi)[0].args.dividendIndex.toString();
                                  this.storage = await this.dividends.getDividend(this.dividendIndex);
                                });
                                it("amount set", async () => {
                                  assert.equal(this.storage[4], ONE_ETHER, "amount not updated");
                                });
                                it("payout token not set", async () => {
                                  assert.equal(this.storage[6], ZERO_ADDRESS, "payout token not updated");
                                });
                                it("ERC20 payout not set", async () => {
                                  assert.equal(this.storage[7], false, "erc20 payout not updated");
                                });
                                it("balance updated", async () => {
                                  assert.equal(await web3.eth.getBalance(this.dividends.address), ONE_ETHER, "balance not");
                                });
                                describe("collect dividends", () => {
                                  it("revert when too soon", async () => {
                                    await expectRevert(this.dividends.claimDividend(this.dividendIndex, { from: investor1 }), "too soon");
                                  });
                                  describe("time travel", () => {
                                    beforeEach(async () => {
                                      await time.advanceBlockTo(this.blocknumber);
                                      await time.increaseTo(this.storage[3]);
                                    });
                                    it("revert on attacker", async () => {
                                      await expectRevert(this.dividends.claimDividend(this.dividendIndex, { from: attacker }), "no dividends owed");
                                    });
                                    describe("claim investor1", () => {
                                      beforeEach(async () => {
                                        this.balance = new BN(await web3.eth.getBalance(investor1));
                                        const tx = await this.dividends.claimDividend(this.dividendIndex, { from: investor1 });
                                        const gasPrice = new BN((await web3.eth.getTransaction(tx.tx)).gasPrice);
                                        this.fees = gasPrice.mul(new BN(tx.receipt.gasUsed));
                                        this.claimedDividend = getTxEvents(tx, "DividendClaimed", this.dividends.abi)[0].args;
                                        this.storage = await this.dividends.getDividend(this.dividendIndex);
                                      });
                                      it("balance updated", async () => {
                                        const newBalance = new BN(await web3.eth.getBalance(investor1));
                                        assert.equal(
                                          this.balance.sub(this.fees).add(this.claimedDividend.amount).toString(),
                                          newBalance.toString(),
                                          "dividends not payed out"
                                        );
                                      });
                                      it("remaining amount updated", async () => {
                                        assert.equal(
                                          this.storage[8].add(this.claimedDividend.amount).toString(),
                                          this.storage[4].toString(),
                                          "remaining amount not correct"
                                        );
                                      });
                                      it("balance lower or equal than liquidity", async () => {
                                        assert.equal(await web3.eth.getBalance(this.dividends.address), this.storage[8].toString(), "funds not available");
                                      });
                                      it("revert on second claim", async () => {
                                        await expectRevert(this.dividends.claimDividend(this.dividendIndex, { from: investor1 }), "already claimed");
                                      });
                                      it("revert on early recycle", async () => {
                                        await expectRevert(this.dividends.recycleDividend(this.dividendIndex, { from: issuer }), "too soon");
                                      });
                                      describe("fast forward 5 years", () => {
                                        beforeEach(async () => {
                                          await time.increaseTo(this.storage[3].add(new BN(5 * 366 * 24 * 60 * 60)));
                                        });
                                        it("revert on time lapse", async () => {
                                          await expectRevert(this.dividends.claimDividend(this.dividendIndex, { from: investor2 }), "time lapsed");
                                        });
                                        describe("recycling", () => {
                                          beforeEach(async () => {
                                            this.balance = new BN(await web3.eth.getBalance(issuer));
                                            const tx = await this.dividends.recycleDividend(this.dividendIndex, { from: issuer });
                                            const gasPrice = new BN((await web3.eth.getTransaction(tx.tx)).gasPrice);
                                            this.fees = gasPrice.mul(new BN(tx.receipt.gasUsed));
                                            this.recycledDividend = getTxEvents(tx, "DividendRecycled", this.dividends.abi)[0].args;
                                          });
                                          it("balance updated", async () => {
                                            const newBalance = new BN(await web3.eth.getBalance(issuer));
                                            assert.equal(
                                              this.balance.sub(this.fees).add(this.recycledDividend.amount).toString(),
                                              newBalance.toString(),
                                              "remaining funds not recycled"
                                            );
                                          });
                                          it("remaining amount equals recycled amount", async () => {
                                            assert.equal(this.storage[8].toString(), this.recycledDividend.amount.toString(), "funds have disappeared");
                                          });
                                          it("remaining amount equals recycled amount", async () => {
                                            assert.equal(
                                              new BN(await web3.eth.getBalance(this.dividends.address)).toString(),
                                              0,
                                              "funds still available in contract"
                                            );
                                          });
                                          it("revert on recycle twice", async () => {
                                            await expectRevert(this.dividends.recycleDividend(this.dividendIndex, { from: issuer }), "already recycled");
                                          });
                                          it("revert on already recycled", async () => {
                                            await expectRevert(this.dividends.claimDividend(this.dividendIndex, { from: investor2 }), "already recycled");
                                          });
                                        });
                                      });
                                    });
                                    describe("claim all", () => {
                                      beforeEach(async () => {
                                        this.balance = new BN(await web3.eth.getBalance(this.dividends.address));
                                        const tx1 = await this.dividends.claimDividend(this.dividendIndex, { from: investor1 });
                                        const tx2 = await this.dividends.claimDividend(this.dividendIndex, { from: investor2 });
                                        const tx3 = await this.dividends.claimDividend(this.dividendIndex, { from: investor3 });
                                        this.storage = await this.dividends.getDividend(this.dividendIndex);
                                        this.claimedDividend1 = getTxEvents(tx1, "DividendClaimed", this.dividends.abi)[0].args;
                                        this.claimedDividend2 = getTxEvents(tx2, "DividendClaimed", this.dividends.abi)[0].args;
                                        this.claimedDividend3 = getTxEvents(tx3, "DividendClaimed", this.dividends.abi)[0].args;
                                      });
                                      it("claim amount should be fair", async () => {
                                        const balance = await this.sygnumToken.balanceOfAt(investor3, this.blocknumber);
                                        assert.equal(
                                          this.claimedDividend3.amount.toString(),
                                          balance.mul(this.storage[4]).div(this.storage[5]).toString(),
                                          "dividends is not fair"
                                        );
                                      });
                                      it("remaining amount should be 0 or a fraction due to rounding", async () => {
                                        assert.equal(this.storage[8].lt(new BN(2)), true, "dividends were not fully claimed");
                                      });
                                      it("available balance should be consistent", async () => {
                                        const balance = await this.dividends.balances(ZERO_ADDRESS);
                                        assert.equal(balance.toString(), this.storage[8].toString(), "remaining dividends are not consistent");
                                      });
                                      describe("fast forward 5 years", () => {
                                        beforeEach(async () => {
                                          await time.increaseTo(this.storage[3].add(new BN(5 * 366 * 24 * 60 * 60)));
                                        });
                                        describe("recycle", () => {
                                          beforeEach(async () => {
                                            this.balance = new BN(await web3.eth.getBalance(issuer));
                                            this.rounding = this.storage[8];
                                            if (!this.rounding.eq(new BN("0"))) {
                                              const tx = await this.dividends.recycleDividend(this.dividendIndex, { from: issuer });
                                              const gasPrice = new BN((await web3.eth.getTransaction(tx.tx)).gasPrice);
                                              this.fees = gasPrice.mul(new BN(tx.receipt.gasUsed));
                                              this.recycledDividend = getTxEvents(tx, "DividendRecycled", this.dividends.abi)[0].args;
                                            }
                                            this.storage = await this.dividends.getDividend(this.dividendIndex);
                                          });
                                          it("remaining amount should be recycled or revert on recycle", async () => {
                                            if (!this.rounding.eq(new BN("0"))) {
                                              assert.equal(this.storage[9], true, "dividends were not recycled");
                                            } else {
                                              await expectRevert(this.dividends.recycleDividend(this.dividendIndex, { from: issuer }), "nothing to recycle");
                                            }
                                          });
                                          it("remaining amount for dividend should be ", async () => {
                                            assert.equal(this.storage[8].toString(), "0", "remaining dividends are not 0");
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
          });
        });
      });
    });
  });
});
