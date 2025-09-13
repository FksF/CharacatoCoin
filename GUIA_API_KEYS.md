# 🔑 Guía para Obtener API Keys - CharacatoCoin

## 📋 Solo 3 Pasos Necesarios

| Paso | Key | ¿Obligatoria? | Tiempo | Para qué sirve |
|------|-----|---------------|--------|----------------|
| **1** | **Alchemy API** | ✅ **Sí** | 3 min | Conectar con redes Ethereum |
| **2** | **Etherscan API** | ✅ **Sí** | 2 min | Verificar contratos automáticamente |
| **3** | **Private Key** | ✅ **Sí** | 2 min | Tu wallet para desplegar |
| *Opcional* | *CoinMarketCap* | ❌ No | 1 min | Precios de gas en USD (reportes) |

**⏱️ Total: 7 minutos para estar listo** 🚀

---

## 🌐 **PASO 1: ALCHEMY API KEY** ✅

### ¿Para qué sirve?
- **RPC Provider**: Es el "puente" entre tu código y la blockchain Ethereum
- **Sin esto NO puedes desplegar contratos**
- **Te conecta a Sepolia testnet y Mainnet**

### Cómo obtenerla (GRATIS - 3 minutos):

1. **Ir a Alchemy**: https://www.alchemy.com/
2. **Crear cuenta gratuita** (con email)
3. **Crear nueva App**:
   - Name: `CharacatoCoin Development`
   - Description: `Testing and deployment for CharacatoCoin`
   - Chain: `Ethereum`
   - Network: `Ethereum Sepolia` (para testnet)
   - **Servicios recomendados**: Node API + Token API
4. **Copiar tu API Key** desde el dashboard

### ✅ Tu archivo .env quedará así:
```bash
SEPOLIA_URL=https://eth-sepolia.g.alchemy.com/v2/TU_API_KEY_AQUI
MAINNET_URL=https://eth-mainnet.g.alchemy.com/v2/TU_API_KEY_AQUI
```

---

## 🔍 **PASO 2: ETHERSCAN API KEY**

### ¿Para qué sirve?
- **Verificación automática**: Sube tu código fuente a Etherscan después del despliegue
- **Transparencia**: Los usuarios pueden ver y auditar tu código
- **Sin esto tienes que verificar manualmente** (muy tedioso)

### Cómo obtenerla (GRATIS - 2 minutos):

1. **Ir a Etherscan**: https://etherscan.io/register
2. **Crear cuenta gratuita** (con email)
3. **Ir a "My Account" → "API-KEYs"**: https://etherscan.io/myapikey
4. **Crear nueva API Key**:
   - AppName: `CharacatoCoin Development`
5. **Copiar la API Key**

### ✅ Tu archivo .env quedará así:
```bash
ETHERSCAN_API_KEY=TU_ETHERSCAN_API_KEY_AQUI
```

---

## 💰 **PASO 3: PRIVATE KEY** (Tu Wallet de Desarrollo)

### ⚠️ **IMPORTANTE**: 
- **NUNCA uses tu wallet principal**
- **Crea una wallet NUEVA solo para desarrollo**
- **Esta wallet necesitará ETH de testnet (gratis)**

### ¿Para qué sirve?
- **Firmar transacciones**: Para desplegar los contratos
- **Pagar gas fees**: Necesitas ETH en esta wallet
- **🔒 CRÍTICO**: Nunca compartas esta clave

### 🎯 **Opción Recomendada: MetaMask** (2 minutos)

1. **Si no tienes MetaMask**:
   - Instalar: https://metamask.io/
   - Crear wallet nueva

2. **Si ya tienes MetaMask**:
   - **Crear cuenta adicional** (botón + en MetaMask)
   - **Nombrarla**: "CharacatoCoin Development"

3. **Exportar Private Key**:
   - Click en los 3 puntos de la cuenta
   - "Account Details" → "Export Private Key"
   - Ingresa tu password de MetaMask
   - **Copiar la clave SIN el prefijo 0x**

### ✅ Tu archivo .env quedará así:
```bash
# SIN el prefijo 0x
PRIVATE_KEY=tu_clave_privada_sin_0x_al_inicio
```

### 🎁 **Obtener ETH de Testnet** (GRATIS):
1. **Copiar la dirección** de tu wallet de desarrollo
2. **Ir a Sepolia Faucet**: https://sepoliafaucet.com/
3. **Pegar tu dirección** y solicitar ETH
4. **Esperar ~1 minuto** para recibir 0.5 ETH

---

## 📊 **OPCIONAL: COINMARKETCAP API KEY**

### ¿Para qué sirve?
- **Solo para reportes fancy**: Convierte costos de gas a USD
- **NO es necesario** para que funcione el proyecto
- **Puedes agregarlo después** si quieres reportes detallados

### Cómo obtenerla (GRATIS - 1 minuto):
1. **Ir a CoinMarketCap**: https://coinmarketcap.com/api/
2. **Crear cuenta gratuita**
3. **Obtener API Key** desde el dashboard

```bash
COINMARKETCAP_API_KEY=tu_coinmarketcap_api_key
```

---

## 🛠️ **CONFIGURACIÓN FINAL**

### ✅ Paso a paso:

1. **Ya tienes tu archivo .env creado** ✅
2. **Edita el archivo .env** con tus keys reales:

```bash
# URLs de proveedores RPC - YA CONFIGURADAS ✅
SEPOLIA_URL=https://eth-sepolia.g.alchemy.com/v2/TU_ALCHEMY_KEY_REAL
MAINNET_URL=https://eth-mainnet.g.alchemy.com/v2/TU_ALCHEMY_KEY_REAL

# Clave privada de tu wallet de desarrollo - FALTA ❌
PRIVATE_KEY=tu_private_key_real_sin_0x

# API Key de Etherscan - FALTA ❌
ETHERSCAN_API_KEY=TU_ETHERSCAN_KEY_REAL

# Opcional
COINMARKETCAP_API_KEY=tu_coinmarketcap_api_key
REPORT_GAS=true
```

3. **Verificar configuración**:
```bash
./scripts/check-config.sh
```

4. **Si todo está ✅, desplegar en testnet**:
```bash
npm run deploy:sepolia
```

---

## 🚨 **Advertencias de Seguridad**

### ⚠️ **NUNCA HAGAS ESTO**:
- ❌ Usar tu wallet principal para desarrollo
- ❌ Subir el archivo `.env` a GitHub
- ❌ Compartir tu private key con nadie
- ❌ Usar ETH real en desarrollo

### ✅ **BUENAS PRÁCTICAS**:
- ✅ Wallet principal → Solo para usar dApps normales
- ✅ Wallet desarrollo → Solo para desplegar contratos
- ✅ ETH de testnet → Completamente gratis y seguro
- ✅ Archivo `.env` → Ya está en `.gitignore`

---

## 🎯 **¿Necesitas Ayuda?**

### **Si ya tienes Alchemy (✅) pero te faltan:**

**Para Etherscan API Key:**
- 2 minutos en https://etherscan.io/register
- API Keys → Crear nueva → Copiar

**Para Private Key:**
- MetaMask → Crear cuenta nueva → Export Private Key
- ⚠️ Wallet NUEVA, no tu principal

**Para ETH de testnet:**
- https://sepoliafaucet.com/ 
- Pegar dirección de tu wallet development → Get ETH

**¿Todo configurado? ¡Prueba el despliegue!**
```bash
npm run deploy:sepolia
```
