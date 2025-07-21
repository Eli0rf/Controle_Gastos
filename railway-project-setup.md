# Railway Project Setup - Controle de Gastos

## Estrutura do Projeto no Railway

Este projeto será configurado no Railway com 3 serviços:

1. **MySQL Database** - Banco de dados principal
2. **Backend API** - Servidor Node.js/Express
3. **Frontend** - Interface web estática

## Passos para Deploy

### 1. Criar Projeto no Railway
```bash
railway login
railway init
```

### 2. Adicionar Banco MySQL
```bash
railway add mysql
```

### 3. Deploy Backend
- Conectar repositório GitHub
- Configurar variáveis de ambiente
- Deploy automático da pasta DeMarchi/backend

### 4. Deploy Frontend
- Deploy separado da pasta DeMarchi/FrontEnd
- Configurar para servir arquivos estáticos

## Variáveis de Ambiente Necessárias

### Backend (.env)
- DATABASE_URL (gerada automaticamente pelo Railway MySQL)
- JWT_SECRET
- NODE_ENV=production
- PORT (gerada automaticamente pelo Railway)

### Frontend
- BACKEND_URL (URL do serviço backend)

## URLs de Acesso - Domínios Personalizados
- **Backend API**: https://backend-production-2310c.up.railway.app
- **Frontend**: https://frontend-production-53cf.up.railway.app
- **MySQL TCP/IP**: ballast.proxy.rlwy.net:27594 (acessível externamente)
- **MySQL Console**: https://railway.com/project/d5087728-9c34-44b6-91fe-33c58052bfd4

## Root Directory Configurado
- **Backend**: DeMarchi/backend ✅
- **Frontend**: DeMarchi/FrontEnd ✅

## Conexão TCP/IP MySQL
- **Host**: ballast.proxy.rlwy.net
- **Porta**: 27594
- **Usuário**: root
- **Senha**: sOOCYQRcUyJStFUIzstbHKMvaUhGPrcy
- **Banco**: railway
