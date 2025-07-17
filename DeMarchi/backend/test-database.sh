#!/bin/bash

echo "🗄️ RAILWAY DATABASE CONNECTION TEST"
echo "=================================="

echo "📋 Testing database connection with your exact credentials:"
echo "Host: yamanote.proxy.rlwy.net"
echo "Port: 14693"
echo "User: root"
echo "Database: railway"

# Test 1: Basic MySQL connection
echo ""
echo "🔍 Test 1: Basic MySQL connectivity..."
mysql -h yamanote.proxy.rlwy.net -u root -p"KMTZNGtmtyCwdYXSydfKjgEvNCEvUKaN" --port 14693 --protocol=TCP -e "SELECT 1 as connection_test;" 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Basic connection: SUCCESS"
else
    echo "❌ Basic connection: FAILED"
fi

# Test 2: Database access
echo ""
echo "🔍 Test 2: Database 'railway' access..."
mysql -h yamanote.proxy.rlwy.net -u root -p"KMTZNGtmtyCwdYXSydfKjgEvNCEvUKaN" --port 14693 --protocol=TCP railway -e "SHOW TABLES;" 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Database access: SUCCESS"
else
    echo "❌ Database access: FAILED"
    echo "⚠️  Trying to create database 'railway'..."
    mysql -h yamanote.proxy.rlwy.net -u root -p"KMTZNGtmtyCwdYXSydfKjgEvNCEvUKaN" --port 14693 --protocol=TCP -e "CREATE DATABASE IF NOT EXISTS railway;" 2>&1
fi

# Test 3: Show all databases
echo ""
echo "🔍 Test 3: Available databases..."
mysql -h yamanote.proxy.rlwy.net -u root -p"KMTZNGtmtyCwdYXSydfKjgEvNCEvUKaN" --port 14693 --protocol=TCP -e "SHOW DATABASES;" 2>&1

# Test 4: Node.js connection test
echo ""
echo "🔍 Test 4: Node.js connection test..."
node -e "
const mysql = require('mysql2/promise');
const dbConfig = {
    host: 'yamanote.proxy.rlwy.net',
    port: 14693,
    user: 'root',
    password: 'KMTZNGtmtyCwdYXSydfKjgEvNCEvUKaN',
    database: 'railway',
    ssl: { rejectUnauthorized: false }
};

(async () => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        await connection.ping();
        console.log('✅ Node.js MySQL connection: SUCCESS');
        const [rows] = await connection.execute('SELECT DATABASE() as current_db');
        console.log('📍 Current database:', rows[0].current_db);
        await connection.end();
    } catch (error) {
        console.log('❌ Node.js MySQL connection: FAILED');
        console.log('Error:', error.message);
    }
})();
" 2>&1

echo ""
echo "🎯 RECOMMENDATION:"
echo "If tests fail, check:"
echo "1. Railway MySQL service is running"
echo "2. Database 'railway' exists"
echo "3. Network connectivity from Railway to MySQL"
echo ""
echo "DATABASE_URL should be:"
echo "mysql://root:KMTZNGtmtyCwdYXSydfKjgEvNCEvUKaN@yamanote.proxy.rlwy.net:14693/railway"
