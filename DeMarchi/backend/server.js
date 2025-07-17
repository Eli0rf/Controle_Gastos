// server.js - Controle de Gastos Backend - Versão 3.0 Railway Optimized
// Atualizado com segurança máxima, performance otimizada e funcionalidades completas

// --- 1. DEPENDÊNCIAS E CONFIGURAÇÕES ---
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
const pdfkit = require('pdfkit');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');

// ChartJS com fallback graceful
let ChartJSNodeCanvas;
try {
    ChartJSNodeCanvas = require('chartjs-node-canvas').ChartJSNodeCanvas;
    console.log('✅ ChartJS-node-canvas carregado com sucesso');
} catch (error) {
    console.warn('⚠️  ChartJS-node-canvas não disponível, PDFs sem gráficos');
    ChartJSNodeCanvas = null;
}

// Configurações do banco de dados
const { pool, testConnection, closePool } = require('./config/db');
require('dotenv').config();

// --- 2. CONFIGURAÇÕES PRINCIPAIS ---
const app = express();
const PORT = process.env.PORT || 3000;

// Validação de variáveis de ambiente críticas - Railway compatível
const requiredEnvVars = ['JWT_SECRET'];
const optionalDbVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'DATABASE_HOST', 'DATABASE_USER', 'DATABASE_PASSWORD', 'DATABASE_NAME', 'DATABASE_URL'];

const missingCriticalVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingCriticalVars.length > 0) {
    console.error('❌ ERRO CRÍTICO: Variáveis de ambiente obrigatórias não configuradas:', missingCriticalVars);
    
    // Em desenvolvimento, permitir continuar com avisos
    if (process.env.NODE_ENV === 'production') {
        console.error('💡 Configure as variáveis no Railway: https://railway.app/dashboard');
        process.exit(1);
    } else {
        console.warn('⚠️  Executando em modo desenvolvimento sem todas as variáveis obrigatórias');
    }
}

// Verificar se há pelo menos uma configuração de banco de dados
const hasDbConfig = optionalDbVars.some(varName => process.env[varName]);
if (!hasDbConfig) {
    console.warn('⚠️  AVISO: Nenhuma configuração de banco de dados encontrada');
    console.warn('💡 Certifique-se de ter configurado DATABASE_URL ou variáveis individuais no Railway');
}

// --- 2.1. CONFIGURAÇÕES DE SEGURANÇA APRIMORADAS ---
// Rate limiting anti-bruteforce para login
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // máximo 5 tentativas por IP
    message: { 
        success: false,
        message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
        code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Combinar IP e User-Agent para melhor identificação
        return `${req.ip}-${req.get('User-Agent') || 'unknown'}`;
    }
});

// Rate limiting geral
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 200, // Aumentado para 200 requests por IP (melhor para Railway)
    message: { 
        success: false,
        message: 'Muitas requisições. Tente novamente em 15 minutos.',
        code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Pular rate limiting para health checks
        return req.path === '/health' || req.path === '/';
    }
});

// Helmet para headers de segurança otimizado para Railway
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            connectSrc: ["'self'", "https://controlegastos-production.up.railway.app", "wss:"],
            fontSrc: ["'self'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));

// Compressão para melhor performance
app.use(compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    }
}));

// Rate limiting aplicado globalmente
app.use(generalLimiter);

// --- 3. MIDDLEWARES APRIMORADOS ---
// CORS otimizado para Railway
app.use(cors({
    origin: function (origin, callback) {
        // Permitir requisições sem origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
            'https://controlegastos-production.up.railway.app',
            'https://controle-gastos-frontend.up.railway.app',
            'http://localhost:3000',
            'http://localhost:3001',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:3001'
        ];
        
        // Em desenvolvimento, permitir qualquer origin localhost
        if (process.env.NODE_ENV !== 'production' && origin.includes('localhost')) {
            return callback(null, true);
        }
        
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        
        callback(new Error('Não permitido pelo CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Content-Disposition', 'X-Total-Count'],
    credentials: true,
    maxAge: 86400 // Cache preflight por 24 horas
}));

// Middlewares de parsing com limites de segurança
app.use(express.json({ 
    limit: '10mb',
    strict: true,
    type: 'application/json'
}));
app.use(express.urlencoded({ 
    extended: true, 
    limit: '10mb',
    parameterLimit: 1000
}));

// Headers de segurança customizados
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    next();
});

