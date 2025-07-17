#!/bin/bash

echo "🚨 EMERGENCY RAILWAY DEPLOYMENT FIX"
echo "=================================="

# Verificar se estamos no Railway
if [ -z "$RAILWAY_ENVIRONMENT" ]; then
    echo "❌ Não estamos no ambiente Railway"
    echo "Execute este script apenas no Railway"
    exit 1
fi

echo "✅ Ambiente Railway detectado: $RAILWAY_ENVIRONMENT"
echo "📦 Tentando corrigir o problema de módulos..."

# Limpar completamente
rm -rf node_modules package-lock.json

# Usar package.json de emergência se o principal falhar
if [ ! -f "package.json" ]; then
    echo "📋 package.json não encontrado, usando versão de emergência"
    cp package-emergency.json package.json
fi

# Instalar dependências forçadamente
echo "🔄 Instalando dependências (tentativa 1)..."
npm install --force --no-optional 2>&1

# Verificar se express foi instalado
if [ ! -d "node_modules/express" ]; then
    echo "⚠️  Express não instalado, tentando abordagem individual..."
    
    # Instalar módulos críticos individualmente
    npm install express@4.19.2 --save --force
    npm install cors@2.8.5 --save --force 
    npm install mysql2@3.9.1 --save --force
    npm install bcryptjs@2.4.3 --save --force
    npm install jsonwebtoken@9.0.2 --save --force
fi

# Verificar instalação final
echo "🔍 Verificando instalação..."
if [ -d "node_modules/express" ]; then
    echo "✅ Express instalado com sucesso!"
    echo "📁 Módulos instalados:"
    ls -la node_modules/ | grep -E "(express|cors|mysql2)" || echo "Alguns módulos podem estar ausentes"
else
    echo "❌ FALHA CRÍTICA: Express não foi instalado"
    echo "📊 Informações de debug:"
    echo "- Working directory: $(pwd)"
    echo "- Package.json exists: $([ -f package.json ] && echo 'YES' || echo 'NO')"
    echo "- Node version: $(node --version)"
    echo "- NPM version: $(npm --version)"
    exit 1
fi

echo "🚀 Iniciando servidor..."
exec node server.js
