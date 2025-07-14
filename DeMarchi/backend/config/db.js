const mysql = require('mysql2/promise');
require('dotenv').config();

// Configuração do pool de conexões do MySQL
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'controle_gastos',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true,
    charset: 'utf8mb4'
};

let pool;

try {
    pool = mysql.createPool(dbConfig);
    console.log('Pool de conexões MySQL configurado com sucesso');
} catch (error) {
    console.error('ERRO ao configurar pool de conexões MySQL:', error);
    process.exit(1);
}

// Função para testar a conexão
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Conexão com MySQL estabelecida com sucesso');
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Erro ao conectar com MySQL:', error.message);
        return false;
    }
}

// Função para fechar o pool graciosamente
async function closePool() {
    try {
        if (pool) {
            await pool.end();
            console.log('🗄️ Pool de conexões MySQL fechado com sucesso');
        }
    } catch (error) {
        console.error('❌ Erro ao fechar pool de conexões:', error);
    }
}

module.exports = {
    pool,
    testConnection,
    closePool
};