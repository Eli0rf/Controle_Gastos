# Controle de Gastos - Deploy Railway

## 🚀 Deploy no Railway

Este projeto está configurado para deploy no Railway com 3 serviços:

### 📊 Arquitetura
- **MySQL Database** - Banco de dados principal
- **Backend API** - Servidor Node.js/Express (porta 3000)
- **Frontend** - Interface web estática (porta 8080)

### 🛠️ Configuração Rápida

#### 1. Pré-requisitos
```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Fazer login
railway login
```

#### 2. Setup Automático (Windows)
```powershell
# Execute o script PowerShell
.\railway-setup.ps1
```

#### 3. Setup Manual

##### Criar projeto e adicionar MySQL
```bash
railway init
railway add mysql
```

##### Configurar variáveis de ambiente
```bash
railway variables set NODE_ENV=production
railway variables set JWT_SECRET=sua_chave_jwt_forte_aqui
```

### 📁 Estrutura de Deploy

#### Backend (`DeMarchi/backend/`)
- **Porta**: Configurada automaticamente pelo Railway
- **Healthcheck**: `/health`
- **Start Command**: `npm start`
- **Build**: Automático via Nixpacks

#### Frontend (`DeMarchi/FrontEnd/`)
- **Porta**: Configurada automaticamente pelo Railway
- **Servidor**: http-server
- **Start Command**: `npm start`
- **Arquivos**: HTML, CSS, JS estáticos

#### Database
- **Tipo**: MySQL 8.0
- **Variáveis**: Preenchidas automaticamente
- **Migração**: Execute `railway-migration.sql`

### 🔧 Configuração Manual no Railway Dashboard

#### 1. Criar 3 Serviços

##### Serviço 1: MySQL Database
- Vá em "Add Service" → "Database" → "MySQL"
- O Railway cria automaticamente as variáveis de ambiente

##### Serviço 2: Backend
- Conecte seu repositório GitHub
- **Root Directory**: `DeMarchi/backend`
- **Build Command**: Deixe vazio (automático)
- **Start Command**: `npm start`
- **Variables**:
  ```
  NODE_ENV=production
  JWT_SECRET=gere_uma_chave_forte
  ```

##### Serviço 3: Frontend
- Conecte o mesmo repositório GitHub
- **Root Directory**: `DeMarchi/FrontEnd`
- **Build Command**: Deixe vazio
- **Start Command**: `npm start`

#### 2. Executar Migração do Banco
```sql
-- Conecte ao MySQL via Railway CLI e execute:
railway run mysql < "DeMarchi/Banco de dados/railway-migration.sql"
```

### 🌐 URLs de Acesso

Após o deploy, você terá:
- **Backend**: `https://[projeto]-backend.up.railway.app`
- **Frontend**: `https://[projeto]-frontend.up.railway.app`
- **Database**: Acesso interno apenas

### 🔄 Atualizações

#### Atualizar URLs no Frontend
Após o deploy, atualize as URLs nos arquivos:
- `DeMarchi/FrontEnd/dashboard.js`
- `DeMarchi/FrontEnd/register.js`

Substitua:
```javascript
const API_URL = 'https://controle-gastos-backend.up.railway.app';
```

#### Deploy Automático
O Railway faz deploy automático quando você faz push para o repositório GitHub.

### 🐛 Troubleshooting

#### Logs do Serviço
```bash
railway logs
```

#### Conectar ao Banco
```bash
railway connect mysql
```

#### Reiniciar Serviço
```bash
railway restart
```

### 📋 Checklist de Deploy

- [ ] Railway CLI instalado
- [ ] Login no Railway realizado
- [ ] Projeto criado
- [ ] MySQL adicionado
- [ ] Variáveis de ambiente configuradas
- [ ] Backend deployado
- [ ] Frontend deployado
- [ ] Migração do banco executada
- [ ] URLs atualizadas no frontend
- [ ] Testes de conexão realizados

### 🔒 Segurança

- JWT_SECRET deve ser uma string forte e única
- Variáveis sensíveis apenas no Railway (não no código)
- CORS configurado apenas para domínios necessários
- SSL/TLS habilitado automaticamente

### 💡 Dicas

1. **Desenvolvimento Local**: Use `npm run dev` para desenvolvimento
2. **Logs**: Monitore sempre os logs durante o deploy
3. **Backup**: Railway faz backup automático do MySQL
4. **Domínio Custom**: Configure no dashboard do Railway
5. **Scaling**: Railway escala automaticamente conforme uso

---

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs com `railway logs`
2. Confirme as variáveis de ambiente
3. Teste a conexão com o banco
4. Verifique as URLs no frontend
