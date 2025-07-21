# Railway Backend Configuration

## Variáveis de Ambiente Obrigatórias

### 1. DATABASE_URL
- Gerada automaticamente quando você adiciona MySQL ao projeto Railway
- Formato: mysql://username:password@host:port/database

### 2. JWT_SECRET
- Chave secreta para autenticação JWT
- Gere uma string aleatória forte
- Exemplo: openssl rand -base64 32

### 3. NODE_ENV
- Valor: production

### 4. PORT
- Gerada automaticamente pelo Railway
- Não precisa definir manualmente

## Como Configurar

1. No Railway Dashboard:
   - Vá para o serviço Backend
   - Clique em "Variables"
   - Adicione as variáveis listadas acima

2. O DATABASE_URL será criado automaticamente quando você conectar o MySQL

## Comandos Railway CLI

```bash
# Login no Railway
railway login

# Criar novo projeto
railway init

# Adicionar MySQL
railway add mysql

# Deploy backend
railway up

# Ver logs
railway logs

# Configurar variáveis
railway variables set JWT_SECRET=sua_chave_secreta_aqui
```
