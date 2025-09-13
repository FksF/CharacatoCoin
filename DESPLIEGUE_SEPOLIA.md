# 🚀 CharacatoCoin - Despliegue en Sepolia Testnet

## 📋 Información del Despliegue

**Fecha de Despliegue**: 12 de Septiembre, 2025
**Red**: Sepolia Testnet
**Deployer**: `0x0c3571aA29C4B7D87485bA0F8BE6920868539e9f`
**Chain ID**: 11155111

---

## 📦 **Direcciones de Contratos Desplegados**

### 🪙 **CharacatoCoin (CHCOIN)**
```
Dirección: 0x991bdf4132Fb68a7caA55d7240Cc02B29b268831
```
- **Nombre**: Characato Coin
- **Símbolo**: CHCOIN
- **Decimales**: 18
- **Supply Inicial**: 1,000,000 CHCOIN
- **Max Supply**: 10,000,000 CHCOIN

### 🔒 **CharacatoStaking**
```
Dirección: 0xe1757AFA916B83B6115D9D386ff162b3cCfE1558
```
- **Reward Rate**: 100 basis points (1% diario)
- **Minimum Stake**: 100 CHCOIN
- **Lock Period**: 7 días
- **Pool de Recompensas**: 10,000 CHCOIN

---

## 🔍 **Enlaces de Etherscan**

### **CharacatoCoin**
- **Contrato**: https://sepolia.etherscan.io/address/0x991bdf4132Fb68a7caA55d7240Cc02B29b268831
- **Transacciones**: https://sepolia.etherscan.io/address/0x991bdf4132Fb68a7caA55d7240Cc02B29b268831#internaltx

### **CharacatoStaking** 
- **Contrato**: https://sepolia.etherscan.io/address/0xe1757AFA916B83B6115D9D386ff162b3cCfE1558
- **Transacciones**: https://sepolia.etherscan.io/address/0xe1757AFA916B83B6115D9D386ff162b3cCfE1558#internaltx

---

## 🛠️ **Verificación de Contratos en Etherscan**

### **Verificar CharacatoCoin:**
```bash
npx hardhat verify --network sepolia 0x991bdf4132Fb68a7caA55d7240Cc02B29b268831 "0x0c3571aA29C4B7D87485bA0F8BE6920868539e9f"
```

### **Verificar CharacatoStaking:**
```bash
npx hardhat verify --network sepolia 0xe1757AFA916B83B6115D9D386ff162b3cCfE1558 "0x991bdf4132Fb68a7caA55d7240Cc02B29b268831" "0x0c3571aA29C4B7D87485bA0F8BE6920868539e9f"
```

---

## 🔎 **Cómo Hacer Consultas a los Contratos**

### **A) Usando Hardhat Console:**

```bash
# Iniciar consola de Hardhat conectada a Sepolia
npx hardhat console --network sepolia
```

```javascript
// En la consola de Hardhat:

// 1. Conectar a CharacatoCoin
const coin = await ethers.getContractAt("CharacatoCoin", "0x991bdf4132Fb68a7caA55d7240Cc02B29b268831");

// 2. Consultar información del token
await coin.name()           // "Characato Coin"
await coin.symbol()         // "CHCOIN"  
await coin.totalSupply()    // Supply total
await coin.balanceOf("DIRECCION_WALLET")  // Balance de una wallet

// 3. Conectar a CharacatoStaking
const staking = await ethers.getContractAt("CharacatoStaking", "0xe1757AFA916B83B6115D9D386ff162b3cCfE1558");

// 4. Consultar información de staking
await staking.totalStaked()       // Total en staking
await staking.rewardRate()        // Tasa de recompensa
await staking.rewardPool()        // Pool de recompensas
await staking.getStakeInfo("DIRECCION_WALLET")  // Info de staking de un usuario
```

### **B) Usando Scripts Personalizados:**

Crear archivo `scripts/query-contracts.js`:

