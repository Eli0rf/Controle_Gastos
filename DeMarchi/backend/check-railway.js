#!/usr/bin/env node

/**
 * Railway Deployment Check Script
 * Valida se todas as configurações necessárias estão presentes
 */

require('dotenv').config();

console.log('🔍 Verificando configurações para Railway...\n');

// Verificar Node.js version
const nodeVersion = process.version;
console.log(`📋 Node.js: ${nodeVersion}`);

if (parseInt(nodeVersion.slice(1)) < 18) {
    console.error('❌ ERRO: Node.js 18+ é necessário para Railway');
    process.exit(1);
}

// Verificar variáveis de ambiente críticas
const requiredEnvVars = [
    'JWT_SECRET'
];

const optionalEnvVars = [
    'DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'DB_PORT',
    'DATABASE_HOST', 'DATABASE_USER', 'DATABASE_PASSWORD', 'DATABASE_NAME', 'DATABASE_PORT',
    'DATABASE_URL'
];

console.log('\n🔐 Variáveis de ambiente obrigatórias:');
let hasAllRequired = true;

requiredEnvVars.forEach(varName => {
    const exists = !!process.env[varName];
    console.log(`  ${exists ? '✅' : '❌'} ${varName}: ${exists ? 'OK' : 'MISSING'}`);
    if (!exists) hasAllRequired = false;
});

console.log('\n🗃️ Variáveis de banco de dados:');
let hasDbConfig = false;

// Verificar se tem DATABASE_URL ou configurações individuais
if (process.env.DATABASE_URL) {
    console.log('  ✅ DATABASE_URL: OK (Railway padrão)');
    hasDbConfig = true;
} else {
    console.log('  ❌ DATABASE_URL: MISSING');
    
    // Verificar configurações individuais
    const dbVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
    const altDbVars = ['DATABASE_HOST', 'DATABASE_USER', 'DATABASE_PASSWORD', 'DATABASE_NAME'];
    
    let hasIndividualConfig = dbVars.every(v => process.env[v]) || altDbVars.every(v => process.env[v]);
    
    if (hasIndividualConfig) {
        console.log('  ✅ Configurações individuais: OK');
        hasDbConfig = true;
    } else {
        console.log('  ❌ Configurações individuais: INCOMPLETE');
        dbVars.forEach(varName => {
            const exists = !!process.env[varName];
            console.log(`    ${exists ? '✅' : '❌'} ${varName}: ${exists ? 'OK' : 'MISSING'}`);
        });
    }
}

console.log('\n⚙️ Configurações opcionais:');
optionalEnvVars.forEach(varName => {
    const exists = !!process.env[varName];
    const value = exists ? (varName.includes('PASSWORD') ? '[HIDDEN]' : process.env[varName]) : 'NOT SET';
    console.log(`  ${exists ? '✅' : '⚪'} ${varName}: ${value}`);
});

// Verificar estrutura de arquivos
console.log('\n📁 Estrutura de arquivos:');
const fs = require('fs');
const path = require('path');

const requiredFiles = [
    'package.json',
    'server.js',
    'config/db.js',
    'railway.toml'
];

requiredFiles.forEach(file => {
    const exists = fs.existsSync(path.join(__dirname, file));
    console.log(`  ${exists ? '✅' : '❌'} ${file}: ${exists ? 'OK' : 'MISSING'}`);
});

// Verificar package.json
console.log('\n📦 Package.json:');
try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
    
    console.log(`  ✅ Name: ${packageJson.name}`);
    console.log(`  ✅ Version: ${packageJson.version}`);
    console.log(`  ${packageJson.scripts?.start ? '✅' : '❌'} Start script: ${packageJson.scripts?.start || 'MISSING'}`);
    console.log(`  ${packageJson.engines?.node ? '✅' : '⚪'} Node engine: ${packageJson.engines?.node || 'NOT SPECIFIED'}`);
    
    // Verificar dependências críticas
    const criticalDeps = ['express', 'mysql2', 'jsonwebtoken', 'bcryptjs'];
    console.log('\n  📚 Dependências críticas:');
    criticalDeps.forEach(dep => {
        const exists = packageJson.dependencies?.[dep];
        console.log(`    ${exists ? '✅' : '❌'} ${dep}: ${exists || 'MISSING'}`);
    });
    
} catch (error) {
    console.error('  ❌ Erro ao ler package.json:', error.message);
}

// Verificar Railway.toml
console.log('\n🚂 Railway.toml:');
try {
    const railwayConfig = fs.readFileSync(path.join(__dirname, 'railway.toml'), 'utf8');
    
    const hasHealthcheck = railwayConfig.includes('healthcheckPath');
    const hasStartCommand = railwayConfig.includes('startCommand');
    
    console.log(`  ${hasHealthcheck ? '✅' : '❌'} Health check: ${hasHealthcheck ? 'CONFIGURED' : 'MISSING'}`);
    console.log(`  ${hasStartCommand ? '✅' : '❌'} Start command: ${hasStartCommand ? 'CONFIGURED' : 'MISSING'}`);
    
} catch (error) {
    console.error('  ❌ Erro ao ler railway.toml:', error.message);
}

// Testar conexão com banco se possível
console.log('\n🗄️ Teste de conexão com banco:');
if (hasDbConfig) {
    try {
        const { testConnection } = require('./config/db');
        
        testConnection().then(isConnected => {
            console.log(`  ${isConnected ? '✅' : '❌'} Conexão: ${isConnected ? 'SUCCESS' : 'FAILED'}`);
            
            // Resumo final
            console.log('\n📋 RESUMO:');
            console.log(`  Variáveis obrigatórias: ${hasAllRequired ? '✅ OK' : '❌ FALTANDO'}`);
            console.log(`  Configuração do banco: ${hasDbConfig ? '✅ OK' : '❌ FALTANDO'}`);
            console.log(`  Conexão com banco: ${isConnected ? '✅ OK' : '❌ FALHOU'}`);
            
            if (hasAllRequired && hasDbConfig && isConnected) {
                console.log('\n🎉 PRONTO PARA RAILWAY! Todas as verificações passaram.');
                process.exit(0);
            } else {
                console.log('\n❌ NÃO PRONTO. Corrija os problemas acima antes do deploy.');
                process.exit(1);
            }
        }).catch(error => {
            console.error('  ❌ Erro ao testar conexão:', error.message);
            console.log('\n❌ NÃO PRONTO. Problemas de conexão com banco.');
            process.exit(1);
        });
    } catch (error) {
        console.error('  ❌ Erro ao carregar módulo de banco:', error.message);
        console.log('\n❌ NÃO PRONTO. Problemas de configuração.');
        process.exit(1);
    }
} else {
    console.log('  ⚪ Pulando teste - configuração de banco ausente');
    
    // Resumo final sem teste de banco
    console.log('\n📋 RESUMO:');
    console.log(`  Variáveis obrigatórias: ${hasAllRequired ? '✅ OK' : '❌ FALTANDO'}`);
    console.log(`  Configuração do banco: ${hasDbConfig ? '✅ OK' : '❌ FALTANDO'}`);
    
    if (hasAllRequired && hasDbConfig) {
        console.log('\n⚠️  PARCIALMENTE PRONTO. Configure o banco de dados no Railway.');
        process.exit(0);
    } else {
        console.log('\n❌ NÃO PRONTO. Corrija os problemas acima antes do deploy.');
        process.exit(1);
    }
}
