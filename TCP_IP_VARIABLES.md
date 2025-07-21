# 🔗 Variáveis de Conexão TCP/IP - MySQL Railway

## 📊 Conexão Externa (TCP/IP Público)

### ✅ Credenciais de Acesso:
```
Host: ballast.proxy.rlwy.net
Porta: 27594
Usuário: root
Senha: sOOCYQRcUyJStFUIzstbHKMvaUhGPrcy
Banco de Dados: railway
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
Banco de Dados: railway
```

## 🛠️ Variáveis de Ambiente (Para código):

### Backend Node.js:
```javascript
MYSQLHOST=ballast.proxy.rlwy.net
MYSQLPORT=27594
MYSQLUSER=root
MYSQLPASSWORD=sOOCYQRcUyJStFUIzstbHKMvaUhGPrcy
MYSQLDATABASE=railway
```

### String de Conexão (DATABASE_URL):
```javascript
DATABASE_URL=mysql://root:sOOCYQRcUyJStFUIzstbHKMvaUhGPrcy@ballast.proxy.rlwy.net:27594/railway
```

## 💻 Comandos de Conexão:

### MySQL Command Line:
```bash
mysql -h ballast.proxy.rlwy.net -P 27594 -u root -psOOCYQRcUyJStFUIzstbHKMvaUhGPrcy railway
```

### Comando com Query:
```bash
mysql -h ballast.proxy.rlwy.net -P 27594 -u root -psOOCYQRcUyJStFUIzstbHKMvaUhGPrcy railway -e "SHOW TABLES;"
```

### PowerShell (Teste de Conectividade):
```powershell
Test-NetConnection -ComputerName "ballast.proxy.rlwy.net" -Port 27594
```

## 🔐 Configuração para Aplicações:

### PHP (PDO):
```php
$host = 'ballast.proxy.rlwy.net';
$port = 27594;
$dbname = 'railway';
$username = 'root';
$password = 'sOOCYQRcUyJStFUIzstbHKMvaUhGPrcy';
$dsn = "mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4";
```

### Python (mysql-connector):
```python
import mysql.connector

config = {
    'host': 'ballast.proxy.rlwy.net',
    'port': 27594,
    'user': 'root',
    'password': 'sOOCYQRcUyJStFUIzstbHKMvaUhGPrcy',
    'database': 'railway',
    'charset': 'utf8mb4'
}
```

### Node.js (mysql2):
```javascript
const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: 'ballast.proxy.rlwy.net',
    port: 27594,
    user: 'root',
    password: 'sOOCYQRcUyJStFUIzstbHKMvaUhGPrcy',
    database: 'railway',
    ssl: { rejectUnauthorized: false }
});
```

## 🌐 Ferramentas Gráficas:

### MySQL Workbench:
- **Connection Name**: Railway MySQL
- **Hostname**: ballast.proxy.rlwy.net
- **Port**: 27594
- **Username**: root
- **Password**: sOOCYQRcUyJStFUIzstbHKMvaUhGPrcy
- **Default Schema**: railway

### phpMyAdmin/Adminer:
- **Server**: ballast.proxy.rlwy.net:27594
- **Username**: root
- **Password**: sOOCYQRcUyJStFUIzstbHKMvaUhGPrcy
- **Database**: railway

### DBeaver:
- **Server**: ballast.proxy.rlwy.net
- **Port**: 27594
- **Database**: railway
- **Username**: root
- **Password**: sOOCYQRcUyJStFUIzstbHKMvaUhGPrcy

## 📋 Variáveis Railway (Completas):

```
MYSQL_PUBLIC_URL=mysql://root:sOOCYQRcUyJStFUIzstbHKMvaUhGPrcy@ballast.proxy.rlwy.net:27594/railway
MYSQL_URL=mysql://root:sOOCYQRcUyJStFUIzstbHKMvaUhGPrcy@mysql.railway.internal:3306/railway
MYSQLHOST=mysql.railway.internal
MYSQLPORT=3306
MYSQLUSER=root
MYSQLPASSWORD=sOOCYQRcUyJStFUIzstbHKMvaUhGPrcy
MYSQLDATABASE=railway
RAILWAY_TCP_PROXY_DOMAIN=ballast.proxy.rlwy.net
RAILWAY_TCP_PROXY_PORT=27594
RAILWAY_TCP_APPLICATION_PORT=3306
```

## ✅ Status da Conexão:

- **IP Resolvido**: 35.212.6.172
- **Status TCP**: ✅ TcpTestSucceeded: True
- **SSL/TLS**: ✅ Habilitado
- **Firewall**: ✅ Configurado
- **Acesso**: 🌍 Global via Internet

## 🚀 Links Úteis:

- **Projeto Railway**: https://railway.com/project/d5087728-9c34-44b6-91fe-33c58052bfd4
- **Console MySQL**: https://railway.com/project/d5087728-9c34-44b6-91fe-33c58052bfd4 (clique em MySQL → Data)
- **Backend Logs**: Disponível no dashboard Railway
- **Frontend Logs**: Disponível no dashboard Railway
