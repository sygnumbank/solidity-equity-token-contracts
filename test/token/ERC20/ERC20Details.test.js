const SolidityBaseContracts = require("@sygnum/solidity-base-contracts");
const { expectRevert, ERC20SygnumDetailedMock, NAME, SYMBOL, DECIMALS, CATEGORY, CLASS_TOKEN } = require("../../common");

const { BaseOperators } = SolidityBaseContracts.load(ERC20SygnumDetailedMock.currentProvider);

contract("ERC20SygnumDetailed && ERC20Detailed", ([admin, operator, issuer, anotherIssuer, attacker]) => {
  beforeEach("deployment", async () => {
    this.mock = await ERC20SygnumDetailedMock.new();
    this.baseOperators = await BaseOperators.new(admin, { from: admin });
  });
  context("deployed", () => {
    describe("initialization", () => {
      beforeEach(async () => {
        await this.mock.initialize(this.baseOperators.address);
      });
      describe("role assigned", () => {
        beforeEach(async () => {
          await this.baseOperators.addOperator(operator, { from: admin });
        });
        it("operator role assigned", async () => {
          assert.equal(await this.baseOperators.isOperator(operator), true);
        });
        describe("values assigned", () => {
          beforeEach(async () => {
            await this.mock.setDetails(NAME, SYMBOL, DECIMALS, CATEGORY, CLASS_TOKEN, issuer);
          });
          describe("ERC20SygnumDetailed", () => {
            it("category set", async () => {
              assert.equal(await this.mock.category(), CATEGORY, "category not assigned");
            });
            it("class set", async () => {
              assert.equal(await this.mock.class(), CLASS_TOKEN, "class not assigned");
            });
            it("issuer set", async () => {
              assert.equal(await this.mock.issuer(), issuer, "issuer not assigned");
            });
          });
          describe("ERC20Detailed", () => {
            it("name set", async () => {
              assert.equal(await this.mock.name(), NAME, "name not assigned");
            });
            it("symbol set", async () => {
              assert.equal(await this.mock.symbol(), SYMBOL, "symbol not assigned");
            });
            it("decimals set", async () => {
              assert.equal(await this.mock.decimals(), DECIMALS, "decimals not assigned");
            });
          });
          describe("update values", () => {
            beforeEach(async () => {
              this.newName = "newName";
              this.newSymbol = "newSymbol";
              this.newCategory = "0x74657373";
              this.newClass = "B";
            });
            describe("name", () => {
              describe("non-functional", () => {
                describe("revert from non-issuer", () => {
                  beforeEach(async () => {
                    await expectRevert(this.mock.updateName(this.newName, { from: attacker }), "Operatorable: caller does not have the operator role");
                  });
                  it("name not updated", async () => {
                    assert.equal(await this.mock.name(), NAME, "name updated");
                  });
                });
              });
              describe("functional", () => {
                describe("from issuer", () => {
                  beforeEach(async () => {
                    await this.mock.updateName(this.newName, { from: operator });
                  });
                  it("name not updated", async () => {
                    assert.equal(await this.mock.name(), this.newName, "name not updated");
                  });
                });
              });
            });
            describe("symbol", () => {
              describe("non-functional", () => {
                describe("revert from non-issuer", () => {
                  beforeEach(async () => {
                    await expectRevert(this.mock.updateSymbol(this.newSymbol, { from: attacker }), "Operatorable: caller does not have the operator role");
                  });
                  it("symbol not updated", async () => {
                    assert.equal(await this.mock.symbol(), SYMBOL, "symbol updated");
                  });
                });
              });
              describe("functional", () => {
                describe("from issuer", () => {
                  beforeEach(async () => {
                    await this.mock.updateSymbol(this.newSymbol, { from: operator });
                  });
                  it("symbol updated", async () => {
                    assert.equal(await this.mock.symbol(), this.newSymbol, "symbol not updated");
                  });
                });
              });
            });
            describe("category", () => {
              describe("non-functional", () => {
                describe("revert from non-issuer", () => {
                  beforeEach(async () => {
                    await expectRevert(this.mock.updateCategory(this.newCategory, { from: attacker }), "Operatorable: caller does not have the operator role");
                  });
                  it("category not updated", async () => {
                    assert.equal(await this.mock.category(), CATEGORY, "category updated");
                  });
                });
              });
              describe("functional", () => {
                describe("from issuer", () => {
                  beforeEach(async () => {
                    await this.mock.updateCategory(this.newCategory, { from: operator });
                  });
                  it("category updated", async () => {
                    assert.equal(await this.mock.category(), this.newCategory, "category not updated");
                  });
                });
              });
            });
            describe("class", () => {
              describe("non-functional", () => {
                describe("revert from non-issuer", () => {
                  beforeEach(async () => {
                    await expectRevert(this.mock.updateClass(this.newClass, { from: attacker }), "Operatorable: caller does not have the operator role");
                  });
                  it("class not updated", async () => {
                    assert.equal(await this.mock.class(), CLASS_TOKEN, "class updated");
                  });
                });
              });
              describe("functional", () => {
                describe("from issuer", () => {
                  beforeEach(async () => {
                    await this.mock.updateClass(this.newClass, { from: operator });
                  });
                  it("category updated", async () => {
                    assert.equal(await this.mock.class(), this.newClass, "class not updated");
                  });
                });
              });
            });
            describe("issuer", () => {
              describe("non-functional", () => {
                describe("revert from non-operator", () => {
                  beforeEach(async () => {
                    await expectRevert(this.mock.updateIssuer(anotherIssuer, { from: attacker }), "Operatorable: caller does not have the operator role");
                  });
                  it("class not updated", async () => {
                    assert.equal(await this.mock.issuer(), issuer, "class updated");
                  });
                });
              });
              describe("functional", () => {
                describe("from issuer", () => {
                  beforeEach(async () => {
                    await this.mock.updateIssuer(anotherIssuer, { from: operator });
                  });
                  it("category updated", async () => {
                    assert.equal(await this.mock.issuer(), anotherIssuer, "class not updated");
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
