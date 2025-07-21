#!/usr/bin/env node

// Script de teste local para validar endpoints antes do deploy
const http = require('http');
const { spawn } = require('child_process');

console.log('🧪 Teste Local - Controle de Gastos Backend');
console.log('==========================================');

const PORT = process.env.PORT || 3000;
let serverProcess;

// Função para testar endpoint
function testEndpoint(path, expectedStatus = 200) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: 'localhost',
            port: PORT,
            path: path,
            method: 'GET'
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === expectedStatus) {
                    console.log(`✅ ${path} - Status: ${res.statusCode}`);
                    try {
                        const json = JSON.parse(data);
                        console.log(`   Response:`, json);
                    } catch (e) {
                        console.log(`   Response: ${data.substring(0, 100)}...`);
                    }
                    resolve(true);
                } else {
                    console.log(`❌ ${path} - Expected: ${expectedStatus}, Got: ${res.statusCode}`);
                    resolve(false);
                }
            });
        });
        
        req.on('error', (err) => {
            console.log(`❌ ${path} - Error: ${err.message}`);
            resolve(false);
        });
        
        req.setTimeout(5000, () => {
            console.log(`❌ ${path} - Timeout`);
            req.destroy();
            resolve(false);
        });
        
        req.end();
    });
}

// Função principal de teste
async function runTests() {
    console.log('🚀 Iniciando servidor...');
    
    // Iniciar servidor
    serverProcess = spawn('node', ['server.js'], {
        cwd: process.cwd(),
        stdio: 'pipe'
    });
    
    // Aguardar servidor inicializar
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('🔍 Testando endpoints...');
    
    const tests = [
        { path: '/', status: 200 },
        { path: '/health-simple', status: 200 },
        { path: '/health', status: 200 }
    ];
    
    const results = [];
    for (const test of tests) {
        const result = await testEndpoint(test.path, test.status);
        results.push(result);
    }
    
    // Cleanup
    if (serverProcess) {
        serverProcess.kill();
    }
    
    // Resultado final
    const passed = results.filter(r => r).length;
    const total = results.length;
    
    console.log('\n📊 Resultado dos Testes:');
    console.log(`✅ Passou: ${passed}/${total}`);
    
    if (passed === total) {
        console.log('🎉 Todos os testes passaram! Pronto para deploy.');
        process.exit(0);
    } else {
        console.log('❌ Alguns testes falharam. Verifique antes do deploy.');
        process.exit(1);
    }
}

// Executar testes
runTests().catch(error => {
    console.error('💥 Erro durante os testes:', error);
    if (serverProcess) {
        serverProcess.kill();
    }
    process.exit(1);
});
