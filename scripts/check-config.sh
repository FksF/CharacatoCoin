#!/bin/bash

echo "🔍 Verificador de Configuración - CharacatoCoin"
echo "============================================="

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Funciones de logging
success() { echo -e "${GREEN}✅ $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

# Contadores
issues=0
warnings=0

echo ""
info "Verificando configuración del entorno..."
echo ""

# Verificar si existe .env
if [[ ! -f ".env" ]]; then
    error "Archivo .env no encontrado"
    info "Ejecuta: cp .env.example .env"
    issues=$((issues + 1))
else
    success "Archivo .env encontrado"
fi

# Cargar variables si existe el archivo
if [[ -f ".env" ]]; then
    source .env
    
    echo ""
    info "Verificando variables de entorno..."
    echo ""
    
    # Verificar SEPOLIA_URL
    if [[ -z "$SEPOLIA_URL" || "$SEPOLIA_URL" == *"YOUR_"* ]]; then
        error "SEPOLIA_URL no configurada correctamente"
        info "Necesitas una API key de Alchemy o Infura"
        info "Ver: GUIA_API_KEYS.md"
        issues=$((issues + 1))
    else
        success "SEPOLIA_URL configurada"
    fi
    
    # Verificar PRIVATE_KEY
    if [[ -z "$PRIVATE_KEY" || "$PRIVATE_KEY" == *"your_"* ]]; then
        error "PRIVATE_KEY no configurada"
        info "Necesitas la clave privada de una wallet de desarrollo"
        info "⚠️  NUNCA uses tu wallet principal"
        issues=$((issues + 1))
    elif [[ "$PRIVATE_KEY" == 0x* ]]; then
        warning "PRIVATE_KEY contiene '0x' al inicio"
        info "Remueve el '0x' del inicio de la clave privada"
        warnings=$((warnings + 1))
    else
        success "PRIVATE_KEY configurada"
    fi
    
    # Verificar ETHERSCAN_API_KEY
    if [[ -z "$ETHERSCAN_API_KEY" || "$ETHERSCAN_API_KEY" == *"your_"* ]]; then
        error "ETHERSCAN_API_KEY no configurada"
        info "Necesitas una API key de Etherscan para verificación automática"
        info "Ver: GUIA_API_KEYS.md"
        issues=$((issues + 1))
    else
        success "ETHERSCAN_API_KEY configurada"
    fi
    
    # Verificar MAINNET_URL (opcional para testnet)
    if [[ -z "$MAINNET_URL" || "$MAINNET_URL" == *"YOUR_"* ]]; then
        warning "MAINNET_URL no configurada (opcional para testnet)"
        warnings=$((warnings + 1))
    else
        success "MAINNET_URL configurada"
    fi
    
    # Verificar COINMARKETCAP_API_KEY (opcional)
    if [[ -z "$COINMARKETCAP_API_KEY" || "$COINMARKETCAP_API_KEY" == *"your_"* ]]; then
        warning "COINMARKETCAP_API_KEY no configurada (opcional)"
        info "Solo necesaria para reportes de gas en USD"
        warnings=$((warnings + 1))
    else
        success "COINMARKETCAP_API_KEY configurada"
    fi
fi

echo ""
info "Verificando conectividad de red..."
echo ""

# Verificar conectividad a Sepolia si está configurada
if [[ -n "$SEPOLIA_URL" && "$SEPOLIA_URL" != *"YOUR_"* ]]; then
    if curl -s -X POST -H "Content-Type: application/json" \
        --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
        "$SEPOLIA_URL" > /dev/null 2>&1; then
        success "Conexión a Sepolia testnet exitosa"
    else
        error "No se puede conectar a Sepolia testnet"
        info "Verifica tu SEPOLIA_URL"
        issues=$((issues + 1))
    fi
fi

echo ""
info "Verificando instalaciones..."
echo ""

# Verificar Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    success "Node.js instalado: $NODE_VERSION"
else
    error "Node.js no instalado"
    issues=$((issues + 1))
fi

# Verificar npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    success "npm instalado: $NPM_VERSION"
else
    error "npm no instalado"
    issues=$((issues + 1))
fi

# Verificar dependencias
if [[ -d "node_modules" ]]; then
    success "Dependencias del backend instaladas"
else
    warning "Dependencias del backend no instaladas"
    info "Ejecuta: npm install"
    warnings=$((warnings + 1))
fi

if [[ -d "frontend/node_modules" ]]; then
    success "Dependencias del frontend instaladas"
else
    warning "Dependencias del frontend no instaladas"
    info "Ejecuta: cd frontend && npm install"
    warnings=$((warnings + 1))
fi

echo ""
echo "=================== RESUMEN ==================="

if [[ $issues -eq 0 ]]; then
    success "🎉 Configuración lista para testnet!"
    echo ""
    info "Próximos pasos:"
    echo "  1. Obtener ETH de Sepolia: https://sepoliafaucet.com/"
    echo "  2. Ejecutar tests: npm test"
    echo "  3. Desplegar en testnet: npm run deploy:sepolia"
else
    error "❌ $issues problema(s) crítico(s) encontrado(s)"
    echo ""
    info "Soluciones:"
    echo "  📖 Ver guía: GUIA_API_KEYS.md"
    echo "  🔧 Configurar .env con tus API keys reales"
fi

if [[ $warnings -gt 0 ]]; then
    warning "⚠️  $warnings advertencia(s) - no críticas"
fi

echo ""
if [[ $issues -eq 0 ]]; then
    info "¿Quieres probar el despliegue en testnet? (después de obtener ETH de Sepolia)"
    echo "  Ejecuta: npm run deploy:sepolia"
fi

exit $issues
