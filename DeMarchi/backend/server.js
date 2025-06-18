// server.js (Versão Final e Completa)

// --- 1. DEPENDÊNCIAS ---
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const pdfkit = require('pdfkit');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// --- 2. CONFIGURAÇÕES PRINCIPAIS ---
const app = express();
const PORT = process.env.PORT || 3000;

// --- 3. MIDDLEWARES ---
app.use(cors());
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
    const { year, month, account } = req.query;

    try {
        let sql = 'SELECT * FROM expenses WHERE user_id = ?';
        const params = [userId];

        // Filtro por conta
        if (account) {
            sql += ' AND account = ?';
            params.push(account);
        }

        // Filtro por período de fatura
        if (account && billingPeriods[account] && year && month) {
            const { startDay, endDay } = billingPeriods[account];
            // Exemplo: mês=6 (junho), ano=2025, startDay=3, endDay=2
            // Período: 03/06/2025 a 02/07/2025
            const startDate = new Date(year, month - 1, startDay);
            let endMonth = Number(month);
            let endYear = Number(year);
            if (endDay < startDay) {
                // Fecha no mês seguinte
                endMonth++;
                if (endMonth > 12) { endMonth = 1; endYear++; }
            }
            const endDate = new Date(endYear, endMonth - 1, endDay);

            sql += ' AND transaction_date >= ? AND transaction_date <= ?';
            params.push(startDate.toISOString().slice(0, 10), endDate.toISOString().slice(0, 10));
        } else if (year && month) {
            // Filtro padrão por mês
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

// --- 8.1. ROTA DE METAS POR PLANO DE CONTAS (ALERTAS) ---
const metas = {
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

// Rota protegida para metas por plano de contas
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

        const dataWithGoals = results.map(item => {
            const planoId = parseInt(item.account_plan_code);
            const meta = metas[planoId] || 0;
            const percentual = meta > 0 ? (item.Total / meta) * 100 : 0;
            let alerta = null;

            if (percentual > 101) {
                alerta = {
                    percentual: 101,
                    mensagem: `Atenção! Você ultrapassou 100% da meta para o plano ${planoId}.`
                };
            } else if (percentual >= 100) {
                alerta = {
                    percentual: 100,
                    mensagem: `Atenção! Você atingiu 100% da meta para o plano ${planoId}.`
                };
            } else if (percentual >= 95) {
                alerta = {
                    percentual: 95,
                    mensagem: `Atenção! Você atingiu 95% da meta para o plano ${planoId}.`
                };
            } else if (percentual >= 90) {
                alerta = {
                    percentual: 90,
                    mensagem: `Atenção! Você atingiu 90% da meta para o plano ${planoId}.`
                };
            } else if (percentual >= 85) {
                alerta = {
                    percentual: 85,
                    mensagem: `Atenção! Você atingiu 85% da meta para o plano ${planoId}.`
                };
            } else if (percentual >= 80) {
                alerta = {
                    percentual: 80,
                    mensagem: `Atenção! Você atingiu 80% da meta para o plano ${planoId}.`
                };
            } else if (percentual >= 70) {
                alerta = {
                    percentual: 70,
                    mensagem: `Atenção! Você atingiu 70% da meta para o plano ${planoId}.`
                };
            } else if (percentual >= 50) {
                alerta = {
                    percentual: 50,
                    mensagem: `Atenção! Você atingiu 50% da meta para o plano ${planoId}.`
                };
            }

            return {
                PlanoContasID: planoId,
                Total: item.Total,
                Meta: meta,
                Percentual: percentual,
                Alerta: alerta
            };
        });

        res.json(dataWithGoals);
    } catch (error) {
        console.error('Erro ao buscar metas:', error);
        res.status(500).json({ message: 'Erro ao buscar metas.' });
    }
});


