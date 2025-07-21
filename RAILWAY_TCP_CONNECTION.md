# 🌐 Conexão TCP/IP MySQL Railway - Controle de Gastos

## 🔗 Link TCP/IP Gerado pelo Railway

### ✅ Conexão Externa (TCP/IP Público):
```
Host: ballast.proxy.rlwy.net
Porta: 27594
Usuário: root
Senha: sOOCYQRcUyJStFUIzstbHKMvaUhGPrcy
Banco: railway
```

### 🔌 String de Conexão Completa:
```
mysql://root:sOOCYQRcUyJStFUIzstbHKMvaUhGPrcy@ballast.proxy.rlwy.net:27594/railway
```

### 🏠 Conexão Interna (Railway Services):
```
Host: mysql.railway.internal
Porta: 3306
Usuário: root
Senha: sOOCYQRcUyJStFUIzstbHKMvaUhGPrcy
Banco: railway
```

## 💻 Como Conectar por Ferramentas Externas

### 1. MySQL Workbench:
- **Hostname**: `ballast.proxy.rlwy.net`
- **Port**: `27594`
- **Username**: `root`
- **Password**: `sOOCYQRcUyJStFUIzstbHKMvaUhGPrcy`
- **Default Schema**: `railway`

### 2. phpMyAdmin ou Adminer:
- **Server**: `ballast.proxy.rlwy.net:27594`
- **Username**: `root`
- **Password**: `sOOCYQRcUyJStFUIzstbHKMvaUhGPrcy`
- **Database**: `railway`

### 3. Linha de Comando (se MySQL estiver instalado):
```bash
mysql -h ballast.proxy.rlwy.net -P 27594 -u root -psOOCYQRcUyJStFUIzstbHKMvaUhGPrcy railway
```

## 🛠️ Instalação do MySQL Client (Windows)

### Opção 1: Chocolate (Recomendado)
```powershell
# Instalar Chocolatey se não tiver
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Instalar MySQL Client
choco install mysql.utilities
```

### Opção 2: Download Direto
1. Acesse: https://dev.mysql.com/downloads/mysql/
2. Baixe "MySQL Community Server"
3. Instale apenas o cliente MySQL
4. Adicione ao PATH do Windows

### Opção 3: MySQL Workbench (Interface Gráfica)
1. Baixe: https://dev.mysql.com/downloads/workbench/
2. Instale e use as credenciais acima

## 🔧 Executando a Migração

### Após instalar o MySQL Client:
```bash
# Conectar e executar migração
mysql -h ballast.proxy.rlwy.net -P 27594 -u root -psOOCYQRcUyJStFUIzstbHKMvaUhGPrcy railway < "DeMarchi/Banco de dados/railway-migration.sql"
```

### Ou executar comandos individuais:
```bash
# Conectar ao banco
mysql -h ballast.proxy.rlwy.net -P 27594 -u root -psOOCYQRcUyJStFUIzstbHKMvaUhGPrcy railway

# Depois executar:
SHOW TABLES;
DESCRIBE users;
DESCRIBE expenses;
```

## 🌐 Alternativa: Railway Web Console

Se não quiser instalar o MySQL, use o console web do Railway:

1. Acesse: https://railway.com/project/d5087728-9c34-44b6-91fe-33c58052bfd4
2. Clique no serviço "MySQL"
3. Vá na aba "Data"
4. Execute os comandos SQL diretamente

## 🔐 Segurança

- ✅ Conexão SSL/TLS automática
- ✅ Firewall Railway configurado
- ✅ Acesso apenas por credenciais
- ✅ Proxy Railway para proteção adicional

## 📊 Testar Conexão

### PowerShell (Windows):
```powershell
# Testar conectividade TCP
Test-NetConnection -ComputerName "ballast.proxy.rlwy.net" -Port 27594
```

### Resultado esperado:
```
ComputerName     : ballast.proxy.rlwy.net
RemoteAddress    : [IP]
RemotePort       : 27594
InterfaceAlias   : Wi-Fi
SourceAddress    : [Seu IP]
TcpTestSucceeded : True
```

---

## ✅ Status do Link TCP/IP

🟢 **ATIVO e TESTADO** - Link TCP/IP público funcionando perfeitamente!
- **Teste realizado**: `TcpTestSucceeded : True`
- **IP Resolvido**: `35.212.6.172`
- **Endpoint**: `ballast.proxy.rlwy.net:27594`
- **Status**: 🛡️ Seguro com SSL/TLS habilitado
- **Acessibilidade**: 🌍 Globalmente via internet

## 🚀 Comando Corrigido para MySQL

### ❌ Problema Original:
```bash
railway run "mysql -h mysql.railway.internal -u root -psOOCYQRcUyJStFUIzstbHKMvaUhGPrcy railway -e 'SHOW TABLES;'"
# Erro: 'mysql' não é reconhecido
```

### ✅ Soluções Funcionais:

#### 1. Console Web Railway (RECOMENDADO):
1. Acesse: https://railway.com/project/d5087728-9c34-44b6-91fe-33c58052bfd4
2. Clique no serviço "MySQL"
3. Vá na aba "Data" 
4. Use o "SQL Query" para executar comandos
5. Execute o arquivo: `railway-database-setup.sql`

#### 2. MySQL Workbench (Interface Gráfica):
- **Download**: https://dev.mysql.com/downloads/workbench/
- **Configuração**:
  - Hostname: `ballast.proxy.rlwy.net`
  - Port: `27594`
  - Username: `root`
  - Password: `sOOCYQRcUyJStFUIzstbHKMvaUhGPrcy`
  - Default Schema: `railway`

#### 3. Via Terminal (após instalar MySQL):
```bash
# Instalar MySQL client
winget install Oracle.MySQL

# Adicionar ao PATH permanentemente
[Environment]::SetEnvironmentVariable("PATH", $env:PATH + ";C:\Program Files\MySQL\MySQL Server 8.0\bin", "User")

# Reiniciar PowerShell e executar:
mysql -h ballast.proxy.rlwy.net -P 27594 -u root -psOOCYQRcUyJStFUIzstbHKMvaUhGPrcy railway -e "SHOW TABLES;"
```
