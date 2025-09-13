# 🪙 Tutorial para Usuarios de CharacatoCoin (CHCOIN)

## 📋 Índice
1. [Instalación de MetaMask](#instalación-de-metamask)
2. [Configuración de la Red Sepolia](#configuración-de-la-red-sepolia)
3. [Agregando el Token CHCOIN](#agregando-el-token-chcoin)
4. [Cómo Encontrar tu Dirección de Wallet](#cómo-encontrar-tu-dirección-de-wallet)
5. [Recibiendo Tokens CHCOIN](#recibiendo-tokens-chcoin)
6. [Verificando tu Balance](#verificando-tu-balance)
7. [Solución de Problemas](#solución-de-problemas)

---

## 🦊 1. Instalación de MetaMask

### Paso 1: Descargar MetaMask
1. Ve a [metamask.io](https://metamask.io)
2. Haz clic en "Download" (Descargar)
3. Selecciona tu navegador (Chrome, Firefox, Edge, etc.)
4. Instala la extensión desde la tienda oficial

### Paso 2: Crear tu Wallet
1. Abre MetaMask (icono del zorro en tu navegador)
2. Haz clic en "Create a new wallet" (Crear nueva wallet)
3. Acepta los términos de uso
4. Crea una contraseña segura (¡guárdala bien!)
5. **IMPORTANTE**: Guarda tu frase de recuperación de 12 palabras en un lugar seguro
6. Confirma tu frase de recuperación

---

## 🌐 2. Configuración de la Red Sepolia

### ¿Qué es Sepolia?
Sepolia es una red de prueba de Ethereum que nos permite usar tokens sin costo real. Es perfecta para probar CharacatoCoin antes de ir a la red principal.

### Agregar Red Sepolia
1. Abre MetaMask
2. Haz clic en el dropdown de redes (arriba, donde dice "Ethereum Mainnet")
3. Busca "Sepolia test network" y selecciónala
4. Si no aparece, haz clic en "Add network" y luego "Add network manually"
5. Ingresa estos datos:

```
Nombre de la red: Sepolia test network
Nueva URL de RPC: https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161
ID de cadena: 11155111
Símbolo de moneda: SepoliaETH
URL del explorador de bloques: https://sepolia.etherscan.io
```

6. Haz clic en "Save" (Guardar)

---

## 🪙 3. Agregando el Token CHCOIN

### Información del Token
- **Nombre**: CharacatoCoin
- **Símbolo**: CHCOIN
- **Dirección del Contrato**: `0x991bdf4132Fb68a7caA55d7240Cc02B29b268831`
- **Decimales**: 18

### Pasos para Agregar
1. En MetaMask, asegúrate de estar en la red Sepolia
2. Ve a la pestaña "Tokens"
3. Haz clic en "Import tokens" (Importar tokens)
4. Selecciona "Custom token" (Token personalizado)
5. Ingresa la dirección del contrato: `0x991bdf4132Fb68a7caA55d7240Cc02B29b268831`
6. El símbolo (CHCOIN) y decimales (18) deberían aparecer automáticamente
7. Haz clic en "Add Custom Token" (Agregar Token Personalizado)
8. Confirma haciendo clic en "Import Tokens"

---

## 📍 4. Cómo Encontrar tu Dirección de Wallet

### Método 1: Copiar Dirección
1. Abre MetaMask
2. Haz clic en el nombre de tu cuenta (ej: "Account 1")
3. Tu dirección aparecerá debajo del nombre
4. Haz clic en la dirección para copiarla automáticamente

### Método 2: Código QR
1. En MetaMask, haz clic en los tres puntos (⋯)
2. Selecciona "Account details" (Detalles de cuenta)
3. Verás un código QR que otros pueden escanear

### ¿Cómo se ve una dirección?
Las direcciones de Ethereum siempre:
- Empiezan con "0x"
- Tienen 42 caracteres en total
- Ejemplo: `0x1234567890abcdef1234567890abcdef12345678`

---

## 💸 5. Recibiendo Tokens CHCOIN

### Cuando alguien te envíe tokens:
1. **Comparte tu dirección**: Envía tu dirección de wallet (que copiaste en el paso anterior)
2. **Espera la confirmación**: El remitente te confirmará cuando haya enviado los tokens
3. **Verifica la transacción**: Puedes ver la transacción en [Sepolia Etherscan](https://sepolia.etherscan.io)

### Tiempo de confirmación:
- Las transacciones en Sepolia suelen tomar 15-30 segundos
- Tu balance se actualizará automáticamente en MetaMask

---

## 💰 6. Verificando tu Balance

### En MetaMask:
1. Asegúrate de estar en la red Sepolia
2. Ve a la pestaña "Tokens"
3. Busca "CHCOIN" en tu lista de tokens
4. El balance aparecerá junto al símbolo

### En el Explorador de Bloques:
1. Ve a [sepolia.etherscan.io](https://sepolia.etherscan.io)
2. Busca tu dirección de wallet
3. Ve a la pestaña "Token Holdings"
4. Busca CharacatoCoin (CHCOIN)

---

## 🔧 7. Solución de Problemas

### No veo el token CHCOIN
**Solución**: 
- Verifica que estés en la red Sepolia
- Vuelve a importar el token con la dirección: `0x991bdf4132Fb68a7caA55d7240Cc02B29b268831`

### No puedo cambiar a Sepolia
**Solución**:
- Agrega manualmente la red con los parámetros del paso 2
- Reinicia MetaMask si es necesario

### Mi balance no se actualiza
**Solución**:
- Refresca MetaMask (haz clic en el icono de actualizar)
- Verifica la transacción en Sepolia Etherscan
- Espera unos minutos más

### No recibí mis tokens
**Solución**:
- Verifica que diste la dirección correcta
- Confirma que el remitente envió a la red Sepolia
- Busca tu dirección en Sepolia Etherscan para ver transacciones

---

## 📞 Contacto y Soporte

Si tienes problemas o preguntas:
1. Verifica esta guía paso a paso
2. Consulta los enlaces de recursos útiles
3. Contacta al administrador del proyecto

---

## 🔗 Enlaces Útiles

- **MetaMask**: https://metamask.io
- **Sepolia Etherscan**: https://sepolia.etherscan.io
- **Contrato CHCOIN**: https://sepolia.etherscan.io/address/0x991bdf4132Fb68a7caA55d7240Cc02B29b268831
- **Contrato de Staking**: https://sepolia.etherscan.io/address/0xe1757AFA916B83B6115D9D386ff162b3cCfE1558

---

## ⚠️ Recordatorios Importantes

1. **Sepolia es una red de prueba**: Los tokens no tienen valor real
2. **Guarda tu frase de recuperación**: Es la única forma de recuperar tu wallet
3. **Nunca compartas tu frase de recuperación**: Solo tú debes conocerla
4. **Verifica siempre la red**: Asegúrate de estar en Sepolia
5. **Las transacciones son irreversibles**: Verifica bien las direcciones antes de enviar

---

## 🎉 ¡Listo!

Ahora estás preparado para:
- ✅ Recibir tokens CHCOIN
- ✅ Ver tu balance
- ✅ Participar en el ecosistema CharacatoCoin
- ✅ Hacer staking cuando quieras ganar recompensas

¡Bienvenido a CharacatoCoin! 🪙
