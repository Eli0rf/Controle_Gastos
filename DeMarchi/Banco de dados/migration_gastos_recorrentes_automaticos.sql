-- Migration para implementar gastos recorrentes automáticos PIX/Boleto
-- Execute este script para atualizar sua base de dados com as novas funcionalidades

USE controle_gastos;

-- 1. Adicionar nova coluna para identificar gastos recorrentes (se não existir)
SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'controle_gastos' AND TABLE_NAME = 'expenses' 
    AND COLUMN_NAME = 'is_recurring_expense') = 0,
    'ALTER TABLE expenses ADD COLUMN `is_recurring_expense` TINYINT(1) DEFAULT 0 COMMENT "Identifica se é um gasto mensal recorrente"',
    'SELECT "Coluna is_recurring_expense já existe"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

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
CREATE INDEX IF NOT EXISTS idx_expenses_recurring ON expenses(is_recurring_expense);
CREATE INDEX IF NOT EXISTS idx_expenses_account_date ON expenses(account, transaction_date);
CREATE INDEX IF NOT EXISTS idx_recurring_active ON recurring_expenses(is_active);

-- 7. Inserir alguns gastos recorrentes de exemplo para PIX e Boleto (opcional)
INSERT IGNORE INTO `recurring_expenses` (`user_id`, `description`, `amount`, `account`, `account_plan_code`, `is_business_expense`, `day_of_month`) VALUES
(1, 'Transferência PIX Mensal', 500.00, 'PIX', 17, 0, 1),
(1, 'Pagamento de Contas via PIX', 300.00, 'PIX', 17, 0, 10),
(1, 'Boleto de Serviços', 150.00, 'Boleto', 17, 0, 5),
(1, 'Boleto Recorrente', 200.00, 'Boleto', 17, 0, 15);

-- 8. Criar view para relatórios de gastos recorrentes
CREATE OR REPLACE VIEW `v_recurring_expenses_summary` AS
SELECT 
    re.id,
    re.user_id,
    re.description,
    re.amount,
    re.account,
    re.account_plan_code,
    re.is_business_expense,
    re.day_of_month,
    re.is_active,
    COUNT(rep.id) as times_processed,
    MAX(rep.processed_at) as last_processed,
    SUM(e.amount) as total_processed_amount
FROM recurring_expenses re
LEFT JOIN recurring_expense_processing rep ON re.id = rep.recurring_expense_id
LEFT JOIN expenses e ON rep.expense_id = e.id
WHERE re.is_active = 1
GROUP BY re.id, re.user_id, re.description, re.amount, re.account, re.account_plan_code, 
         re.is_business_expense, re.day_of_month, re.is_active;

-- 9. Criar função para calcular próximos dias de processamento PIX/Boleto
DELIMITER //

CREATE OR REPLACE FUNCTION GetNextProcessingDays(account_type VARCHAR(50), target_year INT, target_month INT)
RETURNS JSON
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE processing_days JSON;
    DECLARE days_in_month INT;
    
    -- Calcular dias do mês
    SET days_in_month = DAY(LAST_DAY(STR_TO_DATE(CONCAT(target_year, '-', target_month, '-01'), '%Y-%m-%d')));
    
    -- Definir dias de processamento baseado no tipo de conta
    IF account_type = 'PIX' THEN
        SET processing_days = JSON_ARRAY(1, 10, 20, days_in_month);
    ELSEIF account_type = 'Boleto' THEN
        SET processing_days = JSON_ARRAY(5, 15, 25);
    ELSE
        SET processing_days = JSON_ARRAY(1);
    END IF;
    
    RETURN processing_days;
END//

DELIMITER ;

-- 10. Atualizar configurações do sistema
INSERT INTO `system_config` (`config_key`, `config_value`, `description`) VALUES
('auto_recurring_enabled', '1', 'Habilitar processamento automático de gastos recorrentes'),
('pix_processing_days', '[1,10,20,-1]', 'Dias do mês para processar gastos PIX (-1 = último dia)'),
('boleto_processing_days', '[5,15,25]', 'Dias do mês para processar gastos Boleto'),
('recurring_notification_enabled', '1', 'Habilitar notificações de gastos recorrentes')
ON DUPLICATE KEY UPDATE 
    config_value = VALUES(config_value),
    description = VALUES(description);

-- Criar tabela de configurações se não existir
CREATE TABLE IF NOT EXISTS `system_config` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `config_key` VARCHAR(100) NOT NULL,
  `config_value` TEXT,
  `description` VARCHAR(255),
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_config_key` (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 11. Log de execução da migração
INSERT INTO `migration_log` (`migration_name`, `executed_at`, `status`) VALUES
('gastos_recorrentes_pix_boleto_v2', NOW(), 'SUCCESS');

-- Criar tabela de log de migrações se não existir
CREATE TABLE IF NOT EXISTS `migration_log` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `migration_name` VARCHAR(255) NOT NULL,
  `executed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status` ENUM('SUCCESS', 'FAILED', 'PARTIAL') NOT NULL,
  `notes` TEXT,
  PRIMARY KEY (`id`),
  KEY `idx_migration_name` (`migration_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Final: Verificar se tudo foi criado corretamente
SELECT 
    'Migration completed successfully!' as status,
    COUNT(*) as recurring_expenses_count
FROM recurring_expenses
WHERE account IN ('PIX', 'Boleto');