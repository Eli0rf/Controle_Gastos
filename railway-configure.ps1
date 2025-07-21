# Script de Configuração Railway - Controle de Gastos
# Execute este script após fazer login no Railway

Write-Host "🚀 Configurando projeto Controle de Gastos no Railway..." -ForegroundColor Green

# Verificar se está logado
Write-Host "🔍 Verificando autenticação..." -ForegroundColor Blue
railway whoami

# Criar novo projeto
Write-Host "📝 Criando novo projeto..." -ForegroundColor Blue
railway init controle-gastos

# Adicionar banco MySQL
Write-Host "🗄️ Adicionando banco MySQL..." -ForegroundColor Blue
railway add mysql

# Aguardar um pouco para o banco ser provisionado
Start-Sleep -Seconds 10

# Gerar JWT Secret forte
Write-Host "🔐 Gerando JWT Secret..." -ForegroundColor Blue
$JWT_SECRET = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes([System.Guid]::NewGuid().ToString() + [System.DateTime]::Now.Ticks))

# Configurar variáveis de ambiente
Write-Host "⚙️ Configurando variáveis de ambiente..." -ForegroundColor Blue
railway variables set NODE_ENV=production
railway variables set JWT_SECRET=$JWT_SECRET

# Mostrar informações do projeto
Write-Host "📋 Informações do projeto:" -ForegroundColor Cyan
railway status

Write-Host ""
Write-Host "✅ Configuração inicial concluída!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Próximos passos:" -ForegroundColor Cyan
Write-Host "1. Conecte seu repositório GitHub ao Railway" -ForegroundColor White
Write-Host "2. Crie serviço para Backend (pasta: DeMarchi/backend)" -ForegroundColor White
Write-Host "3. Crie serviço para Frontend (pasta: DeMarchi/FrontEnd)" -ForegroundColor White
Write-Host "4. Execute a migração do banco de dados" -ForegroundColor White
Write-Host ""
Write-Host "🔗 Comandos úteis:" -ForegroundColor Cyan
Write-Host "railway logs    # Ver logs" -ForegroundColor Gray
Write-Host "railway open    # Abrir dashboard" -ForegroundColor Gray
Write-Host "railway connect mysql    # Conectar ao banco" -ForegroundColor Gray
