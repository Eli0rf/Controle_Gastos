// server.js (Versão Final e Completa)

// --- 1. DEPENDÊNCIAS ---
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const pdfkit = require('pdfkit');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Função para tentar carregar ChartJS com fallback
let ChartJSNodeCanvas = null;
let chartCanvasAvailable = false;

try {
    const chartModule = require('chartjs-node-canvas');
    ChartJSNodeCanvas = chartModule.ChartJSNodeCanvas;
    chartCanvasAvailable = true;
    console.log('✅ ChartJS Canvas carregado com sucesso');
} catch (error) {
    console.warn('⚠️ ChartJS Canvas não disponível. Relatórios serão gerados sem gráficos:', error.message);
    chartCanvasAvailable = false;
}

// --- 2. CONFIGURAÇÕES PRINCIPAIS ---
const app = express();
const PORT = process.env.PORT || 3000;

// --- 3. MIDDLEWARES ---
app.use(cors({
    origin: '*', // ou especifique o domínio do frontend se necessário
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Disposition']
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- 4. CONFIGURAÇÃO DO BANCO DE DADOS ---
let pool;
try {
    pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });
} catch (error) {
    console.error("ERRO CRÍTICO: Falha ao configurar o pool de conexão. Verifique as suas variáveis de ambiente.", error);
    process.exit(1);
}

// --- 5. CONFIGURAÇÃO DO MULTER (UPLOAD DE FICHEIROS) ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = 'uploads/';
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// --- 6. MIDDLEWARE DE AUTENTICAÇÃO ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.status(401).json({ message: 'Acesso não autorizado.' });

    jwt.verify(token, process.env.JWT_SECRET || 'seu_segredo_super_secreto', (err, user) => {
        if (err) return res.status(403).json({ message: 'Token inválido ou expirado.' });
        req.user = user;
        next();
    });
};

// --- 6.1. ROTA DE HEALTH CHECK PARA RAILWAY ---
app.get('/', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        message: 'Controle de Gastos API está funcionando',
        chartSupport: chartCanvasAvailable ? 'disponível' : 'não disponível',
        timestamp: new Date().toISOString()
    });
});

app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'healthy',
        chartSupport: chartCanvasAvailable,
        timestamp: new Date().toISOString()
    });
});

// --- 7. ROTAS PÚBLICAS (AUTENTICAÇÃO) ---
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'Utilizador e senha são obrigatórios.' });
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);
        res.status(201).json({ message: 'Utilizador criado com sucesso!' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Nome de utilizador já existe.' });
        console.error('Erro no registo:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'Utilizador e senha são obrigatórios.' });
    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        const user = rows[0];
        if (!user) return res.status(404).json({ message: 'Utilizador não encontrado.' });
        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) return res.status(401).json({ message: 'Senha incorreta.' });
        const accessToken = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET || 'seu_segredo_super_secreto', { expiresIn: '8h' });
        res.json({ accessToken });
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
});