// Middleware de logging para debugging
if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
        console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`);
        next();
    });
}

// Servir arquivos estáticos com cache otimizado
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    maxAge: '7d', // Cache por 7 dias
    etag: true,
    lastModified: true,
    setHeaders: (res, path) => {
        res.setHeader('Cache-Control', 'public, max-age=604800'); // 7 dias
    }
}));

// --- 3.1. ROTAS DE HEALTH CHECK OTIMIZADAS ---
app.get('/', (req, res) => {
    res.status(200).json({ 
        success: true,
        status: 'online', 
        service: 'Controle de Gastos API',
        version: '3.0.0',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        features: {
            authentication: true,
            fileUpload: true,
            pdfGeneration: true,
            chartGeneration: ChartJSNodeCanvas ? true : false,
            recurringExpenses: true,
            billingPeriods: true,
            rateLimit: true,
            security: true
        },
        endpoints: {
            health: '/health',
            auth: '/api/login',
            register: '/api/register',
            expenses: '/api/expenses',
            dashboard: '/api/dashboard',
            reports: '/api/reports',
            bills: '/api/bills'
        }
    });
});

app.get('/health', async (req, res) => {
    try {
        console.log('🏥 Health check solicitado');
        const startTime = Date.now();
        
        // Testar conexão com banco de dados
        const isConnected = await testConnection();
        const dbResponseTime = Date.now() - startTime;
        const memoryUsage = process.memoryUsage();
        
        const healthStatus = {
            success: true,
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: Math.floor(process.uptime()),
            environment: process.env.NODE_ENV || 'development',
            version: '3.0.0',
            memory: {
                used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
                total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
                rss: Math.round(memoryUsage.rss / 1024 / 1024),
                external: Math.round(memoryUsage.external / 1024 / 1024),
                unit: 'MB'
            },
            database: {
                connected: isConnected,
                responseTime: dbResponseTime,
                unit: 'ms',
                host: process.env.DB_HOST || process.env.DATABASE_HOST || 'localhost',
                port: process.env.DB_PORT || process.env.DATABASE_PORT || 3306
            },
            railway: {
                environment: process.env.RAILWAY_ENVIRONMENT || 'unknown',
                projectId: process.env.RAILWAY_PROJECT_ID || 'unknown',
                serviceId: process.env.RAILWAY_SERVICE_ID || 'unknown'
            },
            features: {
                chartGeneration: ChartJSNodeCanvas ? 'available' : 'disabled',
                fileUploads: 'enabled',
                pdfGeneration: 'enabled',
                rateLimit: 'enabled',
                compression: 'enabled',
                security: 'enabled'
            },
            config: {
                port: PORT,
                corsEnabled: true,
                httpsOnly: process.env.NODE_ENV === 'production',
                maxFileSize: process.env.MAX_FILE_SIZE || '10MB'
            }
        };

        // Se banco não conectado, marcar como degraded
        if (!isConnected) {
            healthStatus.status = 'degraded';
            healthStatus.success = false;
            healthStatus.database.error = 'Falha na conexão com banco de dados';
            console.warn('⚠️  Health check: Banco de dados não conectado');
        }
        
        // Verificar uso de memória crítico
        if (memoryUsage.heapUsed / memoryUsage.heapTotal > 0.9) {
            healthStatus.status = 'degraded';
            healthStatus.memory.warning = 'Alto uso de memória detectado';
            console.warn('⚠️  Health check: Alto uso de memória');
        }

        const statusCode = isConnected ? 200 : 503;
        console.log(`✅ Health check concluído: ${healthStatus.status} (${statusCode})`);
        
        res.status(statusCode).json(healthStatus);
        
    } catch (error) {
        console.error('❌ Health check falhou:', error);
        const errorResponse = { 
            success: false,
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString(),
            uptime: Math.floor(process.uptime()),
            environment: process.env.NODE_ENV || 'development',
            database: {
                connected: false,
                error: 'Health check exception: ' + error.message
            },
            railway: {
                environment: process.env.RAILWAY_ENVIRONMENT || 'unknown'
            }
        };
        
        res.status(503).json(errorResponse);
    }
});

// --- 4. CONFIGURAÇÃO DO MULTER APRIMORADA (UPLOAD SEGURO) ---
// Criar diretório de uploads se não existir
const uploadsDir = path.join(__dirname, 'uploads');
fsSync.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        // Gerar nome único e seguro
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileExt = path.extname(file.originalname).toLowerCase();
        const safeName = file.fieldname + '-' + uniqueSuffix + fileExt;
        cb(null, safeName);
    }
});

const fileFilter = (req, file, cb) => {
    // Tipos de arquivo permitidos com verificação rigorosa
    const allowedMimes = [
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf'
    ];
    
    const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf'];
    const fileExt = path.extname(file.originalname).toLowerCase();
    
    if (allowedMimes.includes(file.mimetype) && allowedExts.includes(fileExt)) {
        cb(null, true);
    } else {
        cb(new Error(`Tipo de arquivo não permitido: ${file.mimetype}. Use apenas: JPEG, PNG, GIF, WebP ou PDF.`), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB máximo
        files: 1,
        fields: 20
    },
    onError: (err, next) => {
        console.error('❌ Erro no upload:', err);
        next(err);
    }
});

// --- 5. MIDDLEWARE DE AUTENTICAÇÃO APRIMORADO ---
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ 
                success: false,
                message: 'Token de acesso requerido.',
                code: 'NO_TOKEN'
            });
        }

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error('❌ JWT_SECRET não configurado!');
            return res.status(500).json({ 
                success: false,
                message: 'Erro de configuração do servidor.',
                code: 'SERVER_CONFIG_ERROR'
            });
        }

        // Verificar token com validações extras
        jwt.verify(token, jwtSecret, { 
            issuer: 'controle-gastos-api',
            audience: 'controle-gastos-client',
            maxAge: '24h'
        }, async (err, decoded) => {
            if (err) {
                console.log('❌ Token inválido:', err.message);
                let errorCode = 'INVALID_TOKEN';
                let errorMessage = 'Token inválido ou expirado.';
                
                if (err.name === 'TokenExpiredError') {
                    errorCode = 'TOKEN_EXPIRED';
                    errorMessage = 'Token expirado. Faça login novamente.';
                } else if (err.name === 'JsonWebTokenError') {
                    errorCode = 'TOKEN_MALFORMED';
                    errorMessage = 'Token malformado.';
                }
                
                return res.status(403).json({ 
                    success: false,
                    message: errorMessage,
                    code: errorCode
                });
            }
            
            // Verificar se usuário ainda existe e está ativo
            try {
                const [userCheck] = await pool.query(
                    'SELECT id, username FROM users WHERE id = ?', 
                    [decoded.id]
                );
                
                if (userCheck.length === 0) {
                    return res.status(403).json({
                        success: false,
                        message: 'Usuário não encontrado.',
                        code: 'USER_NOT_FOUND'
                    });
                }
                
                req.user = {
                    id: decoded.id,
                    username: decoded.username
                };
                next();
            } catch (dbError) {
                console.error('❌ Erro ao verificar usuário:', dbError);
                return res.status(500).json({
                    success: false,
                    message: 'Erro interno do servidor.',
                    code: 'DATABASE_ERROR'
                });
            }
        });
    } catch (error) {
        console.error('❌ Erro no middleware de autenticação:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro interno do servidor.',
            code: 'INTERNAL_ERROR'
        });
    }
};

// --- 6. ROTAS PÚBLICAS (AUTENTICAÇÃO) OTIMIZADAS ---
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Validações de entrada rigorosas
        if (!username || !password) {
            return res.status(400).json({ 
                success: false,
                message: 'Utilizador e senha são obrigatórios.',
                code: 'MISSING_CREDENTIALS'
            });
        }

        if (typeof username !== 'string' || typeof password !== 'string') {
            return res.status(400).json({ 
                success: false,
                message: 'Dados inválidos fornecidos.',
                code: 'INVALID_DATA_TYPE'
            });
        }

        // Validação de comprimento e caracteres
        if (username.length < 3 || username.length > 50) {
            return res.status(400).json({ 
                success: false,
                message: 'Nome de utilizador deve ter entre 3 e 50 caracteres.',
                code: 'INVALID_USERNAME_LENGTH'
            });
        }

        if (password.length < 8) {
            return res.status(400).json({ 
                success: false,
                message: 'Senha deve ter pelo menos 8 caracteres.',
                code: 'WEAK_PASSWORD'
            });
        }

        // Validação de caracteres especiais na senha
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                success: false,
                message: 'Senha deve conter pelo menos: 1 letra minúscula, 1 maiúscula, 1 número e 1 caractere especial.',
                code: 'PASSWORD_COMPLEXITY'
            });
        }

        // Validação de username (apenas alfanumérico e underscore)
        const usernameRegex = /^[a-zA-Z0-9_]+$/;
        if (!usernameRegex.test(username)) {
            return res.status(400).json({
                success: false,
                message: 'Nome de utilizador deve conter apenas letras, números e underscore.',
                code: 'INVALID_USERNAME_FORMAT'
            });
        }

        // Verificar se usuário já existe
        const [existingUsers] = await pool.query(
            'SELECT id FROM users WHERE username = ?', 
            [username.toLowerCase().trim()]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({ 
                success: false,
                message: 'Nome de utilizador já existe.',
                code: 'USERNAME_EXISTS'
            });
        }

        // Hash da senha com salt mais forte
        const saltRounds = 14; // Aumentado para maior segurança
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        // Inserir novo usuário com timestamp
        const [result] = await pool.query(
            'INSERT INTO users (username, password, created_at, last_login) VALUES (?, ?, NOW(), NULL)', 
            [username.toLowerCase().trim(), hashedPassword]
        );
        
        console.log(`✅ Novo usuário registrado: ${username} (ID: ${result.insertId})`);
        
        res.status(201).json({ 
            success: true,
            message: 'Utilizador criado com sucesso!',
            code: 'USER_CREATED',
            data: {
                userId: result.insertId,
                username: username.toLowerCase().trim()
            }
        });

    } catch (error) {
        console.error('❌ Erro no registo:', error);
        
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ 
                success: false,
                message: 'Nome de utilizador já existe.',
                code: 'USERNAME_EXISTS'
            });
        }
        
        res.status(500).json({ 
            success: false,
            message: 'Erro interno no servidor.',
            code: 'INTERNAL_ERROR'
        });
    }
});

app.post('/api/login', loginLimiter, async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Validações básicas
        if (!username || !password) {
            return res.status(400).json({ 
                success: false,
                message: 'Utilizador e senha são obrigatórios.',
                code: 'MISSING_CREDENTIALS'
            });
        }

        if (typeof username !== 'string' || typeof password !== 'string') {
            return res.status(400).json({ 
                success: false,
                message: 'Dados inválidos fornecidos.',
                code: 'INVALID_DATA_TYPE'
            });
        }

        // Buscar usuário com dados de auditoria
        const [rows] = await pool.query(
            'SELECT id, username, password, created_at, last_login FROM users WHERE username = ?', 
            [username.toLowerCase().trim()]
        );
        
        const user = rows[0];
        if (!user) {
            // Delay de segurança para evitar timing attacks
            await new Promise(resolve => setTimeout(resolve, 1000));
            return res.status(401).json({ 
                success: false,
                message: 'Credenciais inválidas.',
                code: 'INVALID_CREDENTIALS'
            });
        }

        // Verificar senha com timing constante
        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) {
            // Log da tentativa de login falhada
            console.warn(`⚠️  Tentativa de login falhada para usuário: ${username} - IP: ${req.ip}`);
            return res.status(401).json({ 
                success: false,
                message: 'Credenciais inválidas.',
                code: 'INVALID_CREDENTIALS'
            });
        }

        // Gerar token JWT com claims extras
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error('❌ JWT_SECRET não configurado!');
            return res.status(500).json({ 
                success: false,
                message: 'Erro de configuração do servidor.',
                code: 'SERVER_CONFIG_ERROR'
            });
        }

        const tokenPayload = {
            id: user.id,
            username: user.username,
            iat: Math.floor(Date.now() / 1000),
            loginTime: new Date().toISOString()
        };

        const accessToken = jwt.sign(
            tokenPayload, 
            jwtSecret, 
            { 
                expiresIn: '24h',
                issuer: 'controle-gastos-api',
                audience: 'controle-gastos-client',
                algorithm: 'HS256'
            }
        );

        // Atualizar último login e log de acesso
        await pool.query(
            'UPDATE users SET last_login = NOW() WHERE id = ?', 
            [user.id]
        );

        console.log(`✅ Login bem-sucedido: ${user.username} (ID: ${user.id}) - IP: ${req.ip}`);
        
        res.json({ 
            success: true,
            message: 'Login realizado com sucesso.',
            accessToken,
            user: {
                id: user.id,
                username: user.username,
                createdAt: user.created_at,
                lastLogin: user.last_login
            },
            expiresIn: '24h',
            tokenType: 'Bearer'
        });

    } catch (error) {
        console.error('❌ Erro no login:', error);
        res.status(500).json({ 
            success: false,
            message: 'Erro interno no servidor.',
            code: 'INTERNAL_ERROR'
        });
    }
});

// --- 7. ROTAS PROTEGIDAS OTIMIZADAS ---
app.post('/api/expenses', authenticateToken, upload.single('invoice'), async (req, res) => {
    try {
        const {
            transaction_date,
            amount,
            description,
            account,
            account_plan_code,
            total_installments
        } = req.body;

        const is_business_expense = req.body.is_business_expense === 'true' || req.body.is_business_expense === true;
        const has_invoice = req.body.has_invoice === 'true' || req.body.has_invoice === true;
        const userId = req.user.id;
        const invoicePath = req.file ? req.file.path : null;

        // Validação rigorosa dos campos obrigatórios
        if (!transaction_date || !amount || !description || !account) {
            return res.status(400).json({ 
                success: false,
                message: 'Campos obrigatórios: data, valor, descrição e conta.',
                code: 'MISSING_REQUIRED_FIELDS'
            });
        }

        // Validação de tipos de dados
        const installmentAmount = parseFloat(amount);
        const numberOfInstallments = parseInt(total_installments, 10) || 1;

        if (isNaN(installmentAmount) || installmentAmount <= 0) {
            return res.status(400).json({ 
                success: false,
                message: 'Valor deve ser um número positivo.',
                code: 'INVALID_AMOUNT'
            });
        }

        if (numberOfInstallments < 1 || numberOfInstallments > 60) {
            return res.status(400).json({ 
                success: false,
                message: 'Número de parcelas deve estar entre 1 e 60.',
                code: 'INVALID_INSTALLMENTS'
            });
        }

        // Validação da data
        const transactionDate = new Date(transaction_date);
        if (isNaN(transactionDate.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Data da transação inválida.',
                code: 'INVALID_DATE'
            });
        }

        // Validação da conta
        const allowedAccounts = ['Nu Bank Ketlyn', 'Nu Vainer', 'Ourocard Ketlyn', 'PicPay Vainer', 'PIX', 'Boleto'];
        if (!allowedAccounts.includes(account)) {
            return res.status(400).json({
                success: false,
                message: 'Conta não permitida.',
                code: 'INVALID_ACCOUNT'
            });
        }

        // Validação do plano de contas para gastos pessoais
        if (!is_business_expense && account_plan_code && (isNaN(parseInt(account_plan_code)) || parseInt(account_plan_code) < 1)) {
            return res.status(400).json({
                success: false,
                message: 'Código do plano de contas inválido.',
                code: 'INVALID_ACCOUNT_PLAN'
            });
        }

        const calculatedTotalAmount = installmentAmount * numberOfInstallments;
        const insertedExpenses = [];

        // Transação para garantir consistência
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            for (let i = 0; i < numberOfInstallments; i++) {
                const installmentDate = new Date(transactionDate);
                installmentDate.setMonth(installmentDate.getMonth() + i);

                const installmentDescription = numberOfInstallments > 1
                    ? `${description} (Parcela ${i + 1}/${numberOfInstallments})`
                    : description;

                const sql = `
                    INSERT INTO expenses (
                        user_id, transaction_date, amount, description, account,
                        is_business_expense, account_plan_code, has_invoice, invoice_path,
                        total_purchase_amount, installment_number, total_installments
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

                const params = [
                    userId,
                    installmentDate.toISOString().slice(0, 10),
                    installmentAmount.toFixed(2),
                    installmentDescription,
                    account,
                    is_business_expense ? 1 : 0,
                    is_business_expense ? null : (account_plan_code || null),
                    (is_business_expense && i === 0 && has_invoice) ? 1 : 0,
                    (is_business_expense && i === 0 && has_invoice) ? invoicePath : null,
                    calculatedTotalAmount.toFixed(2),
                    i + 1,
                    numberOfInstallments
                ];

                const [result] = await connection.query(sql, params);
                insertedExpenses.push({
                    id: result.insertId,
                    installment: i + 1,
                    date: installmentDate.toISOString().slice(0, 10),
                    amount: installmentAmount
                });
            }

            await connection.commit();
            console.log(`✅ ${numberOfInstallments} despesa(s) adicionada(s) para usuário ${userId}`);

            res.status(201).json({ 
                success: true,
                message: `${numberOfInstallments} despesa(s) adicionada(s) com sucesso!`,
                data: {
                    totalExpenses: numberOfInstallments,
                    totalAmount: calculatedTotalAmount,
                    installmentAmount: installmentAmount,
                    expenses: insertedExpenses
                }
            });

        } catch (transactionError) {
            await connection.rollback();
            throw transactionError;
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('❌ Erro ao adicionar gasto:', error);
        
        // Remover arquivo enviado se houve erro
        if (req.file && req.file.path) {
            try {
                await fs.unlink(req.file.path);
            } catch (unlinkError) {
                console.error('❌ Erro ao remover arquivo:', unlinkError);
            }
        }

        res.status(500).json({ 
            success: false,
            message: 'Erro interno ao adicionar gasto.',
            code: 'INTERNAL_ERROR'
        });
    }
});

