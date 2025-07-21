-- Execute estas consultas no console MySQL do Railway
-- Acesse: https://railway.com/project/d5087728-9c34-44b6-91fe-33c58052bfd4
-- Clique no serviço "MySQL" > aba "Data" > "SQL Query"

-- 1. Verificar conexão
SELECT 'Conexão MySQL Railway OK!' as status;

-- 2. Criar tabelas necessárias
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 3. Criar tabela de gastos
CREATE TABLE IF NOT EXISTS expenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    transaction_date DATE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description VARCHAR(255) NOT NULL,
    account ENUM('Nu Bank Ketlyn','Nu Vainer','Ourocard Ketlyn','PicPay Vainer','Ducatto','Master') NOT NULL,
    is_business_expense TINYINT(1) DEFAULT 0,
    account_plan_code INT DEFAULT NULL,
    has_invoice TINYINT(1) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    invoice_path VARCHAR(255) DEFAULT NULL,
    total_purchase_amount DECIMAL(10,2) DEFAULT NULL,
    installment_number INT DEFAULT NULL,
    total_installments INT DEFAULT NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_transaction_date (transaction_date),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 4. Verificar se as tabelas foram criadas
SHOW TABLES;

-- 5. Verificar estrutura das tabelas
DESCRIBE users;
DESCRIBE expenses;

-- 6. Inserir usuário de teste (opcional)
INSERT IGNORE INTO users (username, email, password) VALUES 
('admin', 'admin@controle-gastos.com', '$2a$10$8ZbWH9E3QxK2mXgJ1vT.Vu7QGqF4nJ5kL2mN8pR9sT1uV6wX7yZ8A');

-- 7. Verificar dados inseridos
SELECT * FROM users;

-- 8. Teste de inserção de gasto
INSERT IGNORE INTO expenses (user_id, transaction_date, amount, description, account) VALUES 
(1, CURDATE(), 25.50, 'Teste de gasto inicial', 'Nu Bank Ketlyn');

-- 9. Verificar gastos
SELECT * FROM expenses;

-- 10. Status final
SELECT 
    'Banco configurado com sucesso!' as status,
    COUNT(*) as total_usuarios
FROM users;
