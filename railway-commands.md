# Comandos Railway - Passo a Passo

## 1. Login (já executado - complete no navegador)
```powershell
railway login
```

## 2. Verificar se está logado
```powershell
railway whoami
```

## 3. Criar projeto
```powershell
railway init controle-gastos
```

## 4. Adicionar MySQL
```powershell
railway add mysql
```

## 5. Configurar variáveis de ambiente
```powershell
# Gerar JWT Secret
$JWT_SECRET = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes([System.Guid]::NewGuid().ToString() + [System.DateTime]::Now.Ticks))

# Configurar variáveis
railway variables set NODE_ENV=production
railway variables set JWT_SECRET=$JWT_SECRET
```

## 6. Verificar status
```powershell
railway status
```

## 7. Abrir dashboard
```powershell
railway open
```

## 8. Ver logs
```powershell
railway logs
```

## 9. Conectar ao banco (após configuração)
```powershell
railway connect mysql
```

## 10. Deploy dos serviços
```powershell
# Navegar para backend e fazer deploy
cd DeMarchi/backend
railway up

# Navegar para frontend e fazer deploy
cd ../FrontEnd
railway up
```
