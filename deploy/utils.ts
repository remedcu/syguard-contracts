import { Interface } from "@ethersproject/abi";
import SafeApiKit from "@safe-global/api-kit";
import Safe from "@safe-global/protocol-kit";
import {
  MetaTransactionData,
  SafeTransactionDataPartial,
} from "@safe-global/safe-core-sdk-types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const buildTransaction = (
  iface: Interface,
  to: string,
  method: string,
  params: any[],
  value?: string
): SafeTransactionDataPartial => {
  return {
    to,
    data: iface.encodeFunctionData(method, params),
    value: value || "0",
  };
};

const deployModuleParameters = async (
  contractName: string,
  paramsTypes: string[],
  paramsValues: any[],
  hre: HardhatRuntimeEnvironment
) => {
  const factoryAddress = "0x000000000000aDdB49795b0f9bA5BC298cDda236";
  const module = hre.artifacts.readArtifact(contractName);
  const iface = new hre.ethers.utils.Interface((await module).abi);

  const encodedParams = [
    new hre.ethers.utils.AbiCoder().encode(paramsTypes, paramsValues),
  ];
  const initParams = iface.encodeFunctionData("setUp", encodedParams);

  return { initParams, iface, factoryAddress };
};

export async function deployModuleTx(
  contractName: string,
  paramsTypes: string[],
  paramsValues: any[],
  masterCopyAddress: string,
  salt: string,
  hre: HardhatRuntimeEnvironment
) {
  const { initParams, factoryAddress } = await deployModuleParameters(
    contractName,
    paramsTypes,
    paramsValues,
    hre
  );
  const module = hre.artifacts.readArtifact("ModuleProxyFactory");
  const iface = new hre.ethers.utils.Interface((await module).abi);

  const TxDeploy = await buildTransaction(
    iface,
    factoryAddress,
    "deployModule",
    [masterCopyAddress, initParams, salt]
  );
  const moduleAddress = await getModuleDeploymentAddress(
    masterCopyAddress,
    initParams,
    salt,
    hre
  );
  return { TxDeploy, moduleAddress };
}

export async function enableModuleTx(
  enabler: string,
  enablee: string,
  hre: HardhatRuntimeEnvironment
): Promise<SafeTransactionDataPartial> {
  const module = hre.artifacts.readArtifact("Modifier");
  const iface = new hre.ethers.utils.Interface((await module).abi);
  iface.encodeFunctionData("enableModule", [enablee]);

  const TxDeploy = buildTransaction(iface, enabler, "enableModule", [enablee]);
  return TxDeploy;
}

export async function proposeTransaction(
  txs: SafeTransactionDataPartial | MetaTransactionData[],
  safe: Safe,
  safeApiKit: SafeApiKit,
  hre: HardhatRuntimeEnvironment,
  senderAddress: string
) {
  const safeTransaction = await safe.createTransaction({
    safeTransactionData: txs,
  });
  senderAddress = hre.ethers.utils.getAddress(senderAddress);
  const safeTxHash = await safe.getTransactionHash(safeTransaction);
  const signature = await safe.signTransactionHash(safeTxHash);
  await safeApiKit.proposeTransaction({
    safeAddress: hre.ethers.utils.getAddress(await safe.getAddress()),
    safeTransactionData: safeTransaction.data,
    safeTxHash,
    senderAddress,
    senderSignature: signature.data,
    origin: "test from backend",
  });
}

export async function getModuleDeploymentAddress(
  masterCopyAddress: string,
  initParams: string,
  salt: string,
  hre: HardhatRuntimeEnvironment
): Promise<string> {
  const factoryAddress = "0x000000000000aDdB49795b0f9bA5BC298cDda236";
  const Factory = await hre.ethers.getContractAt(
    "ModuleProxyFactory",
    factoryAddress
  );

  const deploymentAddress = await Factory.callStatic.deployModule(
    masterCopyAddress,
    initParams,
    salt
  );
  return deploymentAddress;
}