// --- 8. ROTAS PROTEGIDAS ---
app.post('/api/expenses', authenticateToken, upload.single('invoice'), async (req, res) => {
    try {
        const {
            transaction_date,
            amount, // Valor da parcela
            description,
            account,
            account_plan_code,
            total_installments // Número total de parcelas
        } = req.body;

        const is_business_expense = req.body.is_business_expense === 'true';
        const has_invoice = req.body.has_invoice === 'true';
        const userId = req.user.id;
        const invoicePath = req.file ? req.file.path : null;

        // Validação dos campos obrigatórios
        if (!transaction_date || !amount || !description || !account || !total_installments) {
            return res.status(400).json({ message: 'Campos obrigatórios em falta.' });
        }

        const installmentAmount = parseFloat(amount);
        const numberOfInstallments = parseInt(total_installments, 10);

        if (isNaN(installmentAmount) || isNaN(numberOfInstallments)) {
            return res.status(400).json({ message: 'Valor e número de parcelas devem ser números válidos.' });
        }

        const calculatedTotalAmount = installmentAmount * numberOfInstallments;

        for (let i = 0; i < numberOfInstallments; i++) {
            const installmentDate = new Date(transaction_date);
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
                is_business_expense,
                is_business_expense ? null : (account_plan_code || null),
                (is_business_expense && i === 0 && has_invoice) ? 1 : null,
                (is_business_expense && i === 0 && has_invoice) ? invoicePath : null,
                calculatedTotalAmount.toFixed(2),
                i + 1,
                numberOfInstallments
            ];

            await pool.query(sql, params);
        }

        res.status(201).json({ message: 'Gasto(s) parcelado(s) adicionado(s) com sucesso!' });
    } catch (error) {
        console.error('ERRO AO ADICIONAR GASTO:', error);
        res.status(500).json({ message: 'Ocorreu um erro no servidor ao adicionar o gasto.' });
    }
});

app.get('/api/expenses', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { year, month, account, start_date, end_date, include_recurring } = req.query;

    try {
        let sql = 'SELECT * FROM expenses WHERE user_id = ?';
        const params = [userId];

        // Filtro por conta
        if (account) {
            sql += ' AND account = ?';
            params.push(account);
        }

        // Filtrar gastos recorrentes se não for explicitamente solicitado
        if (include_recurring !== 'true') {
            // Para contas que não são PIX ou Boleto, não incluir gastos recorrentes
            // Para PIX e Boleto, incluir apenas se for busca por fatura
            if (account && ['PIX', 'Boleto'].includes(account)) {
                // Se for busca por período de fatura, incluir recorrentes
                // Se for busca geral, excluir recorrentes
                if (!start_date && !end_date) {
                    sql += ' AND is_recurring_expense = 0';
                }
            }
        }

        // Permite busca por intervalo de datas explícito (usado na busca de fatura)
        if (start_date && end_date) {
            sql += ' AND transaction_date >= ? AND transaction_date <= ?';
            params.push(start_date, end_date);
        } else if (account && billingPeriods[account] && year && month) {
            // Para contas PIX e Boleto, não aplicar filtro de período de fatura
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
                // Para PIX e Boleto, filtrar apenas por mês/ano normal
                sql += ' AND YEAR(transaction_date) = ? AND MONTH(transaction_date) = ?';
                params.push(year, month);
            }
        } else if (year && month) {
            sql += ' AND YEAR(transaction_date) = ? AND MONTH(transaction_date) = ?';
            params.push(year, month);
        }

        sql += ' ORDER BY transaction_date DESC';
        const [rows] = await pool.query(sql, params);
        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar despesas:', error);
        res.status(500).json({ message: 'Erro ao buscar despesas.' });
    }
});

