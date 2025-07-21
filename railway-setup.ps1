# Script de configuração automática para Railway - Windows
# Execute este script no PowerShell após criar o projeto no Railway

Write-Host "🚀 Configurando projeto Controle de Gastos no Railway..." -ForegroundColor Green

# Verificar se Railway CLI está instalado
if (-not (Get-Command railway -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Railway CLI não está instalado. Instale com:" -ForegroundColor Red
    Write-Host "npm install -g @railway/cli" -ForegroundColor Yellow
    exit 1
}

# Login no Railway
Write-Host "🔐 Fazendo login no Railway..." -ForegroundColor Blue
railway login

# Inicializar projeto
Write-Host "📝 Inicializando projeto..." -ForegroundColor Blue
railway init

# Adicionar MySQL
Write-Host "🗄️ Adicionando banco MySQL..." -ForegroundColor Blue
railway add mysql

# Configurar variáveis de ambiente para o backend
Write-Host "⚙️ Configurando variáveis de ambiente..." -ForegroundColor Blue

# Gerar JWT Secret
$JWT_SECRET = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes([System.Guid]::NewGuid().ToString() + [System.DateTime]::Now.Ticks))

railway variables set NODE_ENV=production
railway variables set JWT_SECRET=$JWT_SECRET

Write-Host "✅ Variáveis configuradas:" -ForegroundColor Green
Write-Host "- NODE_ENV=production" -ForegroundColor Gray
Write-Host "- JWT_SECRET=[GERADO]" -ForegroundColor Gray

# Instruções finais
Write-Host ""
Write-Host "🎉 Configuração inicial concluída!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Próximos passos:" -ForegroundColor Cyan
Write-Host "1. Conecte seu repositório GitHub ao Railway" -ForegroundColor White
Write-Host "2. Configure o deploy do backend apontando para a pasta 'DeMarchi/backend'" -ForegroundColor White
Write-Host "3. Configure o deploy do frontend apontando para a pasta 'DeMarchi/FrontEnd'" -ForegroundColor White
Write-Host "4. Execute as migrações do banco de dados" -ForegroundColor White
Write-Host ""
Write-Host "🔗 URLs após deploy:" -ForegroundColor Cyan
Write-Host "- Backend: https://[seu-projeto]-backend.up.railway.app" -ForegroundColor White
Write-Host "- Frontend: https://[seu-projeto]-frontend.up.railway.app" -ForegroundColor White
Write-Host ""
Write-Host "💡 Dica: Atualize as URLs no código do frontend após o deploy!" -ForegroundColor Yellow
