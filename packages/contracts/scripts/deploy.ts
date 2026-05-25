import { ethers } from "hardhat";

const zeroAddress = "0x0000000000000000000000000000000000000000";

async function main() {
  const [deployer] = await ethers.getSigners();
  const merchant = process.env.MERCHANT_ADDRESS ?? deployer.address;
  let tokenAddress = process.env.ACCEPTED_TOKEN_ADDRESS;

  console.log("Deployer:", deployer.address);
  console.log("Merchant:", merchant);

  if (!tokenAddress || tokenAddress === zeroAddress) {
    const token = await ethers.deployContract("TestToken");
    await token.waitForDeployment();
    tokenAddress = await token.getAddress();
    console.log("TestToken:", tokenAddress);
  } else {
    console.log("Using existing token:", tokenAddress);
  }

  const processor = await ethers.deployContract("PaymentProcessor", [deployer.address, merchant]);
  await processor.waitForDeployment();
  const processorAddress = await processor.getAddress();

  console.log("PaymentProcessor:", processorAddress);

  const tx = await processor.setAcceptedToken(tokenAddress, true);
  await tx.wait();
  console.log("Accepted token:", tokenAddress);

  console.log("");
  console.log("Copy these values to .env, apps/api/.env, apps/worker/.env and apps/web/.env.local:");
  console.log(`PAYMENT_CONTRACT_ADDRESS="${processorAddress}"`);
  console.log(`ACCEPTED_TOKEN_ADDRESS="${tokenAddress}"`);
  console.log(`NEXT_PUBLIC_PAYMENT_CONTRACT_ADDRESS="${processorAddress}"`);
  console.log(`NEXT_PUBLIC_TOKEN_ADDRESS="${tokenAddress}"`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
