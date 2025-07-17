const mysql = require('mysql2/promise');
require('dotenv').config();

// Configuração direta e simples para Railway MySQL
const dbConfig = {
    host: 'yamanote.proxy.rlwy.net',
    port: 14693,
    user: 'root',
    password: 'KMTZNGtmtyCwdYXSydfKjgEvNCEvUKaN',
    database: 'railway',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    acquireTimeout: 30000,
    timeout: 30000,
    reconnect: true,
    charset: 'utf8mb4',
    ssl: {
        rejectUnauthorized: false
    }
};

console.log('� Configuração Railway MySQL:', {
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    database: dbConfig.database
});

let pool;

try {
    pool = mysql.createPool(dbConfig);
    console.log('✅ Pool de conexões MySQL criado com sucesso');
} catch (error) {
    console.error('❌ ERRO ao criar pool de conexões:', error);
    process.exit(1);
}

// Função simplificada para testar conexão
async function testConnection() {
    try {
        console.log('🔍 Testando conexão Railway MySQL...');
        
        const connection = await pool.getConnection();
        console.log('✅ Conexão obtida do pool');
        
        await connection.ping();
        console.log('✅ Ping MySQL bem-sucedido');
        
        const [rows] = await connection.execute('SELECT DATABASE() as current_db, NOW() as server_time');
        console.log('✅ Query executada:', rows[0]);
        
        connection.release();
        console.log('✅ Conexão liberada de volta ao pool');
        
        return true;
    } catch (error) {
        console.error('❌ Erro na conexão MySQL:');
        console.error('   Código:', error.code);
        console.error('   Mensagem:', error.message);
        console.error('   Errno:', error.errno);
        return false;
    }
}

// Função para fechar o pool
async function closePool() {
    try {
        if (pool) {
            await pool.end();
            console.log('🗄️ Pool MySQL fechado');
        }
    } catch (error) {
        console.error('❌ Erro ao fechar pool:', error);
    }
}

module.exports = {
    pool,
    testConnection,
    closePool
};