app.delete('/api/expenses/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    try {
        const [rows] = await pool.query('SELECT invoice_path FROM expenses WHERE id = ? AND user_id = ?', [id, userId]);
        if (rows.length > 0 && rows[0].invoice_path) {
            fs.unlink(rows[0].invoice_path, (err) => {
                if (err) console.error("Erro ao apagar ficheiro antigo:", err);
            });
        }
        const [result] = await pool.query('DELETE FROM expenses WHERE id = ? AND user_id = ?', [id, userId]);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Despesa não encontrada.' });
        res.json({ message: 'Despesa apagada com sucesso!' });
    } catch (error) {
        console.error('Erro ao apagar despesa:', error);
        res.status(500).json({ message: 'Erro ao apagar despesa.' });
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

        // Gerar gráficos apenas se canvas estiver disponível
        let chartBarBuffer = null;
        let chartPieBuffer = null;
        let chartLineBuffer = null;

        if (chartCanvasAvailable && ChartJSNodeCanvas) {
            try {
                const chartCanvas = new ChartJSNodeCanvas({ width: 600, height: 300 });
                
                // Gráfico de barras por conta
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
                console.warn('⚠️ Erro ao gerar gráficos, continuando sem eles:', chartError.message);
                chartCanvasAvailable = false;
            }
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
            doc.moveDown();
        } else {
            doc.fontSize(12).fillColor('#666').text('(Gráfico não disponível - dados em formato de tabela)', { align: 'center' });
            doc.moveDown(2);
        }
        
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
            doc.moveDown();
        } else {
            doc.fontSize(12).fillColor('#666').text('(Gráfico não disponível - dados em formato de tabela)', { align: 'center' });
            doc.moveDown(2);
        }
        
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
            doc.fontSize(12).fillColor('#666').text('(Gráfico não disponível - dados em formato de tabela)', { align: 'center' });
            doc.moveDown(2);
            
            // Mostrar dados em formato de tabela
            Object.entries(porDia).forEach(([dia, valor]) => {
                doc.fontSize(12).fillColor('#222').text(`- ${dia}: R$ ${valor.toFixed(2)}`);
            });
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
        const daysInMonth = new Date(year, month, 0).getDate();

        for (const recurring of recurringExpenses) {
            // Para PIX e Boleto, criar múltiplas instâncias durante o mês
            let processingDays = [recurring.day_of_month || 1];
            
            if (['PIX', 'Boleto'].includes(recurring.account)) {
                // PIX: processar nos dias 1, 10, 20 e último dia do mês
                // Boleto: processar nos dias 5, 15 e 25
                if (recurring.account === 'PIX') {
                    processingDays = [1, 10, 20, daysInMonth];
                } else if (recurring.account === 'Boleto') {
                    processingDays = [5, 15, 25];
                }
            }

            // Processar para cada dia configurado
            for (const day of processingDays) {
                if (day <= daysInMonth) {
                    // Criar a data baseada no dia configurado
                    const transactionDate = new Date(year, month - 1, day);
                    
                    // Se o dia não existe no mês (ex: 31 em fevereiro), usar o último dia do mês
                    if (transactionDate.getMonth() !== month - 1) {
                        transactionDate.setDate(0); // Vai para o último dia do mês anterior
                    }

                    const formattedDate = transactionDate.toISOString().split('T')[0];

                    // Criar descrição diferenciada para múltiplas ocorrências
                    let description = recurring.description;
                    if (processingDays.length > 1) {
                        const dayNames = {
                            1: '1º', 10: '10º', 15: '15º', 20: '20º', 25: '25º'
                        };
                        const dayName = dayNames[day] || `${day}º`;
                        if (day === daysInMonth && recurring.account === 'PIX') {
                            description += ` (Último dia do mês)`;
                        } else {
                            description += ` (${dayName} do mês)`;
                        }
                    }

                    // Inserir na tabela de expenses
                    const [expenseResult] = await pool.query(
                        `INSERT INTO expenses (user_id, transaction_date, amount, description, account, 
                         is_business_expense, account_plan_code, is_recurring_expense, total_installments, installment_number) 
                         VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, 1)`,
                        [userId, formattedDate, recurring.amount, description, 
                         recurring.account, recurring.is_business_expense, recurring.account_plan_code]
                    );

                    // Registrar o processamento (apenas uma vez por gasto recorrente, não por dia)
                    if (day === processingDays[0]) {
                        await pool.query(
                            'INSERT INTO recurring_expense_processing (recurring_expense_id, processed_month, expense_id) VALUES (?, ?, ?)',
                            [recurring.id, monthKey, expenseResult.insertId]
                        );
                    }

                    processedCount++;
                }
            }
        }

        res.json({ 
            message: `Gastos recorrentes processados para ${month}/${year}: ${processedCount} transações criadas`,
            processedCount 
        });
    } catch (error) {
        console.error('Erro ao processar gastos recorrentes:', error);
        res.status(500).json({ message: 'Erro ao processar gastos recorrentes.' });
    }
});

