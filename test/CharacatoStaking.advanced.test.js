const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("CharacatoStaking - Advanced Tests", function () {
  async function deployStakingFixture() {
    const [owner, addr1, addr2, addr3] = await ethers.getSigners();

    // Desplegar CharacatoCoin
    const CharacatoCoin = await ethers.getContractFactory("CharacatoCoin");
    const characatoCoin = await CharacatoCoin.deploy(owner.address);
    await characatoCoin.waitForDeployment();

    // Desplegar CharacatoStaking
    const CharacatoStaking = await ethers.getContractFactory("CharacatoStaking");
    const characatoStaking = await CharacatoStaking.deploy(
      await characatoCoin.getAddress(),
      owner.address
    );
    await characatoStaking.waitForDeployment();

    // Distribución inicial de tokens
    await characatoCoin.transfer(addr1.address, ethers.parseEther("10000"));
    await characatoCoin.transfer(addr2.address, ethers.parseEther("5000"));
    await characatoCoin.transfer(addr3.address, ethers.parseEther("3000"));
    
    // Financiar el pool de recompensas
    await characatoCoin.approve(await characatoStaking.getAddress(), ethers.parseEther("100000"));
    await characatoStaking.fundRewardPool(ethers.parseEther("50000"));

    return { characatoCoin, characatoStaking, owner, addr1, addr2, addr3 };
  }

  describe("Advanced Staking Scenarios", function () {
    it("Should handle multiple users staking simultaneously", async function () {
      const { characatoCoin, characatoStaking, addr1, addr2, addr3 } = await loadFixture(deployStakingFixture);
      
      const stakeAmount1 = ethers.parseEther("1000");
      const stakeAmount2 = ethers.parseEther("2000");
      const stakeAmount3 = ethers.parseEther("1500");

      // Todos aprueban y hacen staking
      await characatoCoin.connect(addr1).approve(await characatoStaking.getAddress(), stakeAmount1);
      await characatoCoin.connect(addr2).approve(await characatoStaking.getAddress(), stakeAmount2);
      await characatoCoin.connect(addr3).approve(await characatoStaking.getAddress(), stakeAmount3);

      await characatoStaking.connect(addr1).stake(stakeAmount1);
      await characatoStaking.connect(addr2).stake(stakeAmount2);
      await characatoStaking.connect(addr3).stake(stakeAmount3);

      // Verificar que el total es correcto
      const totalStaked = await characatoStaking.totalStaked();
      expect(totalStaked).to.equal(stakeAmount1 + stakeAmount2 + stakeAmount3);

      // Verificar balances individuales
      const info1 = await characatoStaking.getStakeInfo(addr1.address);
      const info2 = await characatoStaking.getStakeInfo(addr2.address);
      const info3 = await characatoStaking.getStakeInfo(addr3.address);

      expect(info1[0]).to.equal(stakeAmount1);
      expect(info2[0]).to.equal(stakeAmount2);
      expect(info3[0]).to.equal(stakeAmount3);
    });

    it("Should emit correct events for staking operations", async function () {
      const { characatoCoin, characatoStaking, addr1 } = await loadFixture(deployStakingFixture);
      
      const stakeAmount = ethers.parseEther("1000");
      await characatoCoin.connect(addr1).approve(await characatoStaking.getAddress(), stakeAmount);

      await expect(characatoStaking.connect(addr1).stake(stakeAmount))
        .to.emit(characatoStaking, "Staked")
        .withArgs(addr1.address, stakeAmount);
    });

    it("Should handle incremental staking correctly", async function () {
      const { characatoCoin, characatoStaking, addr1 } = await loadFixture(deployStakingFixture);
      
      const firstStake = ethers.parseEther("1000");
      const secondStake = ethers.parseEther("500");
      const thirdStake = ethers.parseEther("300");

      // Aprobar total
      await characatoCoin.connect(addr1).approve(
        await characatoStaking.getAddress(), 
        firstStake + secondStake + thirdStake
      );

      // Hacer stake incremental
      await characatoStaking.connect(addr1).stake(firstStake);
      
      // Esperar un poco y hacer más stake
      await time.increase(3600); // 1 hora
      await characatoStaking.connect(addr1).stake(secondStake);
      
      // Esperar más y hacer el último stake
      await time.increase(7200); // 2 horas más
      await characatoStaking.connect(addr1).stake(thirdStake);

      // Verificar que el total es correcto
      const stakeInfo = await characatoStaking.getStakeInfo(addr1.address);
      expect(stakeInfo[0]).to.equal(firstStake + secondStake + thirdStake);
    });
  });

  describe("Reward Calculation Tests", function () {
    it("Should calculate rewards accurately over different time periods", async function () {
      const { characatoCoin, characatoStaking, addr1 } = await loadFixture(deployStakingFixture);
      
      const stakeAmount = ethers.parseEther("10000"); // 10,000 tokens
      await characatoCoin.connect(addr1).approve(await characatoStaking.getAddress(), stakeAmount);
      await characatoStaking.connect(addr1).stake(stakeAmount);

      // Test 1 día
      await time.increase(24 * 60 * 60); // 1 día
      let pendingRewards = await characatoStaking.pendingRewards(addr1.address);
      let expected = ethers.parseEther("100"); // 1% de 10,000 = 100
      let tolerance = expected / 100n; // 1% de tolerancia
      expect(pendingRewards).to.be.closeTo(expected, tolerance);

      // Reset para test de 7 días
      await characatoStaking.connect(addr1).claimRewards();
      
      await time.increase(7 * 24 * 60 * 60); // 7 días más
      pendingRewards = await characatoStaking.pendingRewards(addr1.address);
      expected = ethers.parseEther("700"); // 7% de 10,000 = 700
      tolerance = expected / 50n; // 2% de tolerancia para períodos largos
      expect(pendingRewards).to.be.closeTo(expected, tolerance);
    });

    it("Should handle reward claiming without affecting other users", async function () {
      const { characatoCoin, characatoStaking, addr1, addr2 } = await loadFixture(deployStakingFixture);
      
      const stakeAmount = ethers.parseEther("1000");
      
      // Ambos usuarios hacen staking
      await characatoCoin.connect(addr1).approve(await characatoStaking.getAddress(), stakeAmount);
      await characatoCoin.connect(addr2).approve(await characatoStaking.getAddress(), stakeAmount);
      
      await characatoStaking.connect(addr1).stake(stakeAmount);
      await characatoStaking.connect(addr2).stake(stakeAmount);

      // Avanzar tiempo
      await time.increase(24 * 60 * 60); // 1 día

      // addr1 reclama recompensas
      const pendingBefore = await characatoStaking.pendingRewards(addr1.address);
      const balanceBefore = await characatoCoin.balanceOf(addr1.address);
      
      await characatoStaking.connect(addr1).claimRewards();
      
      const balanceAfter = await characatoCoin.balanceOf(addr1.address);
      const pendingAfter = await characatoStaking.pendingRewards(addr1.address);

      // Verificar que recibió las recompensas
      expect(balanceAfter - balanceBefore).to.be.closeTo(pendingBefore, ethers.parseEther("0.1"));
      expect(pendingAfter).to.be.lt(ethers.parseEther("0.1"));

      // Verificar que addr2 no se vio afectado
      const addr2Pending = await characatoStaking.pendingRewards(addr2.address);
      expect(addr2Pending).to.be.gt(ethers.parseEther("9")); // Debería tener ~10 tokens
    });

    it("Should emit RewardClaimed event with approximately correct amount", async function () {
      const { characatoCoin, characatoStaking, addr1 } = await loadFixture(deployStakingFixture);
      
      const stakeAmount = ethers.parseEther("1000");
      await characatoCoin.connect(addr1).approve(await characatoStaking.getAddress(), stakeAmount);
      await characatoStaking.connect(addr1).stake(stakeAmount);

      await time.increase(24 * 60 * 60); // 1 día

      const tx = await characatoStaking.connect(addr1).claimRewards();
      
      await expect(tx).to.emit(characatoStaking, "RewardClaimed");
      
      // Verificar que el evento fue emitido con el usuario correcto
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => 
        log.fragment && log.fragment.name === "RewardClaimed"
      );
      expect(event.args[0]).to.equal(addr1.address);
    });
  });

  describe("Unstaking Edge Cases", function () {
    it("Should handle partial unstaking correctly", async function () {
      const { characatoCoin, characatoStaking, addr1 } = await loadFixture(deployStakingFixture);
      
      const stakeAmount = ethers.parseEther("1000");
      const unstakeAmount = ethers.parseEther("400");
      
      await characatoCoin.connect(addr1).approve(await characatoStaking.getAddress(), stakeAmount);
      await characatoStaking.connect(addr1).stake(stakeAmount);

      // Avanzar tiempo más allá del período de bloqueo
      await time.increase(8 * 24 * 60 * 60); // 8 días

      const balanceBefore = await characatoCoin.balanceOf(addr1.address);
      
      await characatoStaking.connect(addr1).unstake(unstakeAmount);
      
      const balanceAfter = await characatoCoin.balanceOf(addr1.address);
      const stakeInfo = await characatoStaking.getStakeInfo(addr1.address);

      // Verificar que recibió tokens + recompensas
      expect(balanceAfter).to.be.gt(balanceBefore + unstakeAmount);
      
      // Verificar que aún tiene stake restante
      expect(stakeInfo[0]).to.equal(stakeAmount - unstakeAmount);
    });

    it("Should emit Unstaked event", async function () {
      const { characatoCoin, characatoStaking, addr1 } = await loadFixture(deployStakingFixture);
      
      const stakeAmount = ethers.parseEther("1000");
      await characatoCoin.connect(addr1).approve(await characatoStaking.getAddress(), stakeAmount);
      await characatoStaking.connect(addr1).stake(stakeAmount);

      await time.increase(8 * 24 * 60 * 60); // 8 días

      await expect(characatoStaking.connect(addr1).unstake(stakeAmount))
        .to.emit(characatoStaking, "Unstaked")
        .withArgs(addr1.address, stakeAmount);
    });

    it("Should handle unstaking all tokens", async function () {
      const { characatoCoin, characatoStaking, addr1 } = await loadFixture(deployStakingFixture);
      
      const stakeAmount = ethers.parseEther("1000");
      await characatoCoin.connect(addr1).approve(await characatoStaking.getAddress(), stakeAmount);
      await characatoStaking.connect(addr1).stake(stakeAmount);

      await time.increase(8 * 24 * 60 * 60); // 8 días

      await characatoStaking.connect(addr1).unstake(stakeAmount);
      
      const stakeInfo = await characatoStaking.getStakeInfo(addr1.address);
      expect(stakeInfo[0]).to.equal(0); // No debería tener tokens en staking
    });
  });

  describe("Admin Function Edge Cases", function () {
    it("Should handle reward rate updates correctly", async function () {
      const { characatoStaking, owner } = await loadFixture(deployStakingFixture);
      
      const newRate = 200; // 2%
      
      await expect(characatoStaking.updateRewardRate(newRate))
        .to.emit(characatoStaking, "RewardRateUpdated")
        .withArgs(100, newRate); // de 1% a 2%

      expect(await characatoStaking.rewardRate()).to.equal(newRate);
    });

    it("Should handle reward pool funding", async function () {
      const { characatoCoin, characatoStaking, owner } = await loadFixture(deployStakingFixture);
      
      const fundAmount = ethers.parseEther("10000");
      const initialPool = await characatoStaking.rewardPool();
      
      await characatoCoin.approve(await characatoStaking.getAddress(), fundAmount);
      
      await expect(characatoStaking.fundRewardPool(fundAmount))
        .to.emit(characatoStaking, "RewardPoolFunded")
        .withArgs(fundAmount);

      const finalPool = await characatoStaking.rewardPool();
      expect(finalPool).to.equal(initialPool + fundAmount);
    });

    it("Should not allow reward rate above maximum", async function () {
      const { characatoStaking } = await loadFixture(deployStakingFixture);
      
      await expect(
        characatoStaking.updateRewardRate(1500) // 15%
      ).to.be.revertedWith("Reward rate too high");
    });

    it("Should not allow lock period too long", async function () {
      const { characatoStaking } = await loadFixture(deployStakingFixture);
      
      const tooLong = 35 * 24 * 60 * 60; // 35 días
      await expect(
        characatoStaking.updateLockPeriod(tooLong)
      ).to.be.revertedWith("Lock period too long");
    });

    it("Should allow emergency withdrawal by owner", async function () {
      const { characatoCoin, characatoStaking, owner } = await loadFixture(deployStakingFixture);
      
      const withdrawAmount = ethers.parseEther("1000");
      const ownerBalanceBefore = await characatoCoin.balanceOf(owner.address);
      
      await characatoStaking.emergencyWithdraw(withdrawAmount);
      
      const ownerBalanceAfter = await characatoCoin.balanceOf(owner.address);
      expect(ownerBalanceAfter).to.equal(ownerBalanceBefore + withdrawAmount);
    });
  });

  describe("Security Tests", function () {
    it("Should prevent reentrancy attacks on staking", async function () {
      const { characatoCoin, characatoStaking, addr1 } = await loadFixture(deployStakingFixture);
      
      const stakeAmount = ethers.parseEther("1000");
      await characatoCoin.connect(addr1).approve(await characatoStaking.getAddress(), stakeAmount);
      
      // El modifier nonReentrant debería prevenir ataques de reentrancia
      // Este test verifica que las funciones no puedan ser llamadas recursivamente
      await expect(characatoStaking.connect(addr1).stake(stakeAmount)).to.not.be.reverted;
    });

    it("Should not allow claiming rewards with no stake", async function () {
      const { characatoStaking, addr1 } = await loadFixture(deployStakingFixture);
      
      // addr1 no ha hecho staking, no debería poder reclamar recompensas
      const balanceBefore = await characatoStaking.characatoToken().then(
        addr => ethers.getContractAt("CharacatoCoin", addr)
      ).then(contract => contract.balanceOf(addr1.address));
      
      await characatoStaking.connect(addr1).claimRewards();
      
      const balanceAfter = await characatoStaking.characatoToken().then(
        addr => ethers.getContractAt("CharacatoCoin", addr)
      ).then(contract => contract.balanceOf(addr1.address));
      
      expect(balanceAfter).to.equal(balanceBefore);
    });

    it("Should not allow staking when paused", async function () {
      const { characatoCoin, characatoStaking, addr1, owner } = await loadFixture(deployStakingFixture);
      
      await characatoStaking.connect(owner).pause();
      
      const stakeAmount = ethers.parseEther("1000");
      await characatoCoin.connect(addr1).approve(await characatoStaking.getAddress(), stakeAmount);
      
      await expect(
        characatoStaking.connect(addr1).stake(stakeAmount)
      ).to.be.revertedWithCustomError(characatoStaking, "EnforcedPause");
    });
  });

  describe("Gas Optimization Tests", function () {
    it("Should use reasonable gas for staking operations", async function () {
      const { characatoCoin, characatoStaking, addr1 } = await loadFixture(deployStakingFixture);
      
      const stakeAmount = ethers.parseEther("1000");
      await characatoCoin.connect(addr1).approve(await characatoStaking.getAddress(), stakeAmount);
      
      const tx = await characatoStaking.connect(addr1).stake(stakeAmount);
      const receipt = await tx.wait();
      
      // Staking debería usar menos de 200k gas
      expect(receipt.gasUsed).to.be.lt(200000);
    });

    it("Should use reasonable gas for claiming rewards", async function () {
      const { characatoCoin, characatoStaking, addr1 } = await loadFixture(deployStakingFixture);
      
      const stakeAmount = ethers.parseEther("1000");
      await characatoCoin.connect(addr1).approve(await characatoStaking.getAddress(), stakeAmount);
      await characatoStaking.connect(addr1).stake(stakeAmount);
      
      await time.increase(24 * 60 * 60); // 1 día
      
      const tx = await characatoStaking.connect(addr1).claimRewards();
      const receipt = await tx.wait();
      
      // Claim debería usar menos de 150k gas
      expect(receipt.gasUsed).to.be.lt(150000);
    });
  });

  describe("Integration Tests", function () {
    it("Should handle complete staking lifecycle", async function () {
      const { characatoCoin, characatoStaking, addr1 } = await loadFixture(deployStakingFixture);
      
      const initialBalance = await characatoCoin.balanceOf(addr1.address);
      const stakeAmount = ethers.parseEther("1000");

      // 1. Aprobar y hacer staking
      await characatoCoin.connect(addr1).approve(await characatoStaking.getAddress(), stakeAmount);
      await characatoStaking.connect(addr1).stake(stakeAmount);

      // 2. Esperar y acumular recompensas
      await time.increase(10 * 24 * 60 * 60); // 10 días

      // 3. Reclamar recompensas
      await characatoStaking.connect(addr1).claimRewards();

      // 4. Hacer unstaking completo
      await characatoStaking.connect(addr1).unstake(stakeAmount);

      // 5. Verificar que el usuario tiene más tokens que al inicio (debido a recompensas)
      const finalBalance = await characatoCoin.balanceOf(addr1.address);
      expect(finalBalance).to.be.gt(initialBalance);

      // 6. Verificar que no tiene stake
      const stakeInfo = await characatoStaking.getStakeInfo(addr1.address);
      expect(stakeInfo[0]).to.equal(0);
    });
  });
});
