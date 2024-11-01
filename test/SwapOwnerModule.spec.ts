import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import hre from "hardhat";

const contracts = {
  avatar: "MockAvatar",
  swapOwnerModule: "SwapOwnerModule",
  modifier: "Delay",
};

const ZeroAddress = "0x0000000000000000000000000000000000000000";
const FirstAddress = "0x0000000000000000000000000000000000000001";

describe("DelayModifier", async () => {
  const cooldown = 180;
  const expiration = 180;

  async function setup() {
    //[admin, owner, prevOwner, oldOwner, newOwner]
    const [admin] = await hre.ethers.getSigners();

    const Avatar = await hre.ethers.getContractFactory(contracts.avatar);
    const avatar = await Avatar.deploy();
    const avatarAddress = await avatar.address;

    const Modifier = await hre.ethers.getContractFactory(contracts.modifier);
    const modifier = await Modifier.deploy(
      admin.address,
      avatarAddress,
      avatarAddress,
      cooldown,
      expiration
    );

    const Module = await hre.ethers.getContractFactory(
      contracts.swapOwnerModule
    );
    const module = await Module.deploy(
      modifier.address,
      avatarAddress,
      admin.address
    );

    return { avatar, modifier, module, admin };
  }

  describe("setUp()", async () => {
    it("throws if avatar is zero address", async () => {
      const Module = await hre.ethers.getContractFactory(
        contracts.swapOwnerModule
      );
      await expect(
        Module.deploy(FirstAddress, ZeroAddress, FirstAddress)
      ).to.be.revertedWith("Avatar can not be zero address");
    });
    it("throws if target is zero address", async () => {
      const Module = await hre.ethers.getContractFactory(
        contracts.swapOwnerModule
      );
      await expect(
        Module.deploy(ZeroAddress, FirstAddress, FirstAddress)
      ).to.be.revertedWith("Target can not be zero address");
    });
    it("should emit event because of successful set up", async () => {
      const [owner, avatar, target] = await hre.ethers.getSigners();
      const Module = await hre.ethers.getContractFactory(
        contracts.swapOwnerModule
      );
      expect(await Module.deploy(target.address, avatar.address, owner.address))
        .to.emit(Module, "SwapOwnerSetup")
        .withArgs(owner.address, avatar.address, target.address);
    });
    it("should transfer the ownership to owner address", async () => {
      const [user1, user2] = await hre.ethers.getSigners();
      const Module = await hre.ethers.getContractFactory(
        contracts.swapOwnerModule
      );
      const module = await Module.deploy(
        user1.address,
        user1.address,
        user2.address
      );
      expect(await module.owner()).to.be.equal(user2.address);
    });
  });

  describe("startRecovery()", async () => {
    it("throws if not owner", async () => {
      const [user1, user2] = await hre.ethers.getSigners();
      const { module } = await loadFixture(setup);

      await expect(
        module
          .connect(user2)
          .startRecovery(FirstAddress, user1.address, user2.address)
      )
        .to.be.revertedWithCustomError(module, "OwnableUnauthorizedAccount")
        .withArgs(user2.address);
    });
    it("throws if module not enabled by target (delay modifier)", async () => {
      const [user1, user2] = await hre.ethers.getSigners();
      const { module, modifier } = await loadFixture(setup);
      await expect(
        module.startRecovery(FirstAddress, user1.address, user2.address)
      )
        .to.be.revertedWithCustomError(modifier, "NotAuthorized")
        .withArgs(module.address);
    });
    it("starts a recovery if owner and module enabled by target (delay modifier)", async () => {
      const [user1, user2] = await hre.ethers.getSigners();
      const { module, modifier } = await loadFixture(setup);
      await modifier.enableModule(module.address);
      await expect(
        module.startRecovery(FirstAddress, user1.address, user2.address)
      ).to.not.reverted;
    });
    it("should emit event in case of successful recovery queuing", async () => {
      const [user1, user2] = await hre.ethers.getSigners();
      const { module, modifier } = await loadFixture(setup);
      await modifier.enableModule(module.address);
      await expect(
        module.startRecovery(FirstAddress, user1.address, user2.address)
      )
        .to.emit(module, "SwapOwner")
        .withArgs(user1.address, user2.address);
    });
    it("should SUCCEED when queuing 2 transaction after waiting one cooldown period", async function () {
      const { module, modifier, admin } = await loadFixture(setup);

      const oldOwnerAddress = "0xa234b71A23699783462D739440a5Af46DddafFc5";
      const newUser = "0xC7a622A096405C57af295b63c155b031c2A1822B";

      await modifier.enableModule(module.address);

      await expect(
        module
          .connect(admin)
          .startRecovery(oldOwnerAddress, oldOwnerAddress, newUser)
      )
        .to.emit(module, "SwapOwner")
        .withArgs(oldOwnerAddress, newUser);

      await time.increase(cooldown + expiration + 1);

      await expect(
        module
          .connect(admin)
          .startRecovery(oldOwnerAddress, oldOwnerAddress, newUser)
      )
        .to.emit(module, "SwapOwner")
        .withArgs(oldOwnerAddress, newUser);
    });
    it("should REVERT if a transaction try to queue more than once per cooldown period", async function () {
      const { module, modifier, admin } = await loadFixture(setup);

      const oldOwnerAddress = "0xa234b71A23699783462D739440a5Af46DddafFc5";
      const newUser = "0xC7a622A096405C57af295b63c155b031c2A1822B";

      await modifier.enableModule(module.address);

      await expect(
        module.startRecovery(oldOwnerAddress, oldOwnerAddress, newUser)
      )
        .to.emit(module, "SwapOwner")
        .withArgs(oldOwnerAddress, newUser);
      await expect(
        module.startRecovery(oldOwnerAddress, oldOwnerAddress, newUser)
      ).to.be.revertedWith("Cooldown period has not passed");
    });
    it("should REVERT if a transaction is pending (cooldown passed, no expiration)", async function () {
      const { module, modifier, admin } = await loadFixture(setup);

      const oldOwnerAddress = "0xa234b71A23699783462D739440a5Af46DddafFc5";
      const newUser = "0xC7a622A096405C57af295b63c155b031c2A1822B";

      await modifier.enableModule(module.address);
      await modifier.setTxExpiration(0);

      await expect(
        module.startRecovery(oldOwnerAddress, oldOwnerAddress, newUser)
      )
        .to.emit(module, "SwapOwner")
        .withArgs(oldOwnerAddress, newUser);

      await time.increase(cooldown + 1);

      await expect(
        module.startRecovery(oldOwnerAddress, oldOwnerAddress, newUser)
      ).to.be.revertedWith("A recovery is pending execution");
    });
    it("should REVERT if a transaction cooldown passed, but not expired (cooldown passed, with expiration)", async function () {
      const { module, modifier, admin } = await loadFixture(setup);

      const oldOwnerAddress = "0xa234b71A23699783462D739440a5Af46DddafFc5";
      const newUser = "0xC7a622A096405C57af295b63c155b031c2A1822B";

      await modifier.enableModule(module.address);

      await expect(
        module.startRecovery(oldOwnerAddress, oldOwnerAddress, newUser)
      )
        .to.emit(module, "SwapOwner")
        .withArgs(oldOwnerAddress, newUser);

      await time.increase(cooldown + 1);

      await expect(
        module.startRecovery(oldOwnerAddress, oldOwnerAddress, newUser)
      ).to.be.revertedWith("Transaction has not expired");
    });
    it("should SUCCEED if a transaction is pending and expired (cooldown passed, with expiration)", async function () {
      const { module, modifier, admin } = await loadFixture(setup);

      const oldOwnerAddress = "0xa234b71A23699783462D739440a5Af46DddafFc5";
      const newUser = "0xC7a622A096405C57af295b63c155b031c2A1822B";

      await modifier.enableModule(module.address);

      await expect(
        module.startRecovery(oldOwnerAddress, oldOwnerAddress, newUser)
      )
        .to.emit(module, "SwapOwner")
        .withArgs(oldOwnerAddress, newUser);

      await time.increase(cooldown + expiration);

      await expect(
        module.startRecovery(oldOwnerAddress, oldOwnerAddress, newUser)
      )
        .to.emit(module, "SwapOwner")
        .withArgs(oldOwnerAddress, newUser);
    });
    it("should SUCCEED if previous transaction is already executed", async function () {
      const { module, modifier, admin } = await loadFixture(setup);

      const oldOwnerAddress = "0xa234b71A23699783462D739440a5Af46DddafFc5";
      const newUser = "0xC7a622A096405C57af295b63c155b031c2A1822B";

      await modifier.enableModule(module.address);
      await modifier.setTxExpiration(0);

      await expect(
        module.startRecovery(oldOwnerAddress, oldOwnerAddress, newUser)
      )
        .to.emit(module, "SwapOwner")
        .withArgs(oldOwnerAddress, newUser);

      await time.increase(cooldown + expiration + 1);
      await modifier.setTxNonce(1);

      await expect(
        module.startRecovery(oldOwnerAddress, oldOwnerAddress, newUser)
      )
        .to.emit(module, "SwapOwner")
        .withArgs(oldOwnerAddress, newUser);
    });

    it("should SUCCEED to queue the first transaction even if delay has pending transaction from another module", async function () {
      const { module, modifier, admin } = await loadFixture(setup);

      const oldOwnerAddress = "0xa234b71A23699783462D739440a5Af46DddafFc5";
      const newUser = "0xC7a622A096405C57af295b63c155b031c2A1822B";

      await modifier.enableModule(module.address);
      await modifier.enableModule(admin.address);
      await modifier.setTxExpiration(0);
      await modifier
        .connect(admin)
        .execTransactionFromModule(module.address, 0, "0x", 0);

      await expect(
        module.startRecovery(oldOwnerAddress, oldOwnerAddress, newUser)
      )
        .to.emit(module, "SwapOwner")
        .withArgs(oldOwnerAddress, newUser);
    });
  });
});
