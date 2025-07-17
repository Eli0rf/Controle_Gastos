# 🚂 Railway Deployment Guide - Controle de Gastos Backend

## Solução para Erro "Cannot find module 'express'"

Se você está vendo o erro `Cannot find module 'express'`, siga estes passos:

### 1. Verificar Dependências

Certifique-se de que o `package.json` está correto e todas as dependências estão listadas:

```json
{
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "compression": "^1.7.4",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "express-rate-limit": "^7.4.1",
    "helmet": "^8.0.0",
    "jsonwebtoken": "^9.0.2",
    "multer": "^1.4.5-lts.1",
    "mysql2": "^3.11.4",
    "pdfkit": "^0.15.0"
  }
}
```

### 2. Configurar Variáveis de Ambiente no Railway

No painel do Railway, adicione estas variáveis de ambiente **OBRIGATÓRIAS**:

#### Banco de Dados (Railway MySQL Plugin)
- `DATABASE_URL` - Fornecido automaticamente pelo Railway
- OU configure manualmente:
  - `DB_HOST` - Host do banco
  - `DB_USER` - Usuário do banco
  - `DB_PASSWORD` - Senha do banco
  - `DB_NAME` - Nome do banco
  - `DB_PORT` - Porta do banco

#### Segurança (OBRIGATÓRIO)
- `JWT_SECRET` - Chave secreta forte (mínimo 32 caracteres)
  - Exemplo: `b9f7c3e4d8a1234567890abcdef1234567890abcdef1234567890abcdef123456`

#### Opcionais
- `NODE_ENV=production`
- `MAX_FILE_SIZE=10`
- `RATE_LIMIT_MAX=200`

### 3. Configurar Banco de Dados

No Railway:

1. **Adicionar MySQL Plugin:**
   - Vá para seu projeto no Railway
   - Clique em "New" → "Database" → "Add MySQL"
   - Aguarde a inicialização

2. **Conectar ao Banco:**
   - O Railway criará automaticamente a variável `DATABASE_URL`
   - Esta variável já contém todas as informações de conexão

3. **Criar Tabelas:**
   ```sql
   -- Execute estes comandos no console MySQL do Railway
   
   CREATE TABLE users (
     id INT AUTO_INCREMENT PRIMARY KEY,
     username VARCHAR(50) UNIQUE NOT NULL,
     password VARCHAR(255) NOT NULL,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     last_login TIMESTAMP NULL
   );

   CREATE TABLE expenses (
     id INT AUTO_INCREMENT PRIMARY KEY,
     user_id INT NOT NULL,
     transaction_date DATE NOT NULL,
     amount DECIMAL(10,2) NOT NULL,
     description TEXT NOT NULL,
     account VARCHAR(100) NOT NULL,
     is_business_expense BOOLEAN DEFAULT FALSE,
     account_plan_code INT NULL,
     has_invoice BOOLEAN DEFAULT FALSE,
     invoice_path VARCHAR(500) NULL,
     total_purchase_amount DECIMAL(10,2) NULL,
     installment_number INT DEFAULT 1,
     total_installments INT DEFAULT 1,
     is_recurring_expense BOOLEAN DEFAULT FALSE,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
   );

   CREATE TABLE recurring_expenses (
     id INT AUTO_INCREMENT PRIMARY KEY,
     user_id INT NOT NULL,
     description TEXT NOT NULL,
     amount DECIMAL(10,2) NOT NULL,
     account VARCHAR(100) NOT NULL,
     account_plan_code INT NULL,
     is_business_expense BOOLEAN DEFAULT FALSE,
     day_of_month INT DEFAULT 1,
     is_active BOOLEAN DEFAULT TRUE,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
   );

   CREATE TABLE recurring_expense_processing (
     id INT AUTO_INCREMENT PRIMARY KEY,
     recurring_expense_id INT NOT NULL,
     processed_month VARCHAR(7) NOT NULL,
     expense_id INT NOT NULL,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY (recurring_expense_id) REFERENCES recurring_expenses(id) ON DELETE CASCADE,
     FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE
   );
   ```

### 4. Deploy no Railway

1. **Conectar Repositório:**
   - No Railway: "New Project" → "Deploy from GitHub repo"
   - Selecione o repositório do Controle de Gastos
   - Aponte para a pasta `/DeMarchi/backend`

2. **Configurar Root Directory:**
   - Nas configurações do serviço
   - Set "Root Directory" para: `DeMarchi/backend`

3. **Verificar Build:**
   - Railway deve usar automaticamente os arquivos de configuração
   - `nixpacks.toml` controla o processo de build
   - `railway.toml` controla o deployment

### 5. Solução de Problemas

#### Erro "Cannot find module 'express'"
```bash
# No Railway logs, procure por:
# 1. Mensagens de npm install
# 2. Erros de build
# 3. Problemas de dependências

# Soluções:
# - Verificar se package.json existe
# - Verificar se todas as dependências estão listadas
# - Verificar se npm install foi executado com sucesso
# - Tentar redeploy forçado
```

#### Erro de Health Check
```bash
# Verificar:
# 1. Se o servidor está iniciando na porta correta
# 2. Se as variáveis de ambiente estão configuradas
# 3. Se o banco de dados está conectado
# 4. Se /health retorna 200
```

#### Erro de Banco de Dados
```bash
# Verificar:
# 1. Se o MySQL plugin está ativo
# 2. Se DATABASE_URL está configurada
# 3. Se as tabelas foram criadas
# 4. Se as permissões estão corretas
```

### 6. URLs Importantes

Após o deploy bem-sucedido:
- **API Base:** `https://seu-app.up.railway.app/`
- **Health Check:** `https://seu-app.up.railway.app/health`
- **Login:** `https://seu-app.up.railway.app/api/login`
- **Documentação:** `https://seu-app.up.railway.app/` (retorna lista de endpoints)

### 7. Comandos Úteis

```bash
# Testar localmente antes do deploy
npm install
npm start

# Verificar health check local
curl http://localhost:3000/health

# Testar no Railway
curl https://seu-app.up.railway.app/health
```

### 8. Checklist de Deploy

- [ ] ✅ `package.json` com todas as dependências
- [ ] ✅ `JWT_SECRET` configurado no Railway
- [ ] ✅ MySQL plugin adicionado no Railway
- [ ] ✅ Tabelas criadas no banco de dados
- [ ] ✅ Root directory configurado para `DeMarchi/backend`
- [ ] ✅ Health check retornando 200
- [ ] ✅ Logs sem erros críticos

### 9. Suporte

Se ainda estiver com problemas:

1. **Verificar logs do Railway** em tempo real
2. **Testar endpoints** um por um
3. **Verificar variáveis de ambiente** todas configuradas
4. **Redeploy** se necessário
5. **Contatar suporte** se persistir

### 10. Exemplo de Variáveis de Ambiente

```bash
# No Railway Dashboard > Variables
JWT_SECRET=sua-chave-secreta-super-forte-de-pelo-menos-32-caracteres
NODE_ENV=production
DATABASE_URL=mysql://user:password@host:port/database
```

---

🎉 **Sucesso!** Seu backend estará rodando em `https://seu-app.up.railway.app`