// --- 9. DASHBOARD DATA ROUTES --

// Período de fatura por conta para análise empresarial
const billingPeriods = {
    'Nu Bank Ketlyn': { startDay: 2, endDay: 1, isRecurring: false },
    'Nu Vainer': { startDay: 8, endDay: 7, isRecurring: false },
    'Ourocard Ketlyn': { startDay: 13, endDay: 12, isRecurring: false },
    'PicPay Vainer': { startDay: 3, endDay: 2, isRecurring: false },
    'PIX': { startDay: 1, endDay: 31, isRecurring: true },
    'Boleto': { startDay: 1, endDay: 31, isRecurring: true }
};

// Rota para buscar dados do dashboard
app.get('/api/dashboard', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { year, month } = req.query;

        if (!year || !month) {
            return res.status(400).json({ message: 'Ano e mês são obrigatórios.' });
        }

        // Buscar dados para o gráfico de linha (gastos por dia)
        const [lineData] = await pool.query(`
            SELECT DAY(transaction_date) as day, SUM(amount) as total
            FROM expenses 
            WHERE user_id = ? AND YEAR(transaction_date) = ? AND MONTH(transaction_date) = ?
            GROUP BY DAY(transaction_date)
            ORDER BY day
        `, [userId, year, month]);

        // Buscar dados para o gráfico de pizza (gastos por conta)
        const [pieData] = await pool.query(`
            SELECT account, SUM(amount) as total
            FROM expenses 
            WHERE user_id = ? AND YEAR(transaction_date) = ? AND MONTH(transaction_date) = ?
            GROUP BY account
            ORDER BY total DESC
        `, [userId, year, month]);

        // Buscar dados para o gráfico misto (pessoal vs empresarial por conta)
        const [mixedData] = await pool.query(`
            SELECT 
                account,
                SUM(CASE WHEN is_business_expense = 0 THEN amount ELSE 0 END) as personal_total,
                SUM(CASE WHEN is_business_expense = 1 THEN amount ELSE 0 END) as business_total
            FROM expenses 
            WHERE user_id = ? AND YEAR(transaction_date) = ? AND MONTH(transaction_date) = ?
            GROUP BY account
            HAVING (personal_total > 0 OR business_total > 0)
            ORDER BY (personal_total + business_total) DESC
        `, [userId, year, month]);

        // Buscar dados para o gráfico de planos de conta
        const [planData] = await pool.query(`
            SELECT account_plan_code, SUM(amount) as total
            FROM expenses 
            WHERE user_id = ? AND YEAR(transaction_date) = ? AND MONTH(transaction_date) = ? 
                  AND account_plan_code IS NOT NULL
            GROUP BY account_plan_code
            ORDER BY total DESC
            LIMIT 15
        `, [userId, year, month]);

        // Calcular projeção para o próximo mês
        const [currentMonthData] = await pool.query(`
            SELECT SUM(amount) as total, COUNT(*) as transactions
            FROM expenses 
            WHERE user_id = ? AND YEAR(transaction_date) = ? AND MONTH(transaction_date) = ?
        `, [userId, year, month]);

        const currentTotal = currentMonthData[0]?.total || 0;
        const currentTransactions = currentMonthData[0]?.transactions || 0;

        // Buscar média dos últimos 3 meses para projeção
        const [avgData] = await pool.query(`
            SELECT AVG(monthly_total) as avg_monthly
            FROM (
                SELECT SUM(amount) as monthly_total
                FROM expenses 
                WHERE user_id = ? AND transaction_date >= DATE_SUB(?, 1)
                GROUP BY YEAR(transaction_date), MONTH(transaction_date)
                ORDER BY transaction_date DESC
                LIMIT 3
            ) as monthly_totals
        `, [userId, `${year}-${month}-01`]);

        const nextMonthEstimate = avgData[0]?.avg_monthly || currentTotal;

        res.json({
            lineChartData: lineData,
            pieChartData: pieData,
            mixedTypeChartData: mixedData,
            planChartData: planData,
            projection: {
                currentMonth: currentTotal,
                currentTransactions: currentTransactions,
                nextMonthEstimate: nextMonthEstimate
            }
        });

    } catch (error) {
        console.error('Erro ao buscar dados do dashboard:', error);
        res.status(500).json({ message: 'Erro ao buscar dados do dashboard.' });
    }
});

