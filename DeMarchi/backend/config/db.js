const mysql = require('mysql2/promise');
require('dotenv').config();

// Configuração do pool de conexões do MySQL otimizada para Railway
const dbConfig = {
    host: process.env.DB_HOST || process.env.DATABASE_HOST || 'localhost',
    port: process.env.DB_PORT || process.env.DATABASE_PORT || 3306,
    user: process.env.DB_USER || process.env.DATABASE_USER || 'root',
    password: process.env.DB_PASSWORD || process.env.DATABASE_PASSWORD || '',
    database: process.env.DB_NAME || process.env.DATABASE_NAME || 'controle_gastos',
    waitForConnections: true,
    connectionLimit: process.env.NODE_ENV === 'production' ? 15 : 10,
    queueLimit: 0,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true,
    charset: 'utf8mb4',
    ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
    } : false,
    // Railway específico
    supportBigNumbers: true,
    bigNumberStrings: true,
    dateStrings: false,
    debug: process.env.NODE_ENV !== 'production' ? ['ComQueryPacket', 'RowDataPacket'] : false
};

let pool;

try {
    pool = mysql.createPool(dbConfig);
    console.log('✅ Pool de conexões MySQL configurado com sucesso');
    
    // Log das configurações em desenvolvimento
    if (process.env.NODE_ENV !== 'production') {
        console.log('🔧 Configurações de banco:', {
            host: dbConfig.host,
            port: dbConfig.port,
            user: dbConfig.user,
            database: dbConfig.database,
            ssl: !!dbConfig.ssl
        });
    }
} catch (error) {
    console.error('❌ ERRO ao configurar pool de conexões MySQL:', error);
    process.exit(1);
}

// Função para testar a conexão com retry
async function testConnection(retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const connection = await pool.getConnection();
            await connection.ping();
            console.log(`✅ Conexão com MySQL estabelecida com sucesso (tentativa ${i + 1})`);
            connection.release();
            return true;
        } catch (error) {
            console.error(`❌ Erro ao conectar com MySQL (tentativa ${i + 1}/${retries}):`, error.message);
            
            if (i === retries - 1) {
                console.error('❌ Todas as tentativas de conexão falharam');
                return false;
            }
            
            // Aguardar antes de tentar novamente
            await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
        }
    }
    return false;
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