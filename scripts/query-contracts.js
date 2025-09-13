import hre from "hardhat";

async function main() {
  console.log("🔍 === CONSULTAS A CHARACATOCOIN EN SEPOLIA ===");
  console.log();
  
  const [signer] = await hre.ethers.getSigners();
  
  // Direcciones de los contratos desplegados
  const COIN_ADDRESS = "0x991bdf4132Fb68a7caA55d7240Cc02B29b268831";
  const STAKING_ADDRESS = "0xe1757AFA916B83B6115D9D386ff162b3cCfE1558";
  
  try {
    // Conectar a los contratos
    const coin = await hre.ethers.getContractAt("CharacatoCoin", COIN_ADDRESS);
    const staking = await hre.ethers.getContractAt("CharacatoStaking", STAKING_ADDRESS);
    
    console.log("📋 Información de Red:");
    console.log("🔗 Red:", hre.network.name);
    console.log("💼 Consultor:", signer.address);
    console.log("💰 Balance ETH:", hre.ethers.formatEther(await signer.provider.getBalance(signer.address)), "ETH");
    console.log();
    
    // === CONSULTAS DE CHARACATOCOIN ===
    console.log("🪙 === CHARACATOCOIN INFO ===");
    const tokenInfo = await coin.getTokenInfo();
    console.log("📛 Nombre:", tokenInfo[0]);
    console.log("🏷️  Símbolo:", tokenInfo[1]);
    console.log("💎 Total Supply:", hre.ethers.formatEther(tokenInfo[2]), "CHCOIN");
    console.log("🎯 Max Supply:", hre.ethers.formatEther(tokenInfo[3]), "CHCOIN");
    console.log("👑 Owner:", await coin.owner());
    console.log("⏸️  Pausado:", await coin.paused() ? "Sí" : "No");
    console.log("💰 Balance Owner:", hre.ethers.formatEther(await coin.balanceOf(signer.address)), "CHCOIN");
    console.log();
    
    // === CONSULTAS DE STAKING ===
    console.log("🔒 === STAKING INFO ===");
    console.log("📊 Total Staked:", hre.ethers.formatEther(await staking.totalStaked()), "CHCOIN");
    console.log("💹 Reward Rate:", await staking.rewardRate(), "basis points (", Number(await staking.rewardRate()) / 100, "% diario)");
    console.log("🏦 Reward Pool:", hre.ethers.formatEther(await staking.rewardPool()), "CHCOIN");
    console.log("🎯 Min Stake:", hre.ethers.formatEther(await staking.minimumStakeAmount()), "CHCOIN");
    console.log("🔐 Lock Period:", await staking.lockPeriod(), "segundos (", Number(await staking.lockPeriod()) / 86400, "días)");
    console.log("👑 Owner:", await staking.owner());
    console.log("⏸️  Pausado:", await staking.paused() ? "Sí" : "No");
    console.log();
    
    // === INFORMACIÓN DEL USUARIO ACTUAL ===
    console.log("👤 === TU INFORMACIÓN PERSONAL ===");
    const userStakeInfo = await staking.getStakeInfo(signer.address);
    console.log("🔒 Tokens en Staking:", hre.ethers.formatEther(userStakeInfo[0]), "CHCOIN");
    console.log("💰 Recompensas Pendientes:", hre.ethers.formatEther(userStakeInfo[1]), "CHCOIN");
    
    if (Number(userStakeInfo[2]) > 0) {
      console.log("📅 Último Stake:", new Date(Number(userStakeInfo[2]) * 1000).toLocaleString());
      if (Number(userStakeInfo[3]) > 0) {
        console.log("⏰ Tiempo hasta desbloqueo:", Math.floor(Number(userStakeInfo[3]) / 3600), "horas");
      } else {
        console.log("🔓 Estado: Tokens desbloqueados, puedes hacer unstake");
      }
    } else {
      console.log("📅 Estado: No tienes tokens en staking");
    }
    console.log();
    
    // === ESTADÍSTICAS ADICIONALES ===
    console.log("📈 === ESTADÍSTICAS ADICIONALES ===");
    
    // Supply restante para mintear
    const remainingSupply = tokenInfo[3] - tokenInfo[2]; // max - current
    console.log("🆓 Supply restante para mint:", hre.ethers.formatEther(remainingSupply), "CHCOIN");
    
    // Porcentaje en staking del supply total
    const totalStaked = await staking.totalStaked();
    const stakingPercentage = totalStaked > 0 ? (Number(totalStaked) * 100) / Number(tokenInfo[2]) : 0;
    console.log("📊 % del supply en staking:", stakingPercentage.toFixed(2), "%");
    
    // APY aproximado (si hay staking)
    const rewardRate = Number(await staking.rewardRate());
    const apyApprox = (rewardRate / 100) * 365; // basis points a % anual
    console.log("📈 APY Aproximado:", apyApprox.toFixed(2), "% anual");
    console.log();
    
    // === ENLACES ÚTILES ===
    console.log("🔗 === ENLACES ÚTILES ===");
    console.log("🪙 CharacatoCoin en Etherscan:");
    console.log(`   https://sepolia.etherscan.io/address/${COIN_ADDRESS}`);
    console.log("🔒 CharacatoStaking en Etherscan:");
    console.log(`   https://sepolia.etherscan.io/address/${STAKING_ADDRESS}`);
    console.log("💧 Obtener ETH de testnet:");
    console.log("   https://sepoliafaucet.com/");
    console.log();
    
    console.log("✅ Consulta completada exitosamente!");
    
  } catch (error) {
    console.error("❌ Error durante la consulta:", error.message);
    console.log();
    console.log("💡 Posibles causas:");
    console.log("• Verifica que estés conectado a la red Sepolia");
    console.log("• Verifica que las direcciones de contrato sean correctas");
    console.log("• Verifica que tengas conexión a internet");
  }
}

// Función adicional para consultar información específica de un usuario
async function queryUserInfo(userAddress) {
  console.log(`🔍 Consultando información para: ${userAddress}`);
  
  const COIN_ADDRESS = "0x991bdf4132Fb68a7caA55d7240Cc02B29b268831";
  const STAKING_ADDRESS = "0xe1757AFA916B83B6115D9D386ff162b3cCfE1558";
  
  const coin = await hre.ethers.getContractAt("CharacatoCoin", COIN_ADDRESS);
  const staking = await hre.ethers.getContractAt("CharacatoStaking", STAKING_ADDRESS);
  
  const balance = await coin.balanceOf(userAddress);
  const stakeInfo = await staking.getStakeInfo(userAddress);
  
  console.log("💰 Balance CHCOIN:", hre.ethers.formatEther(balance));
  console.log("🔒 En Staking:", hre.ethers.formatEther(stakeInfo[0]));
  console.log("💎 Recompensas:", hre.ethers.formatEther(stakeInfo[1]));
}

// Ejecutar consulta general
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

// Exportar función para uso individual
export { queryUserInfo };
