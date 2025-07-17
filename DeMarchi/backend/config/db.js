const mysql = require('mysql2/promise');
require('dotenv').config();

// Função para parsear DATABASE_URL do Railway
function parseRailwayDatabaseUrl(databaseUrl) {
    if (!databaseUrl) return null;
    
    try {
        const url = new URL(databaseUrl);
        return {
            host: url.hostname,
            port: parseInt(url.port) || 3306,
            user: url.username,
            password: url.password,
            database: url.pathname.slice(1) || 'railway' // Remove the leading '/'
        };
    } catch (error) {
        console.error('❌ Erro ao parsear DATABASE_URL:', error);
        return null;
    }
}

// Configuração do banco de dados com suporte Railway
let dbConfig;

// Tentar usar DATABASE_URL primeiro (Railway padrão)
const databaseUrl = process.env.DATABASE_URL;
const railwayConfig = parseRailwayDatabaseUrl(databaseUrl);

if (railwayConfig) {
    console.log('🚀 Usando configuração Railway DATABASE_URL');
    console.log('🔍 Configuração parseada:', {
        host: railwayConfig.host,
        port: railwayConfig.port,
        user: railwayConfig.user,
        database: railwayConfig.database,
        hasPassword: !!railwayConfig.password
    });
    
    dbConfig = {
        ...railwayConfig,
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
        supportBigNumbers: true,
        bigNumberStrings: true,
        dateStrings: false
    };
} else {
    console.log('🔧 Usando configuração de variáveis individuais');
    dbConfig = {
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
        supportBigNumbers: true,
        bigNumberStrings: true,
        dateStrings: false
    };
}

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
    console.log('🔍 Iniciando teste de conexão com banco de dados...');
    console.log('🔧 Configuração atual:', {
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user,
        database: dbConfig.database,
        ssl: !!dbConfig.ssl
    });
    
    for (let i = 0; i < retries; i++) {
        try {
            console.log(`🔄 Tentativa de conexão ${i + 1}/${retries}...`);
            const connection = await pool.getConnection();
            
            // Testar com ping primeiro
            await connection.ping();
            console.log('✅ Ping do MySQL bem-sucedido');
            
            // Testar uma query simples
            const [rows] = await connection.execute('SELECT 1 as test');
            console.log('✅ Query de teste executada:', rows);
            
            connection.release();
            console.log(`✅ Conexão com MySQL estabelecida com sucesso (tentativa ${i + 1})`);
            return true;
        } catch (error) {
            console.error(`❌ Erro ao conectar com MySQL (tentativa ${i + 1}/${retries}):`);
            console.error('   Código do erro:', error.code);
            console.error('   Mensagem:', error.message);
            console.error('   Stack:', error.stack);
            
            if (i === retries - 1) {
                console.error('❌ Todas as tentativas de conexão falharam');
                console.error('🔧 Verifique se:');
                console.error('   - MySQL service está rodando no Railway');
                console.error('   - DATABASE_URL está correto');
                console.error('   - Credenciais estão válidas');
                console.error('   - Rede permite conexão na porta', dbConfig.port);
                return false;
            }
            
            // Aguardar antes de tentar novamente
            const waitTime = 2000 * (i + 1);
            console.log(`⏳ Aguardando ${waitTime}ms antes da próxima tentativa...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
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