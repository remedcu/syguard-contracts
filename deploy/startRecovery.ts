import hre from "hardhat";
import SafeApiKit from "@safe-global/api-kit";
import Safe, { EthersAdapter } from "@safe-global/protocol-kit";
import { executeRecovery, proposeTransaction, startRecovery } from "./utils";

const delayAddress = "0x942d1d6DF00B77ddf6634c7F68f5007593DBba70";
const swapAddress = "0x1234Ab00D4C71A5E2278044Ff483D1AFf04d1683";
const sygnumAccount = "0x9cfD7D6e751568761C1E698E6148ed899a0d358d";
const clientSafe = "0xf2aA5a5EDB8E1e384Ec8988F0a32772af1765eE1";
const clientAccount = "0x317E0804a0d38fE6e9E03C9CEf2cD218935E57cd";
const newClientAccount = "0x317E0804a0d38fE6e9E03C9CEf2cD218935E57cd";

async function main() {
  const deployer = (await hre.ethers.getSigners())[1];
  const ethAdapter = new EthersAdapter({
    ethers: hre.ethers,
    signerOrProvider: deployer,
  });
  const safe = await Safe.create({
    ethAdapter,
    safeAddress: hre.ethers.utils.getAddress(sygnumAccount),
  });

  const safeApiKit = new SafeApiKit({
    txServiceUrl: "https://safe-transaction-sepolia.safe.global/",
    ethAdapter,
  });

  const { Tx: txStartRecovery, encoded } = await startRecovery(
    clientAccount,
    newClientAccount,
    swapAddress,
    hre
  );
  const txExecuteRecovery = await executeRecovery(
    clientSafe,
    encoded,
    delayAddress,
    hre
  );

  console.log(encoded);

  await proposeTransaction(
    [txStartRecovery],
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

//E318B52B0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000CF6491BAA3467FA668E84631DF500083E68679590000000000000000000000007B3D7EFE2069373378213B6ABDE9837A76BA2815
//e318b52b0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000cf6491baa3467fa668e84631df500083e68679590000000000000000000000007b3d7efe2069373378213b6abde9837a76ba2815
