-- Migration para adicionar funcionalidades de gastos recorrentes
-- Execute este script para atualizar sua base de dados

USE controle_gastos;

-- 1. Adicionar nova coluna para identificar gastos recorrentes
ALTER TABLE expenses 
ADD COLUMN `is_recurring_expense` TINYINT(1) DEFAULT 0 COMMENT 'Identifica se é um gasto mensal recorrente';

-- 2. Atualizar o ENUM das contas, alterando Ducatto para PIX e Master para Boleto
ALTER TABLE expenses 
MODIFY COLUMN `account` ENUM(
    'Nu Bank Ketlyn',
    'Nu Vainer', 
    'Ourocard Ketlyn',
    'PicPay Vainer',
    'PIX',
    'Boleto'
) NOT NULL;

-- 3. Atualizar registros existentes (se houver)
UPDATE expenses SET account = 'PIX' WHERE account = 'Ducatto';
UPDATE expenses SET account = 'Boleto' WHERE account = 'Master';

-- 4. Criar tabela para gerenciar gastos recorrentes mensais
CREATE TABLE IF NOT EXISTS `recurring_expenses` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) NOT NULL,
  `description` VARCHAR(255) NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `account` ENUM('Nu Bank Ketlyn','Nu Vainer','Ourocard Ketlyn','PicPay Vainer','PIX','Boleto') NOT NULL,
  `account_plan_code` INT(11) DEFAULT NULL,
  `is_business_expense` TINYINT(1) DEFAULT 0,
  `day_of_month` INT(2) DEFAULT 1 COMMENT 'Dia do mês para processar (1-31)',
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `recurring_expenses_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 5. Criar tabela de controle de processamento de gastos recorrentes
CREATE TABLE IF NOT EXISTS `recurring_expense_processing` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `recurring_expense_id` INT(11) NOT NULL,
  `processed_month` VARCHAR(7) NOT NULL COMMENT 'Formato YYYY-MM',
  `expense_id` INT(11) NOT NULL COMMENT 'ID do gasto criado na tabela expenses',
  `processed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_processing` (`recurring_expense_id`, `processed_month`),
  KEY `recurring_expense_id` (`recurring_expense_id`),
  KEY `expense_id` (`expense_id`),
  CONSTRAINT `recurring_processing_ibfk_1` FOREIGN KEY (`recurring_expense_id`) REFERENCES `recurring_expenses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `recurring_processing_ibfk_2` FOREIGN KEY (`expense_id`) REFERENCES `expenses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 6. Adicionar índices para melhor performance
CREATE INDEX idx_expenses_recurring ON expenses(is_recurring_expense);
CREATE INDEX idx_expenses_account_date ON expenses(account, transaction_date);
CREATE INDEX idx_recurring_active ON recurring_expenses(is_active);