// Rota para buscar filtros de contas
app.get('/api/accounts', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const [accounts] = await pool.query(`
            SELECT DISTINCT account 
            FROM expenses 
            WHERE user_id = ? 
            ORDER BY account
        `, [userId]);

        res.json(accounts.map(row => row.account));
    } catch (error) {
        console.error('Erro ao buscar contas:', error);
        res.status(500).json({ message: 'Erro ao buscar contas.' });
    }
});

// --- 10. BUSINESS ANALYSIS ROUTES --

// Rota para análise empresarial por período
app.get('/api/business-analysis', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { period, dateFrom, dateTo, account } = req.query;

        let startDate, endDate;
        
        // Determinar período baseado no parâmetro
        const now = new Date();
        switch (period) {
            case 'current-month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;
            case 'last-month':
                startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                endDate = new Date(now.getFullYear(), now.getMonth(), 0);
                break;
            case 'current-quarter':
                const quarter = Math.floor(now.getMonth() / 3);
                startDate = new Date(now.getFullYear(), quarter * 3, 1);
                endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0);
                break;
            case 'current-year':
                startDate = new Date(now.getFullYear(), 0, 1);
                endDate = new Date(now.getFullYear(), 11, 31);
                break;
            case 'custom':
                if (!dateFrom || !dateTo) {
                    return res.status(400).json({ message: 'Datas inicial e final são obrigatórias para período customizado.' });
                }
                startDate = new Date(dateFrom);
                endDate = new Date(dateTo);
                break;
            default:
                return res.status(400).json({ message: 'Período inválido.' });
        }

        // Query base para gastos empresariais
        let sql = `
            SELECT * FROM expenses 
            WHERE user_id = ? AND is_business_expense = 1 
            AND transaction_date >= ? AND transaction_date <= ?
        `;
        let params = [userId, startDate.toISOString().slice(0, 10), endDate.toISOString().slice(0, 10)];

        // Filtrar por conta se especificado
        if (account && account !== 'all') {
            sql += ' AND account = ?';
            params.push(account);
        }

        sql += ' ORDER BY transaction_date DESC';

        const [expenses] = await pool.query(sql, params);

        // Calcular resumos
        const total = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
        const count = expenses.length;

        // Agrupar por conta
        const byAccount = {};
        expenses.forEach(e => {
            if (!byAccount[e.account]) byAccount[e.account] = 0;
            byAccount[e.account] += parseFloat(e.amount);
        });

        // Agrupar por plano de conta
        const byPlan = {};
        expenses.forEach(e => {
            const plan = e.account_plan_code || 'Sem plano';
            if (!byPlan[plan]) byPlan[plan] = 0;
            byPlan[plan] += parseFloat(e.amount);
        });

        // Agrupar por mês (para análise temporal)
        const byMonth = {};
        expenses.forEach(e => {
            const monthKey = new Date(e.transaction_date).toISOString().slice(0, 7);
            if (!byMonth[monthKey]) byMonth[monthKey] = 0;
            byMonth[monthKey] += parseFloat(e.amount);
        });

        res.json({
            expenses,
            summary: {
                total,
                count,
                averagePerTransaction: count > 0 ? total / count : 0,
                period: {
                    from: startDate.toISOString().slice(0, 10),
                    to: endDate.toISOString().slice(0, 10)
                }
            },
            charts: {
                byAccount,
                byPlan,
                byMonth
            }
        });

    } catch (error) {
        console.error('Erro na análise empresarial:', error);
        res.status(500).json({ message: 'Erro na análise empresarial.' });
    }
});

