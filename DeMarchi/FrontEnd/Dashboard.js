/**
 * dashboard.js - Versão Final e Completa
 */
document.addEventListener('DOMContentLoaded', function() {
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

    let expensesLineChart, expensesPieChart, planChart, mixedTypeChart, goalsChart, goalsPlanChart;

    function getToken() {
        return localStorage.getItem('token');
    }

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
        document.getElementById('filter-account').addEventListener('change', fetchAllData);
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
        checkMonthlyReportReminder();
    }

    function showLogin() {
        if (loginSection) loginSection.style.display = 'flex';
        if (dashboardContent) dashboardContent.style.display = 'none';
    }

    function initializeDashboard() {
        populateAccountFilter();
        populateFilterOptions();
        fetchAllData();
        toggleExpenseFields();
    }

    function populateFilterOptions() {
        if (!filterYear || !filterMonth) return;
        filterYear.innerHTML = '';
        filterMonth.innerHTML = '';
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

    async function fetchAllData() {
        await fetchAndRenderExpenses();
        await fetchAndRenderDashboardMetrics();
        await fetchAndRenderGoalsChart();
    }

    // --- Busca metas e renderiza gráfico de metas/alertas ---
    async function fetchAndRenderGoalsChart() {
        const token = getToken();
        if (!token) return;

        const params = new URLSearchParams({
            year: filterYear.value,
            month: filterMonth.value
        });

        try {
            const response = await fetch(`${API_BASE_URL}/expenses-goals?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Erro ao buscar metas.');
            const data = await response.json();

            // Notificações de metas (alertas)
            data.forEach(item => {
                if (item.Alerta && !sessionStorage.getItem(`alerta_${item.PlanoContasID}_${item.Alerta.percentual}_${filterYear.value}_${filterMonth.value}`)) {
                    showNotification(item.Alerta.mensagem);
                    sessionStorage.setItem(`alerta_${item.PlanoContasID}_${item.Alerta.percentual}_${filterYear.value}_${filterMonth.value}`, 'true');
                }
            });

            renderGoalsChart(data);
            renderGoalsPlanChart(data);
        } catch (error) {
            console.error('Erro ao buscar metas:', error);
        }
    }

    function renderGoalsChart(data = []) {
        const ctx = document.getElementById('goals-chart')?.getContext('2d');
        if (!ctx) return;
        if (goalsChart) goalsChart.destroy();

        const labels = data.map(item => `Plano ${item.PlanoContasID}`);
        const values = data.map(item => Number(item.Total));
        const metas = data.map(item => Number(item.Meta));

        goalsChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Gastos Atuais',
                        data: values,
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Meta',
                        data: metas,
                        type: 'line',
                        fill: false,
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 2,
                        pointRadius: 0
                    }
                ]
            },
            options: {
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }

    function renderGoalsPlanChart(data = []) {
        const ctx = document.getElementById('goals-plan-chart')?.getContext('2d');
        if (!ctx) return;
        if (goalsPlanChart) goalsPlanChart.destroy();

        const sorted = [...data].sort((a, b) => a.PlanoContasID - b.PlanoContasID);

        const labels = sorted.map(item => `Plano ${item.PlanoContasID}`);
        const metas = sorted.map(item => Number(item.Meta));
        const atingido = sorted.map(item => Number(item.Total));
        const percentuais = sorted.map((item, i) =>
            metas[i] > 0 ? Math.round((atingido[i] / metas[i]) * 100) : 0
        );

        goalsPlanChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Meta',
                        data: metas,
                        backgroundColor: 'rgba(75, 192, 192, 0.4)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Atingido',
                        data: atingido,
                        backgroundColor: 'rgba(255, 99, 132, 0.4)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 1,
                        datalabels: {
                            anchor: 'end',
                            align: 'start',
                            color: '#333',
                            font: { weight: 'bold' },
                            formatter: function(value, context) {
                                const i = context.dataIndex;
                                return metas[i] > 0 ? percentuais[i] + '%' : '';
                            }
                        }
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    tooltip: { mode: 'index', intersect: false },
                    legend: { position: 'top' },
                    datalabels: {
                        display: function(context) {
                            // Só mostra percentual na barra "Atingido"
                            return context.dataset.label === 'Atingido';
                        }
                    }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            },
            plugins: [ChartDataLabels]
        });
    }

    function showNotification(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `
            px-4 py-3 rounded shadow-lg text-white mb-2 animate-fade-in
            ${type === 'error' ? 'bg-red-600' : type === 'success' ? 'bg-green-600' : 'bg-blue-600'}
        `;
        toast.textContent = message;

        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('opacity-0');
            setTimeout(() => toast.remove(), 500);
        }, 3500);
    }

    async function fetchAndRenderExpenses() {
        const token = getToken();
        if (!token) return showLogin();
        const selectedAccount = document.getElementById('filter-account')?.value || '';
        const params = new URLSearchParams({
            year: filterYear.value,
            month: filterMonth.value,
            account: selectedAccount
        });
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
            const response = await fetch(`${API_BASE_URL}/dashboard?${params}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Erro ao buscar métricas do dashboard.');
            const data = await response.json();

            if (projectionEl) {
                projectionEl.textContent = `R$ ${data.projection?.nextMonthEstimate || '0.00'}`;
            }

            renderLineChart(data.lineChartData);
            renderPieChart(data.pieChartData);
            renderMixedTypeChart(data.mixedTypeChartData);
            renderPlanChart(data.planChartData);

        } catch (error) {
            console.error('Erro ao buscar métricas do dashboard:', error);
        }
    }

    function renderExpensesTable(expenses = []) {
        if (!expensesTableBody) return;
        expensesTableBody.innerHTML = '';
        let totalSpent = 0;
        if (expenses.length > 0) {
            expenses.forEach(expense => {
                totalSpent += parseFloat(expense.amount);
                const invoiceLink = expense.invoice_path ? `<a href="${FILE_BASE_URL}/${expense.invoice_path}" target="_blank" class="text-blue-600"><i class="fas fa-file-invoice"></i></a>` : 'N/A';
                const planCode = expense.account_plan_code !== null && expense.account_plan_code !== undefined ? expense.account_plan_code : '-';
                const row = document.createElement('tr');
                row.className = 'border-b hover:bg-gray-50';
                row.innerHTML = `
                    <td class="p-3">${new Date(expense.transaction_date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</td>
                    <td class="p-3">${expense.description}</td>
                    <td class="p-3 text-red-600">R$ ${parseFloat(expense.amount).toFixed(2)}</td>
                    <td class="p-3">${expense.account}</td>
                    <td class="p-3">${expense.is_business_expense ? 'Empresa' : 'Pessoal'}</td>
                    <td class="p-3">${planCode}</td>
                    <td class="p-3 text-center">${invoiceLink}</td>
                    <td class="p-3">
                        <button class="text-blue-600 mr-2 edit-btn" data-id="${expense.id}"><i class="fas fa-edit"></i></button>
                        <button class="text-red-600 delete-btn" data-id="${expense.id}"><i class="fas fa-trash"></i></button>
                    </td>
                `;
                expensesTableBody.appendChild(row);
            });
        } else {
            expensesTableBody.innerHTML = `<tr><td colspan="8" class="text-center p-4">Nenhuma despesa encontrada.</td></tr>`;
        }
        if (totalSpentEl) totalSpentEl.textContent = `R$ ${totalSpent.toFixed(2)}`;
        if (totalTransactionsEl) totalTransactionsEl.textContent = expenses.length;
    }

    function renderLineChart(data = []) {
        const ctx = document.getElementById('expenses-line-chart')?.getContext('2d');
        if (!ctx) return;
        if (expensesLineChart) expensesLineChart.destroy();

        const year = parseInt(filterYear.value, 10);
        const month = parseInt(filterMonth.value, 10);
        const daysInMonth = new Date(year, month, 0).getDate();

        const labels = Array.from({ length: daysInMonth }, (_, i) => i + 1);
        const chartData = new Array(daysInMonth).fill(0);

        data.forEach(d => {
            chartData[d.day - 1] = d.total;
        });

        expensesLineChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: `Gastos Diários em ${filterMonth.options[filterMonth.selectedIndex].text}`,
                    data: chartData,
                    borderColor: '#3B82F6',
                    tension: 0.1
                }]
            },
            options: {
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Dia do Mês'
                        }
                    }
                }
            }
        });
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
        const token = getToken();
        if (!token) return showLogin();
        try {
            const response = await fetch(`${API_BASE_URL}/reports/weekly`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Erro ao gerar relatório semanal.');
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'relatorio-semanal.pdf';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            showNotification('Relatório semanal gerado com sucesso!', 'success');
        } catch (error) {
            showNotification(error.message, 'error');
        }
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
        const account = document.getElementById('filter-account')?.value || '';
        const submitButton = e.submitter;

        if(reportGenerateText) reportGenerateText.classList.add('hidden');
        if(reportLoadingText) reportLoadingText.classList.remove('hidden');
        if(submitButton) submitButton.disabled = true;

        try {
            const response = await fetch(`${API_BASE_URL}/reports/monthly`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
                body: JSON.stringify({ year, month, account })
            });
            if (!response.ok) throw new Error('Falha ao gerar o relatório.');
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `relatorio-mensal-${year}-${month}${account ? '-' + account : ''}.pdf`;
            document.body.appendChild(a); a.click(); a.remove();
            window.URL.revokeObjectURL(url);
            closeReportModal();
        } catch (error) {
            showNotification(`Erro: ${error.message}`, 'error');
        } finally {
            if(reportGenerateText) reportGenerateText.classList.remove('hidden');
            if(reportLoadingText) reportLoadingText.classList.add('hidden');
            if(submitButton) submitButton.disabled = false;
        }
    }

    async function populateAccountFilter() {
        const token = getToken();
        const select = document.getElementById('filter-account');
        if (!select || !token) return;

        try {
            const response = await fetch(`${API_BASE_URL}/accounts`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Erro ao buscar contas.');
            const accounts = await response.json();

            select.innerHTML = '<option value="">Todas as Contas</option>';
            accounts.forEach(account => {
                if (account) {
                    const option = document.createElement('option');
                    option.value = account;
                    option.textContent = account;
                    select.appendChild(option);
                }
            });
        } catch (error) {
            showNotification('Erro ao carregar contas.', 'error');
        }
    }

    function checkMonthlyReportReminder() {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth() + 1;
        const lastDay = new Date(year, month, 0).getDate();
        const daysLeft = lastDay - today.getDate();

        if ([3,2,1].includes(daysLeft)) {
            const key = `toast_report_reminder_${year}_${month}_${daysLeft}`;
            if (!sessionStorage.getItem(key)) {
                showNotification(`Faltam ${daysLeft} dia(s) para o fim do mês. Lembre-se de gerar o relatório mensal!`, 'info');
                sessionStorage.setItem(key, 'shown');
            }
        }
    }

    addEventListeners();
    if (getToken()) showDashboard(); else showLogin();
});