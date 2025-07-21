const mysql = require('mysql2/promise');
require('dotenv').config();

// Configuração para Railway MySQL usando variáveis de ambiente
const dbConfig = {
    host: process.env.MYSQLHOST || 'localhost',
    port: process.env.MYSQLPORT || 3306,
    user: process.env.MYSQLUSER || 'root',
    password: process.env.MYSQLPASSWORD || '',
    database: process.env.MYSQLDATABASE || 'controle_gastos',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    acquireTimeout: 30000,
    timeout: 30000,
    reconnect: true,
    charset: 'utf8mb4',
    ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
    } : false
};

console.log('🔧 Configuração MySQL:', {
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    database: dbConfig.database,
    ssl: !!dbConfig.ssl
});

let pool;

try {
    pool = mysql.createPool(dbConfig);
    console.log('✅ Pool de conexões MySQL criado com sucesso');
} catch (error) {
    console.error('❌ ERRO ao criar pool de conexões:', error);
    process.exit(1);
}

// Função para testar conexão
async function testConnection() {
    try {
        console.log('🔍 Testando conexão MySQL...');
        
        const connection = await pool.getConnection();
        console.log('✅ Conexão obtida do pool');
        
        await connection.ping();
        console.log('✅ Ping MySQL bem-sucedido');
        
        const [rows] = await connection.execute('SELECT 1 as test');
        console.log('✅ Query de teste executada:', rows);
        
        connection.release();
        console.log('✅ Conexão liberada');
        
        return true;
    } catch (error) {
        console.error('❌ ERRO no teste de conexão:', error);
        return false;
    }
}

// Função para inicializar tabelas se necessário
async function initializeDatabase() {
    try {
        console.log('🔄 Verificando estrutura do banco...');
        
        const connection = await pool.getConnection();
        
        // Verificar se a tabela users existe
        const [tables] = await connection.execute(
            "SHOW TABLES LIKE 'users'"
        );
        
        if (tables.length === 0) {
            console.log('📋 Criando tabelas do banco...');
            
            // Criar tabela users
            await connection.execute(`
                CREATE TABLE users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    username VARCHAR(50) UNIQUE NOT NULL,
                    email VARCHAR(100) UNIQUE NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            
            // Criar tabela expenses
            await connection.execute(`
                CREATE TABLE expenses (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    transaction_date DATE NOT NULL,
                    amount DECIMAL(10,2) NOT NULL,
                    description VARCHAR(255) NOT NULL,
                    account ENUM('Nu Bank Ketlyn','Nu Vainer','Ourocard Ketlyn','PicPay Vainer','Ducatto','Master') NOT NULL,
                    is_business_expense TINYINT(1) DEFAULT 0,
                    account_plan_code INT DEFAULT NULL,
                    has_invoice TINYINT(1) DEFAULT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    invoice_path VARCHAR(255) DEFAULT NULL,
                    total_purchase_amount DECIMAL(10,2) DEFAULT NULL,
                    installment_number INT DEFAULT NULL,
                    total_installments INT DEFAULT NULL,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            `);
            
            console.log('✅ Tabelas criadas com sucesso');
        } else {
            console.log('✅ Tabelas já existem');
        }
        
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ ERRO ao inicializar banco:', error);
        return false;
    }
}

module.exports = {
    pool,
    testConnection,
    initializeDatabase
};
