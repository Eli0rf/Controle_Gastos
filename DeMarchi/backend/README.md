# Controle de Gastos - Backend

## ✅ Correções para Deploy no Railway

### Problemas Resolvidos:

1. **SIGTERM Handling**: Implementado graceful shutdown para Railway
2. **Health Check**: Endpoint `/health` para monitoramento
3. **Estrutura de Código**: Reorganização do código para evitar erros de inicialização
4. **Pool de Conexões**: Configuração robusta do MySQL com reconexão automática
5. **Canvas/ChartJS**: Fallback graceful caso as dependências nativas falhem

### Configuração das Variáveis de Ambiente

No Railway, configure as seguintes variáveis:

```env
DB_HOST=seu_host_mysql
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
DB_NAME=nome_do_banco
JWT_SECRET=sua_chave_secreta_jwt_super_segura
NODE_ENV=production
PORT=3000
```

### Deploy no Railway

1. **Conecte o repositório ao Railway**
2. **Configure as variáveis de ambiente** (essenciais!)
3. **O deploy será automático** usando nixpacks
4. **Health check ativo** em `/health`

### Melhorias Implementadas:

- ✅ **Graceful Shutdown**: Responde corretamente aos sinais SIGTERM/SIGINT
- ✅ **Health Checks**: Endpoints `/` e `/health` para monitoramento
- ✅ **Robust Database**: Pool de conexões com reconexão automática
- ✅ **Docker Optimizado**: Build mais eficiente e seguro
- ✅ **Error Handling**: Tratamento robusto de erros
- ✅ **Railway Configuration**: Arquivos de configuração específicos

### Funcionalidades

- ✅ API REST completa
- ✅ Autenticação JWT
- ✅ Upload de arquivos
- ✅ Relatórios PDF (com ou sem gráficos)
- ✅ Gastos recorrentes
- ✅ Health checks
- ✅ CORS configurado

### Rotas Principais

- `GET /` - Health check principal
- `GET /health` - Status detalhado da aplicação e banco
- `POST /api/login` - Login
- `POST /api/register` - Registro
- `GET /api/expenses` - Listar gastos (suporte a filtro por período vigente)
- `POST /api/expenses` - Criar gasto
- `GET /api/bills` - **NOVA**: Fatura com período vigente e divisão por planos
- `POST /api/bills/pdf` - **NOVA**: Gerar PDF da fatura
- `GET /api/billing-periods` - **NOVA**: Informações dos períodos de faturamento
- `GET /api/billing-periods/:account/current` - **NOVA**: Calcular período vigente
- `GET /api/reports/weekly` - Relatório semanal
- `POST /api/reports/monthly` - Relatório mensal PDF
- `GET /api/recurring-expenses` - Gastos recorrentes

### 🆕 **Novas Funcionalidades de Faturamento**

#### **Filtro por Período Vigente**
- **Nu Bank**: Dia 2 de um mês até dia 2 do mês seguinte
- **Ourocard**: Dia 17 de um mês até dia 17 do mês seguinte  
- **PIX/Boleto**: Período mensal normal (1º ao último dia)

#### **Divisão por Planos de Contas**
- Separação automática entre gastos empresariais e pessoais
- Agrupamento por código do plano de contas
- Soma total por categoria

#### **Exemplos de Uso:**

```bash
# Buscar fatura do Nu Bank para Janeiro/2025
GET /api/bills?year=2025&month=1&account=Nu%20Bank%20Ketlyn

# Período calculado automaticamente: 02/01/2025 a 02/02/2025

# Buscar gastos com filtro de período vigente
GET /api/expenses?year=2025&month=1&account=Nu%20Bank%20Ketlyn&billing_period=true
```

### Estrutura de Arquivos Importante:

```
backend/
├── server.js              # Servidor principal com graceful shutdown
├── config/db.js          # Configuração robusta do MySQL
├── package.json          # Scripts otimizados
├── railway.toml          # Configuração Railway
├── nixpacks.toml         # Build configuration
├── Dockerfile            # Container otimizado
├── .dockerignore         # Exclusões do build
└── .env.example          # Template das variáveis
```
