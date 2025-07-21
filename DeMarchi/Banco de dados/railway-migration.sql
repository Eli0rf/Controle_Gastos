-- Script de migração para Railway MySQL
-- Execute este script no banco MySQL do Railway após o deploy

-- Usar o banco padrão do Railway
USE railway;

-- Criar tabela de usuários
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Criar tabela de gastos
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

-- Criar tabela de gastos recorrentes (se necessário)
CREATE TABLE IF NOT EXISTS recurring_expenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    account ENUM('Nu Bank Ketlyn','Nu Vainer','Ourocard Ketlyn','PicPay Vainer','Ducatto','Master') NOT NULL,
    frequency ENUM('monthly', 'weekly', 'yearly') DEFAULT 'monthly',
    start_date DATE NOT NULL,
    end_date DATE,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_is_active (is_active),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Criar usuário de teste (opcional - remova em produção)
INSERT IGNORE INTO users (username, email, password) VALUES 
('admin', 'admin@controle-gastos.com', '$2a$10$8ZbWH9E3QxK2mXgJ1vT.Vu7QGqF4nJ5kL2mN8pR9sT1uV6wX7yZ8A');

-- Verificar se as tabelas foram criadas
SHOW TABLES;

-- Mostrar estrutura das tabelas
DESCRIBE users;
DESCRIBE expenses;
DESCRIBE recurring_expenses;