```javascript
import hre from "hardhat";

async function main() {
  const [signer] = await hre.ethers.getSigners();
  
  // Direcciones de los contratos
  const COIN_ADDRESS = "0x991bdf4132Fb68a7caA55d7240Cc02B29b268831";
  const STAKING_ADDRESS = "0xe1757AFA916B83B6115D9D386ff162b3cCfE1558";
  
  // Conectar contratos
  const coin = await hre.ethers.getContractAt("CharacatoCoin", COIN_ADDRESS);
  const staking = await hre.ethers.getContractAt("CharacatoStaking", STAKING_ADDRESS);
  
  // Consultas de CharacatoCoin
  console.log("=== CHARACATOCOIN INFO ===");
  console.log("Nombre:", await coin.name());
  console.log("Símbolo:", await coin.symbol());
  console.log("Total Supply:", hre.ethers.formatEther(await coin.totalSupply()), "CHCOIN");
  console.log("Balance Owner:", hre.ethers.formatEther(await coin.balanceOf(signer.address)), "CHCOIN");
  
  // Consultas de CharacatoStaking
  console.log("\n=== STAKING INFO ===");
  console.log("Total Staked:", hre.ethers.formatEther(await staking.totalStaked()), "CHCOIN");
  console.log("Reward Rate:", await staking.rewardRate(), "basis points");
  console.log("Reward Pool:", hre.ethers.formatEther(await staking.rewardPool()), "CHCOIN");
  console.log("Min Stake:", hre.ethers.formatEther(await staking.minimumStakeAmount()), "CHCOIN");
}

main().catch(console.error);
```

Ejecutar con:
```bash
npx hardhat run scripts/query-contracts.js --network sepolia
```

### **C) Usando Etherscan (Interfaz Web):**

1. **Ir a la página del contrato** en Sepolia Etherscan
2. **Tab "Contract"** → **"Read Contract"**
3. **Conectar tu wallet** si necesitas hacer consultas específicas
4. **Usar las funciones públicas** disponibles

### **Funciones de Solo Lectura Disponibles:**

**CharacatoCoin:**
- `name()` - Nombre del token
- `symbol()` - Símbolo del token  
- `totalSupply()` - Supply total
- `balanceOf(address)` - Balance de una dirección
- `allowance(owner, spender)` - Allowance aprobado
- `getTokenInfo()` - Información completa del token

**CharacatoStaking:**
- `totalStaked()` - Total de tokens en staking
- `rewardRate()` - Tasa de recompensa actual
- `rewardPool()` - Cantidad en el pool de recompensas
- `minimumStakeAmount()` - Cantidad mínima para hacer staking
- `lockPeriod()` - Período de bloqueo en segundos
- `getStakeInfo(address)` - Información de staking de un usuario
- `pendingRewards(address)` - Recompensas pendientes de un usuario

---

## 🎯 **Interacción con los Contratos**

### **Obtener CHCOIN de Testnet:**

```javascript
// Script para mintear tokens (solo owner)
const coin = await ethers.getContractAt("CharacatoCoin", "0x991bdf4132Fb68a7caA55d7240Cc02B29b268831");
await coin.mint("DIRECCION_DESTINO", ethers.parseEther("1000")); // 1000 CHCOIN
```

### **Hacer Staking:**

```javascript
const coin = await ethers.getContractAt("CharacatoCoin", "0x991bdf4132Fb68a7caA55d7240Cc02B29b268831");
const staking = await ethers.getContractAt("CharacatoStaking", "0xe1757AFA916B83B6115D9D386ff162b3cCfE1558");

// 1. Aprobar tokens para staking
await coin.approve("0xe1757AFA916B83B6115D9D386ff162b3cCfE1558", ethers.parseEther("500"));

// 2. Hacer staking de 500 tokens
await staking.stake(ethers.parseEther("500"));
```

### **Consultar Estado de Staking:**

