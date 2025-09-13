#!/bin/bash

echo "⏹️  Deteniendo Demo CharacatoCoin"
echo "==============================="

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para logging
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Detener el nodo de Hardhat
if [[ -f "logs/hardhat-node.pid" ]]; then
    NODE_PID=$(cat logs/hardhat-node.pid)
    if kill -0 $NODE_PID 2>/dev/null; then
        log_info "Deteniendo nodo Hardhat (PID: $NODE_PID)..."
        kill $NODE_PID
        log_success "Nodo Hardhat detenido"
    else
        log_warning "El nodo Hardhat ya no está ejecutándose"
    fi
    rm -f logs/hardhat-node.pid
fi

# Detener el frontend
if [[ -f "logs/frontend.pid" ]]; then
    FRONTEND_PID=$(cat logs/frontend.pid)
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        log_info "Deteniendo frontend Angular (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID
        log_success "Frontend Angular detenido"
    else
        log_warning "El frontend Angular ya no está ejecutándose"
    fi
    rm -f logs/frontend.pid
fi

# Limpiar procesos relacionados por si acaso
log_info "Limpiando procesos relacionados..."
pkill -f "hardhat node" 2>/dev/null || true
pkill -f "ng serve" 2>/dev/null || true

log_success "🎉 Demo detenida completamente"
echo ""
echo "📁 Los logs se mantienen en el directorio 'logs/' para referencia"
echo "🔄 Para reiniciar la demo: npm run start:demo"
