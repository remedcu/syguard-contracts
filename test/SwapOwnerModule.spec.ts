import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
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
  const expiration = 180 * 1000;

  async function setup() {
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

    return { avatar, modifier, module };
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
      const [user1] = await hre.ethers.getSigners();
      const Module = await hre.ethers.getContractFactory(
        contracts.swapOwnerModule
      );
      expect(await Module.deploy(user1.address, user1.address, user1.address))
        .to.emit(Module, "SwapOwnerSetup")
        .withArgs(user1.address, user1.address, user1.address);
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
  });
});