app.get('/api/expenses', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { 
            year, 
            month, 
            account, 
            start_date, 
            end_date, 
            include_recurring, 
            billing_period,
            limit = 1000,
            offset = 0,
            sort_by = 'transaction_date',
            sort_order = 'DESC'
        } = req.query;

        // Validação de parâmetros
        const validSortFields = ['transaction_date', 'amount', 'description', 'account', 'created_at'];
        const validSortOrders = ['ASC', 'DESC'];
        
        if (!validSortFields.includes(sort_by)) {
            return res.status(400).json({
                success: false,
                message: 'Campo de ordenação inválido.',
                code: 'INVALID_SORT_FIELD'
            });
        }

        if (!validSortOrders.includes(sort_order.toUpperCase())) {
            return res.status(400).json({
                success: false,
                message: 'Ordem de classificação inválida.',
                code: 'INVALID_SORT_ORDER'
            });
        }

        // Definir períodos de faturamento
        const billingPeriods = {
            'Nu Bank Ketlyn': { startDay: 2, endDay: 1 },
            'Nu Vainer': { startDay: 2, endDay: 1 },
            'Ourocard Ketlyn': { startDay: 17, endDay: 16 },
            'PicPay Vainer': { startDay: 1, endDay: 30 },
            'PIX': { startDay: 1, endDay: 30, isRecurring: true },
            'Boleto': { startDay: 1, endDay: 30, isRecurring: true }
        };

        // Construir query SQL com otimizações
        let sql = `
            SELECT 
                id, user_id, transaction_date, amount, description, account,
                is_business_expense, account_plan_code, has_invoice, invoice_path,
                total_purchase_amount, installment_number, total_installments,
                is_recurring_expense, created_at
            FROM expenses 
            WHERE user_id = ?
        `;
        const params = [userId];

        // Filtro por conta
        if (account) {
            sql += ' AND account = ?';
            params.push(account);
        }

        // Filtrar gastos recorrentes se não explicitamente solicitado
        if (include_recurring !== 'true') {
            if (account && ['PIX', 'Boleto'].includes(account)) {
                if (!start_date && !end_date && billing_period !== 'true') {
                    sql += ' AND (is_recurring_expense = 0 OR is_recurring_expense IS NULL)';
                }
            }
        }

        // Filtro por datas
        if (start_date && end_date) {
            // Validar formato das datas
            const startDateObj = new Date(start_date);
            const endDateObj = new Date(end_date);
            
            if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: 'Formato de data inválido.',
                    code: 'INVALID_DATE_FORMAT'
                });
            }

            sql += ' AND transaction_date >= ? AND transaction_date <= ?';
            params.push(start_date, end_date);
        } else if (billing_period === 'true' && account && billingPeriods[account] && year && month) {
            // Período vigente de fatura
            const { startDay, endDay, isRecurring } = billingPeriods[account];
            
            if (!isRecurring) {
                const startDate = new Date(year, month - 1, startDay);
                let endMonth = Number(month);
                let endYear = Number(year);
                if (endDay < startDay) {
                    endMonth++;
                    if (endMonth > 12) { endMonth = 1; endYear++; }
                }
                const endDate = new Date(endYear, endMonth - 1, endDay);

                sql += ' AND transaction_date >= ? AND transaction_date <= ?';
                params.push(startDate.toISOString().slice(0, 10), endDate.toISOString().slice(0, 10));
            } else {
                sql += ' AND YEAR(transaction_date) = ? AND MONTH(transaction_date) = ?';
                params.push(year, month);
            }
        } else if (account && billingPeriods[account] && year && month && billing_period !== 'false') {
            // Aplicar período de fatura padrão
            if (!billingPeriods[account].isRecurring) {
                const { startDay, endDay } = billingPeriods[account];
                const startDate = new Date(year, month - 1, startDay);
                let endMonth = Number(month);
                let endYear = Number(year);
                if (endDay < startDay) {
                    endMonth++;
                    if (endMonth > 12) { endMonth = 1; endYear++; }
                }
                const endDate = new Date(endYear, endMonth - 1, endDay);

                sql += ' AND transaction_date >= ? AND transaction_date <= ?';
                params.push(startDate.toISOString().slice(0, 10), endDate.toISOString().slice(0, 10));
            } else {
                sql += ' AND YEAR(transaction_date) = ? AND MONTH(transaction_date) = ?';
                params.push(year, month);
            }
        } else if (year && month) {
            sql += ' AND YEAR(transaction_date) = ? AND MONTH(transaction_date) = ?';
            params.push(year, month);
        }

        // Ordenação e paginação
        sql += ` ORDER BY ${sort_by} ${sort_order.toUpperCase()}`;
        
        // Aplicar limite e offset para paginação
        const limitNum = Math.min(parseInt(limit) || 1000, 5000); // Máximo 5000 registros
        const offsetNum = parseInt(offset) || 0;
        sql += ` LIMIT ? OFFSET ?`;
        params.push(limitNum, offsetNum);

        // Executar query principal
        const [rows] = await pool.query(sql, params);

        // Query para contar total de registros (para paginação)
        let countSql = sql.replace(/SELECT[^FROM]+FROM/, 'SELECT COUNT(*) as total FROM');
        countSql = countSql.replace(/ORDER BY[^LIMIT]+/, '');
        countSql = countSql.replace(/LIMIT[^$]+/, '');
        
        const countParams = params.slice(0, -2); // Remover LIMIT e OFFSET
        const [countResult] = await pool.query(countSql, countParams);
        const totalRecords = countResult[0].total;

        // Calcular estatísticas
        let statsSql = sql.replace(/SELECT[^FROM]+FROM/, 'SELECT SUM(amount) as total_amount, AVG(amount) as avg_amount FROM');
        statsSql = statsSql.replace(/ORDER BY[^LIMIT]+/, '');
        statsSql = statsSql.replace(/LIMIT[^$]+/, '');
        
        const [statsResult] = await pool.query(statsSql, countParams);
        const stats = statsResult[0];

        console.log(`✅ Busca de despesas: ${rows.length} registros para usuário ${userId}`);

        res.json({
            success: true,
            data: rows.map(expense => ({
                ...expense,
                amount: parseFloat(expense.amount),
                total_purchase_amount: expense.total_purchase_amount ? parseFloat(expense.total_purchase_amount) : null,
                is_business_expense: Boolean(expense.is_business_expense),
                has_invoice: Boolean(expense.has_invoice),
                is_recurring_expense: Boolean(expense.is_recurring_expense)
            })),
            pagination: {
                total: totalRecords,
                limit: limitNum,
                offset: offsetNum,
                hasNext: (offsetNum + limitNum) < totalRecords,
                hasPrev: offsetNum > 0
            },
            statistics: {
                totalAmount: parseFloat(stats.total_amount || 0),
                averageAmount: parseFloat(stats.avg_amount || 0),
                count: totalRecords
            },
            filters: {
                year,
                month,
                account,
                start_date,
                end_date,
                include_recurring,
                billing_period
            }
        });

    } catch (error) {
        console.error('❌ Erro ao buscar despesas:', error);
        res.status(500).json({ 
            success: false,
            message: 'Erro ao buscar despesas.',
            code: 'INTERNAL_ERROR'
        });
    }
});

app.delete('/api/expenses/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Validação do ID
        const expenseId = parseInt(id);
        if (isNaN(expenseId) || expenseId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'ID da despesa inválido.',
                code: 'INVALID_EXPENSE_ID'
            });
        }

        // Buscar a despesa para verificar se existe e pertence ao usuário
        const [existingExpense] = await pool.query(
            'SELECT id, invoice_path, installment_number, total_installments FROM expenses WHERE id = ? AND user_id = ?', 
            [expenseId, userId]
        );

        if (existingExpense.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Despesa não encontrada.',
                code: 'EXPENSE_NOT_FOUND'
            });
        }

        const expense = existingExpense[0];
        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();

            // Se tem arquivo de nota fiscal, remover
            if (expense.invoice_path) {
                try {
                    await fs.unlink(expense.invoice_path);
                    console.log(`✅ Arquivo removido: ${expense.invoice_path}`);
                } catch (fileError) {
                    console.warn(`⚠️  Erro ao remover arquivo: ${expense.invoice_path}`, fileError.message);
                }
            }

            // Remover a despesa
            const [deleteResult] = await connection.query(
                'DELETE FROM expenses WHERE id = ? AND user_id = ?', 
                [expenseId, userId]
            );

            if (deleteResult.affectedRows === 0) {
                throw new Error('Falha ao deletar despesa');
            }

            await connection.commit();
            console.log(`✅ Despesa deletada: ID ${expenseId} - Usuário ${userId}`);

            res.json({
                success: true,
                message: 'Despesa removida com sucesso!',
                data: {
                    deletedId: expenseId,
                    installmentInfo: expense.total_installments > 1 ? {
                        installment: expense.installment_number,
                        total: expense.total_installments
                    } : null
                }
            });

        } catch (transactionError) {
            await connection.rollback();
            throw transactionError;
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('❌ Erro ao remover despesa:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno ao remover despesa.',
            code: 'INTERNAL_ERROR'
        });
    }
});