```javascript
const userAddress = "TU_DIRECCION_AQUI";
const stakeInfo = await staking.getStakeInfo(userAddress);

console.log("Tokens en Staking:", ethers.formatEther(stakeInfo[0]));
console.log("Recompensas Pendientes:", ethers.formatEther(stakeInfo[1])); 
console.log("Último Stake:", new Date(Number(stakeInfo[2]) * 1000));
console.log("Tiempo hasta desbloqueo:", stakeInfo[3], "segundos");
```

---

## 🔧 **Configuración para Frontend**

### **Configuración de Red en MetaMask:**
```javascript
// Agregar Red Sepolia (si no está)
const sepoliaConfig = {
  chainId: '0xaa36a7',
  chainName: 'Sepolia test network',
  rpcUrls: ['https://sepolia.infura.io/v3/'],
  nativeCurrency: {
    name: 'ETH',
    symbol: 'ETH',
    decimals: 18
  },
  blockExplorerUrls: ['https://sepolia.etherscan.io']
}
```

### **Configuración de Contratos en Frontend:**
```javascript
// src/environments/environment.sepolia.ts
export const environment = {
  production: false,
  network: 'sepolia',
  contracts: {
    characatoCoin: '0x991bdf4132Fb68a7caA55d7240Cc02B29b268831',
    characatoStaking: '0xe1757AFA916B83B6115D9D386ff162b3cCfE1558'
  },
  rpcUrl: 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY'
};
```

---

## 📊 **Monitoreo y Analytics**

### **Eventos importantes a monitorear:**

**CharacatoCoin:**
- `Transfer(from, to, value)` - Transferencias
- `TokensMinted(to, amount)` - Nuevos tokens acuñados
- `TokensBurned(from, amount)` - Tokens quemados

**CharacatoStaking:**
- `Staked(user, amount)` - Nuevos stakes
- `Unstaked(user, amount)` - Retiros de staking
- `RewardClaimed(user, reward)` - Recompensas reclamadas
- `RewardPoolFunded(amount)` - Financiamiento del pool

### **Consultas útiles en Etherscan:**
1. **Total de transacciones** de cada contrato
2. **Holders** del token CHCOIN
3. **Historia de eventos** de staking
4. **Gas usado** en las transacciones

---

## 🚨 **Información de Seguridad**

### **Funciones Administrativas (Solo Owner):**
- `mint()` - Crear nuevos tokens
- `pause()/unpause()` - Pausar/despausar transferencias
- `updateRewardRate()` - Cambiar tasa de recompensas
- `fundRewardPool()` - Financiar pool de recompensas
- `emergencyWithdraw()` - Retiro de emergencia

### **Controles de Acceso:**
- **Owner actual**: `0x0c3571aA29C4B7D87485bA0F8BE6920868539e9f`
- **Cambio de owner**: Función `transferOwnership()`

---

## 🎯 **Comandos Rápidos de Referencia**

```bash
# Consultar info básica
npx hardhat console --network sepolia

# Verificar contratos
npm run verify:sepolia

# Ejecutar tests contra testnet (cuidado con gas)
npx hardhat test --network sepolia

# Ver logs de eventos
npx hardhat run scripts/listen-events.js --network sepolia
```

---

## ✅ **Checklist de Verificación Post-Despliegue**

- [x] Contratos desplegados exitosamente
- [x] Pool de recompensas financiado
- [x] Configuraciones iniciales aplicadas
- [ ] Contratos verificados en Etherscan
- [ ] Frontend configurado para Sepolia
- [ ] Tests de integración ejecutados
- [ ] Documentación compartida con el equipo

---

## 📞 **Soporte y Recursos**

- **Etherscan Sepolia**: https://sepolia.etherscan.io/
- **Sepolia Faucet**: https://sepoliafaucet.com/
- **OpenZeppelin Docs**: https://docs.openzeppelin.com/
- **Hardhat Docs**: https://hardhat.org/docs

---

**¡Tu proyecto CharacatoCoin está ahora funcionando en Sepolia Testnet!** 🎉
