# Script para Deploy Manual - Railway + GitHub
# Execute após conectar os serviços ao repositório GitHub

Write-Host "🚀 Deploy Manual Railway - Controle de Gastos" -ForegroundColor Green
Write-Host ""

# Verificar se estamos no diretório correto
if (-not (Test-Path "DeMarchi\backend\package.json")) {
    Write-Host "❌ Execute este script no diretório raiz do projeto!" -ForegroundColor Red
    exit 1
}

Write-Host "📋 Informações do Projeto:" -ForegroundColor Cyan
Write-Host "- Projeto: Controle_gastos" -ForegroundColor White
Write-Host "- GitHub: Eli0rf/Controle_Gastos" -ForegroundColor White
Write-Host "- Branch: main" -ForegroundColor White
Write-Host ""

# Verificar status do Railway
Write-Host "🔍 Verificando status Railway..." -ForegroundColor Blue
railway status

Write-Host ""
Write-Host "📦 Opções de Deploy:" -ForegroundColor Cyan
Write-Host "1. Deploy Backend (DeMarchi/backend)" -ForegroundColor White
Write-Host "2. Deploy Frontend (DeMarchi/FrontEnd)" -ForegroundColor White
Write-Host "3. Deploy Ambos" -ForegroundColor White
Write-Host "4. Ver Logs" -ForegroundColor White
Write-Host "5. Status dos Serviços" -ForegroundColor White
Write-Host ""

$opcao = Read-Host "Escolha uma opção (1-5)"

switch ($opcao) {
    "1" {
        Write-Host "🔧 Fazendo deploy do Backend via GitHub..." -ForegroundColor Blue
        Write-Host "📤 Fazendo push das mudanças para GitHub..." -ForegroundColor Yellow
        git add .
        $commitMsg = Read-Host "Digite a mensagem do commit (ou Enter para usar padrão)"
        if ([string]::IsNullOrWhiteSpace($commitMsg)) {
            $commitMsg = "Deploy: Backend update - $(Get-Date -Format 'dd/MM/yyyy HH:mm')"
        }
        git commit -m "$commitMsg"
        git push origin main
        Write-Host "✅ Push realizado! Railway fará deploy automático do GitHub" -ForegroundColor Green
        Write-Host "🔗 Acompanhe em: https://railway.com/project/d5087728-9c34-44b6-91fe-33c58052bfd4" -ForegroundColor Cyan
    }
    "2" {
        Write-Host "🔧 Fazendo deploy do Frontend via GitHub..." -ForegroundColor Blue
        Write-Host "📤 Fazendo push das mudanças para GitHub..." -ForegroundColor Yellow
        git add .
        $commitMsg = Read-Host "Digite a mensagem do commit (ou Enter para usar padrão)"
        if ([string]::IsNullOrWhiteSpace($commitMsg)) {
            $commitMsg = "Deploy: Frontend update - $(Get-Date -Format 'dd/MM/yyyy HH:mm')"
        }
        git commit -m "$commitMsg"
        git push origin main
        Write-Host "✅ Push realizado! Railway fará deploy automático do GitHub" -ForegroundColor Green
        Write-Host "🔗 Acompanhe em: https://railway.com/project/d5087728-9c34-44b6-91fe-33c58052bfd4" -ForegroundColor Cyan
    }
    "3" {
        Write-Host "🔧 Fazendo deploy completo via GitHub..." -ForegroundColor Blue
        Write-Host "📤 Fazendo push das mudanças para GitHub..." -ForegroundColor Yellow
        git add .
        $commitMsg = Read-Host "Digite a mensagem do commit (ou Enter para usar padrão)"
        if ([string]::IsNullOrWhiteSpace($commitMsg)) {
            $commitMsg = "Deploy: Full stack update - Backend + Frontend - $(Get-Date -Format 'dd/MM/yyyy HH:mm')"
        }
        git commit -m "$commitMsg"
        git push origin main
        Write-Host "✅ Push realizado! Railway fará deploy automático de ambos os serviços" -ForegroundColor Green
        Write-Host "🔗 Acompanhe em: https://railway.com/project/d5087728-9c34-44b6-91fe-33c58052bfd4" -ForegroundColor Cyan
    }
    "4" {
        Write-Host "📊 Logs dos Serviços:" -ForegroundColor Blue
        Write-Host "Backend: https://railway.com/project/d5087728-9c34-44b6-91fe-33c58052bfd4/service/33819030-9915-446e-ab0c-a7d9b63b9565" -ForegroundColor Yellow
        Write-Host "Frontend: https://railway.com/project/d5087728-9c34-44b6-91fe-33c58052bfd4/service/f6c6b90b-41a3-429a-932b-fd18b5435caa" -ForegroundColor Yellow
    }
    "5" {
        Write-Host "📊 Status dos Serviços:" -ForegroundColor Blue
        Write-Host ""
        Write-Host "Backend:" -ForegroundColor Cyan
        railway service backend
        railway status
        Write-Host ""
        Write-Host "Frontend:" -ForegroundColor Cyan
        railway service frontend  
        railway status
        Write-Host ""
        Write-Host "MySQL:" -ForegroundColor Cyan
        railway service MySQL
        railway status
    }
    default {
        Write-Host "❌ Opção inválida!" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "🔗 Links Úteis:" -ForegroundColor Cyan
Write-Host "- Dashboard: https://railway.com/project/d5087728-9c34-44b6-91fe-33c58052bfd4" -ForegroundColor White
Write-Host "- Backend: https://backend-production-2310c.up.railway.app" -ForegroundColor White
Write-Host "- Frontend: https://frontend-production-53cf.up.railway.app" -ForegroundColor White
Write-Host "- MySQL TCP/IP: ballast.proxy.rlwy.net:27594" -ForegroundColor White