app.get('/api/dashboard', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { year, month } = req.query;

    if (!year || !month) {
        return res.status(400).json({ message: 'Ano e mês são obrigatórios.' });
    }

    try {
        const [
            projectionData,
            lineChartData,
            pieChartData,
            mixedTypeChartData,
            planChartData
        ] = await Promise.all([
            // Projeção para o próximo mês
            pool.query(
                `SELECT SUM(amount) AS total FROM expenses WHERE user_id = ? AND YEAR(transaction_date) = ? AND MONTH(transaction_date) = ?`,
                [userId, parseInt(month, 10) === 12 ? parseInt(year, 10) + 1 : year, parseInt(month, 10) === 12 ? 1 : parseInt(month, 10) + 1]
            ),
            // Evolução dos Gastos (Diário para o mês selecionado)
            pool.query(
                `SELECT DAY(transaction_date) as day, SUM(amount) as total FROM expenses WHERE user_id = ? AND YEAR(transaction_date) = ? AND MONTH(transaction_date) = ? GROUP BY DAY(transaction_date) ORDER BY DAY(transaction_date)`,
                [userId, year, month]
            ),
            // Distribuição por Conta (Pie Chart)
            pool.query(
                `SELECT account, SUM(amount) as total FROM expenses WHERE user_id = ? AND YEAR(transaction_date) = ? AND MONTH(transaction_date) = ? GROUP BY account`,
                [userId, year, month]
            ),
            // Comparação Pessoal vs. Empresarial (Mixed Chart)
            pool.query(
                `SELECT account,
                        SUM(CASE WHEN is_business_expense = 0 THEN amount ELSE 0 END) as personal_total,
                        SUM(CASE WHEN is_business_expense = 1 THEN amount ELSE 0 END) as business_total
                 FROM expenses
                 WHERE user_id = ? AND YEAR(transaction_date) = ? AND MONTH(transaction_date) = ?
                 GROUP BY account`,
                [userId, year, month]
            ),
            // Gastos por Plano de Conta (Bar Chart)
            pool.query(
                `SELECT account_plan_code, SUM(amount) as total
                 FROM expenses
                 WHERE user_id = ? AND is_business_expense = 0 AND account_plan_code IS NOT NULL AND YEAR(transaction_date) = ? AND MONTH(transaction_date) = ?
                 GROUP BY account_plan_code`,
                [userId, year, month]
            )
        ]);

        const nextMonthProjection = parseFloat(projectionData[0][0]?.total || 0);

        res.json({
            projection: { nextMonthEstimate: nextMonthProjection.toFixed(2) },
            lineChartData: lineChartData[0],
            pieChartData: pieChartData[0],
            mixedTypeChartData: mixedTypeChartData[0],
            planChartData: planChartData[0]
        });

    } catch (error) {
        console.error('Erro ao buscar dados do dashboard:', error);
        res.status(500).json({ message: 'Erro ao buscar dados do dashboard.' });
    }
});

// --- 8.1. ROTA DE TETOS POR PLANO DE CONTAS (ALERTAS) ---
// Renomeado de metas para tetos, pois o foco é não ultrapassar o limite de gastos
const tetos = {
    1: 1000.00, 2: 2782.47, 3: 3165.53, 4: 350.00, 5: 2100.00,
    6: 550.00, 7: 270.00, 8: 1700.00, 9: 1700.00, 10: 230.00,
    11: 1895.40, 12: 1937.70, 13: 220.00, 14: 55.00, 15: 129.90,
    16: 59.90, 17: 4100.00, 18: 1300.00, 19: 500.00, 20: 500.00,
    21: 150.00, 22: 1134.00, 23: 500.00, 24: 1000.00, 25: 350.00,
    26: 2000.00, 27: 500.00, 28: 450.00, 29: 285.00, 30: 700.00,
    31: 200.00, 32: 450.00, 33: 100.00, 34: 54.80, 35: 200.00,
    36: 600.00, 37: 0.00, 38: 210.00, 39: 400.00, 40: 0.00,
    41: 360.00, 42: 0.00, 43: 210.00, 44: 200.00, 45: 12500.00
};

// Rota protegida para tetos por plano de contas
app.get('/api/expenses-goals', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { year, month } = req.query;

        let sql = `
            SELECT account_plan_code, SUM(amount) as Total
            FROM expenses
            WHERE user_id = ? AND account_plan_code IS NOT NULL
        `;
        const params = [userId];

        if (year && month) {
            sql += ' AND YEAR(transaction_date) = ? AND MONTH(transaction_date) = ?';
            params.push(year, month);
        }

        sql += ' GROUP BY account_plan_code ORDER BY Total DESC';

        const [results] = await pool.query(sql, params);

        const dataWithLimits = results.map(item => {
            const planoId = parseInt(item.account_plan_code);
            const teto = tetos[planoId] || 0;
            const percentual = teto > 0 ? (item.Total / teto) * 100 : 0;
            let alerta = null;

            // Mensagens focadas em não ultrapassar o teto
            if (percentual > 101) {
                alerta = {
                    percentual: 101,
                    mensagem: `Atenção! Você ULTRAPASSOU o teto de gastos do plano ${planoId}.`
                };
            } else if (percentual >= 100) {
                alerta = {
                    percentual: 100,
                    mensagem: `Atenção! Você atingiu o teto de gastos do plano ${planoId}.`
                };
            } else if (percentual >= 95) {
                alerta = {
                    percentual: 95,
                    mensagem: `Alerta: Você está em 95% do teto de gastos do plano ${planoId}.`
                };
            } else if (percentual >= 90) {
                alerta = {
                    percentual: 90,
                    mensagem: `Alerta: Você está em 90% do teto de gastos do plano ${planoId}.`
                };
            } else if (percentual >= 85) {
                alerta = {
                    percentual: 85,
                    mensagem: `Alerta: Você está em 85% do teto de gastos do plano ${planoId}.`
                };
            } else if (percentual >= 80) {
                alerta = {
                    percentual: 80,
                    mensagem: `Alerta: Você está em 80% do teto de gastos do plano ${planoId}.`
                };
            } else if (percentual >= 70) {
                alerta = {
                    percentual: 70,
                    mensagem: `Alerta: Você está em 70% do teto de gastos do plano ${planoId}.`
                };
            } else if (percentual >= 50) {
                alerta = {
                    percentual: 50,
                    mensagem: `Alerta: Você está em 50% do teto de gastos do plano ${planoId}.`
                };
            }

            return {
                PlanoContasID: planoId,
                Total: item.Total,
                Teto: teto,
                Percentual: percentual,
                Alerta: alerta
            };
        });

        res.json(dataWithLimits);
    } catch (error) {
        console.error('Erro ao buscar tetos:', error);
        res.status(500).json({ message: 'Erro ao buscar tetos.' });
    }
});


