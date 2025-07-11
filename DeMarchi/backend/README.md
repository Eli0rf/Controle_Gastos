# Controle de Gastos - Backend

## Deploy no Railway

### Problema Resolvido: Canvas/ChartJS
O erro `invalid ELF header` relacionado ao canvas foi resolvido com as seguintes estratégias:

1. **Fallback Graceful**: O sistema agora funciona sem gráficos caso o canvas não esteja disponível
2. **Configuração Docker**: Dockerfile otimizado para instalar dependências nativas
3. **Dependências Opcionais**: Canvas movido para dependências opcionais

### Configuração das Variáveis de Ambiente

No Railway, configure as seguintes variáveis:

```
DB_HOST=seu_host_mysql
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
DB_NAME=nome_do_banco
JWT_SECRET=sua_chave_secreta_jwt
NODE_ENV=production
```

### Deploy

1. Conecte o repositório ao Railway
2. Configure as variáveis de ambiente
3. O deploy será automático

### Funcionalidades

- ✅ API REST completa
- ✅ Autenticação JWT
- ✅ Upload de arquivos
- ✅ Relatórios PDF (com ou sem gráficos)
- ✅ Gastos recorrentes
- ✅ Health checks

### Rotas Principais

- `GET /` - Health check principal
- `GET /health` - Status da aplicação
- `POST /api/login` - Login
- `POST /api/register` - Registro
- `GET /api/expenses` - Listar gastos
- `POST /api/expenses` - Criar gasto
- `GET /api/reports/weekly` - Relatório semanal
- `POST /api/reports/monthly` - Relatório mensal
