#!/bin/bash

echo "🚀 CharacatoCoin - Demo Completa Local"
echo "====================================="

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

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar que estamos en el directorio correcto
if [[ ! -f "hardhat.config.js" ]]; then
    log_error "Este script debe ejecutarse desde el directorio raíz del proyecto"
    exit 1
fi

log_info "Verificando dependencias..."

# Verificar Node.js
if ! command -v node &> /dev/null; then
    log_error "Node.js no está instalado"
    exit 1
fi

# Verificar npm
if ! command -v npm &> /dev/null; then
    log_error "npm no está instalado"
    exit 1
fi

log_success "Node.js y npm detectados"

# Instalar dependencias del backend si no existen
if [[ ! -d "node_modules" ]]; then
    log_info "Instalando dependencias del backend..."
    npm install
fi

# Instalar dependencias del frontend si no existen
if [[ ! -d "frontend/node_modules" ]]; then
    log_info "Instalando dependencias del frontend..."
    cd frontend && npm install && cd ..
fi

log_info "Ejecutando tests para verificar que todo funciona..."
npm test

if [[ $? -ne 0 ]]; then
    log_error "Los tests fallaron. Revisar el código antes de continuar."
    exit 1
fi

log_success "Todos los tests pasaron ✅"

log_info "Compilando contratos..."
npx hardhat compile

log_success "Contratos compilados ✅"

# Crear directorio para logs si no existe
mkdir -p logs

log_info "Iniciando nodo local de Hardhat..."
log_warning "Esto abrirá un nodo en segundo plano. Usa 'npm run stop:node' para detenerlo."

# Iniciar nodo en segundo plano
npx hardhat node > logs/hardhat-node.log 2>&1 &
NODE_PID=$!

# Guardar PID para poder matarlo después
echo $NODE_PID > logs/hardhat-node.pid

log_info "Nodo iniciado con PID: $NODE_PID"
log_info "Esperando que el nodo esté listo..."

# Esperar a que el nodo esté listo
sleep 5

# Verificar que el nodo está funcionando
if ! kill -0 $NODE_PID 2>/dev/null; then
    log_error "El nodo de Hardhat no se inició correctamente"
    exit 1
fi

log_success "Nodo local ejecutándose en http://127.0.0.1:8545"

log_info "Desplegando contratos en red local..."
npm run deploy:localhost

if [[ $? -ne 0 ]]; then
    log_error "Error en el despliegue de contratos"
    kill $NODE_PID
    exit 1
fi

log_success "Contratos desplegados ✅"

log_info "Iniciando frontend..."

# Iniciar frontend en segundo plano
cd frontend
npm start > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Guardar PID del frontend
echo $FRONTEND_PID > logs/frontend.pid

log_info "Frontend iniciado con PID: $FRONTEND_PID"

# Esperar a que el frontend compile
log_info "Esperando que el frontend compile..."
sleep 15

log_success "🎉 Demo Completa Iniciada!"
echo ""
echo "📋 Servicios ejecutándose:"
echo "  🔗 Nodo Hardhat: http://127.0.0.1:8545"
echo "  🌐 Frontend Angular: http://localhost:4200"
echo ""
echo "📁 Logs disponibles en:"
echo "  📄 Nodo: logs/hardhat-node.log"
echo "  📄 Frontend: logs/frontend.log"
echo ""
echo "🔧 Comandos útiles:"
echo "  ⏹️  Parar todo: npm run stop:demo"
echo "  📊 Ver logs nodo: tail -f logs/hardhat-node.log"
echo "  📊 Ver logs frontend: tail -f logs/frontend.log"
echo ""
echo "🎯 Próximos pasos:"
echo "  1. Abrir http://localhost:4200 en tu navegador"
echo "  2. Configurar MetaMask para red local (RPC: http://127.0.0.1:8545, Chain ID: 31337)"
echo "  3. Importar una cuenta de prueba usando las claves privadas del nodo"
echo "  4. ¡Probar todas las funcionalidades!"
echo ""
log_warning "Presiona Ctrl+C para mantener los servicios corriendo o usa 'npm run stop:demo' para pararlos"

# Esperar señal de interrupción
trap 'log_info "Manteniendo servicios en ejecución..."; exit 0' INT
while true; do
    sleep 1
done
