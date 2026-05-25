import { expect } from "chai";
import { ethers } from "hardhat";

describe("PaymentProcessor", () => {
  async function deployFixture() {
    const [owner, merchant, buyer] = await ethers.getSigners();
    const token = await ethers.deployContract("TestToken");
    const processor = await ethers.deployContract("PaymentProcessor", [owner.address, merchant.address]);
    await processor.setAcceptedToken(await token.getAddress(), true);
    await token.mint(buyer.address, 100_000_000);
    return { owner, merchant, buyer, token, processor };
  }

  it("transfers accepted ERC-20 payments and emits order event", async () => {
    const { merchant, buyer, token, processor } = await deployFixture();
    const amount = 35_000_000n;
    const orderId = ethers.id("ord_123");

    await token.connect(buyer).approve(await processor.getAddress(), amount);

    await expect(processor.connect(buyer).payOrder(orderId, await token.getAddress(), amount))
      .to.emit(processor, "PaymentReceived")
      .withArgs(orderId, buyer.address, await token.getAddress(), amount);

    expect(await token.balanceOf(merchant.address)).to.equal(amount);
  });

  it("rejects unaccepted tokens", async () => {
    const { buyer, token, processor } = await deployFixture();
    await processor.setAcceptedToken(await token.getAddress(), false);
    await token.connect(buyer).approve(await processor.getAddress(), 1n);

    await expect(
      processor.connect(buyer).payOrder(ethers.id("ord_123"), await token.getAddress(), 1n)
    ).to.be.revertedWith("TOKEN_NOT_ACCEPTED");
  });

  it("rejects zero amounts", async () => {
    const { buyer, token, processor } = await deployFixture();
    await expect(
      processor.connect(buyer).payOrder(ethers.id("ord_123"), await token.getAddress(), 0n)
    ).to.be.revertedWith("INVALID_AMOUNT");
  });
});
