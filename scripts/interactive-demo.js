import hre from "hardhat";
import readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log("🎮 === DEMO INTERACTIVO DE CHARACATOCOIN ===");
  console.log();
  
  const [signer] = await hre.ethers.getSigners();
  
  // Direcciones de los contratos
  const COIN_ADDRESS = "0x991bdf4132Fb68a7caA55d7240Cc02B29b268831";
  const STAKING_ADDRESS = "0xe1757AFA916B83B6115D9D386ff162b3cCfE1558";
  
  // Conectar a los contratos
  const coin = await hre.ethers.getContractAt("CharacatoCoin", COIN_ADDRESS);
  const staking = await hre.ethers.getContractAt("CharacatoStaking", STAKING_ADDRESS);
  
  console.log("📋 Información inicial:");
  console.log("👤 Tu dirección:", signer.address);
  console.log("💰 Balance CHCOIN:", hre.ethers.formatEther(await coin.balanceOf(signer.address)), "CHCOIN");
  console.log("🔒 En staking:", hre.ethers.formatEther((await staking.getStakeInfo(signer.address))[0]), "CHCOIN");
  console.log();

  // Menú de opciones
  while (true) {
    console.log("🎯 === OPCIONES DISPONIBLES ===");
    console.log("1. 💰 Ver balance y estado");
    console.log("2. 🔒 Hacer staking");
    console.log("3. 🎁 Reclamar recompensas");
    console.log("4. 🔓 Hacer unstaking");
    console.log("5. 🏭 Mintear tokens (solo owner)");
    console.log("6. � Enviar tokens a un amigo");
    console.log("7. �📊 Ver estadísticas completas");
    console.log("0. ❌ Salir");
    console.log();
    
    const choice = await question("👉 Elige una opción (0-7): ");
    console.log();
    
    try {
      switch (choice) {
        case '1':
          await showBalance(coin, staking, signer);
          break;
        case '2':
          await doStaking(coin, staking, signer);
          break;
        case '3':
          await claimRewards(staking, signer);
          break;
        case '4':
          await doUnstaking(staking, signer);
          break;
        case '5':
          await mintTokens(coin, signer);
          break;
        case '6':
          await sendTokens(coin, signer);
          break;
        case '7':
          await showStats(coin, staking, signer);
          break;
        case '0':
          console.log("👋 ¡Hasta luego!");
          rl.close();
          return;
        default:
          console.log("❌ Opción no válida");
      }
    } catch (error) {
      console.log("❌ Error:", error.message);
    }
    
    console.log();
    await question("📱 Presiona Enter para continuar...");
    console.log("\n" + "=".repeat(50) + "\n");
  }
}

async function showBalance(coin, staking, signer) {
  console.log("💰 === BALANCE Y ESTADO ===");
  
  const balance = await coin.balanceOf(signer.address);
  const stakeInfo = await staking.getStakeInfo(signer.address);
  
  console.log("💎 Balance CHCOIN:", hre.ethers.formatEther(balance));
  console.log("🔒 En staking:", hre.ethers.formatEther(stakeInfo[0]));
  console.log("🎁 Recompensas pendientes:", hre.ethers.formatEther(stakeInfo[1]));
  
  if (Number(stakeInfo[2]) > 0) {
    console.log("📅 Último stake:", new Date(Number(stakeInfo[2]) * 1000).toLocaleString());
    if (Number(stakeInfo[3]) > 0) {
      console.log("⏰ Tiempo hasta desbloqueo:", Math.floor(Number(stakeInfo[3]) / 3600), "horas");
    } else {
      console.log("🔓 Estado: Tokens desbloqueados");
    }
  }
}

async function doStaking(coin, staking, signer) {
  console.log("🔒 === HACER STAKING ===");
  
  const balance = await coin.balanceOf(signer.address);
  const minStake = await staking.minimumStakeAmount();
  
  console.log("💰 Tu balance:", hre.ethers.formatEther(balance), "CHCOIN");
  console.log("🎯 Mínimo para staking:", hre.ethers.formatEther(minStake), "CHCOIN");
  
  if (balance < minStake) {
    console.log("❌ Balance insuficiente para staking");
    return;
  }
  
  const amount = await question("💵 ¿Cuántos CHCOIN quieres hacer staking? ");
  const amountWei = hre.ethers.parseEther(amount);
  
  if (amountWei > balance) {
    console.log("❌ No tienes suficientes tokens");
    return;
  }
  
  if (amountWei < minStake) {
    console.log("❌ Cantidad menor al mínimo requerido");
    return;
  }
  
  console.log("🔄 Aprobando tokens...");
  const approveTx = await coin.approve(await staking.getAddress(), amountWei);
  await approveTx.wait();
  console.log("✅ Tokens aprobados");
  
  console.log("🔒 Haciendo staking...");
  const stakeTx = await staking.stake(amountWei);
  await stakeTx.wait();
  console.log("🎉 ¡Staking exitoso!");
  console.log("⏰ Tokens bloqueados por 7 días");
  console.log("📈 Ganando 1% diario de recompensas");
}

