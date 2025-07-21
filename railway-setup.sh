#!/bin/bash

# Script de configuração automática para Railway
# Execute este script após criar o projeto no Railway

echo "🚀 Configurando projeto Controle de Gastos no Railway..."

# Verificar se Railway CLI está instalado
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI não está instalado. Instale com:"
    echo "npm install -g @railway/cli"
    exit 1
fi

# Login no Railway
echo "🔐 Fazendo login no Railway..."
railway login

# Inicializar projeto
echo "📝 Inicializando projeto..."
railway init

# Adicionar MySQL
echo "🗄️ Adicionando banco MySQL..."
railway add mysql

# Configurar variáveis de ambiente para o backend
echo "⚙️ Configurando variáveis de ambiente..."

# Gerar JWT Secret
JWT_SECRET=$(openssl rand -base64 32)

railway variables set NODE_ENV=production
railway variables set JWT_SECRET="$JWT_SECRET"

echo "✅ Variáveis configuradas:"
echo "- NODE_ENV=production"
echo "- JWT_SECRET=[GERADO]"

# Instruções finais
echo ""
echo "🎉 Configuração inicial concluída!"
echo ""
echo "📋 Próximos passos:"
echo "1. Conecte seu repositório GitHub ao Railway"
echo "2. Configure o deploy do backend apontando para a pasta 'DeMarchi/backend'"
echo "3. Configure o deploy do frontend apontando para a pasta 'DeMarchi/FrontEnd'"
echo "4. Execute as migrações do banco de dados"
echo ""
echo "🔗 URLs após deploy:"
echo "- Backend: https://[seu-projeto]-backend.up.railway.app"
echo "- Frontend: https://[seu-projeto]-frontend.up.railway.app"
echo ""
echo "💡 Dica: Atualize as URLs no código do frontend após o deploy!"
