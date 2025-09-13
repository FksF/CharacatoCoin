const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("CharacatoStaking", function () {
  let CharacatoCoin;
  let characatoCoin;
  let CharacatoStaking;
  let characatoStaking;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    // Desplegar CharacatoCoin
    CharacatoCoin = await ethers.getContractFactory("CharacatoCoin");
    characatoCoin = await CharacatoCoin.deploy(owner.address);
    await characatoCoin.waitForDeployment();

    // Desplegar CharacatoStaking
    CharacatoStaking = await ethers.getContractFactory("CharacatoStaking");
    characatoStaking = await CharacatoStaking.deploy(
      await characatoCoin.getAddress(),
      owner.address
    );
    await characatoStaking.waitForDeployment();

    // Transferir tokens a addr1 para testing
    await characatoCoin.transfer(addr1.address, ethers.parseEther("10000"));
    
    // Financiar el pool de recompensas
    await characatoCoin.approve(await characatoStaking.getAddress(), ethers.parseEther("100000"));
    await characatoStaking.fundRewardPool(ethers.parseEther("50000"));
  });

  describe("Deployment", function () {
    it("Should deploy with correct initial values", async function () {
      expect(await characatoStaking.characatoToken()).to.equal(await characatoCoin.getAddress());
      expect(await characatoStaking.owner()).to.equal(owner.address);
      expect(await characatoStaking.rewardRate()).to.equal(100); // 1%
      expect(await characatoStaking.minimumStakeAmount()).to.equal(ethers.parseEther("100"));
    });

    it("Should have funded reward pool", async function () {
      expect(await characatoStaking.rewardPool()).to.equal(ethers.parseEther("50000"));
    });
  });

  describe("Staking", function () {
    it("Should allow users to stake tokens", async function () {
      const stakeAmount = ethers.parseEther("1000");
      
      // Aprobar tokens
      await characatoCoin.connect(addr1).approve(await characatoStaking.getAddress(), stakeAmount);
      
      // Hacer stake
      await characatoStaking.connect(addr1).stake(stakeAmount);
      
      const stakeInfo = await characatoStaking.getStakeInfo(addr1.address);
      expect(stakeInfo[0]).to.equal(stakeAmount); // stakedAmount
      expect(await characatoStaking.totalStaked()).to.equal(stakeAmount);
    });

    it("Should not allow staking below minimum amount", async function () {
      const stakeAmount = ethers.parseEther("50"); // Menos del mínimo
      
      await characatoCoin.connect(addr1).approve(await characatoStaking.getAddress(), stakeAmount);
      
      await expect(
        characatoStaking.connect(addr1).stake(stakeAmount)
      ).to.be.revertedWith("Amount below minimum stake");
    });

    it("Should not allow staking without sufficient balance", async function () {
      const stakeAmount = ethers.parseEther("20000"); // Más de lo que tiene addr1
      
      await characatoCoin.connect(addr1).approve(await characatoStaking.getAddress(), stakeAmount);
      
      await expect(
        characatoStaking.connect(addr1).stake(stakeAmount)
      ).to.be.revertedWith("Insufficient balance");
    });

    it("Should accumulate multiple stakes", async function () {
      const firstStake = ethers.parseEther("1000");
      const secondStake = ethers.parseEther("500");
      
      // Aprobar tokens
      await characatoCoin.connect(addr1).approve(
        await characatoStaking.getAddress(), 
        firstStake + secondStake
      );
      
      // Primer stake
      await characatoStaking.connect(addr1).stake(firstStake);
      
      // Segundo stake
      await characatoStaking.connect(addr1).stake(secondStake);
      
      const stakeInfo = await characatoStaking.getStakeInfo(addr1.address);
      expect(stakeInfo[0]).to.equal(firstStake + secondStake);
    });
  });

  describe("Unstaking", function () {
    beforeEach(async function () {
      const stakeAmount = ethers.parseEther("1000");
      await characatoCoin.connect(addr1).approve(await characatoStaking.getAddress(), stakeAmount);
      await characatoStaking.connect(addr1).stake(stakeAmount);
    });

    it("Should not allow unstaking during lock period", async function () {
      const unstakeAmount = ethers.parseEther("500");
      
      await expect(
        characatoStaking.connect(addr1).unstake(unstakeAmount)
      ).to.be.revertedWith("Tokens are still locked");
    });

    it("Should allow unstaking after lock period", async function () {
      const unstakeAmount = ethers.parseEther("500");
      
      // Avanzar tiempo más allá del período de bloqueo
      await time.increase(8 * 24 * 60 * 60); // 8 días
      
      const initialBalance = await characatoCoin.balanceOf(addr1.address);
      await characatoStaking.connect(addr1).unstake(unstakeAmount);
      
      const finalBalance = await characatoCoin.balanceOf(addr1.address);
      expect(finalBalance).to.be.gt(initialBalance); // Debería incluir tokens + recompensas
      
      const stakeInfo = await characatoStaking.getStakeInfo(addr1.address);
      expect(stakeInfo[0]).to.equal(ethers.parseEther("500")); // 1000 - 500
    });

    it("Should not allow unstaking more than staked", async function () {
      const unstakeAmount = ethers.parseEther("2000"); // Más de lo que tiene en stake
      
      await time.increase(8 * 24 * 60 * 60); // 8 días
      
      await expect(
        characatoStaking.connect(addr1).unstake(unstakeAmount)
      ).to.be.revertedWith("Insufficient staked amount");
    });
  });

  describe("Rewards", function () {
    beforeEach(async function () {
      const stakeAmount = ethers.parseEther("1000");
      await characatoCoin.connect(addr1).approve(await characatoStaking.getAddress(), stakeAmount);
      await characatoStaking.connect(addr1).stake(stakeAmount);
    });

    it("Should calculate pending rewards correctly", async function () {
      // Avanzar 1 día
      await time.increase(24 * 60 * 60);
      
      const pendingRewards = await characatoStaking.pendingRewards(addr1.address);
      
      // Debería ser aproximadamente 1% de 1000 tokens = 10 tokens
      expect(pendingRewards).to.be.closeTo(
        ethers.parseEther("10"),
        ethers.parseEther("0.1") // Tolerancia de 0.1 tokens
      );
    });

    it("Should allow claiming rewards", async function () {
      // Avanzar 1 día
      await time.increase(24 * 60 * 60);
      
      const initialBalance = await characatoCoin.balanceOf(addr1.address);
      const pendingBefore = await characatoStaking.pendingRewards(addr1.address);
      
      await characatoStaking.connect(addr1).claimRewards();
      
      const finalBalance = await characatoCoin.balanceOf(addr1.address);
      expect(finalBalance - initialBalance).to.be.closeTo(
        pendingBefore,
        ethers.parseEther("0.01")
      );
    });

    it("Should reset reward debt after claiming", async function () {
      // Avanzar 1 día
      await time.increase(24 * 60 * 60);
      
      await characatoStaking.connect(addr1).claimRewards();
      
      // Las recompensas pendientes deberían ser mínimas después de reclamar
      const pendingAfterClaim = await characatoStaking.pendingRewards(addr1.address);
      expect(pendingAfterClaim).to.be.lt(ethers.parseEther("0.1"));
    });
  });

  describe("Admin functions", function () {
    it("Should allow owner to update reward rate", async function () {
      await characatoStaking.updateRewardRate(200); // 2%
      expect(await characatoStaking.rewardRate()).to.equal(200);
    });

    it("Should not allow setting reward rate too high", async function () {
      await expect(
        characatoStaking.updateRewardRate(1500) // 15%
      ).to.be.revertedWith("Reward rate too high");
    });

    it("Should allow owner to update minimum stake amount", async function () {
      const newMinimum = ethers.parseEther("200");
      await characatoStaking.updateMinimumStakeAmount(newMinimum);
      expect(await characatoStaking.minimumStakeAmount()).to.equal(newMinimum);
    });

    it("Should allow owner to update lock period", async function () {
      const newLockPeriod = 14 * 24 * 60 * 60; // 14 días
      await characatoStaking.updateLockPeriod(newLockPeriod);
      expect(await characatoStaking.lockPeriod()).to.equal(newLockPeriod);
    });

    it("Should not allow lock period too long", async function () {
      const tooLongPeriod = 35 * 24 * 60 * 60; // 35 días
      await expect(
        characatoStaking.updateLockPeriod(tooLongPeriod)
      ).to.be.revertedWith("Lock period too long");
    });

    it("Should allow owner to pause and unpause", async function () {
      await characatoStaking.pause();
      expect(await characatoStaking.paused()).to.be.true;

      // No debería permitir staking cuando está pausado
      const stakeAmount = ethers.parseEther("1000");
      await characatoCoin.connect(addr1).approve(await characatoStaking.getAddress(), stakeAmount);
      
      await expect(
        characatoStaking.connect(addr1).stake(stakeAmount)
      ).to.be.revertedWithCustomError(characatoStaking, "EnforcedPause");

      await characatoStaking.unpause();
      expect(await characatoStaking.paused()).to.be.false;
    });

    it("Should not allow non-owners to use admin functions", async function () {
      await expect(
        characatoStaking.connect(addr1).updateRewardRate(200)
      ).to.be.revertedWithCustomError(characatoStaking, "OwnableUnauthorizedAccount");

      await expect(
        characatoStaking.connect(addr1).pause()
      ).to.be.revertedWithCustomError(characatoStaking, "OwnableUnauthorizedAccount");
    });
  });

  describe("Funding reward pool", function () {
    it("Should allow owner to fund reward pool", async function () {
      const fundAmount = ethers.parseEther("10000");
      const initialPool = await characatoStaking.rewardPool();
      
      await characatoCoin.approve(await characatoStaking.getAddress(), fundAmount);
      await characatoStaking.fundRewardPool(fundAmount);
      
      const finalPool = await characatoStaking.rewardPool();
      expect(finalPool).to.equal(initialPool + fundAmount);
    });
  });
});