app.get('/api/reports/weekly', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 (domingo) a 6 (sábado)
    const start = new Date(now);
    start.setDate(now.getDate() - dayOfWeek);
    start.setHours(0,0,0,0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23,59,59,999);

    try {
        // Busca gastos da semana
        const [expenses] = await pool.query(
            `SELECT * FROM expenses WHERE user_id = ? AND transaction_date BETWEEN ? AND ? ORDER BY transaction_date`,
            [userId, start.toISOString().slice(0,10), end.toISOString().slice(0,10)]
        );

        // Resumo
        const total = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
        const porConta = {};
        const porTipo = { Pessoal: 0, Empresarial: 0 };
        const porDia = {};
        expenses.forEach(e => {
            porConta[e.account] = (porConta[e.account] || 0) + parseFloat(e.amount);
            if (e.is_business_expense) porTipo.Empresarial += parseFloat(e.amount);
            else porTipo.Pessoal += parseFloat(e.amount);

            const dia = new Date(e.transaction_date).toLocaleDateString('pt-BR');
            porDia[dia] = (porDia[dia] || 0) + parseFloat(e.amount);
        });

        // Top 5 maiores gastos
        const topGastos = [...expenses]
            .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount))
            .slice(0, 5);

        // Verificar se ChartJS está disponível antes de gerar gráficos
        let chartBarBuffer, chartPieBuffer, chartLineBuffer;
        
        if (ChartJSNodeCanvas) {
            try {
                // Gráfico de barras por conta
                const chartCanvas = new ChartJSNodeCanvas({ width: 600, height: 300 });
                chartBarBuffer = await chartCanvas.renderToBuffer({
                    type: 'bar',
                    data: {
                        labels: Object.keys(porConta),
                        datasets: [{
                            label: 'Gastos por Conta',
                            data: Object.values(porConta),
                            backgroundColor: [
                                '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#6366F1'
                            ]
                        }]
                    },
                    options: { plugins: { legend: { display: false } } }
                });

                // Gráfico de pizza por tipo
                chartPieBuffer = await chartCanvas.renderToBuffer({
                    type: 'pie',
                    data: {
                        labels: Object.keys(porTipo),
                        datasets: [{
                            data: Object.values(porTipo),
                            backgroundColor: ['#3B82F6', '#EF4444']
                        }]
                    }
                });

                // Gráfico de linha por dia
                const diasLabels = Object.keys(porDia);
                const diasValores = diasLabels.map(d => porDia[d]);
                chartLineBuffer = await chartCanvas.renderToBuffer({
                    type: 'line',
                    data: {
                        labels: diasLabels,
                        datasets: [{
                            label: 'Gastos por Dia',
                            data: diasValores,
                            borderColor: '#6366F1',
                            backgroundColor: 'rgba(99,102,241,0.2)',
                            fill: true,
                            tension: 0.3
                        }]
                    }
                });
            } catch (chartError) {
                console.warn('⚠️  Erro ao gerar gráficos:', chartError.message);
                chartBarBuffer = chartPieBuffer = chartLineBuffer = null;
            }
        } else {
            console.log('⚠️  ChartJS não disponível, gerando PDF sem gráficos');
        }

        // Gera PDF
        const doc = new pdfkit({ autoFirstPage: false });
        doc.registerFont('NotoSans', path.join(__dirname, 'fonts', 'NotoSans-Regular.ttf'));
        doc.font('NotoSans');

        // Página de capa
        doc.addPage({ margin: 40, size: 'A4', layout: 'portrait', bufferPages: true });
        doc.rect(0, 0, doc.page.width, 90).fill('#3B82F6');
        doc.fillColor('white').fontSize(32).text('📅 Relatório Semanal de Gastos', 0, 30, { align: 'center', width: doc.page.width });
        doc.moveDown(2);
        doc.fillColor('#222').fontSize(16).text(`Período: ${start.toLocaleDateString('pt-BR')} a ${end.toLocaleDateString('pt-BR')}`, { align: 'center' });
        doc.moveDown();
        doc.fontSize(14).fillColor('#10B981').text(`Total gasto: R$ ${total.toFixed(2)}`, { align: 'center' });
        doc.moveDown(2);
        doc.fillColor('#6B7280').fontSize(12).text('Relatório gerado automaticamente pelo sistema Controle de Gastos', { align: 'center' });

        // Gráfico de barras por conta
        doc.addPage();
        doc.rect(0, 0, doc.page.width, 40).fill('#6366F1');
        doc.fillColor('white').fontSize(20).text('💳 Gastos por Conta', 0, 10, { align: 'center', width: doc.page.width });
        doc.moveDown(2);
        
        if (chartBarBuffer) {
            doc.image(chartBarBuffer, { fit: [500, 200], align: 'center' });
        } else {
            doc.fontSize(14).fillColor('#666').text('Gráfico não disponível - ChartJS não instalado', { align: 'center' });
        }
        doc.moveDown();
        Object.entries(porConta).forEach(([conta, valor]) => {
            doc.fontSize(12).fillColor('#222').text(`- ${conta}: R$ ${valor.toFixed(2)}`);
        });

        // Gráfico de pizza por tipo
        doc.addPage();
        doc.rect(0, 0, doc.page.width, 40).fill('#F59E0B');
        doc.fillColor('white').fontSize(20).text('🏷️ Distribuição por Tipo', 0, 10, { align: 'center', width: doc.page.width });
        doc.moveDown(2);
        
        if (chartPieBuffer) {
            doc.image(chartPieBuffer, { fit: [300, 200], align: 'center' });
        } else {
            doc.fontSize(14).fillColor('#666').text('Gráfico não disponível - ChartJS não instalado', { align: 'center' });
        }
        doc.moveDown();
        Object.entries(porTipo).forEach(([tipo, valor]) => {
            doc.fontSize(12).fillColor(tipo === 'Empresarial' ? '#EF4444' : '#3B82F6').text(`- ${tipo}: R$ ${valor.toFixed(2)}`);
        });

        // Gráfico de linha por dia
        doc.addPage();
        doc.rect(0, 0, doc.page.width, 40).fill('#10B981');
        doc.fillColor('white').fontSize(20).text('📈 Evolução Diária dos Gastos', 0, 10, { align: 'center', width: doc.page.width });
        doc.moveDown(2);
        
        if (chartLineBuffer) {
            doc.image(chartLineBuffer, { fit: [500, 200], align: 'center' });
        } else {
            doc.fontSize(14).fillColor('#666').text('Gráfico não disponível - ChartJS não instalado', { align: 'center' });
        }

        // Top 5 maiores gastos
        doc.addPage();
        doc.rect(0, 0, doc.page.width, 40).fill('#EF4444');
        doc.fillColor('white').fontSize(20).text('🔥 Top 5 Maiores Gastos da Semana', 0, 10, { align: 'center', width: doc.page.width });
        doc.moveDown(2);
        topGastos.forEach((e, idx) => {
            doc.fontSize(13).fillColor('#222').text(
                `${idx + 1}. ${new Date(e.transaction_date).toLocaleDateString('pt-BR')} | ${e.account} | R$ ${parseFloat(e.amount).toFixed(2)} | ${e.description}`
            );
        });

        // Lista de todas as transações
        doc.addPage();
        doc.rect(0, 0, doc.page.width, 40).fill('#3B82F6');
        doc.fillColor('white').fontSize(20).text('📋 Todas as Transações da Semana', 0, 10, { align: 'center', width: doc.page.width });
        doc.moveDown(2);
        expenses.forEach(e => {
            doc.fontSize(10).fillColor('#222').text(
                `🗓️ ${new Date(e.transaction_date).toLocaleDateString('pt-BR')} | R$ ${parseFloat(e.amount).toFixed(2)} | ${e.account} | ${e.description} | ${e.is_business_expense ? 'Empresarial 💼' : 'Pessoal 🏠'}`
            );
        });

        // Rodapé
        doc.fontSize(10).fillColor('#6B7280').text('Obrigado por usar o Controle de Gastos! 🚀', 0, doc.page.height - 40, { align: 'center', width: doc.page.width });

        doc.end();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=relatorio-semanal.pdf');
        doc.pipe(res);
    } catch (error) {
        console.error('Erro ao gerar relatório semanal:', error);
        res.status(500).json({ message: 'Erro ao gerar relatório semanal.' });
    }
});

app.post('/api/reports/monthly', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { year, month, account } = req.body;

    if (!year || !month) {
        return res.status(400).json({ message: 'Ano e mês são obrigatórios.' });
    }

    // Determina período vigente se for por conta
    let startDate, endDate;
    let contaNome = account || 'Todas as Contas';
    if (account && billingPeriods[account]) {
        const { startDay, endDay } = billingPeriods[account];
        startDate = new Date(year, month - 1, startDay);
        let endMonth = Number(month);
        let endYear = Number(year);
        if (endDay <= startDay) {
            endMonth++;
            if (endMonth > 12) { endMonth = 1; endYear++; }
        }
        endDate = new Date(endYear, endMonth - 1, endDay);
    } else {
        startDate = new Date(year, month - 1, 1);
        endDate = new Date(year, month, 0);
    }

    try {
        // Busca despesas do período
        let sql = `SELECT * FROM expenses WHERE user_id = ? AND transaction_date >= ? AND transaction_date <= ?`;
        let params = [userId, startDate.toISOString().slice(0,10), endDate.toISOString().slice(0,10)];
        if (account) {
            sql += ' AND account = ?';
            params.push(account);
        }
        sql += ' ORDER BY transaction_date';
        const [expenses] = await pool.query(sql, params);

        // Gastos empresariais detalhados
        const empresariais = expenses.filter(e => e.is_business_expense);

        // Resumo geral
        const total = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
        const totalEmpresarial = empresariais.reduce((sum, e) => sum + parseFloat(e.amount), 0);
        const totalPessoal = total - totalEmpresarial;

        // Por plano de conta
        const porPlano = {};
        expenses.forEach(e => {
            const plano = e.account_plan_code || 'Sem Plano';
            if (!porPlano[plano]) porPlano[plano] = 0;
            porPlano[plano] += parseFloat(e.amount);
        });

        // Por conta
        const porConta = {};
        expenses.forEach(e => {
            const conta = e.account || 'Sem Conta';
            if (!porConta[conta]) porConta[conta] = 0;
            porConta[conta] += parseFloat(e.amount);
        });

        // Gera PDF
        const doc = new pdfkit({ autoFirstPage: false });
        doc.registerFont('NotoSans', path.join(__dirname, 'fonts', 'NotoSans-Regular.ttf'));
        doc.font('NotoSans');

        // Capa
        doc.addPage({ margin: 40, size: 'A4', layout: 'portrait', bufferPages: true });
        doc.rect(0, 0, doc.page.width, 90).fill('#3B82F6');
        doc.fillColor('white').fontSize(32).text('📅 Relatório Mensal de Gastos', 0, 30, { align: 'center', width: doc.page.width });
        doc.moveDown(2);
        doc.fillColor('#222').fontSize(16).text(`Período: ${startDate.toLocaleDateString('pt-BR')} a ${endDate.toLocaleDateString('pt-BR')}`, { align: 'center' });
        doc.moveDown();
        doc.fontSize(14).fillColor('#10B981').text(`Total gasto: R$ ${total.toFixed(2)}`, { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).fillColor('#6366F1').text(`Conta: ${contaNome}`, { align: 'center' });
        doc.moveDown(2);
        doc.fillColor('#6B7280').fontSize(12).text('Relatório gerado automaticamente pelo sistema Controle de Gastos', { align: 'center' });

        // Resumo geral
        doc.addPage();
        doc.fontSize(20).fillColor('#3B82F6').text('Resumo Geral', { align: 'center' });
        doc.moveDown();
        doc.fontSize(14).fillColor('#222').text(`Total de despesas: R$ ${total.toFixed(2)}`);
        doc.text(`Total pessoal: R$ ${totalPessoal.toFixed(2)}`);
        doc.text(`Total empresarial: R$ ${totalEmpresarial.toFixed(2)}`);
        doc.moveDown();

        // Por plano de conta
        doc.fontSize(16).fillColor('#6366F1').text('Gastos por Plano de Conta', { underline: true });
        Object.entries(porPlano).forEach(([plano, valor]) => {
            doc.fontSize(12).fillColor('#222').text(`Plano ${plano}: R$ ${valor.toFixed(2)}`);
        });
        doc.moveDown();

        // Por conta
        doc.fontSize(16).fillColor('#6366F1').text('Gastos por Conta', { underline: true });
        Object.entries(porConta).forEach(([conta, valor]) => {
            doc.fontSize(12).fillColor('#222').text(`${conta}: R$ ${valor.toFixed(2)}`);
        });
        doc.moveDown();

        // Detalhe dos gastos empresariais
        doc.addPage();
        doc.fontSize(18).fillColor('#EF4444').text('Gastos Empresariais Detalhados', { align: 'center' });
        doc.moveDown();
        if (empresariais.length === 0) {
            doc.fontSize(12).fillColor('#888').text('Nenhum gasto empresarial registrado no período.');
        } else {
            empresariais.forEach(e => {
                doc.fontSize(12).fillColor('#222').text(
                    `Data: ${new Date(e.transaction_date).toLocaleDateString('pt-BR')} | Valor: R$ ${parseFloat(e.amount).toFixed(2)} | Conta: ${e.account} | Descrição: ${e.description}${e.has_invoice ? ' | Nota Fiscal: Sim' : ''}`
                );
            });
        }

        // Todas as despesas do mês
        doc.addPage();
        doc.fontSize(18).fillColor('#3B82F6').text('Todas as Despesas do Mês', { align: 'center' });
        doc.moveDown();
        expenses.forEach(e => {
            doc.fontSize(11).fillColor('#222').text(
                `Data: ${new Date(e.transaction_date).toLocaleDateString('pt-BR')} | Valor: R$ ${parseFloat(e.amount).toFixed(2)} | Conta: ${e.account} | Tipo: ${e.is_business_expense ? 'Empresarial' : 'Pessoal'} | Plano: ${e.account_plan_code || '-'} | Descrição: ${e.description}${e.has_invoice ? ' | Nota Fiscal: Sim' : ''}`
            );
        });

        // Rodapé
        doc.fontSize(10).fillColor('#6B7280').text('Obrigado por usar o Controle de Gastos! 🚀', 0, doc.page.height - 40, { align: 'center', width: doc.page.width });

        doc.end();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=relatorio-mensal-${year}-${month}${account ? '-' + account : ''}.pdf`);
        doc.pipe(res);
    } catch (error) {
        console.error('Erro ao gerar relatório mensal:', error);
        res.status(500).json({ message: 'Erro ao gerar relatório mensal.' });
    }
});

// --- 8.2. ROTAS PARA GASTOS RECORRENTES MENSAIS ---

// Criar novo gasto recorrente
app.post('/api/recurring-expenses', authenticateToken, async (req, res) => {
    try {
        const {
            description,
            amount,
            account,
            account_plan_code,
            is_business_expense,
            day_of_month
        } = req.body;

        const userId = req.user.id;

        // Validação
        if (!description || !amount || !account) {
            return res.status(400).json({ message: 'Descrição, valor e conta são obrigatórios.' });
        }

        // Verificar se é conta que permite gastos recorrentes (PIX ou Boleto)
        if (!['PIX', 'Boleto'].includes(account)) {
            return res.status(400).json({ message: 'Gastos recorrentes só são permitidos para contas PIX e Boleto.' });
        }

        await pool.query(
            `INSERT INTO recurring_expenses (user_id, description, amount, account, account_plan_code, is_business_expense, day_of_month) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [userId, description, amount, account, account_plan_code || null, is_business_expense || 0, day_of_month || 1]
        );

        res.status(201).json({ message: 'Gasto recorrente criado com sucesso!' });
    } catch (error) {
        console.error('Erro ao criar gasto recorrente:', error);
        res.status(500).json({ message: 'Erro ao criar gasto recorrente.' });
    }
});

