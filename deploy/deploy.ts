import hre from "hardhat";
import { TASK_ETHERSCAN_VERIFY } from "hardhat-deploy";
const FirstAddress = "0x0000000000000000000000000000000000000001";

async function main() {
  const { deployments, getNamedAccounts, run } = hre;
  const { deployer } = await getNamedAccounts();
  const { deploy } = deployments;
  const args = [FirstAddress, FirstAddress, FirstAddress];

  const deployResult = await deploy("SwapOwnerModule", {
    from: deployer,
    args,
    log: true,
    deterministicDeployment: true,
  });
  console.log(deployResult.address);
  await new Promise((resolve) => setTimeout(resolve, 60000));
  await run(TASK_ETHERSCAN_VERIFY, {
    apiKey: process.env.ETHERSCAN_KEY_API,
    license: "MIT",
    solcInput: true,
    forceLicense: false, // we need this because contracts license is LGPL-3.0-only
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
