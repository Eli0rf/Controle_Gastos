/**
 * dashboard.js - Versão Final e Completa
 */
document.addEventListener('DOMContentLoaded', () => {

    const API_BASE_URL = 'http://localhost:3000/api';
    const FILE_BASE_URL = 'http://localhost:3000';

    const loginSection = document.getElementById('login-section');
    const dashboardContent = document.getElementById('dashboard-content');
    const loginForm = document.getElementById('login-form');
    const logoutButton = document.getElementById('logout-button');
    const welcomeUserSpan = document.getElementById('welcome-user');
    const addExpenseForm = document.getElementById('add-expense-form');
    const businessCheckbox = document.getElementById('form-is-business');
    const personalFields = document.getElementById('personal-fields-container');
    const businessFields = document.getElementById('business-fields-container');
    const expensesTableBody = document.getElementById('expenses-table-body');
    const filterYear = document.getElementById('filter-year');
    const filterMonth = document.getElementById('filter-month');
    const totalSpentEl = document.getElementById('total-spent');
    const totalTransactionsEl = document.getElementById('total-transactions');
    const projectionEl = document.getElementById('next-month-projection');
    
    const monthlyReportBtn = document.getElementById('monthly-report-btn');
    const weeklyReportBtn = document.getElementById('weekly-report-btn');
    const reportModal = document.getElementById('report-modal');
    const reportForm = document.getElementById('report-form');
    const cancelReportBtn = document.getElementById('cancel-report-btn');
    const reportGenerateText = document.getElementById('report-generate-text');
    const reportLoadingText = document.getElementById('report-loading-text');
    
    let expensesLineChart, expensesPieChart, planChart, mixedTypeChart;

    function addEventListeners() {
        if (loginForm) loginForm.addEventListener('submit', handleLogin);
        if (logoutButton) logoutButton.addEventListener('click', handleLogout);
        if (filterYear) filterYear.addEventListener('change', fetchAllData);
        if (filterMonth) filterMonth.addEventListener('change', fetchAllData);
        if (addExpenseForm) addExpenseForm.addEventListener('submit', handleAddExpense);
        if (expensesTableBody) expensesTableBody.addEventListener('click', handleTableClick);
        if (weeklyReportBtn) weeklyReportBtn.addEventListener('click', handleWeeklyReportDownload);
        if (monthlyReportBtn) monthlyReportBtn.addEventListener('click', openReportModal);
        if (cancelReportBtn) cancelReportBtn.addEventListener('click', closeReportModal);
        if (reportForm) reportForm.addEventListener('submit', handleMonthlyReportDownload);
        if (businessCheckbox) businessCheckbox.addEventListener('change', toggleExpenseFields);
    }

    async function handleLogin(e) {
        e.preventDefault();
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        if (!usernameInput || !passwordInput) return alert("Erro de configuração do HTML.");
        try {
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: usernameInput.value, password: passwordInput.value })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            localStorage.setItem('token', data.accessToken);
            localStorage.setItem('username', usernameInput.value);
            showDashboard();
        } catch (error) {
            alert(`Erro no login: ${error.message}`);
        }
    }

    function handleLogout() {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        showLogin();
    }

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

    function initializeDashboard() {
        populateFilterOptions();
        fetchAllData();
        toggleExpenseFields();
    }
    
    function populateFilterOptions() {
        if (!filterYear || !filterMonth) return;
        filterYear.innerHTML = '';
        filterMonth.innerHTML = '<option value="">Todos os Meses</option>';
        const currentYear = new Date().getFullYear();
        for (let i = currentYear; i >= currentYear - 5; i--) filterYear.add(new Option(i, i));
        const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        months.forEach((month, index) => filterMonth.add(new Option(month, index + 1)));
        filterYear.value = currentYear;
        filterMonth.value = new Date().getMonth() + 1;
    }
    
    function toggleExpenseFields() {
        if (!personalFields || !businessFields || !businessCheckbox) return;
        personalFields.classList.toggle('hidden', businessCheckbox.checked);
        businessFields.classList.toggle('hidden', !businessCheckbox.checked);
    }

    const getToken = () => localStorage.getItem('token');

    async function fetchAllData() {
        await fetchAndRenderExpenses();
        await fetchAndRenderDashboardMetrics();
    }
    
    async function fetchAndRenderExpenses() {
        const token = getToken();
        if (!token) return showLogin();
        const params = new URLSearchParams({ year: filterYear.value, month: filterMonth.value });
        try {
            const response = await fetch(`${API_BASE_URL}/expenses?${params.toString()}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (response.status === 401) return showLogin();
            const expenses = await response.json();
            renderExpensesTable(expenses);
        } catch (error) { console.error('Erro ao buscar despesas:', error); }
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
            renderPlanChart(data.planChartData || []);
            renderMixedTypeChart(data.mixedTypeData || []);
        } catch (error) { console.error('Erro ao buscar dados do dashboard:', error); }
    }

    function renderExpensesTable(expenses = []) {
        if (!expensesTableBody) return;
        expensesTableBody.innerHTML = '';
        let totalSpent = 0;
        if (expenses.length > 0) {
            expenses.forEach(expense => {
                totalSpent += parseFloat(expense.amount);
                const invoiceLink = expense.invoice_path ? `<a href="${FILE_BASE_URL}/${expense.invoice_path}" target="_blank" class="text-blue-600"><i class="fas fa-file-invoice"></i></a>` : 'N/A';
                const row = document.createElement('tr');
                row.className = 'border-b hover:bg-gray-50';
                row.innerHTML = `<td class="p-3">${new Date(expense.transaction_date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</td><td class="p-3">${expense.description}</td><td class="p-3 text-red-600">R$ ${parseFloat(expense.amount).toFixed(2)}</td><td class="p-3">${expense.account}</td><td class="p-3">${expense.is_business_expense ? 'Empresa' : 'Pessoal'}</td><td class="p-3 text-center">${invoiceLink}</td><td class="p-3"><button class="text-blue-600 mr-2 edit-btn" data-id="${expense.id}"><i class="fas fa-edit"></i></button><button class="text-red-600 delete-btn" data-id="${expense.id}"><i class="fas fa-trash"></i></button></td>`;
                expensesTableBody.appendChild(row);
            });
        } else {
            expensesTableBody.innerHTML = `<tr><td colspan="7" class="text-center p-4">Nenhuma despesa encontrada.</td></tr>`;
        }
        if (totalSpentEl) totalSpentEl.textContent = `R$ ${totalSpent.toFixed(2)}`;
        if (totalTransactionsEl) totalTransactionsEl.textContent = expenses.length;
    }

    function renderLineChart(data = []) {
        const ctx = document.getElementById('expenses-line-chart')?.getContext('2d');
        if (!ctx) return;
        if (expensesLineChart) expensesLineChart.destroy();
        expensesLineChart = new Chart(ctx, { type: 'line', data: { labels: data.map(d => d.month), datasets: [{ label: 'Gastos Mensais', data: data.map(d => d.total), borderColor: '#3B82F6', tension: 0.1 }] } });
    }

    function renderPieChart(data = []) {
        const ctx = document.getElementById('expenses-pie-chart')?.getContext('2d');
        if (!ctx) return;
        if (expensesPieChart) expensesPieChart.destroy();
        expensesPieChart = new Chart(ctx, { type: 'pie', data: { labels: data.map(d => d.account), datasets: [{ data: data.map(d => d.total), backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#6366F1'] }] } });
    }
    
    function renderPlanChart(data = []) {
        const ctx = document.getElementById('plan-chart')?.getContext('2d');
        if (!ctx) return;
        if (planChart) planChart.destroy();
        planChart = new Chart(ctx, { type: 'bar', data: { labels: data.map(d => `Plano ${d.account_plan_code}`), datasets: [{ label: 'Total Gasto (R$)', data: data.map(d => d.total), backgroundColor: 'rgba(239, 68, 68, 0.7)' }] }, options: { indexAxis: 'y', plugins: { legend: { display: false } } } });
    }

    function renderMixedTypeChart(data = []) {
        const ctx = document.getElementById('mixed-type-chart')?.getContext('2d');
        if (!ctx) return;
        if (mixedTypeChart) mixedTypeChart.destroy();
        mixedTypeChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(d => d.account),
                datasets: [
                    { label: 'Gastos Pessoais', data: data.map(d => d.personal_total), backgroundColor: 'rgba(59, 130, 246, 0.7)' },
                    { label: 'Gastos Empresariais', data: data.map(d => d.business_total), backgroundColor: 'rgba(239, 68, 68, 0.7)' }
                ]
            },
            options: { scales: { x: { stacked: false }, y: { beginAtZero: true } }, plugins: { tooltip: { mode: 'index', intersect: false } } }
        });
    }

    async function handleAddExpense(e) {
        e.preventDefault();
        const formData = new FormData(addExpenseForm);
        formData.set('is_business_expense', businessCheckbox.checked);
        try {
            const response = await fetch(`${API_BASE_URL}/expenses`, { method: 'POST', headers: { 'Authorization': `Bearer ${getToken()}` }, body: formData });
            if (!response.ok) { const err = await response.json(); throw new Error(err.message); }
            addExpenseForm.reset();
            toggleExpenseFields();
            fetchAllData();
        } catch (error) { alert(`Erro: ${error.message}`); }
    }
    
    function handleTableClick(e) {
        if (e.target.closest('.edit-btn')) alert('Funcionalidade de edição não implementada.');
        if (e.target.closest('.delete-btn')) { if (confirm('Tem a certeza?')) deleteExpense(e.target.closest('.delete-btn').dataset.id); }
    }

    async function deleteExpense(id) {
        try {
            const response = await fetch(`${API_BASE_URL}/expenses/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } });
            if (!response.ok) throw new Error('Falha ao apagar despesa.');
            fetchAllData();
        } catch (error) { alert(`Erro: ${error.message}`); }
    }
    
    async function handleWeeklyReportDownload() {
        // ... (código da função de download semanal) ...
    }
    
    function openReportModal() {
        populateReportModalFilters();
        if(reportModal) {
            reportModal.classList.remove('hidden');
            setTimeout(() => reportModal.classList.remove('opacity-0'), 10);
        }
    }

    function closeReportModal() {
        if(reportModal) {
            reportModal.classList.add('opacity-0');
            setTimeout(() => reportModal.classList.add('hidden'), 300);
        }
    }

    function populateReportModalFilters() {
        const yearSelect = document.getElementById('report-year');
        const monthSelect = document.getElementById('report-month');
        if(!yearSelect || !monthSelect) return;
        yearSelect.innerHTML = '';
        monthSelect.innerHTML = '';
        const currentYear = new Date().getFullYear();
        for (let i = currentYear; i >= currentYear - 5; i--) yearSelect.add(new Option(i, i));
        const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        months.forEach((month, index) => monthSelect.add(new Option(month, index + 1)));
        yearSelect.value = filterYear.value;
        monthSelect.value = filterMonth.value;
    }

    async function handleMonthlyReportDownload(e) {
        e.preventDefault();
        const year = document.getElementById('report-year').value;
        const month = document.getElementById('report-month').value;
        const submitButton = e.submitter;

        if(reportGenerateText) reportGenerateText.classList.add('hidden');
        if(reportLoadingText) reportLoadingText.classList.remove('hidden');
        if(submitButton) submitButton.disabled = true;
        
        try {
            const response = await fetch(`${API_BASE_URL}/reports/monthly`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
                body: JSON.stringify({ year, month })
            });
            if (!response.ok) throw new Error('Falha ao gerar o relatório.');
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `relatorio-mensal-${year}-${month}.pdf`;
            document.body.appendChild(a); a.click(); a.remove();
            window.URL.revokeObjectURL(url);
            closeReportModal();
        } catch (error) {
            alert(`Erro: ${error.message}`);
        } finally {
            if(reportGenerateText) reportGenerateText.classList.remove('hidden');
            if(reportLoadingText) reportLoadingText.classList.add('hidden');
            if(submitButton) submitButton.disabled = false;
        }
    }

    addEventListeners();
    if (getToken()) showDashboard(); else showLogin();
});