// Listar gastos recorrentes
app.get('/api/recurring-expenses', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const [rows] = await pool.query(
            'SELECT * FROM recurring_expenses WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC',
            [userId]
        );
        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar gastos recorrentes:', error);
        res.status(500).json({ message: 'Erro ao buscar gastos recorrentes.' });
    }
});

// Atualizar gasto recorrente
app.put('/api/recurring-expenses/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const {
            description,
            amount,
            account,
            account_plan_code,
            is_business_expense,
            day_of_month
        } = req.body;

        // Verificar se o gasto recorrente pertence ao usuário
        const [existing] = await pool.query(
            'SELECT id FROM recurring_expenses WHERE id = ? AND user_id = ?',
            [id, userId]
        );

        if (existing.length === 0) {
            return res.status(404).json({ message: 'Gasto recorrente não encontrado.' });
        }

        await pool.query(
            `UPDATE recurring_expenses 
             SET description = ?, amount = ?, account = ?, account_plan_code = ?, 
                 is_business_expense = ?, day_of_month = ? 
             WHERE id = ? AND user_id = ?`,
            [description, amount, account, account_plan_code || null, is_business_expense || 0, day_of_month || 1, id, userId]
        );

        res.json({ message: 'Gasto recorrente atualizado com sucesso!' });
    } catch (error) {
        console.error('Erro ao atualizar gasto recorrente:', error);
        res.status(500).json({ message: 'Erro ao atualizar gasto recorrente.' });
    }
});

// Deletar gasto recorrente
app.delete('/api/recurring-expenses/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const [result] = await pool.query(
            'UPDATE recurring_expenses SET is_active = 0 WHERE id = ? AND user_id = ?',
            [id, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Gasto recorrente não encontrado.' });
        }

        res.json({ message: 'Gasto recorrente removido com sucesso!' });
    } catch (error) {
        console.error('Erro ao remover gasto recorrente:', error);
        res.status(500).json({ message: 'Erro ao remover gasto recorrente.' });
    }
});

// Processar gastos recorrentes para um mês específico
app.post('/api/recurring-expenses/process', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { year, month } = req.body;

        if (!year || !month) {
            return res.status(400).json({ message: 'Ano e mês são obrigatórios.' });
        }

        const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
        
        // Buscar gastos recorrentes ativos que ainda não foram processados para este mês
        const [recurringExpenses] = await pool.query(`
            SELECT re.* FROM recurring_expenses re
            LEFT JOIN recurring_expense_processing rep ON re.id = rep.recurring_expense_id AND rep.processed_month = ?
            WHERE re.user_id = ? AND re.is_active = 1 AND rep.id IS NULL
        `, [monthKey, userId]);

        let processedCount = 0;

        for (const recurring of recurringExpenses) {
            // Criar a data baseada no dia configurado
            const transactionDate = new Date(year, month - 1, recurring.day_of_month);
            
            // Se o dia não existe no mês (ex: 31 em fevereiro), usar o último dia do mês
            if (transactionDate.getMonth() !== month - 1) {
                transactionDate.setDate(0); // Vai para o último dia do mês anterior
            }

            const formattedDate = transactionDate.toISOString().split('T')[0];

            // Inserir na tabela de expenses
            const [expenseResult] = await pool.query(
                `INSERT INTO expenses (user_id, transaction_date, amount, description, account, 
                 is_business_expense, account_plan_code, is_recurring_expense, total_installments) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1)`,
                [userId, formattedDate, recurring.amount, recurring.description, 
                 recurring.account, recurring.is_business_expense, recurring.account_plan_code]
            );

            // Registrar o processamento
            await pool.query(
                'INSERT INTO recurring_expense_processing (recurring_expense_id, processed_month, expense_id) VALUES (?, ?, ?)',
                [recurring.id, monthKey, expenseResult.insertId]
            );

            processedCount++;
        }

        res.json({ 
            message: 'Gastos recorrentes processados para ' + month + '/' + year + ': ' + processedCount,
            processedCount 
        });
    } catch (error) {
        console.error('Erro ao processar gastos recorrentes:', error);
        res.status(500).json({ message: 'Erro ao processar gastos recorrentes.' });
    }
});

const billingPeriods = {
    'Nu Bank Ketlyn': { startDay: 2, endDay: 1 },
    'Nu Vainer': { startDay: 2, endDay: 1 },
    'Ourocard Ketlyn': { startDay: 17, endDay: 16 },
    'PicPay Vainer': { startDay: 1, endDay: 30 },
    'PIX': { startDay: 1, endDay: 30, isRecurring: true },
    'Boleto': { startDay: 1, endDay: 30, isRecurring: true }
};

app.get('/api/accounts', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const [rows] = await pool.query(
            'SELECT DISTINCT account FROM expenses WHERE user_id = ? ORDER BY account',
            [userId]
        );
        res.json(rows.map(r => r.account));
    } catch (error) {
        console.error('Erro ao buscar contas:', error);
        res.status(500).json({ message: 'Erro ao buscar contas.' });
    }
});

// --- ROTAS PARA RELATÓRIOS ---
app.get('/api/reports/monthly', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { year, month } = req.query;
        
        const [rows] = await pool.query(`
            SELECT 
                account,
                SUM(CASE WHEN is_business_expense = 0 THEN amount ELSE 0 END) as personal_total,
                SUM(CASE WHEN is_business_expense = 1 THEN amount ELSE 0 END) as business_total,
                COUNT(*) as transaction_count
            FROM expenses 
            WHERE user_id = ? AND YEAR(transaction_date) = ? AND MONTH(transaction_date) = ?
            GROUP BY account
            ORDER BY (personal_total + business_total) DESC
        `, [userId, year, month]);
        
        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar relatório mensal:', error);
        res.status(500).json({ message: 'Erro ao buscar relatório mensal.' });
    }
});

app.get('/api/reports/weekly', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { startDate, endDate } = req.query;
        
        const [rows] = await pool.query(`
            SELECT * FROM expenses 
            WHERE user_id = ? AND transaction_date BETWEEN ? AND ?
            ORDER BY transaction_date DESC
        `, [userId, startDate, endDate]);
        
        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar relatório semanal:', error);
        res.status(500).json({ message: 'Erro ao buscar relatório semanal.' });
    }
});

// --- ROTAS PARA ANÁLISE EMPRESARIAL ---
app.get('/api/business/summary', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { year, month } = req.query;
        
        const [summary] = await pool.query(`
            SELECT 
                SUM(amount) as total,
                COUNT(*) as count,
                AVG(amount) as average,
                SUM(CASE WHEN invoice_path IS NOT NULL THEN amount ELSE 0 END) as invoiced_total,
                SUM(CASE WHEN invoice_path IS NULL THEN amount ELSE 0 END) as non_invoiced_total,
                COUNT(CASE WHEN invoice_path IS NOT NULL THEN 1 END) as invoiced_count,
                COUNT(CASE WHEN invoice_path IS NULL THEN 1 END) as non_invoiced_count
            FROM expenses 
            WHERE user_id = ? AND is_business_expense = 1
            ${year ? 'AND YEAR(transaction_date) = ?' : ''}
            ${month ? 'AND MONTH(transaction_date) = ?' : ''}
        `, [userId, year, month].filter(Boolean));
        
        res.json(summary[0] || {
            total: 0, count: 0, average: 0, 
            invoiced_total: 0, non_invoiced_total: 0,
            invoiced_count: 0, non_invoiced_count: 0
        });
    } catch (error) {
        console.error('Erro ao buscar resumo empresarial:', error);
        res.status(500).json({ message: 'Erro ao buscar resumo empresarial.' });
    }
});