async function claimRewards(staking, signer) {
  console.log("🎁 === RECLAMAR RECOMPENSAS ===");
  
  const stakeInfo = await staking.getStakeInfo(signer.address);
  const pendingRewards = stakeInfo[1];
  
  console.log("💰 Recompensas pendientes:", hre.ethers.formatEther(pendingRewards), "CHCOIN");
  
  if (pendingRewards == 0) {
    console.log("😅 No tienes recompensas para reclamar");
    return;
  }
  
  const confirm = await question("🤔 ¿Reclamar recompensas? (s/n): ");
  if (confirm.toLowerCase() !== 's') {
    console.log("❌ Operación cancelada");
    return;
  }
  
  console.log("🔄 Reclamando recompensas...");
  const claimTx = await staking.claimRewards();
  await claimTx.wait();
  console.log("🎉 ¡Recompensas reclamadas exitosamente!");
}

async function doUnstaking(staking, signer) {
  console.log("🔓 === HACER UNSTAKING ===");
  
  const stakeInfo = await staking.getStakeInfo(signer.address);
  const stakedAmount = stakeInfo[0];
  const timeUntilUnlock = stakeInfo[3];
  
  console.log("🔒 Cantidad en staking:", hre.ethers.formatEther(stakedAmount), "CHCOIN");
  
  if (stakedAmount == 0) {
    console.log("😅 No tienes tokens en staking");
    return;
  }
  
  if (timeUntilUnlock > 0) {
    console.log("⏰ Tokens aún bloqueados por", Math.floor(Number(timeUntilUnlock) / 3600), "horas");
    return;
  }
  
  const amount = await question("💵 ¿Cuántos CHCOIN quieres retirar? (max " + hre.ethers.formatEther(stakedAmount) + "): ");
  const amountWei = hre.ethers.parseEther(amount);
  
  if (amountWei > stakedAmount) {
    console.log("❌ No puedes retirar más de lo que tienes en staking");
    return;
  }
  
  console.log("🔄 Haciendo unstaking...");
  const unstakeTx = await staking.unstake(amountWei);
  await unstakeTx.wait();
  console.log("🎉 ¡Unstaking exitoso!");
  console.log("💰 Recompensas incluidas automáticamente");
}

async function mintTokens(coin, signer) {
  console.log("🏭 === MINTEAR TOKENS ===");
  
  const owner = await coin.owner();
  if (signer.address.toLowerCase() !== owner.toLowerCase()) {
    console.log("❌ Solo el owner puede mintear tokens");
    return;
  }
  
  const totalSupply = await coin.totalSupply();
  const maxSupply = await coin.MAX_SUPPLY();
  const remaining = maxSupply - totalSupply;
  
  console.log("🎯 Supply actual:", hre.ethers.formatEther(totalSupply), "CHCOIN");
  console.log("🏆 Supply máximo:", hre.ethers.formatEther(maxSupply), "CHCOIN");
  console.log("🆓 Disponible para mint:", hre.ethers.formatEther(remaining), "CHCOIN");
  
  if (remaining == 0) {
    console.log("❌ Ya se alcanzó el supply máximo");
    return;
  }
  
  const to = await question("📮 ¿A qué dirección enviar? (Enter para ti mismo): ");
  const recipient = to.trim() || signer.address;
  
  const amount = await question("💵 ¿Cuántos CHCOIN mintear? ");
  const amountWei = hre.ethers.parseEther(amount);
  
  if (amountWei > remaining) {
    console.log("❌ Excede el supply máximo");
    return;
  }
  
  console.log("🔄 Minteando tokens...");
  const mintTx = await coin.mint(recipient, amountWei);
  await mintTx.wait();
  console.log("🎉 ¡Tokens minteados exitosamente!");
}

