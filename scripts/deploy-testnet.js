import hre from "hardhat";
import fs from 'fs';
import path from 'path';

async function main() {
  console.log("🌐 === DESPLIEGUE EN SEPOLIA TESTNET ===");
  console.log();

  const [deployer] = await hre.ethers.getSigners();

  console.log("📋 Información de despliegue:");
  console.log("🔗 Red:", hre.network.name);
  console.log("💼 Deployer:", deployer.address);
  console.log("💰 Balance:", hre.ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");
  console.log();

  // Verificar que tenemos suficiente ETH para el despliegue
  const balance = await deployer.provider.getBalance(deployer.address);
  const minBalance = hre.ethers.parseEther("0.1"); // 0.1 ETH mínimo
  
  if (balance < minBalance) {
    console.log("❌ Error: Balance insuficiente para despliegue");
    console.log("💡 Necesitas al menos 0.1 ETH en Sepolia para el despliegue");
    console.log("🚰 Puedes obtener ETH de prueba en: https://sepoliafaucet.com/");
    return;
  }

  console.log("✅ Balance suficiente para despliegue");
  console.log();

  try {
    // Paso 1: Desplegar CharacatoCoin
    console.log("📋 PASO 1: Desplegando CharacatoCoin...");
    const CharacatoCoin = await hre.ethers.getContractFactory("CharacatoCoin");
    
    // Estimar gas para el deployment
    const deploymentData = CharacatoCoin.getDeployTransaction(deployer.address);
    const estimatedGas = await deployer.estimateGas(deploymentData);
    console.log("⛽ Gas estimado para CharacatoCoin:", estimatedGas.toString());
    
    const characatoCoin = await CharacatoCoin.deploy(deployer.address);
    await characatoCoin.waitForDeployment();
    
    const coinAddress = await characatoCoin.getAddress();
    console.log("✅ CharacatoCoin desplegado en:", coinAddress);

    // Paso 2: Desplegar CharacatoStaking
    console.log("\n📋 PASO 2: Desplegando CharacatoStaking...");
    const CharacatoStaking = await hre.ethers.getContractFactory("CharacatoStaking");
    
    const stakingDeploymentData = CharacatoStaking.getDeployTransaction(coinAddress, deployer.address);
    const stakingEstimatedGas = await deployer.estimateGas(stakingDeploymentData);
    console.log("⛽ Gas estimado para CharacatoStaking:", stakingEstimatedGas.toString());
    
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
    const rewardPoolAmount = hre.ethers.parseEther("10000"); // 10K para testnet
    console.log("🔄 Aprobando tokens para el pool de recompensas...");
    const approveTx = await characatoCoin.approve(stakingAddress, rewardPoolAmount);
    await approveTx.wait();
    
    console.log("🔄 Financiando pool de recompensas...");
    const fundTx = await characatoStaking.fundRewardPool(rewardPoolAmount);
    await fundTx.wait();
    console.log("✅ Pool de recompensas financiado con 10,000 CHCOIN");

    // Paso 4: Verificar información de los contratos
    console.log("\n📋 PASO 4: Verificación de contratos...");
    
    const tokenInfo = await characatoCoin.getTokenInfo();
    console.log("🪙 Token Info:");
    console.log("  - Nombre:", tokenInfo[0]);
    console.log("  - Símbolo:", tokenInfo[1]);
    console.log("  - Supply Total:", hre.ethers.formatEther(tokenInfo[2]), "CHCOIN");
    console.log("  - Supply Máximo:", hre.ethers.formatEther(tokenInfo[3]), "CHCOIN");
    
    // Información del contrato de staking usando variables individuales
    console.log("🔒 Staking Info:");
    console.log("  - Reward Rate:", await characatoStaking.rewardRate(), "basis points");
    console.log("  - Minimum Stake:", hre.ethers.formatEther(await characatoStaking.minimumStakeAmount()), "CHCOIN");
    console.log("  - Lock Period:", await characatoStaking.lockPeriod(), "seconds");
    console.log("  - Total Staked:", hre.ethers.formatEther(await characatoStaking.totalStaked()), "CHCOIN");

    // Paso 5: Guardar configuración para frontend
    console.log("\n📋 PASO 5: Guardando configuración...");
    
    const config = {
      network: hre.network.name,
      chainId: hre.network.config.chainId,
      deployedAt: new Date().toISOString(),
      deployer: deployer.address,
      contracts: {
        CharacatoCoin: {
          address: coinAddress,
          deploymentBlock: (await characatoCoin.deploymentTransaction()).blockNumber
        },
        CharacatoStaking: {
          address: stakingAddress,
          deploymentBlock: (await characatoStaking.deploymentTransaction()).blockNumber
        }
      },
      gasUsed: {
        CharacatoCoin: estimatedGas.toString(),
        CharacatoStaking: stakingEstimatedGas.toString()
      }
    };

    // Guardar configuración
    const configPath = path.join(process.cwd(), 'deployments');
    if (!fs.existsSync(configPath)) {
      fs.mkdirSync(configPath, { recursive: true });
    }

    fs.writeFileSync(
      path.join(configPath, `${hre.network.name}.json`),
      JSON.stringify(config, null, 2)
    );

    console.log(`✅ Configuración guardada en deployments/${hre.network.name}.json`);

    // Resumen final
    console.log("\n🎉 === DESPLIEGUE COMPLETADO ===");
    console.log("📋 Resumen:");
    console.log("✅ Contratos desplegados exitosamente en", hre.network.name);
    console.log("✅ Pool de recompensas financiado");
    console.log("✅ Configuración guardada");
    console.log();
    console.log("📦 Direcciones de contratos:");
    console.log("🪙 CharacatoCoin:", coinAddress);
    console.log("🔒 CharacatoStaking:", stakingAddress);
    console.log();
    console.log("🔍 Próximos pasos:");
    console.log("1. Verificar contratos en Etherscan:");
    console.log(`   npx hardhat verify --network ${hre.network.name} ${coinAddress} "${deployer.address}"`);
    console.log(`   npx hardhat verify --network ${hre.network.name} ${stakingAddress} "${coinAddress}" "${deployer.address}"`);
    console.log("2. Configurar frontend para la nueva red");
    console.log("3. Probar funcionalidades en testnet");

  } catch (error) {
    console.error("❌ Error durante el despliegue:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error durante el despliegue:", error);
    process.exit(1);
  });