// --- ROTAS PARA GESTÃO DE GASTOS RECORRENTES ---
app.get('/api/recurring-expenses', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const [rows] = await pool.query(`
            SELECT * FROM recurring_expenses 
            WHERE user_id = ? AND is_active = 1
            ORDER BY description ASC
        `, [userId]);
        
        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar gastos recorrentes:', error);
        res.status(500).json({ message: 'Erro ao buscar gastos recorrentes.' });
    }
});

app.post('/api/recurring-expenses', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { description, amount, account, category, is_business_expense, day_of_month } = req.body;
        
        if (!description || !amount || !account || !day_of_month) {
            return res.status(400).json({ message: 'Dados obrigatórios não fornecidos.' });
        }
        
        const [result] = await pool.query(`
            INSERT INTO recurring_expenses 
            (user_id, description, amount, account, category, is_business_expense, day_of_month, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        `, [userId, description, amount, account, category, is_business_expense || 0, day_of_month]);
        
        res.json({ 
            message: 'Gasto recorrente criado com sucesso!',
            id: result.insertId 
        });
    } catch (error) {
        console.error('Erro ao criar gasto recorrente:', error);
        res.status(500).json({ message: 'Erro ao criar gasto recorrente.' });
    }
});

app.delete('/api/recurring-expenses/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        
        const [result] = await pool.query(`
            UPDATE recurring_expenses 
            SET is_active = 0 
            WHERE id = ? AND user_id = ?
        `, [id, userId]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Gasto recorrente não encontrado.' });
        }
        
        res.json({ message: 'Gasto recorrente removido com sucesso!' });
    } catch (error) {
        console.error('Erro ao remover gasto recorrente:', error);
        res.status(500).json({ message: 'Erro ao remover gasto recorrente.' });
    }
});

app.post('/api/recurring-expenses/process', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { year, month } = req.body;
        
        if (!year || !month) {
            return res.status(400).json({ message: 'Ano e mês são obrigatórios.' });
        }
        
        // Buscar gastos recorrentes ativos
        const [recurringExpenses] = await pool.query(`
            SELECT * FROM recurring_expenses 
            WHERE user_id = ? AND is_active = 1
        `, [userId]);
        
        let processedCount = 0;
        
        for (const expense of recurringExpenses) {
            // Verificar se já foi processado neste mês
            const [existing] = await pool.query(`
                SELECT id FROM expenses 
                WHERE user_id = ? AND recurring_expense_id = ? 
                AND YEAR(transaction_date) = ? AND MONTH(transaction_date) = ?
            `, [userId, expense.id, year, month]);
            
            if (existing.length === 0) {
                // Criar a data da transação
                const transactionDate = new Date(year, month - 1, expense.day_of_month);
                
                // Inserir o gasto
                await pool.query(`
                    INSERT INTO expenses 
                    (user_id, description, amount, account, category, is_business_expense, transaction_date, recurring_expense_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    userId, 
                    expense.description,
                    expense.amount,
                    expense.account,
                    expense.category,
                    expense.is_business_expense,
                    transactionDate,
                    expense.id
                ]);
                
                processedCount++;
            }
        }
        
        res.json({ 
            message: `${processedCount} gastos recorrentes processados com sucesso!`,
            processed: processedCount 
        });
    } catch (error) {
        console.error('Erro ao processar gastos recorrentes:', error);
        res.status(500).json({ message: 'Erro ao processar gastos recorrentes.' });
    }
});

// --- ROTA PARA FATURAS COM PERÍODO VIGENTE ---
app.get('/api/bills', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { year, month, account } = req.query;

        if (!year || !month || !account) {
            return res.status(400).json({ message: 'Ano, mês e conta são obrigatórios para consulta de fatura.' });
        }

        // Verificar se a conta tem período vigente definido
        if (!billingPeriods[account]) {
            return res.status(400).json({ message: 'Conta não possui período de fatura definido.' });
        }

        const { startDay, endDay, isRecurring } = billingPeriods[account];
        
        // Calcular o período vigente da fatura
        let startDate, endDate;
        
        if (isRecurring) {
            // Para PIX e Boleto, usar o mês normal
            startDate = new Date(year, month - 1, 1);
            endDate = new Date(year, month, 0); // Último dia do mês
        } else {
            // Para cartões de crédito
            startDate = new Date(year, month - 1, startDay);
            let endMonth = Number(month);
            let endYear = Number(year);
            
            if (endDay < startDay) {
                endMonth++;
                if (endMonth > 12) { 
                    endMonth = 1; 
                    endYear++; 
                }
            }
            
            endDate = new Date(endYear, endMonth - 1, endDay);
        }

        // Buscar gastos no período vigente
        const [expenses] = await pool.query(`
            SELECT * FROM expenses 
            WHERE user_id = ? AND account = ? 
            AND transaction_date >= ? AND transaction_date <= ?
            ORDER BY transaction_date DESC
        `, [userId, account, startDate.toISOString().slice(0, 10), endDate.toISOString().slice(0, 10)]);

        // Calcular totais gerais
        const totalGeral = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
        const totalEmpresarial = expenses
            .filter(e => e.is_business_expense)
            .reduce((sum, e) => sum + parseFloat(e.amount), 0);
        const totalPessoal = totalGeral - totalEmpresarial;

        // Agrupar por planos de contas (apenas gastos pessoais)
        const porPlanoContas = {};
        const gastosEmpresariais = [];

        expenses.forEach(expense => {
            if (expense.is_business_expense) {
                gastosEmpresariais.push({
                    id: expense.id,
                    date: expense.transaction_date,
                    amount: parseFloat(expense.amount),
                    description: expense.description,
                    has_invoice: expense.has_invoice,
                    invoice_path: expense.invoice_path
                });
            } else if (expense.account_plan_code) {
                const plano = expense.account_plan_code;
                if (!porPlanoContas[plano]) {
                    porPlanoContas[plano] = {
                        code: plano,
                        total: 0,
                        count: 0,
                        expenses: []
                    };
                }
                porPlanoContas[plano].total += parseFloat(expense.amount);
                porPlanoContas[plano].count++;
                porPlanoContas[plano].expenses.push({
                    id: expense.id,
                    date: expense.transaction_date,
                    amount: parseFloat(expense.amount),
                    description: expense.description
                });
            }
        });

        // Converter para array e ordenar por total
        const planosArray = Object.values(porPlanoContas).sort((a, b) => b.total - a.total);

        res.json({
            account,
            period: {
                start: startDate.toISOString().slice(0, 10),
                end: endDate.toISOString().slice(0, 10),
                type: isRecurring ? 'monthly' : 'billing_cycle'
            },
            summary: {
                totalGeral: parseFloat(totalGeral.toFixed(2)),
                totalEmpresarial: parseFloat(totalEmpresarial.toFixed(2)),
                totalPessoal: parseFloat(totalPessoal.toFixed(2)),
                totalTransactions: expenses.length
            },
            planoContas: planosArray,
            gastosEmpresariais,
            allExpenses: expenses.map(e => ({
                id: e.id,
                date: e.transaction_date,
                amount: parseFloat(e.amount),
                description: e.description,
                account_plan_code: e.account_plan_code,
                is_business_expense: e.is_business_expense,
                has_invoice: e.has_invoice,
                invoice_path: e.invoice_path,
                installment_info: e.total_installments > 1 ? {
                    current: e.installment_number,
                    total: e.total_installments,
                    total_amount: e.total_purchase_amount
                } : null
            }))
        });

    } catch (error) {
        console.error('Erro ao buscar fatura:', error);
        res.status(500).json({ message: 'Erro ao buscar dados da fatura.' });
    }
});

// --- ROTA PARA RESUMO DE FATURA EM PDF ---
app.post('/api/bills/pdf', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { year, month, account } = req.body;

        if (!year || !month || !account) {
            return res.status(400).json({ message: 'Ano, mês e conta são obrigatórios.' });
        }

        // Verificar se a conta tem período vigente definido
        if (!billingPeriods[account]) {
            return res.status(400).json({ message: 'Conta não possui período de fatura definido.' });
        }

        const { startDay, endDay, isRecurring } = billingPeriods[account];
        
        // Calcular o período vigente da fatura
        let startDate, endDate;
        
        if (isRecurring) {
            startDate = new Date(year, month - 1, 1);
            endDate = new Date(year, month, 0);
        } else {
            startDate = new Date(year, month - 1, startDay);
            let endMonth = Number(month);
            let endYear = Number(year);
            
            if (endDay < startDay) {
                endMonth++;
                if (endMonth > 12) { 
                    endMonth = 1; 
                    endYear++; 
                }
            }
            
            endDate = new Date(endYear, endMonth - 1, endDay);
        }

        // Buscar gastos do período
        const [expenses] = await pool.query(`
            SELECT * FROM expenses 
            WHERE user_id = ? AND account = ? 
            AND transaction_date >= ? AND transaction_date <= ?
            ORDER BY transaction_date DESC
        `, [userId, account, startDate.toISOString().slice(0, 10), endDate.toISOString().slice(0, 10)]);

        // Calcular totais
        const totalGeral = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
        const totalEmpresarial = expenses
            .filter(e => e.is_business_expense)
            .reduce((sum, e) => sum + parseFloat(e.amount), 0);
        const totalPessoal = totalGeral - totalEmpresarial;

        // Agrupar por planos de contas
        const porPlanoContas = {};
        expenses.forEach(expense => {
            if (!expense.is_business_expense && expense.account_plan_code) {
                const plano = expense.account_plan_code;
                if (!porPlanoContas[plano]) {
                    porPlanoContas[plano] = { total: 0, count: 0 };
                }
                porPlanoContas[plano].total += parseFloat(expense.amount);
                porPlanoContas[plano].count++;
            }
        });

        // Gerar PDF
        const doc = new pdfkit({ autoFirstPage: false });
        doc.registerFont('NotoSans', path.join(__dirname, 'fonts', 'NotoSans-Regular.ttf'));
        doc.font('NotoSans');

        // Capa
        doc.addPage({ margin: 40, size: 'A4', layout: 'portrait' });
        doc.rect(0, 0, doc.page.width, 90).fill('#2563EB');
        doc.fillColor('white').fontSize(28).text('💳 Fatura Detalhada', 0, 30, { align: 'center', width: doc.page.width });
        doc.moveDown();
        doc.fontSize(16).text(`Conta: ${account}`, { align: 'center' });
        doc.fontSize(14).text(`Período: ${startDate.toLocaleDateString('pt-BR')} a ${endDate.toLocaleDateString('pt-BR')}`, { align: 'center' });
        doc.moveDown();
        doc.fontSize(20).fillColor('#10B981').text(`Total: R$ ${totalGeral.toFixed(2)}`, { align: 'center' });
        doc.moveDown(2);
        doc.fillColor('#6B7280').fontSize(12).text('Relatório gerado pelo sistema Controle de Gastos', { align: 'center' });

        // Resumo
        doc.addPage();
        doc.fontSize(22).fillColor('#1F2937').text('📊 Resumo da Fatura', { align: 'center' });
        doc.moveDown(2);
        
        doc.fontSize(16).fillColor('#059669');
        doc.text(`💰 Total Geral: R$ ${totalGeral.toFixed(2)}`);
        doc.moveDown();
        doc.fillColor('#DC2626').text(`🏢 Total Empresarial: R$ ${totalEmpresarial.toFixed(2)}`);
        doc.moveDown();
        doc.fillColor('#2563EB').text(`🏠 Total Pessoal: R$ ${totalPessoal.toFixed(2)}`);
        doc.moveDown();
        doc.fillColor('#6B7280').fontSize(14).text(`📝 Total de Transações: ${expenses.length}`);

        // Gastos por Plano de Contas
        if (Object.keys(porPlanoContas).length > 0) {
            doc.addPage();
            doc.fontSize(20).fillColor('#7C3AED').text('📋 Gastos por Plano de Contas', { align: 'center' });
            doc.moveDown(2);
            
            Object.entries(porPlanoContas)
                .sort(([,a], [,b]) => b.total - a.total)
                .forEach(([plano, data]) => {
                    doc.fontSize(14).fillColor('#1F2937');
                    doc.text(`Plano ${plano}: R$ ${data.total.toFixed(2)} (${data.count} transações)`);
                    doc.moveDown(0.5);
                });
        }

        // Gastos Empresariais Detalhados
        const gastosEmpresariais = expenses.filter(e => e.is_business_expense);
        if (gastosEmpresariais.length > 0) {
            doc.addPage();
            doc.fontSize(20).fillColor('#DC2626').text('🏢 Gastos Empresariais Detalhados', { align: 'center' });
            doc.moveDown(2);
            
            gastosEmpresariais.forEach(e => {
                doc.fontSize(12).fillColor('#1F2937');
                doc.text(`${new Date(e.transaction_date).toLocaleDateString('pt-BR')} | R$ ${parseFloat(e.amount).toFixed(2)} | ${e.description}${e.has_invoice ? ' | 📄 NF' : ''}`);
                doc.moveDown(0.3);
            });
        }

        // Todas as transações
        doc.addPage();
        doc.fontSize(18).fillColor('#1F2937').text('📝 Todas as Transações', { align: 'center' });
        doc.moveDown(2);
        
        expenses.forEach(e => {
            const tipo = e.is_business_expense ? '🏢' : '🏠';
            const plano = e.account_plan_code ? ` | Plano ${e.account_plan_code}` : '';
            doc.fontSize(11).fillColor('#374151');
            doc.text(`${new Date(e.transaction_date).toLocaleDateString('pt-BR')} | R$ ${parseFloat(e.amount).toFixed(2)} | ${tipo} ${e.description}${plano}`);
            doc.moveDown(0.2);
        });

        // Rodapé
        doc.fontSize(10).fillColor('#6B7280').text('Gerado automaticamente pelo Controle de Gastos 🚀', 0, doc.page.height - 40, { align: 'center', width: doc.page.width });

        doc.end();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=fatura-${account}-${year}-${month}.pdf`);
        doc.pipe(res);

    } catch (error) {
        console.error('Erro ao gerar PDF da fatura:', error);
        res.status(500).json({ message: 'Erro ao gerar PDF da fatura.' });
    }
});

