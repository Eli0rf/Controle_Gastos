#!/bin/bash

echo "Starting Controle de Gastos Backend..."
echo "Node.js version: $(node --version)"
echo "NPM version: $(npm --version)"

# Verificar se node_modules existe
if [ ! -d "node_modules" ]; then
    echo "node_modules não encontrado. Instalando dependências..."
    npm install --only=production --ignore-scripts
fi

# Verificar se express está instalado
if [ ! -d "node_modules/express" ]; then
    echo "Express não encontrado. Forçando reinstalação..."
    npm install express --save
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
