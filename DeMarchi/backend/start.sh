#!/bin/bash

echo "🚀 Starting Controle de Gastos Backend..."
echo "Node.js version: $(node --version)"
echo "NPM version: $(npm --version)"
echo "Working directory: $(pwd)"
echo "Contents: $(ls -la)"

# Limpar cache do npm
echo "🧹 Limpando cache do npm..."
npm cache clean --force

# Verificar se package.json existe
if [ ! -f "package.json" ]; then
    echo "❌ package.json não encontrado!"
    exit 1
fi

echo "📦 Conteúdo do package.json:"
cat package.json

# Verificar se node_modules existe
if [ ! -d "node_modules" ]; then
    echo "📥 node_modules não encontrado. Instalando dependências..."
    npm install --only=production --ignore-scripts --verbose
fi

# Verificar se express está instalado
if [ ! -d "node_modules/express" ]; then
    echo "⚠️  Express não encontrado. Forçando reinstalação completa..."
    rm -rf node_modules package-lock.json
    npm install --force --verbose
fi

# Verificar se ainda não existe express
if [ ! -d "node_modules/express" ]; then
    echo "🔧 Tentativa de instalação individual do express..."
    npm install express@^4.19.2 --save --force
fi

# Listar dependências principais para debug
echo "Verificando dependências principais:"
ls -la node_modules/ | grep -E "(express|cors|mysql2|bcryptjs|jsonwebtoken)" || echo "Algumas dependências podem estar ausentes"

# Verificar variáveis de ambiente
echo "Verificando variáveis de ambiente..."
if [ -z "$JWT_SECRET" ]; then
    echo "AVISO: JWT_SECRET não definido"
fi

if [ -z "$DATABASE_URL" ] && [ -z "$DB_HOST" ]; then
    echo "AVISO: Variáveis de database não definidas"
fi

echo "Iniciando servidor..."
exec node server.js
