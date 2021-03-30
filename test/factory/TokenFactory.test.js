const BigNumber = require("bignumber.js");
const SolidityBaseContracts = require("@sygnum/solidity-base-contracts");
const {
  expectRevert,
  getTxEvents,
  SygnumToken,
  TokenFactory,
  ProxyDeployer,
  TokenDeployer,
  ZERO_ADDRESS,
  NAME,
  SYMBOL,
  DECIMALS,
  CATEGORY,
  CLASS_TOKEN,
} = require("../common");

const { BaseOperators, TraderOperators, BlockerOperators, Whitelist } = SolidityBaseContracts.load(SygnumToken.currentProvider);

contract("TokenFactory", ([admin, operator, system, newImplementation, issuer, proxyAdmin, attacker]) => {
  before(async () => {
    this.baseOperators = await BaseOperators.new(admin, { from: admin });
    this.traderOperators = await TraderOperators.new({ from: admin });
    this.blockerOperators = await BlockerOperators.new({ from: admin });
    this.whitelist = await Whitelist.new({ from: admin });

    this.proxyDeployer = await ProxyDeployer.new({ from: admin });
    this.tokenDeployer = await TokenDeployer.new({ from: admin });
    await TokenFactory.link("ProxyDeployer", this.proxyDeployer.address);
    await TokenFactory.link("TokenDeployer", this.tokenDeployer.address);

    this.factory = await TokenFactory.new({ from: admin });
    this.token = await SygnumToken.new();
  });

  context("contract initialization", () => {
    describe("initialize operators contracts", () => {
      before(async () => {
        await this.traderOperators.initialize(this.baseOperators.address, { from: admin });
        await this.blockerOperators.initialize(this.baseOperators.address, { from: admin });
        await this.whitelist.initialize(this.baseOperators.address, { from: admin });
      });
      describe("intialize factory", () => {
        before(async () => {
          await this.factory.initialize(
            this.baseOperators.address,
            this.traderOperators.address,
            this.blockerOperators.address,
            this.whitelist.address,
            this.token.address,
            proxyAdmin
          );
        });
        describe("contract initialized", () => {
          it("should be initialized", async () => {
            assert.equal(await this.factory.isInitialized(), true);
          });
          it("should have the baseOperators", async () => {
            assert.equal(await this.factory.getOperatorsContract(), this.baseOperators.address);
          });
          it("should have a whitelist", async () => {
            assert.equal(await this.factory.whitelist(), this.whitelist.address);
          });
          it("should have the traderOperators", async () => {
            assert.equal(await this.factory.traderOperators(), this.traderOperators.address);
          });
          it("should have the blockerOperators", async () => {
            assert.equal(await this.factory.blockerOperators(), this.blockerOperators.address);
          });
          it("should have the proxyAdmin", async () => {
            assert.equal(await this.factory.proxyAdmin(), proxyAdmin);
          });
        });
      });
    });
  });

  context("Role set-up", () => {
    describe("set operator", () => {
      before(async () => {
        await this.baseOperators.addOperator(operator, { from: admin });
      });
      it("operator set", async () => {
        assert.equal(await this.baseOperators.isOperator(operator), true);
      });
    });
    describe("set system", () => {
      before(async () => {
        await this.baseOperators.addSystem(system, { from: admin });
      });
      it("operator set", async () => {
        assert.equal(await this.baseOperators.isSystem(system), true);
      });
    });
  });

  context("contract factory", () => {
    describe("generate equity token", () => {
      before(async () => {
        const tx = await this.factory.newToken(NAME, SYMBOL, DECIMALS, CATEGORY, CLASS_TOKEN, issuer, this.whitelist.address, { from: operator });

        const events = getTxEvents(tx, "NewTokenDeployed", this.factory.abi);
        const tokenDeployed = events[0].args;
        this.newToken = await SygnumToken.at(tokenDeployed.proxy);
      });
      it("proxy should be initialized", async () => {
        assert.equal(await this.newToken.isInitialized(), true);
      });
      it("should have correct name", async () => {
        assert.equal(await this.newToken.name(), NAME);
      });
      it("should have correct symbol", async () => {
        assert.equal(await this.newToken.symbol(), SYMBOL);
      });
      it("should have correct decimals", async () => {
        assert.equal(await this.newToken.decimals(), DECIMALS);
      });
      it("should have correct class", async () => {
        assert.equal(await this.newToken.class(), CLASS_TOKEN);
      });
      it("should have correct category", async () => {
        assert.equal(new BigNumber(await this.newToken.category()).toString(), new BigNumber(CATEGORY).toString());
      });
    });
  });

  context("update configurations", () => {
    describe("update addresses", () => {
      before(async () => {
        this.baseOperators = await BaseOperators.new(admin, { from: admin });
        this.traderOperators = await TraderOperators.new({ from: admin });
        this.blockerOperators = await BlockerOperators.new({ from: admin });
        this.whitelist = await Whitelist.new({ from: admin });
      });
      it("should update the blocker operators address", async () => {
        await this.factory.updateWhitelist(this.whitelist.address, { from: operator });
        assert.equal(await this.factory.whitelist(), this.whitelist.address);
      });
      it("should update the blocker operators address", async () => {
        await this.factory.updateTraderOperators(this.traderOperators.address, { from: operator });
        assert.equal(await this.factory.traderOperators(), this.traderOperators.address);
      });
      it("should update the blocker operators address", async () => {
        await this.factory.updateBlockerOperators(this.blockerOperators.address, { from: operator });
        assert.equal(await this.factory.blockerOperators(), this.blockerOperators.address);
      });
      it("should update the blocker operators address", async () => {
        await this.factory.updateProxyAdmin(operator, { from: proxyAdmin });
        assert.equal(await this.factory.proxyAdmin(), operator);
      });
      it("should update the implementation address", async () => {
        await this.factory.updateImplementation(newImplementation, { from: operator });
        assert.equal(await this.factory.implementation(), newImplementation);
      });
    });
  });

  context("assert failures", () => {
    before(async () => {});
    describe("on permissions", () => {
      it("should revert on new token generation", async () => {
        await expectRevert(
          this.factory.newToken(NAME, SYMBOL, DECIMALS, CATEGORY, CLASS_TOKEN, proxyAdmin, this.whitelist.address, { from: attacker }),
          "Operatorable: caller does not have the operator role nor system nor relay"
        );
      });
      it("should revert on whitelist update", async () => {
        await expectRevert(this.factory.updateWhitelist(ZERO_ADDRESS, { from: attacker }), "Operatorable: caller does not have the operator role");
      });
      it("should revert on update trader operators", async () => {
        await expectRevert(this.factory.updateTraderOperators(ZERO_ADDRESS, { from: attacker }), "Operatorable: caller does not have the operator role");
      });
      it("should revert on update blocker operators", async () => {
        await expectRevert(this.factory.updateBlockerOperators(ZERO_ADDRESS, { from: attacker }), "Operatorable: caller does not have the operator role");
      });
      it("should revert on proxy admin update", async () => {
        await expectRevert(this.factory.updateProxyAdmin(attacker, { from: attacker }), "TokenFactory: caller not proxy admin");
      });
      it("should revert on implementation update", async () => {
        await expectRevert(this.factory.updateImplementation(ZERO_ADDRESS, { from: attacker }), "Operatorable: caller does not have the operator role");
      });
    });
  });
});
