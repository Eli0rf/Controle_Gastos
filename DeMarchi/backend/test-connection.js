const { testConnection } = require('./config/db');

console.log('🧪 TESTE DE CONEXÃO RAILWAY MYSQL');
console.log('=================================');

async function runTest() {
    console.log('🚀 Iniciando teste...');
    
    const isConnected = await testConnection();
    
    if (isConnected) {
        console.log('✅ SUCESSO: Conexão com Railway MySQL funcionando!');
        process.exit(0);
    } else {
        console.log('❌ FALHA: Não foi possível conectar ao Railway MySQL');
        process.exit(1);
    }
}

runTest().catch(error => {
    console.error('💥 Erro no teste:', error);
    process.exit(1);
});