async function sendTokens(coin, signer) {
  console.log("💸 === ENVIAR TOKENS A UN AMIGO ===");
  
  const balance = await coin.balanceOf(signer.address);
  console.log("💰 Tu balance actual:", hre.ethers.formatEther(balance), "CHCOIN");
  
  if (balance == 0) {
    console.log("😅 No tienes tokens para enviar");
    return;
  }
  
  const recipient = await question("📮 Dirección de tu amigo (0x...): ");
  
  // Validar dirección
  if (!recipient.startsWith('0x') || recipient.length !== 42) {
    console.log("❌ Dirección no válida. Debe ser como: 0x1234567890123456789012345678901234567890");
    return;
  }
  
  const amount = await question("💵 ¿Cuántos CHCOIN quieres enviar? ");
  const amountWei = hre.ethers.parseEther(amount);
  
  if (amountWei > balance) {
    console.log("❌ No tienes suficientes tokens");
    return;
  }
  
  console.log();
  console.log("📋 === CONFIRMACIÓN ===");
  console.log("👤 Desde:", signer.address);
  console.log("👥 Hacia:", recipient);
  console.log("💰 Cantidad:", amount, "CHCOIN");
  console.log("⛽ Red: Sepolia Testnet");
  console.log();
  
  const confirm = await question("🤔 ¿Confirmar transacción? (s/n): ");
  if (confirm.toLowerCase() !== 's') {
    console.log("❌ Transacción cancelada");
    return;
  }
  
  console.log("🔄 Enviando tokens...");
  const transferTx = await coin.transfer(recipient, amountWei);
  console.log("📄 Hash de transacción:", transferTx.hash);
  console.log("⏳ Esperando confirmación...");
  
  const receipt = await transferTx.wait();
  console.log("🎉 ¡Tokens enviados exitosamente!");
  console.log("✅ Confirmado en bloque:", receipt.blockNumber);
  console.log("🔗 Ver en Etherscan:");
  console.log(`https://sepolia.etherscan.io/tx/${transferTx.hash}`);
  
  // Mostrar nuevos balances
  const newBalance = await coin.balanceOf(signer.address);
  const recipientBalance = await coin.balanceOf(recipient);
  console.log();
  console.log("📊 Balances actualizados:");
  console.log("👤 Tu nuevo balance:", hre.ethers.formatEther(newBalance), "CHCOIN");
  console.log("👥 Balance del receptor:", hre.ethers.formatEther(recipientBalance), "CHCOIN");
}

async function showStats(coin, staking, signer) {
  console.log("📊 === ESTADÍSTICAS COMPLETAS ===");
  
  // Token stats
  const tokenInfo = await coin.getTokenInfo();
  console.log("🪙 TOKEN STATS:");
  console.log("  📛 Nombre:", tokenInfo[0]);
  console.log("  🏷️  Símbolo:", tokenInfo[1]);
  console.log("  💎 Supply Total:", hre.ethers.formatEther(tokenInfo[2]), "CHCOIN");
  console.log("  🎯 Supply Máximo:", hre.ethers.formatEther(tokenInfo[3]), "CHCOIN");
  console.log();
  
  // Staking stats
  console.log("🔒 STAKING STATS:");
  console.log("  📊 Total Staked:", hre.ethers.formatEther(await staking.totalStaked()), "CHCOIN");
  console.log("  💹 Reward Rate:", await staking.rewardRate(), "basis points (1% diario)");
  console.log("  🏦 Reward Pool:", hre.ethers.formatEther(await staking.rewardPool()), "CHCOIN");
  console.log("  🎯 Min Stake:", hre.ethers.formatEther(await staking.minimumStakeAmount()), "CHCOIN");
  console.log("  🔐 Lock Period:", Number(await staking.lockPeriod()) / 86400, "días");
  console.log();
  
  // User stats
  const balance = await coin.balanceOf(signer.address);
  const stakeInfo = await staking.getStakeInfo(signer.address);
  
  console.log("👤 TUS STATS:");
  console.log("  💰 Balance:", hre.ethers.formatEther(balance), "CHCOIN");
  console.log("  🔒 En Staking:", hre.ethers.formatEther(stakeInfo[0]), "CHCOIN");
  console.log("  🎁 Recompensas:", hre.ethers.formatEther(stakeInfo[1]), "CHCOIN");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
