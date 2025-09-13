const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CharacatoCoin", function () {
  let CharacatoCoin;
  let characatoCoin;
  let owner;
  let addr1;
  let addr2;
  let addrs;

  beforeEach(async function () {
    // Obtener signatarios
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    // Desplegar contrato
    CharacatoCoin = await ethers.getContractFactory("CharacatoCoin");
    characatoCoin = await CharacatoCoin.deploy(owner.address);
    await characatoCoin.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should deploy with correct initial values", async function () {
      const tokenInfo = await characatoCoin.getTokenInfo();
      
      expect(tokenInfo[0]).to.equal("Characato Coin"); // name
      expect(tokenInfo[1]).to.equal("CHCOIN"); // symbol
      expect(tokenInfo[2]).to.equal(18); // decimals
      expect(tokenInfo[3]).to.equal(ethers.parseEther("1000000")); // total supply
      expect(tokenInfo[4]).to.equal(ethers.parseEther("10000000")); // max supply
    });

    it("Should assign the total supply to the owner", async function () {
      const ownerBalance = await characatoCoin.balanceOf(owner.address);
      expect(await characatoCoin.totalSupply()).to.equal(ownerBalance);
    });

    it("Should set the owner as initial minter", async function () {
      expect(await characatoCoin.isMinter(owner.address)).to.be.true;
    });
  });

  describe("Minting", function () {
    it("Should allow owner to mint new tokens", async function () {
      const mintAmount = ethers.parseEther("1000");
      await characatoCoin.mint(addr1.address, mintAmount);
      
      expect(await characatoCoin.balanceOf(addr1.address)).to.equal(mintAmount);
    });

    it("Should not allow non-minters to mint", async function () {
      const mintAmount = ethers.parseEther("1000");
      await expect(
        characatoCoin.connect(addr1).mint(addr1.address, mintAmount)
      ).to.be.revertedWith("CharacatoCoin: caller is not a minter");
    });

    it("Should not exceed max supply", async function () {
      const excessiveAmount = ethers.parseEther("9500000"); // Más del máximo permitido
      await expect(
        characatoCoin.mint(addr1.address, excessiveAmount)
      ).to.be.revertedWith("CharacatoCoin: would exceed max supply");
    });

    it("Should add and remove minters correctly", async function () {
      // Añadir minter
      await characatoCoin.addMinter(addr1.address);
      expect(await characatoCoin.isMinter(addr1.address)).to.be.true;

      // Permitir que el nuevo minter mintee
      const mintAmount = ethers.parseEther("1000");
      await characatoCoin.connect(addr1).mint(addr2.address, mintAmount);
      expect(await characatoCoin.balanceOf(addr2.address)).to.equal(mintAmount);

      // Remover minter
      await characatoCoin.removeMinter(addr1.address);
      expect(await characatoCoin.isMinter(addr1.address)).to.be.false;

      // No debería poder mintear después de ser removido
      await expect(
        characatoCoin.connect(addr1).mint(addr2.address, mintAmount)
      ).to.be.revertedWith("CharacatoCoin: caller is not a minter");
    });
  });

  describe("Burning", function () {
    beforeEach(async function () {
      // Dar algunos tokens a addr1 para las pruebas
      const amount = ethers.parseEther("1000");
      await characatoCoin.transfer(addr1.address, amount);
    });

    it("Should allow users to burn their own tokens", async function () {
      const burnAmount = ethers.parseEther("100");
      const initialBalance = await characatoCoin.balanceOf(addr1.address);
      
      await characatoCoin.connect(addr1).burn(burnAmount);
      
      expect(await characatoCoin.balanceOf(addr1.address)).to.equal(
        initialBalance - burnAmount
      );
    });

    it("Should allow burning with allowance", async function () {
      const burnAmount = ethers.parseEther("100");
      const initialBalance = await characatoCoin.balanceOf(addr1.address);
      
      // Aprobar que addr2 queme tokens de addr1
      await characatoCoin.connect(addr1).approve(addr2.address, burnAmount);
      await characatoCoin.connect(addr2).burnFrom(addr1.address, burnAmount);
      
      expect(await characatoCoin.balanceOf(addr1.address)).to.equal(
        initialBalance - burnAmount
      );
    });
  });

  describe("Pausable", function () {
    it("Should allow owner to pause and unpause", async function () {
      // Pausar
      await characatoCoin.pause();
      expect(await characatoCoin.paused()).to.be.true;

      // No debería permitir transferencias cuando está pausado
      await expect(
        characatoCoin.transfer(addr1.address, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(characatoCoin, "EnforcedPause");

      // Reanudar
      await characatoCoin.unpause();
      expect(await characatoCoin.paused()).to.be.false;

      // Debería permitir transferencias cuando no está pausado
      await characatoCoin.transfer(addr1.address, ethers.parseEther("100"));
      expect(await characatoCoin.balanceOf(addr1.address)).to.equal(
        ethers.parseEther("100")
      );
    });

    it("Should not allow non-owners to pause", async function () {
      await expect(
        characatoCoin.connect(addr1).pause()
      ).to.be.revertedWithCustomError(characatoCoin, "OwnableUnauthorizedAccount");
    });
  });

  describe("Emergency functions", function () {
    it("Should allow owner to withdraw ETH", async function () {
      // Enviar ETH al contrato
      await owner.sendTransaction({
        to: await characatoCoin.getAddress(),
        value: ethers.parseEther("1")
      });

      const initialBalance = await ethers.provider.getBalance(owner.address);
      
      await characatoCoin.emergencyWithdraw();
      
      // El balance debería haber aumentado (menos gas fees)
      const finalBalance = await ethers.provider.getBalance(owner.address);
      expect(finalBalance).to.be.gt(initialBalance);
    });
  });

  describe("View functions", function () {
    it("Should return correct token information", async function () {
      const tokenInfo = await characatoCoin.getTokenInfo();
      
      expect(tokenInfo[0]).to.equal("Characato Coin");
      expect(tokenInfo[1]).to.equal("CHCOIN");
      expect(tokenInfo[2]).to.equal(18);
      expect(tokenInfo[3]).to.equal(ethers.parseEther("1000000"));
      expect(tokenInfo[4]).to.equal(ethers.parseEther("10000000"));
      expect(tokenInfo[5]).to.equal(ethers.parseEther("1000000"));
      expect(tokenInfo[6]).to.equal(false); // not paused
    });

    it("Should return correct remaining supply", async function () {
      const remaining = await characatoCoin.remainingSupply();
      expect(remaining).to.equal(ethers.parseEther("9000000")); // 10M - 1M initial
    });
  });
});