// --- ROTA PARA INFORMAÇÕES DOS PERÍODOS DE FATURAMENTO ---
app.get('/api/billing-periods', authenticateToken, (req, res) => {
    try {
        const periods = Object.entries(billingPeriods).map(([account, config]) => ({
            account,
            startDay: config.startDay,
            endDay: config.endDay,
            isRecurring: config.isRecurring || false,
            type: config.isRecurring ? 'monthly' : 'billing_cycle'
        }));
        
        res.json(periods);
    } catch (error) {
        console.error('Erro ao buscar períodos de faturamento:', error);
        res.status(500).json({ message: 'Erro ao buscar períodos de faturamento.' });
    }
});

// --- ROTA PARA CALCULAR PERÍODO VIGENTE DE UMA CONTA ---
app.get('/api/billing-periods/:account/current', authenticateToken, (req, res) => {
    try {
        const { account } = req.params;
        const { year, month } = req.query;
        
        if (!year || !month) {
            return res.status(400).json({ message: 'Ano e mês são obrigatórios.' });
        }
        
        if (!billingPeriods[account]) {
            return res.status(404).json({ message: 'Conta não encontrada ou sem período definido.' });
        }
        
        const { startDay, endDay, isRecurring } = billingPeriods[account];
        let startDate, endDate;
        
        if (isRecurring) {
            startDate = new Date(year, month - 1, 1);
            endDate = new Date(year, month, 0);
        } else {
            startDate = new Date(year, month - 1, startDay);
            let endMonth = Number(month);
            let endYear = Number(year);
            
            if (endDay < startDay) {
                endMonth++;
                if (endMonth > 12) { 
                    endMonth = 1; 
                    endYear++; 
                }
            }
            
            endDate = new Date(endYear, endMonth - 1, endDay);
        }
        
        res.json({
            account,
            requestedPeriod: { year: Number(year), month: Number(month) },
            currentPeriod: {
                start: startDate.toISOString().slice(0, 10),
                end: endDate.toISOString().slice(0, 10),
                startDay: startDate.getDate(),
                endDay: endDate.getDate(),
                type: isRecurring ? 'monthly' : 'billing_cycle'
            }
        });
        
    } catch (error) {
        console.error('Erro ao calcular período vigente:', error);
        res.status(500).json({ message: 'Erro ao calcular período vigente.' });
    }
});

// --- MIDDLEWARE DE TRATAMENTO DE ERROS ---
app.use((error, req, res, next) => {
    console.error('Erro não tratado:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
});

// --- ROTA PARA ARQUIVOS ESTÁTICOS ---
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- 9. INICIALIZAÇÃO DO SERVIDOR ---
if (require.main === module) {
    // Função para inicializar o servidor com retry
    async function startServer() {
        try {
            console.log('🚀 Iniciando Controle de Gastos Backend v3.0...');
            console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🔌 Porta: ${PORT}`);
            
            // Testar conexão com banco antes de iniciar servidor
            console.log('🔍 Testando conexão com banco de dados...');
            const isConnected = await testConnection();
            
            if (!isConnected) {
                console.error('❌ ERRO CRÍTICO: Não foi possível conectar ao banco de dados');
                console.error('❌ Variáveis de ambiente disponíveis:', {
                    DB_HOST: process.env.DB_HOST ? '✅' : '❌',
                    DB_USER: process.env.DB_USER ? '✅' : '❌',
                    DB_PASSWORD: process.env.DB_PASSWORD ? '✅' : '❌',
                    DB_NAME: process.env.DB_NAME ? '✅' : '❌',
                    DATABASE_URL: process.env.DATABASE_URL ? '✅' : '❌'
                });
                process.exit(1);
            }
            
            // Iniciar servidor
            const server = app.listen(PORT, '0.0.0.0', () => {
                console.log('✅ Conexão com o MySQL estabelecida com sucesso');
                console.log(`🚀 Servidor rodando na porta ${PORT}`);
                console.log(`🌐 Health check disponível em: http://localhost:${PORT}/health`);
                console.log(`📚 API endpoints disponíveis em: http://localhost:${PORT}/`);
                console.log('✅ Sistema pronto para receber requisições!');
            });

            // Configurar timeouts do servidor para Railway
            server.timeout = 120000; // 2 minutos
            server.keepAliveTimeout = 61000; // 61 segundos
            server.headersTimeout = 62000; // 62 segundos

            // Graceful shutdown para Railway
            const shutdown = (signal) => {
                console.log(`\n🛑 Recebido ${signal}. Encerrando servidor graciosamente...`);
                
                server.close(async () => {
                    console.log('📡 Servidor HTTP fechado');
                    
                    try {
                        await closePool();
                        console.log('🗄️ Conexões do banco fechadas');
                    } catch (error) {
                        console.error('❌ Erro ao fechar conexões do banco:', error);
                    }
                    
                    console.log('✅ Processo encerrado com sucesso');
                    process.exit(0);
                });

                // Force shutdown após timeout
                setTimeout(() => {
                    console.error('❌ Forçando encerramento após timeout');
                    process.exit(1);
                }, 10000);
            };

            // Handlers de sinais
            process.on('SIGTERM', () => shutdown('SIGTERM'));
            process.on('SIGINT', () => shutdown('SIGINT'));
            process.on('SIGHUP', () => shutdown('SIGHUP'));
            
            // Handler de erros não capturados
            process.on('uncaughtException', (error) => {
                console.error('❌ Erro não capturado:', error);
                shutdown('UNCAUGHT_EXCEPTION');
            });
            
            process.on('unhandledRejection', (reason, promise) => {
                console.error('❌ Promise rejeitada não tratada:', reason);
                console.error('❌ Promise:', promise);
                shutdown('UNHANDLED_REJECTION');
            });

            return server;
            
        } catch (error) {
            console.error('❌ ERRO CRÍTICO ao iniciar servidor:', error);
            process.exit(1);
        }
    }
    
    // Iniciar servidor
    startServer().catch(error => {
        console.error('❌ Falha fatal ao iniciar servidor:', error);
        process.exit(1);
    });
    
} else {
    module.exports = app;
}