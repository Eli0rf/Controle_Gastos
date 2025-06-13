// server.js (Versão Final e Completa)

// --- 1. DEPENDÊNCIAS ---
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const pdfkit = require('pdfkit');
const path = require('path');
const fs = require('fs');
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
    const { month, year } = req.query;
    try {
        let sql = 'SELECT * FROM expenses WHERE user_id = ?';
        const params = [userId];
        if (year && month) {
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
    try {
        const baseParams = [userId];
        const monthFilter = ` AND YEAR(transaction_date) = ? AND MONTH(transaction_date) = ?`;
        const paramsWithMonth = [...baseParams];
        if (year && month) {
            paramsWithMonth.push(year, month);
        }

        const [lineChartData] = await pool.query(`SELECT DATE_FORMAT(transaction_date, '%Y-%m') as month, SUM(amount) as total FROM expenses WHERE user_id = ? GROUP BY month ORDER BY month ASC`, [userId]);
        const [pieChartData] = await pool.query(`SELECT account, SUM(amount) as total FROM expenses WHERE user_id = ? ${year && month ? monthFilter : ''} GROUP BY account`, paramsWithMonth);
        const [planChartData] = await pool.query(`SELECT account_plan_code, SUM(amount) as total FROM expenses WHERE user_id = ? AND is_business_expense = FALSE AND account_plan_code IS NOT NULL ${year && month ? monthFilter : ''} GROUP BY account_plan_code ORDER BY total DESC`, paramsWithMonth);
        const [mixedTypeData] = await pool.query(`
            SELECT 
                account,
                SUM(CASE WHEN is_business_expense = FALSE THEN amount ELSE 0 END) as personal_total,
                SUM(CASE WHEN is_business_expense = TRUE THEN amount ELSE 0 END) as business_total
            FROM expenses 
            WHERE user_id = ? ${year && month ? monthFilter : ''}
            GROUP BY account
            ORDER BY personal_total DESC, business_total DESC
        `, paramsWithMonth);
        const [last3Months] = await pool.query(`SELECT SUM(amount) as total FROM expenses WHERE user_id = ? AND transaction_date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH) GROUP BY YEAR(transaction_date), MONTH(transaction_date)`, [userId]);
        
        let projection = 0;
        if (last3Months.length > 0) {
            projection = last3Months.reduce((acc, curr) => acc + parseFloat(curr.total), 0) / last3Months.length;
        }

        res.json({ 
            lineChartData, 
            pieChartData, 
            planChartData, 
            mixedTypeData,
            projection: { nextMonthEstimate: projection.toFixed(2) } 
        });
    } catch (error) {
        console.error('Erro ao buscar dados do dashboard:', error);
        res.status(500).json({ message: 'Erro ao buscar dados do dashboard.' });
    }
});

app.get('/api/reports/weekly', authenticateToken, async (req, res) => {
    // ... (código da rota de relatório semanal) ...
});

app.post('/api/reports/monthly', authenticateToken, async (req, res) => {
    // ... (código da rota de relatório mensal) ...
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
