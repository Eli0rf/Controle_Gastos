/**
 * dashboard.js
 * Versão Completa e Refeita
 *
 * Este script controla toda a interatividade da página do dashboard, incluindo:
 * - Autenticação de utilizador (login/logout).
 * - Exibição de dados do dashboard (tabela de despesas, gráficos, totais).
 * - Funcionalidades de CRUD (Criar, Ler, Atualizar, Apagar) para despesas.
 * - Upload de ficheiros para notas fiscais.
 * - Geração e download de relatórios semanais em PDF.
 * - Filtros de dados por mês e ano.
 * - Lógica de formulário condicional para despesas pessoais e empresariais.
 */
document.addEventListener('DOMContentLoaded', () => {

    // --- Seletores de Elementos Globais ---
    const API_BASE_URL = 'http://localhost:3000/api';
    const FILE_BASE_URL = 'http://localhost:3000';

    // Secções principais
    const loginSection = document.getElementById('login-section');
    const dashboardContent = document.getElementById('dashboard-content');

    // Autenticação
    const loginForm = document.getElementById('login-form');
    const logoutButton = document.getElementById('logout-button');
    const welcomeUserSpan = document.getElementById('welcome-user');

    // Formulário de Adição e seus campos condicionais
    const addExpenseForm = document.getElementById('add-expense-form');
    const businessCheckbox = document.getElementById('form-is-business');
    const personalFields = document.getElementById('personal-fields-container');
    const businessFields = document.getElementById('business-fields-container');

    // Tabela e Filtros
    const expensesTableBody = document.getElementById('expenses-table-body');
    const filterYear = document.getElementById('filter-year');
    const filterMonth = document.getElementById('filter-month');
    
    // Elementos de exibição de dados
    const totalSpentEl = document.getElementById('total-spent');
    const totalTransactionsEl = document.getElementById('total-transactions');
    const projectionEl = document.getElementById('next-month-projection');

    // Relatório
    const reportBtn = document.getElementById('report-btn');
    
    // Gráficos (variáveis para guardar as instâncias)
    let expensesLineChart, expensesPieChart;

    // --- LÓGICA DE AUTENTICAÇÃO ---

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const usernameInput = document.getElementById('username');
            const passwordInput = document.getElementById('password');

            if (!usernameInput || !passwordInput) {
                alert("Erro de configuração: Campos de utilizador ou senha não encontrados no HTML.");
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: usernameInput.value, password: passwordInput.value })
                });

                const data = await response.json();
                if (!response.ok) throw new Error(data.message || 'Falha ao fazer login.');

                localStorage.setItem('token', data.accessToken);
                localStorage.setItem('username', usernameInput.value);
                
                showDashboard();

            } catch (error) {
                alert(`Erro no login: ${error.message}`);
            }
        });
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('username');
            showLogin();
        });
    }

    // --- CONTROLO DE VISIBILIDADE (UI) ---

    function showDashboard() {
        if (loginSection) loginSection.style.display = 'none';
        if (dashboardContent) dashboardContent.style.display = 'block';
        if (welcomeUserSpan) welcomeUserSpan.textContent = `Bem-vindo, ${localStorage.getItem('username')}!`;
        initializeDashboard();
    }

    function showLogin() {
        if (loginSection) loginSection.style.display = 'flex';
        if (dashboardContent) dashboardContent.style.display = 'none';
    }

    // --- INICIALIZAÇÃO DO DASHBOARD ---

    function initializeDashboard() {
        populateFilterOptions();
        addEventListeners();
        fetchAllData();
        toggleExpenseFields(); // Garante que o estado inicial do formulário está correto
    }
    
    function populateFilterOptions() {
        if (!filterYear || !filterMonth) return;
        filterYear.innerHTML = '';
        filterMonth.innerHTML = '<option value="">Todos os Meses</option>';
        const currentYear = new Date().getFullYear();
        for (let i = currentYear; i >= currentYear - 5; i--) {
            filterYear.add(new Option(i, i));
        }
        const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        months.forEach((month, index) => {
            filterMonth.add(new Option(month, index + 1));
        });
        filterYear.value = currentYear;
        filterMonth.value = new Date().getMonth() + 1;
    }
    
    function addEventListeners() {
        if (filterYear) filterYear.addEventListener('change', fetchAllData);
        if (filterMonth) filterMonth.addEventListener('change', fetchAllData);
        if (addExpenseForm) addExpenseForm.addEventListener('submit', handleAddExpense);
        if (expensesTableBody) expensesTableBody.addEventListener('click', handleTableClick);
        if (reportBtn) reportBtn.addEventListener('click', handleReportDownload);
        if (businessCheckbox) businessCheckbox.addEventListener('change', toggleExpenseFields);
    }

    function toggleExpenseFields() {
        if (!personalFields || !businessFields) return;
        const isBusiness = businessCheckbox.checked;
        personalFields.classList.toggle('hidden', isBusiness);
        businessFields.classList.toggle('hidden', !isBusiness);
    }

    // --- COMUNICAÇÃO COM A API ---

    const getToken = () => localStorage.getItem('token');

    async function fetchAllData() {
        await fetchAndRenderExpenses();
        await fetchAndRenderDashboardMetrics();
    }
    
    async function fetchAndRenderExpenses() {
        const token = getToken();
        if (!token) { showLogin(); return; }
        const params = new URLSearchParams({ year: filterYear.value, month: filterMonth.value });
        try {
            const response = await fetch(`${API_BASE_URL}/expenses?${params.toString()}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (response.status === 401 || response.status === 403) { showLogin(); return; }
            const expenses = await response.json();
            renderExpensesTable(expenses);
        } catch (error) {
            console.error('Erro ao buscar despesas:', error);
            if(expensesTableBody) expensesTableBody.innerHTML = `<tr><td colspan="7" class="text-center p-4 text-red-500">Falha ao carregar dados.</td></tr>`;
        }
    }

    async function fetchAndRenderDashboardMetrics() {
        const token = getToken();
        if (!token) return;
        const params = new URLSearchParams({ year: filterYear.value, month: filterMonth.value });
        try {
            const response = await fetch(`${API_BASE_URL}/dashboard?${params.toString()}`, { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await response.json();
            if (projectionEl) projectionEl.textContent = `R$ ${data.projection.nextMonthEstimate || '0.00'}`;
            renderLineChart(data.lineChartData || []);
            renderPieChart(data.pieChartData || []);
        } catch (error) {
            console.error('Erro ao buscar dados do dashboard:', error);
        }
    }

    // --- RENDERIZAÇÃO NA PÁGINA (UI) ---

    function renderExpensesTable(expenses = []) {
        if (!expensesTableBody) return;
        expensesTableBody.innerHTML = '';
        if (expenses.length === 0) {
            expensesTableBody.innerHTML = `<tr><td colspan="7" class="text-center p-4">Nenhuma despesa encontrada.</td></tr>`;
            if (totalSpentEl) totalSpentEl.textContent = 'R$ 0,00';
            if (totalTransactionsEl) totalTransactionsEl.textContent = '0';
            return;
        }
        let totalSpent = 0;
        expenses.forEach(expense => {
            totalSpent += parseFloat(expense.amount);
            const invoiceLink = expense.invoice_path ? `<a href="${FILE_BASE_URL}/${expense.invoice_path}" target="_blank" class="text-blue-600 hover:underline"><i class="fas fa-file-invoice"></i> Ver</a>` : 'N/A';
            const row = document.createElement('tr');
            row.className = 'border-b hover:bg-gray-50';
            row.innerHTML = `
                <td class="p-3">${new Date(expense.transaction_date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</td>
                <td class="p-3">${expense.description}</td>
                <td class="p-3 text-red-600 font-medium">R$ ${parseFloat(expense.amount).toFixed(2)}</td>
                <td class="p-3">${expense.account}</td>
                <td class="p-3">${expense.is_business_expense ? 'Empresarial' : 'Pessoal'}</td>
                <td class="p-3">${invoiceLink}</td>
                <td class="p-3">
                    <button class="text-blue-600 hover:text-blue-800 mr-2 edit-btn" data-id="${expense.id}" title="Editar"><i class="fas fa-edit"></i></button>
                    <button class="text-red-600 hover:text-red-800 delete-btn" data-id="${expense.id}" title="Apagar"><i class="fas fa-trash"></i></button>
                </td>
            `;
            expensesTableBody.appendChild(row);
        });
        if (totalSpentEl) totalSpentEl.textContent = `R$ ${totalSpent.toFixed(2)}`;
        if (totalTransactionsEl) totalTransactionsEl.textContent = expenses.length;
    }

    function renderLineChart(data = []) {
        const ctx = document.getElementById('expenses-line-chart')?.getContext('2d');
        if (!ctx) return;
        if (expensesLineChart) expensesLineChart.destroy();
        expensesLineChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(d => d.month),
                datasets: [{ label: 'Gastos Mensais', data: data.map(d => d.total), borderColor: 'rgb(59, 130, 246)', backgroundColor: 'rgba(59, 130, 246, 0.1)', tension: 0.1, fill: true }]
            }
        });
    }

    function renderPieChart(data = []) {
        const ctx = document.getElementById('expenses-pie-chart')?.getContext('2d');
        if (!ctx) return;
        if (expensesPieChart) expensesPieChart.destroy();
        expensesPieChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: data.map(d => d.account),
                datasets: [{ label: 'Gastos por Conta', data: data.map(d => d.total), backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#6366F1'] }]
            }
        });
    }

    // --- MANIPULADORES DE EVENTOS (HANDLERS) ---

    async function handleAddExpense(e) {
        e.preventDefault();
        const formData = new FormData(addExpenseForm);
        const token = getToken();

        // O valor do checkbox 'form-is-business' já está correto no formData se tiver o atributo 'name'
        // Corrigindo o valor do 'has_invoice' que também vem do seu próprio checkbox
        formData.set('has_invoice', document.getElementById('form-has-invoice-check').checked);

        if (businessCheckbox.checked) {
            formData.delete('account_plan_code');
        } else {
            formData.delete('has_invoice');
            formData.delete('invoice'); // 'invoice' é o nome do input do ficheiro
        }

        try {
            const response = await fetch(`${API_BASE_URL}/expenses`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            if (!response.ok) {
                 const errorData = await response.json();
                 throw new Error(errorData.message || 'Falha ao adicionar despesa.');
            }
            
            addExpenseForm.reset();
            toggleExpenseFields();
            fetchAllData();

        } catch (error) {
            alert(`Erro: ${error.message}`);
        }
    }
    
    function handleTableClick(e) {
        const editButton = e.target.closest('.edit-btn');
        const deleteButton = e.target.closest('.delete-btn');
        if (editButton) { alert('A funcionalidade de edição precisa ser implementada no modal.'); }
        if (deleteButton) { if (confirm('Tem a certeza de que deseja apagar esta despesa?')) { deleteExpense(deleteButton.dataset.id); } }
    }

    async function deleteExpense(id) {
        const token = getToken();
        try {
            const response = await fetch(`${API_BASE_URL}/expenses/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Falha ao apagar despesa.');
            fetchAllData();
        } catch (error) {
            alert(`Erro: ${error.message}`);
        }
    }
    
    async function handleReportDownload() {
        const token = getToken();
        if (!token) return;
        try {
            const response = await fetch(`${API_BASE_URL}/reports/weekly`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Não foi possível gerar o relatório.');
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = 'relatorio-semanal-de-gastos.pdf';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        } catch (error) {
            alert(`Erro ao descarregar relatório: ${error.message}`);
        }
    }

    // --- PONTO DE ENTRADA DA APLICAÇÃO ---
    if (getToken()) {
        showDashboard();
    } else {
        showLogin();
    }
});
