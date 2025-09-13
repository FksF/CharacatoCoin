import hre from "hardhat";
import fs from 'fs';
import path from 'path';

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Desplegando contratos con la cuenta:", deployer.address);
  console.log("Balance de la cuenta:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Desplegar CharacatoCoin
  console.log("\n1. Desplegando CharacatoCoin...");
  const CharacatoCoin = await hre.ethers.getContractFactory("CharacatoCoin");
  const characatoCoin = await CharacatoCoin.deploy(deployer.address);
  await characatoCoin.waitForDeployment();
  
  console.log("✅ CharacatoCoin desplegado en:", await characatoCoin.getAddress());

  // Desplegar CharacatoStaking
  console.log("\n2. Desplegando CharacatoStaking...");
  const CharacatoStaking = await hre.ethers.getContractFactory("CharacatoStaking");
  const characatoStaking = await CharacatoStaking.deploy(
    await characatoCoin.getAddress(),
    deployer.address
  );
  await characatoStaking.waitForDeployment();
  
  console.log("✅ CharacatoStaking desplegado en:", await characatoStaking.getAddress());

  // Configuración inicial
  console.log("\n3. Configurando contratos...");
  
  // Aprobar al contrato de staking para manejar tokens
  const approveAmount = hre.ethers.parseEther("100000"); // 100,000 tokens para el pool de recompensas
  await characatoCoin.approve(await characatoStaking.getAddress(), approveAmount);
  console.log("✅ Aprobación configurada para el contrato de staking");

  // Financiar el pool de recompensas
  const rewardPoolAmount = hre.ethers.parseEther("50000"); // 50,000 tokens para recompensas
  await characatoStaking.fundRewardPool(rewardPoolAmount);
  console.log("✅ Pool de recompensas financiado con 50,000 CHCOIN");

  // Obtener información del token
  const tokenInfo = await characatoCoin.getTokenInfo();
  console.log("\n📊 Información del Token:");
  console.log("   Nombre:", tokenInfo[0]);
  console.log("   Símbolo:", tokenInfo[1]);
  console.log("   Decimales:", tokenInfo[2].toString());
  console.log("   Suministro Total:", hre.ethers.formatEther(tokenInfo[3]), "CHCOIN");
  console.log("   Suministro Máximo:", hre.ethers.formatEther(tokenInfo[4]), "CHCOIN");

  // Verificar balances
  const deployerBalance = await characatoCoin.balanceOf(deployer.address);
  console.log("\n💰 Balances:");
  console.log("   Deployer:", hre.ethers.formatEther(deployerBalance), "CHCOIN");

  // Guardar direcciones para la aplicación frontend
  const deploymentInfo = {
    network: hre.network.name,
    characatoCoin: {
      address: await characatoCoin.getAddress(),
      deployer: deployer.address
    },
    characatoStaking: {
      address: await characatoStaking.getAddress(),
      deployer: deployer.address
    },
    deploymentDate: new Date().toISOString(),
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString()
  };

  // Crear archivo de configuración para el frontend
  const contractsDir = path.join(process.cwd(), 'frontend/src/assets/contracts');
  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(contractsDir, 'deployment.json'),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\n📄 Información de despliegue guardada en frontend/src/assets/contracts/deployment.json");
  
  console.log("\n🎉 ¡Despliegue completado exitosamente!");
  console.log("\n📋 Resumen:");
  console.log("   CharacatoCoin:", await characatoCoin.getAddress());
  console.log("   CharacatoStaking:", await characatoStaking.getAddress());
  console.log("   Red:", hre.network.name);
  console.log("   Chain ID:", (await hre.ethers.provider.getNetwork()).chainId.toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error durante el despliegue:", error);
    process.exit(1);
  });
