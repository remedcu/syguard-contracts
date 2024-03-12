import hre from "hardhat";
import SafeApiKit from "@safe-global/api-kit";
import Safe, { EthersAdapter } from "@safe-global/protocol-kit";
import { deployModuleTx, enableModuleTx, proposeTransaction } from "./utils";

const masterCopyDelay = "0xE82814727799742403a4c41bEc96996fCE6D2719";
const masterCopySwap = "0xc31161A7f7588D80782272A974fA8676D40299d1";
const sygnumAccount = "0x9cfD7D6e751568761C1E698E6148ed899a0d358d";
const clientAccount = "0xf2aA5a5EDB8E1e384Ec8988F0a32772af1765eE1";

async function main() {
  const deployer = (await hre.ethers.getSigners())[0];
  const ethAdapter = new EthersAdapter({
    ethers: hre.ethers,
    signerOrProvider: deployer,
  });
  const safe = await Safe.create({
    ethAdapter,
    safeAddress: hre.ethers.utils.getAddress(clientAccount),
  });

  const safeApiKit = new SafeApiKit({
    txServiceUrl: "https://safe-transaction-sepolia.safe.global/",
    ethAdapter,
  });

  //   address _owner,
  // address _avatar,
  // address _target,
  // uint256 _cooldown,
  // uint256 _expiration

  const { TxDeploy: deployDelayTx, moduleAddress: delayAddress } =
    await deployModuleTx(
      "Delay",
      ["address", "address", "address", "uint256", "uint256"],
      [clientAccount, clientAccount, clientAccount, 0, 0],
      masterCopyDelay,
      hre.ethers.utils.hexlify(hre.ethers.utils.randomBytes(4)),
      hre
    );
  const { TxDeploy: deploySwapTx, moduleAddress: swapAddress } =
    await deployModuleTx(
      "SwapOwnerModule",
      ["address", "address", "address"],
      [delayAddress, clientAccount, sygnumAccount],
      masterCopySwap,
      hre.ethers.utils.hexlify(hre.ethers.utils.randomBytes(4)),
      hre
    );
  const enableDelayTx = await enableModuleTx(clientAccount, delayAddress, hre);
  const enableSwapTx = await enableModuleTx(delayAddress, swapAddress, hre);
  await proposeTransaction(
    [deployDelayTx, deploySwapTx, enableDelayTx, enableSwapTx],
    safe,
    safeApiKit,
    hre,
    deployer.address
  );
}

// await new Promise((resolve) => setTimeout(resolve, 60000));

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
