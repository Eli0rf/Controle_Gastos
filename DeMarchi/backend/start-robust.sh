#!/bin/bash

# Script de inicialização robusto para Railway
echo "🚀 Iniciando Controle de Gastos Backend v3.0"
echo "📅 $(date)"
echo "🌍 NODE_ENV: ${NODE_ENV:-development}"
echo "🚢 RAILWAY_ENVIRONMENT: ${RAILWAY_ENVIRONMENT:-unknown}"
echo "🔌 PORT: ${PORT:-3000}"

# Verificar se as variáveis essenciais estão definidas
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  WARNING: DATABASE_URL não está definida"
fi

if [ -z "$JWT_SECRET" ]; then
    echo "⚠️  WARNING: JWT_SECRET não está definida"
fi

# Verificar se o diretório de uploads existe
mkdir -p uploads
echo "📁 Diretório uploads verificado"

# Verificar dependências críticas
echo "🔍 Verificando dependências..."
node -e "console.log('✅ Node.js:', process.version)"
npm -v > /dev/null && echo "✅ NPM disponível"

# Iniciar servidor com handling de erros
echo "🎯 Iniciando servidor..."
exec node server.js
