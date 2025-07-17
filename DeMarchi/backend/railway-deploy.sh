#!/bin/bash

echo "🚀 Railway Deployment Script - Controle de Gastos Backend"
echo "========================================================="

# Verificar ambiente
echo "Environment: ${RAILWAY_ENVIRONMENT:-unknown}"
echo "Node.js: $(node --version)"
echo "NPM: $(npm --version)"
echo "Working directory: $(pwd)"

# Função para testar se o módulo está disponível
test_module() {
    node -e "try { require('$1'); console.log('✅ $1 OK'); } catch(e) { console.log('❌ $1 FAIL'); process.exit(1); }"
}

# Função para instalar dependências com retry
install_deps() {
    local attempt=1
    local max_attempts=3
    
    while [ $attempt -le $max_attempts ]; do
        echo "🔄 Tentativa $attempt de $max_attempts: Instalando dependências..."
        
        if npm ci --only=production --ignore-scripts --verbose; then
            echo "✅ Dependências instaladas com sucesso!"
            return 0
        fi
        
        echo "❌ Tentativa $attempt falhou. Limpando e tentando novamente..."
        rm -rf node_modules package-lock.json
        npm cache clean --force
        
        attempt=$((attempt + 1))
        sleep 2
    done
    
    echo "❌ Falha em todas as tentativas de instalação"
    return 1
}

# Backup do package.json original se necessário
if [ -f "package.json" ] && [ ! -f "package.json.backup" ]; then
    cp package.json package.json.backup
    echo "📋 Backup do package.json criado"
fi

# Tentar instalação normal primeiro
echo "📦 Tentando instalação normal..."
if install_deps; then
    # Verificar se express está disponível
    if test_module "express"; then
        echo "🎉 Instalação bem-sucedida! Iniciando servidor..."
        exec node server.js
    else
        echo "⚠️  Express não encontrado após instalação normal"
    fi
fi

# Se falhou, tentar com package.json mínimo
echo "🔧 Tentando com configuração mínima..."
if [ -f "package-minimal.json" ]; then
    cp package-minimal.json package.json
    echo "📝 Usando package.json mínimo"
    
    if install_deps; then
        if test_module "express"; then
            echo "🎉 Instalação mínima bem-sucedida! Iniciando servidor..."
            exec node server.js
        fi
    fi
fi

# Último recurso: instalação individual dos módulos críticos
echo "🆘 Último recurso: instalação individual..."
critical_modules=("express" "cors" "mysql2" "bcryptjs" "jsonwebtoken")

for module in "${critical_modules[@]}"; do
    echo "📥 Instalando $module..."
    npm install "$module" --force
done

# Teste final
if test_module "express"; then
    echo "🎉 Módulos críticos instalados! Iniciando servidor..."
    exec node server.js
else
    echo "💥 FALHA CRÍTICA: Não foi possível instalar o Express"
    echo "📊 Debug info:"
    echo "- Node.js version: $(node --version)"
    echo "- NPM version: $(npm --version)"
    echo "- Working directory: $(pwd)"
    echo "- Directory contents:"
    ls -la
    echo "- package.json exists: $([ -f package.json ] && echo 'YES' || echo 'NO')"
    echo "- node_modules exists: $([ -d node_modules ] && echo 'YES' || echo 'NO')"
    
    if [ -d node_modules ]; then
        echo "- node_modules contents:"
        ls -la node_modules/ | head -20
    fi
    
    exit 1
fi
