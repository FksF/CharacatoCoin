const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("CharacatoCoin - Advanced Tests", function () {
  let CharacatoCoin;
  let characatoCoin;
  let owner;
  let addr1;
  let addr2;
  let addr3;

  beforeEach(async function () {
    [owner, addr1, addr2, addr3] = await ethers.getSigners();
    CharacatoCoin = await ethers.getContractFactory("CharacatoCoin");
    characatoCoin = await CharacatoCoin.deploy(owner.address);
    await characatoCoin.waitForDeployment();
  });

  describe("Advanced Minting Tests", function () {
    it("Should emit TokensMinted event when minting", async function () {
      const mintAmount = ethers.parseEther("1000");
      
      await expect(characatoCoin.mint(addr1.address, mintAmount))
        .to.emit(characatoCoin, "TokensMinted")
        .withArgs(addr1.address, mintAmount);
    });

    it("Should update totalMinted correctly", async function () {
      const initialMinted = await characatoCoin.totalMinted();
      const mintAmount = ethers.parseEther("1000");
      
      await characatoCoin.mint(addr1.address, mintAmount);
      
      const finalMinted = await characatoCoin.totalMinted();
      expect(finalMinted).to.equal(initialMinted + mintAmount);
    });

    it("Should not allow minting to zero address", async function () {
      const mintAmount = ethers.parseEther("1000");
      
      await expect(
        characatoCoin.mint(ethers.ZeroAddress, mintAmount)
      ).to.be.revertedWith("CharacatoCoin: cannot mint to zero address");
    });

    it("Should not allow minting zero amount", async function () {
      await expect(
        characatoCoin.mint(addr1.address, 0)
      ).to.be.revertedWith("CharacatoCoin: amount must be greater than 0");
    });

    it("Should calculate remaining supply correctly", async function () {
      const maxSupply = ethers.parseEther("10000000");
      const currentMinted = await characatoCoin.totalMinted();
      const remaining = await characatoCoin.remainingSupply();
      
      expect(remaining).to.equal(maxSupply - currentMinted);
    });
  });

  describe("Advanced Burning Tests", function () {
    beforeEach(async function () {
      await characatoCoin.transfer(addr1.address, ethers.parseEther("1000"));
    });

    it("Should emit TokensBurned event when burning", async function () {
      const burnAmount = ethers.parseEther("100");
      
      await expect(characatoCoin.connect(addr1).burn(burnAmount))
        .to.emit(characatoCoin, "TokensBurned")
        .withArgs(addr1.address, burnAmount);
    });

    it("Should emit TokensBurned event when burning from", async function () {
      const burnAmount = ethers.parseEther("100");
      
      await characatoCoin.connect(addr1).approve(addr2.address, burnAmount);
      
      await expect(characatoCoin.connect(addr2).burnFrom(addr1.address, burnAmount))
        .to.emit(characatoCoin, "TokensBurned")
        .withArgs(addr1.address, burnAmount);
    });

    it("Should not allow burning more than balance", async function () {
      const burnAmount = ethers.parseEther("2000");
      
      await expect(
        characatoCoin.connect(addr1).burn(burnAmount)
      ).to.be.revertedWithCustomError(characatoCoin, "ERC20InsufficientBalance");
    });
  });

  describe("Minter Management Tests", function () {
    it("Should not allow adding zero address as minter", async function () {
      await expect(
        characatoCoin.addMinter(ethers.ZeroAddress)
      ).to.be.revertedWith("CharacatoCoin: cannot add zero address as minter");
    });

    it("Should not allow adding existing minter", async function () {
      await characatoCoin.addMinter(addr1.address);
      
      await expect(
        characatoCoin.addMinter(addr1.address)
      ).to.be.revertedWith("CharacatoCoin: account is already a minter");
    });

    it("Should not allow removing zero address", async function () {
      await expect(
        characatoCoin.removeMinter(ethers.ZeroAddress)
      ).to.be.revertedWith("CharacatoCoin: cannot remove zero address");
    });

    it("Should not allow removing non-minter", async function () {
      await expect(
        characatoCoin.removeMinter(addr1.address)
      ).to.be.revertedWith("CharacatoCoin: account is not a minter");
    });

    it("Should not allow removing owner as minter", async function () {
      await expect(
        characatoCoin.removeMinter(owner.address)
      ).to.be.revertedWith("CharacatoCoin: cannot remove owner as minter");
    });

    it("Should allow multiple minters to work independently", async function () {
      // Añadir dos minters
      await characatoCoin.addMinter(addr1.address);
      await characatoCoin.addMinter(addr2.address);
      
      // Ambos deberían poder mintear
      await characatoCoin.connect(addr1).mint(addr3.address, ethers.parseEther("500"));
      await characatoCoin.connect(addr2).mint(addr3.address, ethers.parseEther("300"));
      
      expect(await characatoCoin.balanceOf(addr3.address)).to.equal(
        ethers.parseEther("800")
      );
    });
  });

  describe("Pause/Unpause Advanced Tests", function () {
    it("Should emit ContractPaused event when pausing", async function () {
      await expect(characatoCoin.pause())
        .to.emit(characatoCoin, "ContractPaused")
        .withArgs(owner.address);
    });

    it("Should emit ContractUnpaused event when unpausing", async function () {
      await characatoCoin.pause();
      
      await expect(characatoCoin.unpause())
        .to.emit(characatoCoin, "ContractUnpaused")
        .withArgs(owner.address);
    });

    it("Should not allow minting when paused", async function () {
      await characatoCoin.pause();
      
      await expect(
        characatoCoin.mint(addr1.address, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(characatoCoin, "EnforcedPause");
    });

    it("Should not allow burning when paused", async function () {
      await characatoCoin.transfer(addr1.address, ethers.parseEther("100"));
      await characatoCoin.pause();
      
      await expect(
        characatoCoin.connect(addr1).burn(ethers.parseEther("50"))
      ).to.be.revertedWithCustomError(characatoCoin, "EnforcedPause");
    });

    it("Should not allow transfers when paused", async function () {
      await characatoCoin.pause();
      
      await expect(
        characatoCoin.connect(addr1).transfer(addr2.address, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(characatoCoin, "EnforcedPause");
    });
  });

  describe("Emergency Recovery Tests", function () {
    it("Should successfully withdraw ETH", async function () {
      // Enviar ETH al contrato
      await owner.sendTransaction({
        to: await characatoCoin.getAddress(),
        value: ethers.parseEther("1")
      });

      const initialBalance = await ethers.provider.getBalance(owner.address);
      const contractBalance = await ethers.provider.getBalance(await characatoCoin.getAddress());
      
      expect(contractBalance).to.equal(ethers.parseEther("1"));
      
      const tx = await characatoCoin.emergencyWithdraw();
      const receipt = await tx.wait();
      
      // Verificar que el contrato ya no tiene ETH
      expect(await ethers.provider.getBalance(await characatoCoin.getAddress())).to.equal(0);
    });

    it("Should not allow withdrawing when no ETH", async function () {
      await expect(
        characatoCoin.emergencyWithdraw()
      ).to.be.revertedWith("CharacatoCoin: no ETH to withdraw");
    });

    it("Should not allow non-owner to withdraw ETH", async function () {
      await owner.sendTransaction({
        to: await characatoCoin.getAddress(),
        value: ethers.parseEther("1")
      });

      await expect(
        characatoCoin.connect(addr1).emergencyWithdraw()
      ).to.be.revertedWithCustomError(characatoCoin, "OwnableUnauthorizedAccount");
    });

    it("Should recover ERC20 tokens", async function () {
      // Desplegar otro token para probar
      const TestToken = await ethers.getContractFactory("CharacatoCoin");
      const testToken = await TestToken.deploy(owner.address);
      await testToken.waitForDeployment();
      
      // Enviar tokens al contrato principal
      await testToken.transfer(await characatoCoin.getAddress(), ethers.parseEther("100"));
      
      const initialOwnerBalance = await testToken.balanceOf(owner.address);
      
      // Recuperar tokens
      await characatoCoin.recoverERC20(await testToken.getAddress(), ethers.parseEther("100"));
      
      const finalOwnerBalance = await testToken.balanceOf(owner.address);
      expect(finalOwnerBalance).to.equal(initialOwnerBalance + ethers.parseEther("100"));
    });

    it("Should not allow recovering own tokens", async function () {
      await expect(
        characatoCoin.recoverERC20(await characatoCoin.getAddress(), ethers.parseEther("100"))
      ).to.be.revertedWith("CharacatoCoin: cannot recover own tokens");
    });

    it("Should not allow recovering from zero address", async function () {
      await expect(
        characatoCoin.recoverERC20(ethers.ZeroAddress, ethers.parseEther("100"))
      ).to.be.revertedWith("CharacatoCoin: invalid token address");
    });
  });

  describe("View Functions Tests", function () {
    it("Should return correct token information", async function () {
      const tokenInfo = await characatoCoin.getTokenInfo();
      
      expect(tokenInfo[0]).to.equal("Characato Coin");
      expect(tokenInfo[1]).to.equal("CHCOIN");
      expect(tokenInfo[2]).to.equal(18);
      expect(tokenInfo[3]).to.equal(ethers.parseEther("1000000"));
      expect(tokenInfo[4]).to.equal(ethers.parseEther("10000000"));
      expect(tokenInfo[5]).to.equal(ethers.parseEther("1000000"));
      expect(tokenInfo[6]).to.equal(false);
    });

    it("Should return correct token information when paused", async function () {
      await characatoCoin.pause();
      const tokenInfo = await characatoCoin.getTokenInfo();
      
      expect(tokenInfo[6]).to.equal(true); // isPaused should be true
    });

    it("Should update token info after minting", async function () {
      const mintAmount = ethers.parseEther("1000");
      await characatoCoin.mint(addr1.address, mintAmount);
      
      const tokenInfo = await characatoCoin.getTokenInfo();
      expect(tokenInfo[3]).to.equal(ethers.parseEther("1001000")); // total supply increased
      expect(tokenInfo[5]).to.equal(ethers.parseEther("1001000")); // total minted increased
    });
  });

  describe("Edge Cases", function () {
    it("Should handle maximum supply edge case", async function () {
      const maxSupply = ethers.parseEther("10000000");
      const currentSupply = await characatoCoin.totalSupply();
      const remainingToMax = maxSupply - currentSupply;
      
      // Mintear hasta el máximo
      await characatoCoin.mint(addr1.address, remainingToMax);
      
      // Intentar mintear más debería fallar
      await expect(
        characatoCoin.mint(addr1.address, 1)
      ).to.be.revertedWith("CharacatoCoin: would exceed max supply");
    });

    it("Should handle multiple transfers correctly", async function () {
      const transferAmount = ethers.parseEther("100");
      
      // Transfer chain: owner -> addr1 -> addr2 -> addr3
      await characatoCoin.transfer(addr1.address, transferAmount);
      await characatoCoin.connect(addr1).transfer(addr2.address, transferAmount);
      await characatoCoin.connect(addr2).transfer(addr3.address, transferAmount);
      
      expect(await characatoCoin.balanceOf(addr3.address)).to.equal(transferAmount);
      expect(await characatoCoin.balanceOf(addr2.address)).to.equal(0);
      expect(await characatoCoin.balanceOf(addr1.address)).to.equal(0);
    });

    it("Should handle allowance edge cases", async function () {
      const allowanceAmount = ethers.parseEther("100");
      
      // Aprobar
      await characatoCoin.approve(addr1.address, allowanceAmount);
      expect(await characatoCoin.allowance(owner.address, addr1.address)).to.equal(allowanceAmount);
      
      // Reducir allowance a cero
      await characatoCoin.approve(addr1.address, 0);
      expect(await characatoCoin.allowance(owner.address, addr1.address)).to.equal(0);
    });
  });

  describe("Gas Optimization Tests", function () {
    it("Should use reasonable gas for basic operations", async function () {
      const transferTx = await characatoCoin.transfer(addr1.address, ethers.parseEther("100"));
      const receipt = await transferTx.wait();
      
      // Transfer debería usar menos de 100k gas
      expect(receipt.gasUsed).to.be.lt(100000);
    });

    it("Should use reasonable gas for minting", async function () {
      const mintTx = await characatoCoin.mint(addr1.address, ethers.parseEther("100"));
      const receipt = await mintTx.wait();
      
      // Mint debería usar menos de 150k gas
      expect(receipt.gasUsed).to.be.lt(150000);
    });
  });
});
