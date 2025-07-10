# 🚀 ATUALIZAÇÃO - GASTOS RECORRENTES E NOVAS CONTAS

## 📋 **RESUMO DAS ALTERAÇÕES**

Esta atualização adiciona funcionalidades avançadas ao sistema de controle de gastos, incluindo gastos recorrentes mensais e alterações nas contas disponíveis.

## 🆕 **NOVAS FUNCIONALIDADES**

### 1. **Gastos Recorrentes Mensais**
- **Descrição**: Permite cadastrar gastos que se repetem todos os meses
- **Contas Suportadas**: PIX e Boleto
- **Características**:
  - Não fazem parte de períodos de fatura
  - São processados mensalmente de forma automática ou manual
  - Podem ser gastos pessoais ou empresariais
  - Suportam planos de conta

### 2. **Alterações nas Contas**
- **Ducatto** → **PIX**: Agora representa gastos via PIX recorrentes
- **Master** → **Boleto**: Agora representa gastos via Boleto recorrentes

### 3. **Interface Melhorada**
- Novo botão "🔄 Gastos Recorrentes" no header
- Modal dedicado para gerenciar gastos recorrentes
- Botão "Processar Mês Atual" para gerar gastos do mês
- Filtros atualizados com as novas contas

## 🛠️ **ALTERAÇÕES NO BANCO DE DADOS**

### Tabelas Criadas:
1. **`recurring_expenses`**: Armazena os templates dos gastos recorrentes
2. **`recurring_expense_processing`**: Controla quais gastos já foram processados por mês

### Colunas Adicionadas:
- **`expenses.is_recurring_expense`**: Identifica gastos originados de recorrentes

### Enum Atualizado:
- Campo `account` agora inclui 'PIX' e 'Boleto' em lugar de 'Ducatto' e 'Master'

## 🔧 **COMO USAR AS NOVAS FUNCIONALIDADES**

### **Cadastrar Gasto Recorrente:**
1. Clique no botão "🔄 Gastos Recorrentes" no header
2. Preencha o formulário:
   - Descrição (ex: "Aluguel", "Netflix")
   - Valor mensal
   - Conta (PIX ou Boleto)
   - Dia do mês (1-31)
   - Plano de conta (opcional)
   - Tipo (pessoal ou empresarial)
3. Clique em "Criar Gasto Recorrente"

### **Processar Gastos do Mês:**
1. Na seção "Gastos Recorrentes Mensais", clique em "Processar Mês Atual"
2. O sistema criará automaticamente os gastos recorrentes para o mês/ano selecionado nos filtros
3. Gastos já processados para o mesmo mês não serão duplicados

### **Filtros e Relatórios:**
- **Contas PIX e Boleto**: Não são filtradas por períodos de fatura
- **Busca por Fatura**: PIX e Boleto usam filtro mensal normal
- **Gastos Recorrentes**: Aparecem marcados como recorrentes nos relatórios

## 📊 **IMPACTO NOS RELATÓRIOS**

### **Dashboard:**
- Gastos recorrentes são incluídos nos gráficos mensais
- Métricas de total e quantidade incluem gastos recorrentes

### **Relatórios PDF:**
- Gastos recorrentes aparecem identificados
- Separação entre gastos normais e recorrentes

### **Filtros:**
- Por padrão, gastos recorrentes são incluídos nas visualizações
- Parâmetro `include_recurring=true` para controlar inclusão via API

## 🔒 **SEGURANÇA E VALIDAÇÕES**

### **Validações Implementadas:**
- Gastos recorrentes só podem ser criados para contas PIX e Boleto
- Validação de dia do mês (1-31)
- Verificação de duplicatas por mês
- Autenticação obrigatória para todas as operações

### **Controles:**
- Soft delete para gastos recorrentes (campo `is_active`)
- Log de processamento para auditoria
- Validação de permissões por usuário

## 🚀 **APIS ADICIONADAS**

### **Gastos Recorrentes:**
- `POST /api/recurring-expenses` - Criar gasto recorrente
- `GET /api/recurring-expenses` - Listar gastos recorrentes
- `PUT /api/recurring-expenses/:id` - Atualizar gasto recorrente
- `DELETE /api/recurring-expenses/:id` - Remover gasto recorrente
- `POST /api/recurring-expenses/process` - Processar gastos para um mês

### **Parâmetros Adicionados:**
- `include_recurring` - Controlar inclusão de gastos recorrentes na listagem
- Suporte para filtros específicos de contas PIX/Boleto

## 📋 **PRÓXIMOS PASSOS**

### **Para Implementar:**
1. Execute o script `migration_gastos_recorrentes.sql` na sua base de dados
2. Atualize o código do backend e frontend
3. Teste as novas funcionalidades
4. Configure gastos recorrentes existentes

### **Funcionalidades Futuras:**
- Edição de gastos recorrentes
- Processamento automático via cron job
- Notificações de gastos processados
- Histórico de alterações em gastos recorrentes

## 🐛 **TROUBLESHOOTING**

### **Problemas Comuns:**
1. **Erro de enum**: Execute a migration para atualizar as opções de conta
2. **Gastos não aparecem**: Verifique se foram processados para o mês correto
3. **Duplicatas**: O sistema previne automaticamente, mas verifique logs

### **Logs Importantes:**
- Verificar processamento de gastos recorrentes
- Validar criação de gastos mensais
- Monitorar uso das novas APIs

---

## 📞 **SUPORTE**

Para dúvidas ou problemas com as novas funcionalidades, verifique:
1. Logs do servidor para erros de API
2. Console do navegador para erros de frontend
3. Base de dados para consistência dos dados

**Versão**: 2.0.0  
**Data**: Julho 2025  
**Autor**: Sistema de Controle de Gastos
