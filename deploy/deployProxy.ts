import hre from "hardhat";
import SafeApiKit from "@safe-global/api-kit";
import Safe, { EthersAdapter } from "@safe-global/protocol-kit";
import { deployModuleTx, enableModuleTx, proposeTransaction } from "./utils";

const masterCopyDelay = "0xd54895B1121A2eE3f37b502F507631FA1331BED6";
const masterCopySwap = "0x681DA7CbB7Ade11CA1E51C4CB08300CafD749673";
const sygnumAccount = "0x928cCB4BC9Ec337591247354FB146541b4f9c931";
const clientAccount = "0xD85f64E9DDB888C7c65F12a4409E3e1148189b3c";

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
    txServiceUrl: "https://safe-transaction-goerli.safe.global/",
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
      "0x489498",
      hre
    );
  const { TxDeploy: deploySwapTx, moduleAddress: swapAddress } =
    await deployModuleTx(
      "SwapOwnerModule",
      ["address", "address", "address"],
      [delayAddress, clientAccount, sygnumAccount],
      masterCopySwap,
      "0x489498",
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