// --- 11. PIX/BOLETO SPECIFIC ROUTES --

// Rota específica para dados de PIX e Boleto
app.get('/api/pix-boleto-data', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { year, month, type, search } = req.query;

        if (!year || !month) {
            return res.status(400).json({ message: 'Ano e mês são obrigatórios.' });
        }

        // Determinar quais contas buscar
        let accounts = [];
        if (type === 'pix') {
            accounts = ['PIX'];
        } else if (type === 'boleto') {
            accounts = ['Boleto'];
        } else {
            accounts = ['PIX', 'Boleto'];
        }

        // Query base
        let sql = `
            SELECT * FROM expenses 
            WHERE user_id = ? AND account IN (${accounts.map(() => '?').join(',')})
            AND YEAR(transaction_date) = ? AND MONTH(transaction_date) = ?
        `;
        let params = [userId, ...accounts, year, month];

        // Filtro de busca
        if (search && search.trim()) {
            sql += ' AND (description LIKE ? OR amount LIKE ?)';
            const searchTerm = `%${search.trim()}%`;
            params.push(searchTerm, searchTerm);
        }

        sql += ' ORDER BY transaction_date DESC';

        const [transactions] = await pool.query(sql, params);

        // Separar por tipo
        const pixTransactions = transactions.filter(t => t.account === 'PIX');
        const boletoTransactions = transactions.filter(t => t.account === 'Boleto');

        // Calcular totais
        const pixTotal = pixTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
        const boletoTotal = boletoTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);

        // Agrupar por categoria (plano de conta)
        const pixByCategory = {};
        const boletoByCategory = {};

        pixTransactions.forEach(t => {
            const category = t.account_plan_code || 'Sem categoria';
            if (!pixByCategory[category]) pixByCategory[category] = 0;
            pixByCategory[category] += parseFloat(t.amount);
        });

        boletoTransactions.forEach(t => {
            const category = t.account_plan_code || 'Sem categoria';
            if (!boletoByCategory[category]) boletoByCategory[category] = 0;
            boletoByCategory[category] += parseFloat(t.amount);
        });

        res.json({
            transactions,
            pix: {
                transactions: pixTransactions,
                total: pixTotal,
                count: pixTransactions.length,
                byCategory: pixByCategory
            },
            boleto: {
                transactions: boletoTransactions,
                total: boletoTotal,
                count: boletoTransactions.length,
                byCategory: boletoByCategory
            },
            summary: {
                grandTotal: pixTotal + boletoTotal,
                totalTransactions: transactions.length
            }
        });

    } catch (error) {
        console.error('Erro ao buscar dados PIX/Boleto:', error);
        res.status(500).json({ message: 'Erro ao buscar dados PIX/Boleto.' });
    }
});

// --- 12. MIDDLEWARES DE ERRO ---
app.use((err, req, res, next) => {
    console.error('Erro não tratado:', err);
    res.status(500).json({ message: 'Erro interno do servidor.' });
});

// --- 13. INICIALIZAÇÃO DO SERVIDOR ---
async function startServer() {
    try {
        // Testar conexão com o banco
        await pool.query('SELECT 1');
        console.log('✅ Conexão com banco de dados estabelecida');
        
        // Iniciar servidor
        app.listen(PORT, () => {
            console.log(`🚀 Servidor rodando na porta ${PORT}`);
            console.log(`📊 ChartJS suporte: ${chartCanvasAvailable ? 'disponível' : 'não disponível'}`);
            console.log(`🌐 Ambiente: ${process.env.NODE_ENV || 'development'}`);
        });
    } catch (error) {
        console.error('❌ Erro ao iniciar servidor:', error);
        process.exit(1);
    }
}

startServer();