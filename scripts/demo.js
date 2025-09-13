import hre from "hardhat";
import fs from 'fs';
import path from 'path';

async function main() {
  console.log("🚀 === DEMO COMPLETA CHARACATO COIN ===");
  console.log();

  const [deployer, user1, user2] = await hre.ethers.getSigners();

  console.log("👥 Cuentas disponibles:");
  console.log("💼 Deployer:", deployer.address);
  console.log("👤 Usuario 1:", user1.address);
  console.log("👤 Usuario 2:", user2.address);
  console.log();

  // Paso 1: Desplegar CharacatoCoin
  console.log("📋 PASO 1: Desplegando CharacatoCoin...");
  const CharacatoCoin = await hre.ethers.getContractFactory("CharacatoCoin");
  const characatoCoin = await CharacatoCoin.deploy(deployer.address);
  await characatoCoin.waitForDeployment();
  
  const coinAddress = await characatoCoin.getAddress();
  console.log("✅ CharacatoCoin desplegado en:", coinAddress);

  // Paso 2: Desplegar CharacatoStaking
  console.log("\n📋 PASO 2: Desplegando CharacatoStaking...");
  const CharacatoStaking = await hre.ethers.getContractFactory("CharacatoStaking");
  const characatoStaking = await CharacatoStaking.deploy(
    coinAddress,
    deployer.address
  );
  await characatoStaking.waitForDeployment();
  
  const stakingAddress = await characatoStaking.getAddress();
  console.log("✅ CharacatoStaking desplegado en:", stakingAddress);

  // Paso 3: Configuración inicial
  console.log("\n📋 PASO 3: Configuración inicial...");
  
  // Financiar el pool de recompensas
  const rewardPoolAmount = hre.ethers.parseEther("50000");
  await characatoCoin.approve(stakingAddress, rewardPoolAmount);
  await characatoStaking.fundRewardPool(rewardPoolAmount);
  console.log("✅ Pool de recompensas financiado con 50,000 CHCOIN");

  // Transferir tokens a usuarios para demo
  const userAmount = hre.ethers.parseEther("10000");
  await characatoCoin.transfer(user1.address, userAmount);
  await characatoCoin.transfer(user2.address, userAmount);
  console.log("✅ Transferidos 10,000 CHCOIN a cada usuario");

  // Paso 4: Demostración de funcionalidades
  console.log("\n📋 PASO 4: Demostración de funcionalidades...");

  // Mostrar balances iniciales
  console.log("\n💰 Balances iniciales:");
  console.log("Deployer:", hre.ethers.formatEther(await characatoCoin.balanceOf(deployer.address)), "CHCOIN");
  console.log("Usuario 1:", hre.ethers.formatEther(await characatoCoin.balanceOf(user1.address)), "CHCOIN");
  console.log("Usuario 2:", hre.ethers.formatEther(await characatoCoin.balanceOf(user2.address)), "CHCOIN");

  // Usuario 1 hace staking
  console.log("\n🔒 Usuario 1 hace staking de 5,000 CHCOIN...");
  const stakeAmount = hre.ethers.parseEther("5000");
  await characatoCoin.connect(user1).approve(stakingAddress, stakeAmount);
  await characatoStaking.connect(user1).stake(stakeAmount);
  console.log("✅ Staking completado");

  // Usuario 2 hace una transferencia
  console.log("\n💸 Usuario 2 transfiere 1,000 CHCOIN al Usuario 1...");
  const transferAmount = hre.ethers.parseEther("1000");
  await characatoCoin.connect(user2).transfer(user1.address, transferAmount);
  console.log("✅ Transferencia completada");

  // Mostrar información del staking
  console.log("\n📊 Información de staking:");
  const stakeInfo = await characatoStaking.getStakeInfo(user1.address);
  console.log("Total en staking:", hre.ethers.formatEther(stakeInfo[0]), "CHCOIN");
  console.log("Timestamp de inicio:", new Date(Number(stakeInfo[1]) * 1000).toLocaleString());
  console.log("Última actualización:", new Date(Number(stakeInfo[2]) * 1000).toLocaleString());

  // Simular paso del tiempo y mostrar recompensas
  console.log("\n⏱️  Simulando paso del tiempo (24 horas)...");
  await hre.network.provider.send("evm_increaseTime", [24 * 60 * 60]); // 24 horas
  await hre.network.provider.send("evm_mine"); // Minar un bloque

  const pendingRewards = await characatoStaking.pendingRewards(user1.address);
  console.log("💎 Recompensas pendientes:", hre.ethers.formatEther(pendingRewards), "CHCOIN");

  // Usuario 1 reclama recompensas
  console.log("\n💰 Usuario 1 reclama recompensas...");
  await characatoStaking.connect(user1).claimRewards();
  console.log("✅ Recompensas reclamadas");

  // Mostrar balances finales
  console.log("\n💰 Balances finales:");
  console.log("Deployer:", hre.ethers.formatEther(await characatoCoin.balanceOf(deployer.address)), "CHCOIN");
  console.log("Usuario 1:", hre.ethers.formatEther(await characatoCoin.balanceOf(user1.address)), "CHCOIN");
  console.log("Usuario 2:", hre.ethers.formatEther(await characatoCoin.balanceOf(user2.address)), "CHCOIN");

  // Paso 5: Guardar configuración para frontend
  console.log("\n📋 PASO 5: Guardando configuración para frontend...");
  
  const frontendConfigPath = path.join(process.cwd(), 'frontend', 'src', 'assets');
  if (!fs.existsSync(frontendConfigPath)) {
    fs.mkdirSync(frontendConfigPath, { recursive: true });
  }

  const config = {
    networkName: "localhost",
    chainId: 31337,
    contracts: {
      CharacatoCoin: {
        address: coinAddress,
        abi: JSON.parse(fs.readFileSync(
          path.join(process.cwd(), 'artifacts/contracts/CharacatoCoin.sol/CharacatoCoin.json')
        )).abi
      },
      CharacatoStaking: {
        address: stakingAddress,
        abi: JSON.parse(fs.readFileSync(
          path.join(process.cwd(), 'artifacts/contracts/CharacatoStaking.sol/CharacatoStaking.json')
        )).abi
      }
    },
    accounts: {
      deployer: deployer.address,
      user1: user1.address,
      user2: user2.address
    }
  };

  fs.writeFileSync(
    path.join(frontendConfigPath, 'contracts-config.json'),
    JSON.stringify(config, null, 2)
  );

  console.log("✅ Configuración guardada en frontend/src/assets/contracts-config.json");

  // Resumen final
  console.log("\n🎉 === DEMO COMPLETADA ===");
  console.log("📋 Resumen:");
  console.log("✅ Contratos desplegados exitosamente");
  console.log("✅ Pool de recompensas financiado");
  console.log("✅ Usuarios configurados con tokens");
  console.log("✅ Funcionalidades de staking demostradas");
  console.log("✅ Sistema de recompensas funcionando");
  console.log("✅ Configuración de frontend generada");
  console.log();
  console.log("🌐 Frontend disponible en: http://localhost:4200");
  console.log("🔗 Conecta MetaMask a la red local (http://127.0.0.1:8545)");
  console.log("🔑 Importa una de las cuentas privadas mostradas por Hardhat");
  console.log();
  console.log("📦 Direcciones de contratos:");
  console.log("🪙 CharacatoCoin:", coinAddress);
  console.log("🔒 CharacatoStaking:", stakingAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error durante la demo:", error);
    process.exit(1);
  });
