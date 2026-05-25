import { ethers } from "hardhat";

async function main() {
  const tokenAddress = process.env.ACCEPTED_TOKEN_ADDRESS;
  const recipient = process.env.MINT_TO;
  const amount = process.env.MINT_AMOUNT ?? "1000";

  if (!tokenAddress) throw new Error("ACCEPTED_TOKEN_ADDRESS is required");
  if (!recipient) throw new Error("MINT_TO is required");

  const token = await ethers.getContractAt("TestToken", tokenAddress);
  const decimals = await token.decimals();
  const parsedAmount = ethers.parseUnits(amount, decimals);

  const tx = await token.mint(recipient, parsedAmount);
  await tx.wait();

  console.log(`Minted ${amount} TEST-USDC to ${recipient}`);
  console.log(`Token: ${tokenAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