app.get('/api/reports/weekly', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    // Por padrão, pega a semana atual (domingo a sábado)
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
        expenses.forEach(e => {
            porConta[e.account] = (porConta[e.account] || 0) + parseFloat(e.amount);
        });

        // Gráfico de barras por conta
        const chartCanvas = new ChartJSNodeCanvas({ width: 600, height: 300 });
        const chartBuffer = await chartCanvas.renderToBuffer({
            type: 'bar',
            data: {
                labels: Object.keys(porConta),
                datasets: [{
                    label: 'Gastos por Conta',
                    data: Object.values(porConta),
                    backgroundColor: 'rgba(59,130,246,0.7)'
                }]
            },
            options: { plugins: { legend: { display: false } } }
        });

        // Gera PDF
        const doc = new pdfkit({ autoFirstPage: false });
        doc.font('NotoSans');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=relatorio-semanal.pdf');
        doc.fontSize(18).text('Relatório Semanal de Gastos', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Período: ${start.toLocaleDateString()} a ${end.toLocaleDateString()}`);
        doc.text(`Total gasto: R$ ${total.toFixed(2)}`);
        doc.moveDown();
        doc.text('Resumo por Conta:');
        Object.entries(porConta).forEach(([conta, valor]) => {
            doc.text(`- ${conta}: R$ ${valor.toFixed(2)}`);
        });
        doc.moveDown();
        doc.text('Gráfico de Gastos por Conta:');
        doc.image(chartBuffer, { fit: [500, 250], align: 'center' });
        doc.moveDown();
        doc.text('Transações da Semana:', { underline: true });
        expenses.forEach(e => {
            doc.text(`${new Date(e.transaction_date).toLocaleDateString()} | ${e.account} | R$ ${parseFloat(e.amount).toFixed(2)} | ${e.description}`);
        });
        doc.end();
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
    let startDate, endDate, fechamentoDia = null;
    let contaNome = account || 'Todas as Contas';
    if (account && billingPeriods[account]) {
        const { startDay, endDay } = billingPeriods[account];
        startDate = new Date(year, month - 1, startDay);
        let endMonth = Number(month);
        let endYear = Number(year);
        if (endDay < startDay) {
            endMonth++;
            if (endMonth > 12) { endMonth = 1; endYear++; }
        }
        endDate = new Date(endYear, endMonth - 1, endDay);
        fechamentoDia = endDay;
    } else {
        startDate = new Date(year, month - 1, 1);
        endDate = new Date(year, month, 0);
    }

    // Período do mês anterior
    let prevStartDate, prevEndDate;
    if (account && billingPeriods[account]) {
        const { startDay, endDay } = billingPeriods[account];
        let prevMonth = month - 1, prevYear = year;
        if (prevMonth < 1) { prevMonth = 12; prevYear--; }
        prevStartDate = new Date(prevYear, prevMonth - 1, startDay);
        let prevEndMonth = prevMonth;
        let prevEndYear = prevYear;
        if (endDay < startDay) {
            prevEndMonth++;
            if (prevEndMonth > 12) { prevEndMonth = 1; prevEndYear++; }
        }
        prevEndDate = new Date(prevEndYear, prevEndMonth - 1, endDay);
    } else {
        let prevMonth = month - 1, prevYear = year;
        if (prevMonth < 1) { prevMonth = 12; prevYear--; }
        prevStartDate = new Date(prevYear, prevMonth - 1, 1);
        prevEndDate = new Date(prevYear, prevMonth, 0);
    }

    try {
        // Busca despesas do período atual e anterior
        let sql = `SELECT * FROM expenses WHERE user_id = ? AND transaction_date >= ? AND transaction_date <= ?`;
        let params = [userId, startDate.toISOString().slice(0,10), endDate.toISOString().slice(0,10)];
        if (account) { // Se account está preenchido, filtra por conta
            sql += ' AND account = ?';
            params.push(account);
        }
        sql += ' ORDER BY transaction_date';
        const [expenses] = await pool.query(sql, params);

        let sqlPrev = `SELECT * FROM expenses WHERE user_id = ? AND transaction_date >= ? AND transaction_date <= ?`;
        let paramsPrev = [userId, prevStartDate.toISOString().slice(0,10), prevEndDate.toISOString().slice(0,10)];
        if (account) { sqlPrev += ' AND account = ?'; paramsPrev.push(account); }
        sqlPrev += ' ORDER BY transaction_date';
        const [expensesPrev] = await pool.query(sqlPrev, paramsPrev);

        // Soma dos valores empresariais
        const totalEmpresarial = expenses.filter(e => e.is_business_expense).reduce((sum, e) => sum + parseFloat(e.amount), 0);

        // Resumo geral
        const total = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);

        // Por plano de conta (atual e anterior)
        const porPlano = {}, porPlanoPrev = {};
        expenses.forEach(e => {
            if (e.account_plan_code) porPlano[e.account_plan_code] = (porPlano[e.account_plan_code] || 0) + parseFloat(e.amount);
        });
        expensesPrev.forEach(e => {
            if (e.account_plan_code) porPlanoPrev[e.account_plan_code] = (porPlanoPrev[e.account_plan_code] || 0) + parseFloat(e.amount);
        });

        // Por conta (atual e anterior)
        const porConta = {}, porContaPrev = {};
        expenses.forEach(e => {
            porConta[e.account] = (porConta[e.account] || 0) + parseFloat(e.amount);
        });
        expensesPrev.forEach(e => {
            porContaPrev[e.account] = (porContaPrev[e.account] || 0) + parseFloat(e.amount);
        });

        // Tendência por plano de conta e por conta
        function tendencia(atual, anterior) {
            if (anterior === 0 && atual === 0) return 'Estável';
            if (anterior === 0) return 'Alta';
            const perc = ((atual - anterior) / anterior) * 100;
            if (perc > 5) return `Alta (${perc.toFixed(1)}%)`;
            if (perc < -5) return `Baixa (${perc.toFixed(1)}%)`;
            return `Estável (${perc.toFixed(1)}%)`;
        }

        // Planejamento para o próximo mês (parcelas futuras)
        const nextMonth = parseInt(month) === 12 ? 1 : parseInt(month) + 1;
        const nextYear = parseInt(month) === 12 ? parseInt(year) + 1 : parseInt(year);
        let sqlParcelas = `SELECT * FROM expenses WHERE user_id = ? AND YEAR(transaction_date) = ? AND MONTH(transaction_date) = ? AND total_installments > 1`;
        let paramsParcelas = [userId, nextYear, nextMonth];
            if (account) {
              sqlParcelas += ' AND account = ?';
                 paramsParcelas.push(account);
                }
                const [parcelasFuturas] = await pool.query(sqlParcelas, paramsParcelas);

        // Gráficos
        const chartCanvas = new ChartJSNodeCanvas({ width: 600, height: 250 });
        // 1. Gráfico de barras por plano de conta (atual x anterior)
        const planoLabels = Array.from(new Set([...Object.keys(porPlanoPrev), ...Object.keys(porPlano)])).sort();
        const planoAtual = planoLabels.map(p => porPlano[p] || 0);
        const planoAnterior = planoLabels.map(p => porPlanoPrev[p] || 0);
        const planoChart = await chartCanvas.renderToBuffer({
            type: 'bar',
            data: {
                labels: planoLabels.map(p => `Plano ${p}`),
                datasets: [
                    { label: 'Mês Atual', data: planoAtual, backgroundColor: 'rgba(59,130,246,0.7)' },
                    { label: 'Mês Anterior', data: planoAnterior, backgroundColor: 'rgba(239,68,68,0.7)' }
                ]
            },
            options: { plugins: { legend: { position: 'top' } }, responsive: false }
        });

        // 2. Gráfico de barras por conta (atual x anterior)
        const contaLabels = Array.from(new Set([...Object.keys(porContaPrev), ...Object.keys(porConta)])).sort();
        const contaAtual = contaLabels.map(c => porConta[c] || 0);
        const contaAnterior = contaLabels.map(c => porContaPrev[c] || 0);
        const contaChart = await chartCanvas.renderToBuffer({
            type: 'line',
            data: {
                labels: contaLabels,
                datasets: [
                    { label: 'Mês Atual', data: contaAtual, backgroundColor: 'rgba(59,130,246,0.7)' },
                    { label: 'Mês Anterior', data: contaAnterior, backgroundColor: 'rgba(239,68,68,0.7)' }
                ]
            },
            options: { plugins: { legend: { position: 'top' } }, responsive: false }
        });

        // 3. Gráfico de barras para planejamento (parcelas futuras)
        const parcelasLabels = parcelasFuturas.map(e => `${e.description} (${new Date(e.transaction_date).toLocaleDateString()})`);
        const parcelasData = parcelasFuturas.map(e => parseFloat(e.amount));
        const parcelasChart = await chartCanvas.renderToBuffer({
            type: 'bar',
            data: {
                labels: parcelasLabels,
                datasets: [
                    { label: 'Parcelas Futuras', data: parcelasData, backgroundColor: 'rgba(75,192,192,0.7)' }
                ]
            },
            options: { plugins: { legend: { position: 'top' } }, responsive: false }
        });

        // Gera PDF
        const doc = new pdfkit({ autoFirstPage: false });

        // REGISTRE A FONTE NOTO SANS
        doc.registerFont('NotoSans', path.join(__dirname, 'fonts', 'NotoSans-Regular.ttf'));

        // Use a fonte NotoSans como padrão
        doc.font('NotoSans');

        // Exemplo de uso:
        doc.addPage({ margin: 40, size: 'A4', layout: 'portrait', bufferPages: true });
        doc.rect(0, 0, doc.page.width, 80).fill('#3B82F6');
        doc.fillColor('white').fontSize(28).font('NotoSans')
            .text('📊 Relatório Mensal de Gastos', 0, 25, { align: 'center', width: doc.page.width });
        doc.moveDown(2);
        doc.fillColor('#222').fontSize(16).font('NotoSans')
            .text(`Período: ${startDate.toLocaleDateString()} a ${endDate.toLocaleDateString()}`, { align: 'center' })
            .text(`Conta: ${contaNome}`, { align: 'center' });
        if (fechamentoDia) doc.text(`Dia de Fechamento: ${fechamentoDia}`, { align: 'center' });
        doc.moveDown();
        doc.fontSize(14).fillColor('#10B981').font('NotoSans')
            .text(`Total gasto: R$ ${total.toFixed(2)}`, { align: 'center' });
        doc.fontSize(14).fillColor('#F59E0B').font('NotoSans')
            .text(`Total Empresarial: R$ ${totalEmpresarial.toFixed(2)}`, { align: 'center' });
        doc.moveDown(2);
        doc.fillColor('#6B7280').fontSize(12).font('NotoSans')
            .text('Relatório gerado automaticamente pelo sistema Controle de Gastos', { align: 'center' });

        // Gráfico por plano de conta
        doc.addPage();
        doc.rect(0, 0, doc.page.width, 40).fill('#F59E0B');
        doc.fillColor('white').fontSize(20).font('NotoSans')
            .text('📈 Gastos por Plano de Conta (Comparativo)', 0, 10, { align: 'center', width: doc.page.width });
        doc.moveDown(2);
        doc.image(planoChart, { fit: [500, 200], align: 'center' });
        doc.moveDown();
        planoLabels.forEach((p, i) => {
            const tendenciaStr = tendencia(planoAtual[i], planoAnterior[i]);
            let cor = '#222';
            if (tendenciaStr.includes('Alta')) cor = '#EF4444';
            else if (tendenciaStr.includes('Baixa')) cor = '#10B981';
            doc.fontSize(12).fillColor(cor).font('NotoSans')
                .text(`Plano ${p}: Atual R$ ${planoAtual[i].toFixed(2)} | Anterior R$ ${planoAnterior[i].toFixed(2)} | Tendência: ${tendenciaStr}`);
        });

        // Gráfico por conta
        doc.addPage();
        doc.rect(0, 0, doc.page.width, 40).fill('#6366F1');
        doc.fillColor('white').fontSize(20).font('NotoSans')
            .text('💳 Gastos por Conta (Comparativo)', 0, 10, { align: 'center', width: doc.page.width });
        doc.moveDown(2);
        doc.image(contaChart, { fit: [500, 200], align: 'center' });
        doc.moveDown();
        contaLabels.forEach((c, i) => {
            const tendenciaStr = tendencia(contaAtual[i], contaAnterior[i]);
            let cor = '#222';
            if (tendenciaStr.includes('Alta')) cor = '#EF4444';
            else if (tendenciaStr.includes('Baixa')) cor = '#10B981';
            doc.fontSize(12).fillColor(cor).font('NotoSans')
                .text(`${c}: Atual R$ ${contaAtual[i].toFixed(2)} | Anterior R$ ${contaAnterior[i].toFixed(2)} | Tendência: ${tendenciaStr}`);
        });

        // Planejamento do próximo mês
        doc.addPage();
        doc.rect(0, 0, doc.page.width, 40).fill('#10B981');
        doc.fillColor('white').fontSize(20).font('NotoSans')
            .text('📅 Planejamento Próximo Mês (Parcelas Futuras)', 0, 10, { align: 'center', width: doc.page.width });
        doc.moveDown(2);
        if (parcelasFuturas.length > 0) {
            doc.image(parcelasChart, { fit: [500, 200], align: 'center' });
            parcelasFuturas.forEach(e => {
                doc.fontSize(12).fillColor('#222').font('NotoSans')
                    .text(`💸 ${new Date(e.transaction_date).toLocaleDateString()} | ${e.account} | R$ ${parseFloat(e.amount).toFixed(2)} | ${e.description} | Parcela ${e.installment_number}/${e.total_installments}`);
            });
        } else {
            doc.fontSize(14).fillColor('#6B7280').font('NotoSans-Oblique')
                .text('Nenhuma parcela futura encontrada.', { align: 'center' });
        }

        // Gastos empresariais detalhados
        const empresariais = expenses.filter(e => e.is_business_expense);
        if (empresariais.length > 0) {
            doc.addPage();
            doc.fontSize(16).text('Gastos Empresariais', { underline: true });
            doc.moveDown();
            empresariais.forEach(e => {
                doc.fontSize(12).fillColor('#222').font('NotoSans')
                    .text(`🗓️ ${new Date(e.transaction_date).toLocaleDateString()} | R$ ${parseFloat(e.amount).toFixed(2)} | ${e.description}`);
                doc.fontSize(12).fillColor('#6366F1').font('NotoSans')
                    .text(`Plano de Conta: ${e.account_plan_code || '-'}`);
                doc.fontSize(12).fillColor(e.has_invoice ? '#10B981' : '#EF4444').font('NotoSans')
                    .text(`Nota Fiscal: ${e.has_invoice ? 'Sim 📄' : 'Não ❌'}`);
                if (e.invoice_path) {
                    try {
                        const imgPath = path.resolve(__dirname, '..', e.invoice_path);
                        if (fs.existsSync(imgPath)) {
                            doc.image(imgPath, { fit: [200, 200] });
                        }
                    } catch (err) {
                        doc.fontSize(10).fillColor('#EF4444').text('Erro ao carregar imagem da nota fiscal.');
                    }
                }
                doc.moveDown();
            });
        }

        // Lista de todas as transações
        doc.addPage();
        doc.rect(0, 0, doc.page.width, 40).fill('#F59E0B');
        doc.fillColor('white').fontSize(20).font('NotoSans')
            .text('📋 Todas as Transações do Período', 0, 10, { align: 'center', width: doc.page.width });
        doc.moveDown(2);
        expenses.forEach(e => {
            doc.fontSize(10).fillColor('#222').font('NotoSans')
                .text(`🗓️ ${new Date(e.transaction_date).toLocaleDateString()} | R$ ${parseFloat(e.amount).toFixed(2)} | ${e.account} | ${e.description} | ${e.is_business_expense ? 'Empresarial 💼' : 'Pessoal 🏠'} | Plano: ${e.account_plan_code || '-'}`);
        });

        // Rodapé
        
        doc.fontSize(10).fillColor('#6B7280').font('NotoSans')
            .text('Obrigado por usar o Controle de Gastos! 🚀', 0, doc.page.height - 40, { align: 'center', width: doc.page.width });

        doc.end();
        doc.pipe(res);
    } catch (error) {
        console.error('Erro ao gerar relatório mensal:', error);
        res.status(500).json({ message: 'Erro ao gerar relatório mensal.' });
    }
});

// --- 9. INICIALIZAÇÃO DO SERVIDOR ---
app.listen(PORT, async () => {
    try {
        await pool.getConnection();
        console.log('Conexão com o MySQL estabelecida com sucesso.');
        console.log(`Servidor a ser executado na porta ${PORT}`);
    } catch (error) {
        console.error('ERRO CRÍTICO AO CONECTAR COM O BANCO DE DADOS:', error.message);
        process.exit(1);
    }
});

const billingPeriods = {
    'Nu Bank Vainer': { startDay: 3, endDay: 2 },    // 3 a 2 do mês seguinte
    'Nu Bank Ketlyn': { startDay: 3, endDay: 2 },
    'Ourocard Ketlyn': { startDay: 11, endDay: 10 }, // 11 a 10 do mês seguinte
    'Ducatto': { startDay: 11, endDay: 10 },
    'Master': { startDay: 16, endDay: 15 }
    // Adicione outras contas se necessário
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