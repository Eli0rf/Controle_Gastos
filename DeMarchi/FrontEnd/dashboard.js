/**
 * dashboard.js - Versão Final e Completa
 */
document.addEventListener('DOMContentLoaded', function() {

    // Define a URL base do backend no Railway
    const API_BASE_URL = 'https://controlegastos-production.up.railway.app';

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
    const filterSearchInput = document.getElementById('filter-search');
    const filterType = document.getElementById('filter-type');
    const filterMin = document.getElementById('filter-min');
    const filterMax = document.getElementById('filter-max');
    const filterPlan = document.getElementById('filter-plan');
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

    // ========== RELATÓRIO INTERATIVO ==========
    const interactiveReportBtn = document.getElementById('interactive-report-btn');
    const interactiveReportModal = document.getElementById('interactive-report-modal');
    const closeIrModalBtn = document.getElementById('close-ir-modal');
    const irForm = document.getElementById('interactive-report-form');
    const irAccount = document.getElementById('ir-account');
    const irCharts = document.getElementById('ir-charts');
    const irDetails = document.getElementById('ir-details');

    // ========== GASTOS RECORRENTES ==========
    const recurringBtn = document.getElementById('recurring-expenses-btn');
    const recurringModal = document.getElementById('recurring-modal');
    const closeRecurringModalBtn = document.getElementById('close-recurring-modal');
    const recurringForm = document.getElementById('recurring-form');
    const recurringList = document.getElementById('recurring-list');
    const processRecurringBtn = document.getElementById('process-recurring-btn');

    // ========== ANÁLISE EMPRESARIAL ==========
    const businessAnalysisTab = document.getElementById('business-analysis-tab');
    const businessPeriodSelect = document.getElementById('business-period');
    const customDateFields = document.getElementById('custom-date-fields');
    const businessDateFrom = document.getElementById('business-date-from');
    const businessDateTo = document.getElementById('business-date-to');
    const businessAccountSelect = document.getElementById('business-account');
    const businessInvoiceFilter = document.getElementById('business-invoice-filter');
    const businessSearchInput = document.getElementById('business-search');
    const billingYearSelect = document.getElementById('billing-year');
    const billingMonthSelect = document.getElementById('billing-month');
    const billingAccountSelect = document.getElementById('billing-account');
    const filterBillingBtn = document.getElementById('filter-billing-btn');
    const billingSummary = document.getElementById('billing-summary');
    const businessExpensesTable = document.getElementById('business-expenses-table');
    const exportBusinessCsvBtn = document.getElementById('export-business-csv');
    const exportBusinessPdfBtn = document.getElementById('export-business-pdf');
    const businessAlertsContainer = document.getElementById('business-alerts');

    // ========== PIX & BOLETO ELEMENTS ==========
    const pixBoletoType = document.getElementById('pix-boleto-type');
    const pixBoletoYear = document.getElementById('pix-boleto-year');
    const pixBoletoMonth = document.getElementById('pix-boleto-month');
    const pixBoletoSearch = document.getElementById('pix-boleto-search');
    const pixTotal = document.getElementById('pix-total');
    const boletoTotal = document.getElementById('boleto-total');
    const pixBoletoTransactions = document.getElementById('pix-boleto-transactions');
    const pixBoletoGrandTotal = document.getElementById('pix-boleto-grand-total');
    const pixDetailsTable = document.getElementById('pix-details-table');
    const boletoDetailsTable = document.getElementById('boleto-details-table');
    const pixCategorySummary = document.getElementById('pix-category-summary');
    const boletoCategorySummary = document.getElementById('boleto-category-summary');

    // ========== VARIÁVEIS GLOBAIS ==========
    let expensesLineChart, expensesPieChart, planChart, mixedTypeChart, goalsChart, goalsPlanChart;
    let businessCharts = {}; // Objeto para armazenar gráficos empresariais
    let allExpensesCache = [];
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Flags para controlar renderização concorrente
    let renderingQuarterly = false;
    let renderingProjection = false;
    
    // Timeouts para debounce
    let quarterlyTimeout = null;
    let projectionTimeout = null;
    
    // Flag para evitar event listeners duplicados
    let eventListenersInitialized = false;
    
    // Flag para prevenir submissões duplicadas de gastos
    let isSubmittingExpense = false;
    
    // Flag para prevenir submissões duplicadas de gastos recorrentes
    let isSubmittingRecurringExpense = false;
    
    // Flag para evitar múltiplas inicializações do dashboard
    let dashboardInitialized = false;
    
    // Debounce para fetchAllData
    let fetchAllDataTimeout = null;
    let isFetchingAllData = false;
    
    // Flag para prevenir processamento duplicado de gastos recorrentes
    let isProcessingRecurringExpenses = false;

    // ========== FUNÇÕES UTILITÁRIAS ==========
    
    /**
     * Função utilitária para limpar canvas e destruir gráficos existentes
     * @param {HTMLCanvasElement} ctx - Contexto do canvas
     * @param {string} chartKey - Chave do gráfico no objeto businessCharts (opcional)
     */
    function ensureCanvasClean(ctx, chartKey = null) {
        if (!ctx) return;

        const canvasId = ctx.id || 'unknown';
        
        // Primeiro: destruir por referência no businessCharts se fornecida
        if (chartKey && businessCharts[chartKey]) {
            try {
                console.log(`Destruindo gráfico ${chartKey} do businessCharts`);
                businessCharts[chartKey].destroy();
                businessCharts[chartKey] = null;
            } catch (e) {
                console.warn(`Erro ao destruir gráfico ${chartKey}:`, e);
            }
        }

        // Segundo: destruir qualquer gráfico restante no canvas
        let attempts = 0;
        const maxAttempts = 5;
        
        while (attempts < maxAttempts) {
            const existingChart = Chart.getChart(ctx);
            if (!existingChart) {
                break; // Não há mais gráficos no canvas
            }
            
            try {
                console.log(`Tentativa ${attempts + 1}: Destruindo gráfico ID ${existingChart.id} do canvas ${canvasId}`);
                existingChart.destroy();
                attempts++;
            } catch (e) {
                console.warn(`Erro ao destruir gráfico existente do canvas ${canvasId} (tentativa ${attempts + 1}):`, e);
                attempts++;
            }
            
            // Verificar se ainda há gráfico após destruição
            if (Chart.getChart(ctx)) {
                // Se ainda há gráfico, forçar limpeza do contexto
                try {
                    const context = ctx.getContext('2d');
                    context.clearRect(0, 0, ctx.width, ctx.height);
                    
                    // Forçar reset do canvas removendo e recriando
                    if (attempts >= 3) {
                        const parent = ctx.parentNode;
                        const newCanvas = document.createElement('canvas');
                        newCanvas.id = ctx.id;
                        newCanvas.className = ctx.className;
                        newCanvas.style.cssText = ctx.style.cssText;
                        parent.replaceChild(newCanvas, ctx);
                        console.log(`Canvas ${canvasId} foi recriado para forçar limpeza`);
                        break;
                    }
                } catch (e) {
                    console.warn(`Erro ao limpar contexto do canvas ${canvasId}:`, e);
                }
            }
        }
        
        // Verificação final após recriação se necessário
        const currentCanvas = document.getElementById(canvasId);
        const finalCheck = currentCanvas ? Chart.getChart(currentCanvas) : null;
        if (finalCheck) {
            console.error(`ERRO CRÍTICO: Canvas ${canvasId} ainda contém gráfico ID ${finalCheck.id} após limpeza forçada`);
            try {
                finalCheck.destroy();
            } catch (e) {
                console.error(`Erro na limpeza crítica final do canvas ${canvasId}:`, e);
            }
        }
    }

    function getToken() {
        return localStorage.getItem('token');
    }

    // ========== FUNÇÕES AUXILIARES ==========
    function formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    }

    // Nova função para formatação com separadores de milhares
    function formatCurrencyDetailed(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR');
    }

    function showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `p-4 rounded-lg shadow-lg text-white max-w-sm transform transition-all duration-300 translate-x-full opacity-0`;
        
        switch (type) {
            case 'success':
                toast.classList.add('bg-green-500');
                break;
            case 'error':
                toast.classList.add('bg-red-500');
                break;
            case 'warning':
                toast.classList.add('bg-yellow-500');
                break;
            default:
                toast.classList.add('bg-blue-500');
        }

        toast.innerHTML = `
            <div class="flex items-center gap-2">
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-2 text-white hover:text-gray-200">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        toastContainer.appendChild(toast);

        // Animar entrada
        setTimeout(() => {
            toast.classList.remove('translate-x-full', 'opacity-0');
        }, 100);

        // Auto-remover após 5 segundos
        setTimeout(() => {
            toast.classList.add('translate-x-full', 'opacity-0');
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }

    function addEventListeners() {
        // Prevenir adição de event listeners duplicados
        if (eventListenersInitialized) {
            console.log('Event listeners já inicializados. Evitando duplicação.');
            return;
        }
        
        console.log('Inicializando event listeners...');
        
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
        if (filterPlan) filterPlan.addEventListener('input', applyAllFilters);
        if (interactiveReportBtn) interactiveReportBtn.addEventListener('click', () => {
            if (interactiveReportModal) {
                interactiveReportModal.classList.remove('hidden');
                setTimeout(() => interactiveReportModal.classList.remove('opacity-0'), 10);
                populateIrAccounts();
            }
        });
        if (closeIrModalBtn) closeIrModalBtn.addEventListener('click', () => {
            if (interactiveReportModal) {
                interactiveReportModal.classList.add('opacity-0');
                setTimeout(() => interactiveReportModal.classList.add('hidden'), 300);
            }
        });
        
        // Event listeners para gastos recorrentes
        if (recurringBtn) recurringBtn.addEventListener('click', openRecurringModal);
        if (closeRecurringModalBtn) closeRecurringModalBtn.addEventListener('click', closeRecurringModal);
        if (recurringForm) recurringForm.addEventListener('submit', handleRecurringExpenseSubmit);
        if (processRecurringBtn) processRecurringBtn.addEventListener('click', processRecurringExpenses);

        // Event listeners para PIX/Boleto
        if (pixBoletoType) pixBoletoType.addEventListener('change', loadPixBoletoData);
        if (pixBoletoYear) pixBoletoYear.addEventListener('change', loadPixBoletoData);
        if (pixBoletoMonth) pixBoletoMonth.addEventListener('change', loadPixBoletoData);
        if (pixBoletoSearch) pixBoletoSearch.addEventListener('input', loadPixBoletoData);
        
        // Marcar como inicializado
        eventListenersInitialized = true;
        console.log('Event listeners inicializados com sucesso.');
    }

    async function handleLogin(e) {
        e.preventDefault();
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        if (!usernameInput || !passwordInput) {
            showNotification("Erro de configuração do HTML.", 'error');
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/api/login`, {
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
            showNotification(`Erro no login: ${error.message}`, 'error');
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
        // Prevenir múltiplas inicializações
        if (dashboardInitialized) {
            console.log('Dashboard já inicializado. Evitando duplicação.');
            return;
        }
        
        console.log('Inicializando dashboard...');
        dashboardInitialized = true;
        
        populateAccountFilter();
        populateFilterOptions();
        fetchAllData();
        toggleExpenseFields();
        initializeTabs();
        initializePixBoletoFilters();
        initBusinessAnalysis();
        
        console.log('Dashboard inicializado com sucesso.');
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
        // Debounce: cancelar chamada anterior se ainda estiver pendente
        if (fetchAllDataTimeout) {
            clearTimeout(fetchAllDataTimeout);
        }
        
        // Se já está buscando dados, ignorar nova chamada
        if (isFetchingAllData) {
            console.log('fetchAllData já em execução. Ignorando chamada duplicada.');
            return;
        }
        
        // Debounce de 300ms para evitar chamadas excessivas
        return new Promise((resolve) => {
            fetchAllDataTimeout = setTimeout(async () => {
                isFetchingAllData = true;
                console.log('Iniciando fetchAllData...');
                
                try {
                    await fetchAndRenderExpenses();
                    await fetchAndRenderDashboardMetrics();
                    await fetchAndRenderGoalsChart();
                    console.log('fetchAllData completado com sucesso');
                } catch (error) {
                    console.error('Erro em fetchAllData:', error);
                } finally {
                    isFetchingAllData = false;
                    fetchAllDataTimeout = null;
                }
                
                resolve();
            }, 300);
        });
    }

    // --- Busca tetos e renderiza gráfico de limites/alertas ---
    async function fetchAndRenderGoalsChart() {
        const token = getToken();
        if (!token) return;

        const params = new URLSearchParams({
            year: filterYear.value,
            month: filterMonth.value
        });

        try {
            const response = await fetch(`${API_BASE_URL}/api/expenses-goals?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Erro ao buscar limites.');
            const data = await response.json();

            // Notificações de limites (alertas)
            data.forEach(item => {
                if (item.Alerta && !sessionStorage.getItem(`alerta_${item.PlanoContasID}_${item.Alerta.percentual}_${filterYear.value}_${filterMonth.value}`)) {
                    showNotification(item.Alerta.mensagem);
                    sessionStorage.setItem(`alerta_${item.PlanoContasID}_${item.Alerta.percentual}_${filterYear.value}_${filterMonth.value}`, 'true');
                }
            });

            renderGoalsChart(data);
            renderGoalsPlanChart(data);
        } catch (error) {
            console.error('Erro ao buscar limites:', error);
        }
    }

    function renderGoalsChart(data = []) {
        const ctx = document.getElementById('goals-chart')?.getContext('2d');
        if (!ctx) return;
        if (goalsChart) goalsChart.destroy();

        const labels = data.map(item => `Plano ${item.PlanoContasID}`);
        const values = data.map(item => Number(item.Total));
        const tetos = data.map(item => Number(item.Teto));

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
                        label: 'Teto de Gastos',
                        data: tetos,
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
        const canvas = document.getElementById('goals-plan-chart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        goalsPlanChart = destroyChartInstance(goalsPlanChart, 'goals-plan-chart');

        const sorted = [...data].sort((a, b) => a.PlanoContasID - b.PlanoContasID);

        const labels = sorted.map(item => `Plano ${item.PlanoContasID}`);
        const tetos = sorted.map(item => Number(item.Teto));
        const atingido = sorted.map(item => Number(item.Total));
        const percentuais = sorted.map((item, i) =>
            tetos[i] > 0 ? Math.round((atingido[i] / tetos[i]) * 100) : 0
        );

        goalsPlanChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Teto de Gastos',
                        data: tetos,
                        backgroundColor: 'rgba(75, 192, 192, 0.4)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Gasto Atual',
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
                                return tetos[i] > 0 ? percentuais[i] + '%' : '';
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
                            // Só mostra percentual na barra "Gasto Atual"
                            return context.dataset.label === 'Gasto Atual';
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

    // ====== DARK MODE (MODO ESCURO) ======
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');

    function setTheme(mode) {
        if (mode === 'dark') {
            document.body.classList.add('dark-mode');
            if (themeIcon) themeIcon.className = 'bi bi-brightness-high-fill';
        } else {
            document.body.classList.remove('dark-mode');
            if (themeIcon) themeIcon.className = 'bi bi-moon-stars-fill';
        }
        localStorage.setItem('theme', mode);
    }

    function toggleTheme() {
        const isDark = document.body.classList.contains('dark-mode');
        setTheme(isDark ? 'light' : 'dark');
    }

    if (themeToggleBtn) themeToggleBtn.addEventListener('click', toggleTheme);

    // Aplica o tema salvo ao carregar
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') setTheme('dark');
    else setTheme('light');

    // ====== TIPPY TOOLTIP ======
    if (window.tippy) {
        tippy('#theme-toggle', { content: 'Alternar modo claro/escuro', placement: 'bottom' });
        tippy('#monthly-report-btn', { content: 'Gerar relatório mensal em PDF', placement: 'bottom' });
        tippy('#weekly-report-btn', { content: 'Baixar relatório semanal em PDF', placement: 'bottom' });
        tippy('#logout-button', { content: 'Sair do sistema', placement: 'bottom' });
    }

    // ====== SWEETALERT2 PARA NOTIFICAÇÕES ======
    function showNotification(message, type = 'info') {
        if (window.Swal) {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: type === 'error' ? 'error' : type === 'success' ? 'success' : 'info',
                title: message,
                showConfirmButton: false,
                timer: 3500,
                timerProgressBar: true
            });
        } else {
            // fallback para toast antigo
            const toastContainer = document.getElementById('toast-container');
            if (!toastContainer) return;
            const toast = document.createElement('div');
            toast.className = `px-4 py-3 rounded shadow-lg text-white mb-2 animate-fade-in ${type === 'error' ? 'bg-red-600' : type === 'success' ? 'bg-green-600' : 'bg-blue-600'}`;
            toast.textContent = message;
            toastContainer.appendChild(toast);
            setTimeout(() => {
                toast.classList.add('opacity-0');
                setTimeout(() => toast.remove(), 500);
            }, 3500);
        }
    }

    async function fetchAndRenderExpenses() {
        const token = getToken();
        if (!token) return;

        const params = new URLSearchParams({
            year: filterYear.value,
            month: filterMonth.value,
            account: document.getElementById('filter-account')?.value || ''
        });

        try {
            const response = await fetch(`${API_BASE_URL}/api/expenses?${params.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Erro ao buscar despesas.');
            }

            const expenses = await response.json();
            allExpensesCache = expenses; // Salva para filtros
            applyAllFilters(); // Aplica filtros após buscar
        } catch (error) {
            console.error(error);
        }
    }

    // FILTRO DE BUSCA NO HISTÓRICO (todas as colunas + tipo + valor min/max + plano de conta)
    function applyAllFilters() {
        let filtered = allExpensesCache;
        const search = filterSearchInput?.value.trim().toLowerCase() || '';
        const type = filterType?.value || '';
        const min = filterMin?.value ? parseFloat(filterMin.value) : null;
        const max = filterMax?.value ? parseFloat(filterMax.value) : null;
        const plan = filterPlan?.value.trim().toLowerCase() || '';
        const filterAccountValue = document.getElementById('filter-account')?.value || '';

        filtered = filtered.filter(e => {
            // Busca texto em todas as colunas
            const data = e.transaction_date ? new Date(e.transaction_date).toLocaleDateString('pt-BR', {timeZone: 'UTC'}).toLowerCase() : '';
            const descricao = e.description ? e.description.toLowerCase() : '';
            const valor = e.amount ? String(e.amount).toLowerCase() : '';
            const conta = e.account ? e.account.toLowerCase() : '';
            const tipo = e.is_business_expense ? 'empresa' : 'pessoal';
            const plano = e.account_plan_code ? String(e.account_plan_code).toLowerCase() : '';
            const nota = e.invoice_path ? 'sim' : 'não';
            let match = true;
            if (search) {
                match = (
                    data.includes(search) ||
                    descricao.includes(search) ||
                    valor.includes(search) ||
                    conta.includes(search) ||
                    tipo.includes(search) ||
                    plano.includes(search) ||
                    nota.includes(search)
                );
            }
            if (type && tipo !== type) match = false;
            if (min !== null && parseFloat(e.amount) < min) match = false;
            if (max !== null && parseFloat(e.amount) > max) match = false;
            if (plan && !plano.includes(plan)) match = false;
            // Corrige filtro para ser igual ao banco
            if (filterAccountValue && e.account !== filterAccountValue) match = false;
            return match;
        });
        renderExpensesTable(filtered);
    }
    if (filterSearchInput) filterSearchInput.addEventListener('input', applyAllFilters);
    if (filterType) filterType.addEventListener('change', applyAllFilters);
    if (filterMin) filterMin.addEventListener('input', applyAllFilters);
    if (filterMax) filterMax.addEventListener('input', applyAllFilters);
    if (filterPlan) filterPlan.addEventListener('input', applyAllFilters);

    async function fetchAndRenderDashboardMetrics() {
        const token = getToken();
        if (!token) return;

        const params = new URLSearchParams({ year: filterYear.value, month: filterMonth.value });
        try {
            const response = await fetch(`${API_BASE_URL}/api/dashboard?${params}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Erro ao buscar métricas do dashboard.');
            const data = await response.json();

            if (projectionEl) {
                projectionEl.textContent = formatCurrencyDetailed(data.projection?.nextMonthEstimate || 0);
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
                const invoiceLink = expense.invoice_path ? `<a href="${API_BASE_URL}/${expense.invoice_path}" target="_blank" class="text-blue-600"><i class="fas fa-file-invoice"></i></a>` : 'N/A';
                // Corrigido: mostra plano de conta corretamente, inclusive string vazia ou null
                let planCode = '-';
                if (expense.account_plan_code !== null && expense.account_plan_code !== undefined && expense.account_plan_code !== '') {
                    planCode = expense.account_plan_code;
                }
                const row = document.createElement('tr');
                row.className = 'border-b hover:bg-gray-50';
                row.innerHTML = `
                    <td class="p-3">${new Date(expense.transaction_date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</td>
                    <td class="p-3">${expense.description}</td>
                    <td class="p-3 text-red-600">${formatCurrency(parseFloat(expense.amount))}</td>
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
        if (totalSpentEl) totalSpentEl.textContent = formatCurrency(totalSpent);
        if (totalTransactionsEl) totalTransactionsEl.textContent = expenses.length;
    }

    // Função utilitária para obter cor do tema
    function getThemeColor(light, dark) {
        return document.body.classList.contains('dark-mode') ? dark : light;
    }

    // Função para exibir mensagem amigável quando não há dados
    function showNoDataMessage(canvasId, message) {
        const canvas = document.getElementById(canvasId);
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.font = '16px Arial';
            ctx.fillStyle = getThemeColor('#222', '#fff');
            ctx.textAlign = 'center';
            ctx.fillText(message, canvas.width / 2, canvas.height / 2);
        }
    }

    function getNumberValue(v) {
        if (typeof v === 'number') return v;
        if (v && typeof v === 'object') {
            if ('y' in v && typeof v.y === 'number') return v.y;
            if ('x' in v && typeof v.x === 'number') return v.x;
        }
        return 0;
    }

    function renderLineChart(data = []) {
        const canvas = document.getElementById('expenses-line-chart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        expensesLineChart = destroyChartInstance(expensesLineChart, 'expenses-line-chart');
        const year = parseInt(filterYear.value, 10);
        const month = parseInt(filterMonth.value, 10);
        const daysInMonth = new Date(year, month, 0).getDate();
        const labels = Array.from({ length: daysInMonth }, (_, i) => i + 1);
        const chartData = new Array(daysInMonth).fill(0);
        data.forEach(d => { chartData[d.day - 1] = d.total; });
        if (chartData.every(v => v === 0)) {
            showNoDataMessage('expenses-line-chart', 'Sem dados para este período.');
            return;
        }
        const max = Math.max(...chartData);
        const min = Math.min(...chartData.filter(v => v > 0));
        expensesLineChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: `Gastos Diários em ${filterMonth.options[filterMonth.selectedIndex].text}`,
                    data: chartData,
                    borderColor: getThemeColor('#3B82F6', '#60A5FA'),
                    backgroundColor: getThemeColor('rgba(59,130,246,0.1)', 'rgba(59,130,246,0.3)'),
                    tension: 0.2,
                    pointBackgroundColor: chartData.map(v => v === max ? '#22c55e' : v === min ? '#ef4444' : getThemeColor('#3B82F6', '#60A5FA')),
                    pointRadius: chartData.map(v => v === max || v === min ? 6 : 4)
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Evolução dos Gastos Diários',
                        color: getThemeColor('#222', '#fff'),
                        font: { size: 18 }
                    },
                    subtitle: {
                        display: true,
                        text: `Maior gasto: ${formatCurrencyDetailed(max)} | Menor gasto: ${min ? formatCurrencyDetailed(min) : formatCurrencyDetailed(0)}`,
                        color: getThemeColor('#666', '#ccc'),
                        font: { size: 13 }
                    },
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: ctx => `Dia ${ctx.label}: ${formatCurrencyDetailed(ctx.parsed.y)}`
                        }
                    },
                    datalabels: {
                        color: getThemeColor('#222', '#fff'),
                        anchor: 'end', align: 'top', font: { weight: 'bold' },
                        formatter: v => {
                            const val = getNumberValue(v);
                            return val > 0 ? formatCurrencyDetailed(val) : '';
                        }
                    }
                },
                scales: {
                    x: { title: { display: true, text: 'Dia do Mês' } },
                    y: { beginAtZero: true }
                }
            },
            plugins: [ChartDataLabels]
        });
    }

    function renderPieChart(data = []) {
        const canvas = document.getElementById('expenses-pie-chart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        expensesPieChart = destroyChartInstance(expensesPieChart, 'expenses-pie-chart');
        if (!data.length) {
            showNoDataMessage('expenses-pie-chart', 'Sem dados para este período.');
            return;
        }
        const total = Array.isArray(data) && data.length > 0 ? data.reduce((sum, d) => sum + (typeof d.total === 'number' ? d.total : parseFloat(d.total) || 0), 0) : 0;
        expensesPieChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: data.map(d => d.account),
                datasets: [{
                    data: data.map(d => d.total),
                    backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#6366F1']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Distribuição por Conta',
                        color: getThemeColor('#222', '#fff'),
                        font: { size: 18 }
                    },
                    subtitle: {
                        display: true,
                        text: `Total: ${formatCurrencyDetailed(total)}`,
                        color: getThemeColor('#666', '#ccc'),
                        font: { size: 13 }
                    },
                    legend: {
                        position: 'bottom',
                        labels: { color: getThemeColor('#222', '#fff') }
                    },
                    tooltip: {
                        callbacks: {
                            label: ctx => `${ctx.label}: ${formatCurrencyDetailed(ctx.parsed)} (${((ctx.parsed/total)*100).toFixed(1)}%)`
                        }
                    },
                    datalabels: {
                        color: '#fff',
                        font: { weight: 'bold' },
                        formatter: v => {
                            const val = getNumberValue(v);
                            return val > 0 ? formatCurrencyDetailed(val) : '';
                        }
                    }
                }
            },
            plugins: [ChartDataLabels]
        });
    }

    function renderMixedTypeChart(data = []) {
        const canvas = document.getElementById('mixed-type-chart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        mixedTypeChart = destroyChartInstance(mixedTypeChart, 'mixed-type-chart');
        if (!data.length) {
            showNoDataMessage('mixed-type-chart', 'Sem dados para este período.');
            return;
        }
        const max = Math.max(...data.map(d => d.personal_total + d.business_total));
        mixedTypeChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(d => d.account),
                datasets: [
                    { label: 'Gastos Pessoais', data: data.map(d => d.personal_total), backgroundColor: 'rgba(59, 130, 246, 0.7)' },
                    { label: 'Gastos Empresariais', data: data.map(d => d.business_total), backgroundColor: 'rgba(239, 68, 68, 0.7)' }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Comparação: Pessoal vs. Empresarial por Conta',
                        color: getThemeColor('#222', '#fff'),
                        font: { size: 18 }
                    },
                    subtitle: {
                        display: true,
                        text: `Conta com maior gasto: ${data.find(d => d.personal_total + d.business_total === max)?.account || '-'}`,
                        color: getThemeColor('#666', '#ccc'),
                        font: { size: 13 }
                    },
                    legend: {
                        position: 'bottom',
                        labels: { color: getThemeColor('#222', '#fff') }
                    },
                    tooltip: {
                        callbacks: {
                            label: ctx => `${ctx.dataset.label}: ${formatCurrencyDetailed(ctx.parsed.y)}`
                        }
                    },
                    datalabels: {
                        color: getThemeColor('#222', '#fff'),
                        anchor: 'end', align: 'top', font: { weight: 'bold' },
                        formatter: v => {
                            const val = getNumberValue(v);
                            return val > 0 ? formatCurrencyDetailed(val) : '';
                        }
                    }
                },
                scales: { x: { stacked: false }, y: { beginAtZero: true } }
            },
            plugins: [ChartDataLabels]
        });
    }

    function renderPlanChart(data = []) {
        const canvas = document.getElementById('plan-chart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        planChart = destroyChartInstance(planChart, 'plan-chart');
        if (!data.length) {
            showNoDataMessage('plan-chart', 'Sem dados para este período.');
            return;
        }
        const max = Math.max(...data.map(d => d.total));
        planChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(d => `Plano ${d.account_plan_code}`),
                datasets: [{
                    label: 'Total Gasto',
                    data: data.map(d => d.total),
                    backgroundColor: data.map(d => d.total === max ? '#22c55e' : 'rgba(239, 68, 68, 0.7)')
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Gastos por Plano de Conta',
                        color: getThemeColor('#222', '#fff'),
                        font: { size: 18 }
                    },
                    subtitle: {
                        display: true,
                        text: `Plano com maior gasto: ${data.find(d => d.total === max)?.account_plan_code || '-'}`,
                        color: getThemeColor('#666', '#ccc'),
                        font: { size: 13 }
                    },
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: ctx => formatCurrencyDetailed(ctx.parsed.x)
                        }
                    },
                    datalabels: {
                        color: getThemeColor('#222', '#fff'),
                        anchor: 'end', align: 'right', font: { weight: 'bold' },
                        formatter: v => {
                            const val = getNumberValue(v);
                            return val > 0 ? formatCurrencyDetailed(val) : '';
                        }
                    }
                }
            },
            plugins: [ChartDataLabels]
        });
    }

    async function handleAddExpense(e) {
        e.preventDefault();
        
        // Prevenir submissões duplicadas
        if (isSubmittingExpense) {
            console.log('Submissão já em andamento. Ignorando duplicata.');
            showToast('Aguarde, processando gasto anterior...', 'warning');
            return;
        }
        
        isSubmittingExpense = true;
        console.log('Iniciando submissão de gasto...');
        
        // Desabilitar botão de submit temporariamente
        const submitButton = addExpenseForm.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Adicionando...';
        }
        
        const formData = new FormData(addExpenseForm);
        formData.set('is_business_expense', businessCheckbox.checked);
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/expenses`, { 
                method: 'POST', 
                headers: { 'Authorization': `Bearer ${getToken()}` }, 
                body: formData 
            });
            
            if (!response.ok) { 
                const err = await response.json(); 
                throw new Error(err.message); 
            }
            
            addExpenseForm.reset();
            toggleExpenseFields();
            
            // Recarregar todos os dados
            await fetchAllData();
            
            // Verificar se precisa atualizar PIX/Boleto
            const account = formData.get('account');
            if (account === 'PIX' || account === 'Boleto') {
                // Se está na aba PIX/Boleto, recarregar os dados
                const activeTab = document.querySelector('.tab-button.active');
                if (activeTab && activeTab.dataset.tab === 'pix-boleto') {
                    await loadPixBoletoData();
                }
            }
            
            // Verificar se precisa atualizar análise empresarial
            if (formData.get('is_business_expense') === 'true') {
                const activeTab = document.querySelector('.tab-button.active');
                if (activeTab && activeTab.dataset.tab === 'business-analysis') {
                    await loadBusinessAnalysis();
                }
            }
            
            showToast('Gasto adicionado com sucesso!', 'success');
            console.log('Gasto adicionado com sucesso');
            
        } catch (error) { 
            console.error('Erro ao adicionar gasto:', error);
            showToast(`Erro: ${error.message}`, 'error'); 
        } finally {
            // Reabilitar botão e resetar flag
            isSubmittingExpense = false;
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.innerHTML = '<i class="fas fa-plus mr-2"></i>Adicionar Gasto';
            }
            console.log('Submissão de gasto finalizada');
        }
    }

    function handleTableClick(e) {
        if (e.target.closest('.edit-btn')) showNotification('Funcionalidade de edição não implementada.', 'info');
        if (e.target.closest('.delete-btn')) { if (confirm('Tem certeza que deseja excluir este gasto?')) deleteExpense(e.target.closest('.delete-btn').dataset.id); }
    }

    async function deleteExpense(id) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/expenses/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } });
            if (!response.ok) throw new Error('Falha ao apagar despesa.');
            
            // Recarregar todos os dados
            await fetchAllData();
            
            // Recarregar dados específicos da aba ativa
            const activeTab = document.querySelector('.tab-button.active');
            if (activeTab) {
                if (activeTab.dataset.tab === 'pix-boleto') {
                    await loadPixBoletoData();
                } else if (activeTab.dataset.tab === 'business-analysis') {
                    await loadBusinessAnalysis();
                }
            }
            
            showToast('Gasto removido com sucesso!', 'success');
        } catch (error) { 
            console.error('Erro ao deletar gasto:', error);
            showToast(`Erro: ${error.message}`, 'error'); 
        }
    }

    async function handleWeeklyReportDownload() {
        const token = getToken();
        if (!token) return showLogin();
        try {
            const response = await fetch(`${API_BASE_URL}/api/reports/weekly`, {
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
        const filterYear = document.getElementById('filter-year');
        const filterMonth = document.getElementById('filter-month');
        const reportYear = document.getElementById('report-year');
        const reportMonth = document.getElementById('report-month');
        const filterAccount = document.getElementById('filter-account');
        const reportAccount = document.getElementById('report-account');

        // Copia as opções dos filtros principais para o modal
        if (reportYear && filterYear) {
            reportYear.innerHTML = filterYear.innerHTML;
            reportYear.value = filterYear.value;
        }
        if (reportMonth && filterMonth) {
            reportMonth.innerHTML = filterMonth.innerHTML;
            reportMonth.value = filterMonth.value;
        }

        // Preenche as contas disponíveis no filtro do modal
        if (reportAccount && filterAccount) {
            reportAccount.innerHTML = '';
            for (let i = 0; i < filterAccount.options.length; i++) {
                const opt = filterAccount.options[i];
                const option = document.createElement('option');
                option.value = opt.value;
                option.textContent = opt.textContent;
                reportAccount.appendChild(option);
            }
            // Seleciona a mesma conta do filtro principal, se houver
            reportAccount.value = filterAccount.value;
        }

        // Exibe o modal normalmente
        const modal = document.getElementById('report-modal');
        if (modal) {
            modal.classList.remove('hidden', 'opacity-0');
            modal.classList.add('flex');
            setTimeout(() => modal.classList.remove('opacity-0'), 10);
        }
    }

    function closeReportModal() {
        if(reportModal) {
            reportModal.classList.add('opacity-0');
            setTimeout(() => reportModal.classList.add('hidden'), 300);
        }
    }

    async function handleMonthlyReportDownload(e) {
        e.preventDefault();
        const year = document.getElementById('report-year')?.value;
        const month = document.getElementById('report-month')?.value;
        // Use o filtro do modal, não o da tela principal
        const account = document.getElementById('report-account')?.value || '';

        if (!year || !month) {
            showNotification('Selecione ano e mês para o relatório.', 'error');
            return;
        }

        const submitButton = e.submitter;

        if(reportGenerateText) reportGenerateText.classList.add('hidden');
        if(reportLoadingText) reportLoadingText.classList.remove('hidden');
        if(submitButton) submitButton.disabled = true;

        try {
            const response = await fetch(`${API_BASE_URL}/api/reports/monthly`, {
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
            const response = await fetch(`${API_BASE_URL}/api/accounts`, {
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

    // Garantir que o plugin ChartDataLabels está registrado globalmente
    if (window.Chart && window.ChartDataLabels) {
        Chart.register(window.ChartDataLabels);
    }

    addEventListeners();
    if (getToken()) showDashboard(); else showLogin();

    // ========== RELATÓRIO INTERATIVO ==========
    async function populateIrAccounts() {
        const token = getToken();
        if (!irAccount || !token) return;
        try {
            const response = await fetch(`${API_BASE_URL}/api/accounts`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Erro ao buscar contas.');
            const accounts = await response.json();
            irAccount.innerHTML = '<option value="">Todas</option>';
            accounts.forEach(account => {
                if (account) {
                    const option = document.createElement('option');
                    option.value = account;
                    option.textContent = account;
                    irAccount.appendChild(option);
                }
            });
        } catch (error) {
            showNotification('Erro ao carregar contas.', 'error');
        }
    }

    if (irForm) irForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        irCharts.innerHTML = '';
        irDetails.innerHTML = '';
        const period1 = document.getElementById('ir-period-1').value;
        const period2 = document.getElementById('ir-period-2').value;
        const account = irAccount.value;
        const type = document.getElementById('ir-type').value;
        const category = document.getElementById('ir-category').value.trim();
        if (!period1) return showNotification('Selecione ao menos o Período 1.', 'error');
        const [year1, month1] = period1.split('-');
        let year2, month2;
        if (period2) [year2, month2] = period2.split('-');
        // Busca dados dos dois períodos
        const data1 = await fetchIrData(year1, month1, account, type, category);
        let data2 = null;
        if (year2 && month2) data2 = await fetchIrData(year2, month2, account, type, category);
        renderIrCharts(data1, data2, period1, period2);
    });

    async function fetchIrData(year, month, account, type, category) {
        const token = getToken();
        year = parseInt(year, 10);
        month = parseInt(month, 10);
        const params = new URLSearchParams({ year, month });
        if (account) params.append('account', account);
        try {
            const response = await fetch(`${API_BASE_URL}/api/expenses?${params.toString()}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Erro ao buscar despesas:', errorText);
                throw new Error('Erro ao buscar despesas.');
            }
            let expenses = await response.json();
            if (!Array.isArray(expenses)) {
                console.error('Resposta inesperada da API:', expenses);
                expenses = [];
            }
            // Filtro por tipo
            if (type) expenses = expenses.filter(e => (type === 'empresa' ? e.is_business_expense : !e.is_business_expense));
            // Filtro por categoria
            if (category) expenses = expenses.filter(e => String(e.account_plan_code || '').toLowerCase().includes(category.toLowerCase()));
            if (expenses.length === 0) {
                console.warn('Nenhum dado encontrado para os filtros:', {year, month, account, type, category});
            }
            return expenses;
        } catch (error) {
            showNotification('Erro ao buscar dados do relatório: ' + error.message, 'error');
            return [];
        }
    }

    function renderIrCharts(data1, data2, period1, period2) {
        irCharts.innerHTML = '';
        irDetails.innerHTML = '';
        // Gráfico 1
        const canvas1 = document.createElement('canvas');
        canvas1.height = 300;
        irCharts.appendChild(canvas1);
        renderIrBarChart(canvas1, data1, period1, 1);
        // Gráfico 2 (comparação)
        if (data2) {
            const canvas2 = document.createElement('canvas');
            canvas2.height = 300;
            irCharts.appendChild(canvas2);
            renderIrBarChart(canvas2, data2, period2, 2);
        }
    }

    function renderIrBarChart(canvas, data, period, chartNum) {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        if (!data || !data.length) {
            ctx.font = '16px Arial';
            ctx.fillStyle = '#888';
            ctx.textAlign = 'center';
            ctx.fillText('Sem dados para este período.', canvas.width / 2, canvas.height / 2);
            return;
        }
        // Agrupa por categoria/plano de conta
        const grouped = {};
        data.forEach(e => {
            const key = e.account_plan_code || 'Sem Plano';
            if (!grouped[key]) grouped[key] = 0;
            grouped[key] += parseFloat(e.amount);
        });
        const labels = Object.keys(grouped);
        const values = Object.values(grouped);
        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: `Total por Plano (${period})`,
                    data: values,
                    backgroundColor: '#6366F1'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: `Gastos por Plano de Conta (${period})`,
                        font: { size: 16 }
                    },
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: ctx => formatCurrencyDetailed(ctx.parsed.y)
                        }
                    },
                    datalabels: {
                        color: '#222',
                        anchor: 'end', align: 'top', font: { weight: 'bold' },
                        formatter: v => typeof v === 'number' ? formatCurrencyDetailed(v) : ''
                    }
                },
                onClick: (evt, elements) => {
                    if (elements && elements.length > 0) {
                        const idx = elements[0].index;
                        const plano = labels[idx];
                        showIrDetails(data, plano, chartNum, period);
                    }
                },
                scales: { y: { beginAtZero: true } }
            },
            plugins: [ChartDataLabels]
        });
    }

    function showIrDetails(data, plano, chartNum, period) {
        const filtered = data.filter(e => String(e.account_plan_code || 'Sem Plano') === String(plano));
        let total = filtered.reduce((sum, e) => sum + parseFloat(e.amount), 0);
        let html = `<div class="mb-2 font-bold text-lg flex items-center justify-between">
            <span>Detalhes do Plano <span class='text-blue-600'>${plano}</span> (${period})</span>
            <span class='bg-blue-100 text-blue-800 px-3 py-1 rounded font-mono'>Total: ${formatCurrencyDetailed(total)}</span>
            <button id="ir-export-csv" class="bg-green-500 text-white px-3 py-1 rounded ml-4"><i class="fa fa-file-csv"></i> Exportar CSV</button>
        </div>`;
        if (filtered.length === 0) {
            html += `<div class='text-gray-500 italic'>Nenhuma transação encontrada para este plano neste período.</div>`;
            irDetails.innerHTML = html;
            return;
        }
        html += `<div style="max-height:320px;overflow:auto;"><table class="table table-sm table-bordered align-middle"><thead class='sticky-top bg-white'><tr><th>Data</th><th>Descrição</th><th class='text-end'>Valor</th><th>Conta</th><th>Tipo</th></tr></thead><tbody>`;
        filtered.forEach(e => {
            html += `<tr><td>${new Date(e.transaction_date).toLocaleDateString('pt-BR')}</td><td>${e.description}</td><td class='text-end'>${formatCurrencyDetailed(parseFloat(e.amount))}</td><td>${e.account}</td><td>${e.is_business_expense ? 'Empresarial' : 'Pessoal'}</td></tr>`;
        });
        html += '</tbody></table></div>';
        irDetails.innerHTML = html;
        // Exportar CSV
        const exportBtn = document.getElementById('ir-export-csv');
        if (exportBtn) {
            exportBtn.onclick = () => {
                let csv = 'Data,Descrição,Valor,Conta,Tipo\n';
                filtered.forEach(e => {
                    csv += `"${new Date(e.transaction_date).toLocaleDateString('pt-BR')}","${e.description}","${parseFloat(e.amount).toFixed(2)}","${e.account}","${e.is_business_expense ? 'Empresarial' : 'Pessoal'}"\n`;
                });
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `relatorio_${plano}_${period}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            };
        }
        irDetails.scrollIntoView({ behavior: 'smooth' });
    }

    // ========== NOVO CÓDIGO PARA CONSULTA DE FATURAMENTO =========
    const billingForm = document.getElementById('billing-period-form');
    const billingResults = document.getElementById('billing-results');

    // Definição dos períodos de fatura para cada conta
    const billingPeriods = {
        'Nu Bank Ketlyn': { startDay: 2, endDay: 1 },
        'Nu Vainer': { startDay: 2, endDay: 1 },
        'Ourocard Ketlyn': { startDay: 17, endDay: 16 },
        'PicPay Vainer': { startDay: 1, endDay: 30 },
        'Ducatto': { startDay: 1, endDay: 30 },
        'Master': { startDay: 1, endDay: 30 }
    };

    billingForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Use o ano e mês dos filtros principais do histórico de despesas
        const filterYearEl = document.getElementById('filter-year');
        const filterMonthEl = document.getElementById('filter-month');
        let year = filterYearEl && filterYearEl.value ? parseInt(filterYearEl.value, 10) : new Date().getFullYear();
        let month = filterMonthEl && filterMonthEl.value ? parseInt(filterMonthEl.value, 10) : (new Date().getMonth() + 1);

        // Alternativamente, se quiser usar o mês do select do quadro de fatura:
        // const month = parseInt(document.getElementById('billing-month').value, 10);

        if (!month) {
            showNotification('Por favor, selecione um mês.', 'error');
            return;
        }

        // IMPORTANTE: O mês selecionado é o mês de fechamento da fatura
        // Os gastos devem ser buscados no mês ANTERIOR ao selecionado
        month = month - 1;
        if (month === 0) {
            month = 12;
            year = year - 1;
        }

        // Lista das contas exatamente como no banco de dados
        const accounts = [
            'Nu Bank Ketlyn',
            'Nu Vainer',
            'Ourocard Ketlyn',
            'PicPay Vainer',
            'Ducatto',
            'Master'
        ];

        billingResults.innerHTML = '<div class="text-gray-500 mb-2">Buscando dados...</div>';

        // Busca e exibe resultados para cada conta
        const allResults = await Promise.all(accounts.map(async (account) => {
            const period = billingPeriods[account];
            if (!period) return { account, error: 'Conta inválida.' };

            // Calcula o intervalo de datas para o período vigente
            let startDate, endDate;
            if (account === 'Nu Bank Ketlyn' || account === 'Nu Vainer') {
                // Nubank: do dia 2 do mês até dia 1 do mês seguinte (inclusive)
                startDate = new Date(year, month - 1, 2);
                endDate = new Date(year, month, 1);
            } else if (account === 'Ourocard Ketlyn') {
                // Ourocard: do dia 17 do mês até dia 16 do mês seguinte (inclusive)
                startDate = new Date(year, month - 1, 17);
                endDate = new Date(year, month, 16);
            } else {
                // fallback
                startDate = new Date(year, month - 1, 1);
                endDate = new Date(year, month, 0);
            }

            try {
                const response = await fetch(
                    `${API_BASE_URL}/api/expenses?account=${encodeURIComponent(account)}&start_date=${startDate.toISOString().slice(0, 10)}&end_date=${endDate.toISOString().slice(0, 10)}`,
                    { headers: { Authorization: `Bearer ${getToken()}` } }
                );
                if (!response.ok) throw new Error('Erro ao buscar dados.');
                const expenses = await response.json();

                // Filtra os gastos para garantir que estejam dentro do intervalo
                const filteredExpenses = expenses.filter(expense => {
                    const expenseDate = new Date(expense.transaction_date);
                    return expenseDate >= startDate && expenseDate <= endDate;
                });

                return { account, startDate, endDate, expenses: filteredExpenses };
            } catch (error) {
                return { account, error: error.message };
            }
        }));

        // Renderiza os resultados de todas as contas
        billingResults.innerHTML = '';
        allResults.forEach(result => {
            if (result.error) {
                billingResults.innerHTML += `<div class="mb-6"><h4 class="text-lg font-semibold text-gray-700 mb-2">${result.account}</h4><p class="text-red-600">${result.error}</p></div>`;
                return;
            }
            billingResults.innerHTML += renderBillingResultsBlock(result.expenses, result.account, result.startDate, result.endDate);
        });
    });

    // Função para renderizar o bloco de resultados de uma conta
    function renderBillingResultsBlock(expenses, account, startDate, endDate) {
        let html = `
            <div class="mb-8">
                <h4 class="text-lg font-semibold text-gray-700 mb-2">Resultados para ${account}</h4>
                <p class="text-sm text-gray-500 mb-2">Período: ${startDate.toLocaleDateString('pt-BR')} a ${endDate.toLocaleDateString('pt-BR')}</p>
        `;

        if (!expenses || expenses.length === 0) {
            html += `<p class="text-gray-500">Nenhum gasto encontrado neste período.</p></div>`;
            return html;
        }

        const groupedByDay = groupExpensesByDay(expenses);

        html += `
            <div class="overflow-x-auto">
            <table class="table table-bordered w-full text-sm">
                <thead>
                    <tr>
                        <th>Dia</th>
                        <th>Descrição</th>
                        <th>Valor</th>
                        <th>Conta</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.keys(groupedByDay).map(day => `
                        <tr>
                            <td>${day}</td>
                            <td>${groupedByDay[day].map(expense => expense.description).join(', ')}</td>
                            <td>${formatCurrencyDetailed(groupedByDay[day].reduce((sum, expense) => sum + parseFloat(expense.amount), 0))}</td>
                            <td>${groupedByDay[day][0].account}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            </div>
        </div>
        `;
        return html;
    }

    function groupExpensesByDay(expenses) {
        return expenses.reduce((acc, expense) => {
            const day = new Date(expense.transaction_date).toLocaleDateString('pt-BR');
            if (!acc[day]) acc[day] = [];
            acc[day].push(expense);
            return acc;
        }, {});
    }

    // Helper to destroy Chart.js instance safely and clear Chart registry
    function destroyChartInstance(chartVar, canvasId) {
        if (chartVar && typeof chartVar.destroy === 'function') {
            try {
                chartVar.destroy();
            } catch (e) {
                // fallback: forcibly clear the canvas if Chart.js fails
                const canvas = document.getElementById(canvasId);
                if (canvas && canvas.getContext) {
                    const ctx = canvas.getContext('2d');
                    ctx && ctx.clearRect(0, 0, canvas.width, canvas.height);
                }
            }
        }
        // Remove lingering Chart.js reference from Chart registry (Chart 3+)
        if (window.Chart && window.Chart.instances) {
            Object.keys(window.Chart.instances).forEach(key => {
                const chart = window.Chart.instances[key];
                if (chart && chart.canvas && chart.canvas.id === canvasId) {
                    delete window.Chart.instances[key];
                }
            });
        }
        return null;
    }

    // ========== FUNÇÕES PARA GASTOS RECORRENTES ==========
    
    async function openRecurringModal() {
        if (recurringModal) {
            recurringModal.classList.remove('hidden');
            setTimeout(() => recurringModal.classList.remove('opacity-0'), 10);
            await loadRecurringExpenses();
        }
    }

    function closeRecurringModal() {
        if (recurringModal) {
            recurringModal.classList.add('opacity-0');
            setTimeout(() => recurringModal.classList.add('hidden'), 300);
        }
    }

    async function loadRecurringExpenses() {
        const token = getToken();
        if (!token) return;

        try {
            const response = await fetch(`${API_BASE_URL}/api/recurring-expenses`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Erro ao carregar gastos recorrentes');

            const recurringExpenses = await response.json();
            renderRecurringExpensesList(recurringExpenses);
        } catch (error) {
            console.error('Erro ao carregar gastos recorrentes:', error);
            showNotification('Erro ao carregar gastos recorrentes', 'error');
        }
    }

    function renderRecurringExpensesList(expenses) {
        if (!recurringList) return;

        if (expenses.length === 0) {
            recurringList.innerHTML = '<p class="text-gray-500 text-center">Nenhum gasto recorrente cadastrado.</p>';
            return;
        }

        recurringList.innerHTML = expenses.map(expense => `
            <div class="bg-gray-50 p-4 rounded-lg mb-3">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <h4 class="font-medium text-gray-800">${expense.description}</h4>
                        <p class="text-sm text-gray-600">
                            <strong>Valor:</strong> ${formatCurrencyDetailed(parseFloat(expense.amount))} | 
                            <strong>Conta:</strong> ${expense.account} | 
                            <strong>Dia:</strong> ${expense.day_of_month}
                        </p>
                        ${expense.account_plan_code ? `<p class="text-sm text-gray-600"><strong>Plano:</strong> ${expense.account_plan_code}</p>` : ''}
                        <p class="text-sm ${expense.is_business_expense ? 'text-blue-600' : 'text-green-600'}">
                            ${expense.is_business_expense ? '💼 Empresarial' : '🏠 Pessoal'}
                        </p>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="editRecurringExpense(${expense.id})" 
                                class="bg-blue-500 text-white px-3 py-1 rounded text-sm">
                            Editar
                        </button>
                        <button onclick="deleteRecurringExpense(${expense.id})" 
                                class="bg-red-500 text-white px-3 py-1 rounded text-sm">
                            Remover
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async function handleRecurringExpenseSubmit(e) {
        e.preventDefault();
        
        // Prevenir submissões duplicadas
        if (isSubmittingRecurringExpense) {
            console.log('Submissão de gasto recorrente já em andamento. Ignorando duplicata.');
            showToast('Aguarde, processando gasto recorrente anterior...', 'warning');
            return;
        }
        
        isSubmittingRecurringExpense = true;
        console.log('Iniciando submissão de gasto recorrente...');
        
        const token = getToken();
        if (!token) {
            isSubmittingRecurringExpense = false;
            return;
        }

        // Desabilitar botão de submit temporariamente
        const submitButton = recurringForm.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Criando...';
        }

        const formData = new FormData(recurringForm);
        const data = {
            description: formData.get('description'),
            amount: parseFloat(formData.get('amount')),
            account: formData.get('account'),
            account_plan_code: formData.get('account_plan_code') || null,
            is_business_expense: formData.get('is_business_expense') === 'on',
            day_of_month: parseInt(formData.get('day_of_month')) || 1
        };

        // Validações básicas
        if (!data.description || !data.amount || !data.account) {
            showToast('Preencha todos os campos obrigatórios', 'error');
            isSubmittingRecurringExpense = false;
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.innerHTML = 'Criar Gasto Recorrente';
            }
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/recurring-expenses`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) throw new Error('Erro ao criar gasto recorrente');

            showToast('Gasto recorrente criado com sucesso!', 'success');
            recurringForm.reset();
            await loadRecurringExpenses();
            console.log('Gasto recorrente criado com sucesso');
            
        } catch (error) {
            console.error('Erro ao criar gasto recorrente:', error);
            showToast('Erro ao criar gasto recorrente', 'error');
        } finally {
            // Reabilitar botão e resetar flag
            isSubmittingRecurringExpense = false;
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.innerHTML = 'Criar Gasto Recorrente';
            }
            console.log('Submissão de gasto recorrente finalizada');
        }
    }

    async function deleteRecurringExpense(id) {
        if (!confirm('Tem certeza que deseja remover este gasto recorrente?')) return;

        const token = getToken();
        if (!token) return;

        try {
            const response = await fetch(`${API_BASE_URL}/api/recurring-expenses/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Erro ao remover gasto recorrente');

            showNotification('Gasto recorrente removido com sucesso!', 'success');
            await loadRecurringExpenses();
        } catch (error) {
            console.error('Erro ao remover gasto recorrente:', error);
            showNotification('Erro ao remover gasto recorrente', 'error');
        }
    }

    async function processRecurringExpenses() {
        // Prevenir processamento duplicado
        if (isProcessingRecurringExpenses) {
            console.log('Processamento de gastos recorrentes já em andamento. Ignorando duplicata.');
            showToast('Aguarde, processamento anterior ainda em andamento...', 'warning');
            return;
        }
        
        isProcessingRecurringExpenses = true;
        console.log('Iniciando processamento de gastos recorrentes...');
        
        const token = getToken();
        if (!token) {
            isProcessingRecurringExpenses = false;
            return;
        }

        const year = filterYear.value;
        const month = filterMonth.value;

        if (!year || !month) {
            showToast('Selecione ano e mês para processar', 'error');
            isProcessingRecurringExpenses = false;
            return;
        }
        
        // Desabilitar botão temporariamente
        if (processRecurringBtn) {
            processRecurringBtn.disabled = true;
            processRecurringBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Processando...';
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/recurring-expenses/process`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ year: parseInt(year), month: parseInt(month) })
            });

            const result = await response.json();

            if (!response.ok) throw new Error(result.message);

            showToast(result.message, 'success');
            await fetchAllData(); // Recarregar dados do dashboard
            
            // Recarregar dados específicos da aba ativa
            const activeTab = document.querySelector('.tab-button.active');
            if (activeTab) {
                if (activeTab.dataset.tab === 'pix-boleto') {
                    await loadPixBoletoData();
                } else if (activeTab.dataset.tab === 'business-analysis') {
                    await loadBusinessAnalysis();
                }
            }
            
            console.log('Processamento de gastos recorrentes completado com sucesso');
            
        } catch (error) {
            console.error('Erro ao processar gastos recorrentes:', error);
            showToast('Erro ao processar gastos recorrentes', 'error');
        } finally {
            // Reabilitar botão e resetar flag
            isProcessingRecurringExpenses = false;
            if (processRecurringBtn) {
                processRecurringBtn.disabled = false;
                processRecurringBtn.innerHTML = 'Processar Mês Atual';
            }
            console.log('Processamento de gastos recorrentes finalizado');
        }
    }

    // Tornar funções globais para uso nos botões
    window.editRecurringExpense = async function(id) {
        // Implementar funcionalidade de edição
        showNotification('Funcionalidade de edição em desenvolvimento', 'info');
    };

    window.deleteRecurringExpense = deleteRecurringExpense;

    // ========== SISTEMA DE ABAS ==========
    function initializeTabs() {
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabId = button.dataset.tab;
                switchTab(tabId);
            });
        });
    }

    function switchTab(tabId) {
        // Remove active class from all buttons
        tabButtons.forEach(btn => {
            btn.classList.remove('active', 'bg-blue-500', 'text-white');
            btn.classList.add('hover:bg-gray-50');
        });

        // Hide all tab contents
        tabContents.forEach(content => {
            content.classList.add('hidden');
        });

        // Destruir gráficos empresariais quando se sai da aba de análise empresarial
        const currentActiveTab = document.querySelector('.tab-button.active');
        if (currentActiveTab && currentActiveTab.dataset.tab === 'business-analysis' && tabId !== 'business-analysis') {
            destroyBusinessCharts();
        }

        // Activate selected tab
        const activeButton = document.querySelector(`[data-tab="${tabId}"]`);
        const activeContent = document.getElementById(`${tabId}-tab`);

        if (activeButton && activeContent) {
            activeButton.classList.add('active', 'bg-blue-500', 'text-white');
            activeButton.classList.remove('hover:bg-gray-50');
            activeContent.classList.remove('hidden');

            // Load specific data for tab
            if (tabId === 'pix-boleto') {
                loadPixBoletoData();
            } else if (tabId === 'business-analysis') {
                // Destruir gráficos antes de carregar novos dados
                destroyBusinessCharts();
                loadBusinessAnalysis();
            }
        }
    }

    // ========== PIX & BOLETO FUNCTIONS ==========
    async function loadPixBoletoData() {
        try {
            const token = getToken();
            if (!token) return;

            const year = pixBoletoYear?.value || new Date().getFullYear();
            const month = pixBoletoMonth?.value || '';
            const type = pixBoletoType?.value || '';
            const search = pixBoletoSearch?.value || '';

            // Construir parâmetros de busca
            let pixParams = `account=PIX&year=${year}&include_recurring=true`;
            let boletoParams = `account=Boleto&year=${year}&include_recurring=true`;
            
            if (month) {
                pixParams += `&month=${month}`;
                boletoParams += `&month=${month}`;
            }

            // Buscar dados baseados no filtro de tipo
            let pixData = [];
            let boletoData = [];

            if (type === '' || type === 'PIX') {
                pixData = await fetch(`${API_BASE_URL}/api/expenses?${pixParams}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }).then(res => res.json()).catch(() => []);
            }

            if (type === '' || type === 'Boleto') {
                boletoData = await fetch(`${API_BASE_URL}/api/expenses?${boletoParams}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }).then(res => res.json()).catch(() => []);
            }

            // Filtrar por busca se necessário
            const filteredPix = search ? pixData.filter(expense => 
                expense.description.toLowerCase().includes(search.toLowerCase())
            ) : pixData;

            const filteredBoleto = search ? boletoData.filter(expense => 
                expense.description.toLowerCase().includes(search.toLowerCase())
            ) : boletoData;

            // Atualizar resumos
            updatePixBoletoSummary(filteredPix, filteredBoleto);

            // Atualizar tabelas
            updatePixBoletoTables(filteredPix, filteredBoleto);

            // Atualizar resumos por categoria
            updatePixBoletoCategorySummary(filteredPix, filteredBoleto);

            // Atualizar gráficos
            updatePixBoletoCharts(filteredPix, filteredBoleto);

        } catch (error) {
            console.error('Erro ao carregar dados PIX/Boleto:', error);
            showToast('Erro ao carregar dados PIX/Boleto', 'error');
        }
    }

    function updatePixBoletoSummary(pixData, boletoData) {
        const pixTotalValue = pixData.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
        const boletoTotalValue = boletoData.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
        const totalTransactions = pixData.length + boletoData.length;
        const grandTotal = pixTotalValue + boletoTotalValue;

        if (pixTotal) pixTotal.textContent = formatCurrencyDetailed(pixTotalValue);
        if (boletoTotal) boletoTotal.textContent = formatCurrencyDetailed(boletoTotalValue);
        if (pixBoletoTransactions) pixBoletoTransactions.textContent = totalTransactions;
        if (pixBoletoGrandTotal) pixBoletoGrandTotal.textContent = formatCurrencyDetailed(grandTotal);
    }

    function updatePixBoletoTables(pixData, boletoData) {
        // Atualizar tabela PIX
        if (pixDetailsTable) {
            pixDetailsTable.innerHTML = '';
            pixData.forEach(expense => {
                const row = document.createElement('tr');
                row.className = 'pix-row';
                row.innerHTML = `
                    <td class="p-3">${new Date(expense.transaction_date).toLocaleDateString('pt-BR')}</td>
                    <td class="p-3">${expense.description}</td>
                    <td class="p-3 font-semibold text-green-600">${formatCurrencyDetailed(parseFloat(expense.amount))}</td>
                    <td class="p-3">${expense.is_business_expense ? 'Empresarial' : 'Pessoal'}</td>
                    <td class="p-3">${expense.account_plan_code || '-'}</td>
                    <td class="p-3">${expense.is_recurring_expense ? '<span class="recurring-badge">Recorrente</span>' : '-'}</td>
                `;
                pixDetailsTable.appendChild(row);
            });
        }

        // Atualizar tabela Boleto
        if (boletoDetailsTable) {
            boletoDetailsTable.innerHTML = '';
            boletoData.forEach(expense => {
                const row = document.createElement('tr');
                row.className = 'boleto-row';
                row.innerHTML = `
                    <td class="p-3">${new Date(expense.transaction_date).toLocaleDateString('pt-BR')}</td>
                    <td class="p-3">${expense.description}</td>
                    <td class="p-3 font-semibold text-blue-600">${formatCurrencyDetailed(parseFloat(expense.amount))}</td>
                    <td class="p-3">${expense.is_business_expense ? 'Empresarial' : 'Pessoal'}</td>
                    <td class="p-3">${expense.account_plan_code || '-'}</td>
                    <td class="p-3">${expense.is_recurring_expense ? '<span class="recurring-badge">Recorrente</span>' : '-'}</td>
                `;
                boletoDetailsTable.appendChild(row);
            });
        }
    }

    function updatePixBoletoCategorySummary(pixData, boletoData) {
        // Resumo PIX por plano de conta
        const pixByPlan = {};
        pixData.forEach(expense => {
            const plan = expense.account_plan_code || 'Sem Plano';
            pixByPlan[plan] = (pixByPlan[plan] || 0) + parseFloat(expense.amount);
        });

        if (pixCategorySummary) {
            pixCategorySummary.innerHTML = '';
            Object.entries(pixByPlan).forEach(([plan, total]) => {
                const div = document.createElement('div');
                div.className = 'flex justify-between items-center p-2 bg-green-50 rounded';
                div.innerHTML = `
                    <span class="font-medium">Plano ${plan}:</span>
                    <span class="font-bold text-green-600">${formatCurrencyDetailed(total)}</span>
                `;
                pixCategorySummary.appendChild(div);
            });
        }

        // Resumo Boleto por plano de conta
        const boletoByPlan = {};
        boletoData.forEach(expense => {
            const plan = expense.account_plan_code || 'Sem Plano';
            boletoByPlan[plan] = (boletoByPlan[plan] || 0) + parseFloat(expense.amount);
        });

        if (boletoCategorySummary) {
            boletoCategorySummary.innerHTML = '';
            Object.entries(boletoByPlan).forEach(([plan, total]) => {
                const div = document.createElement('div');
                div.className = 'flex justify-between items-center p-2 bg-blue-50 rounded';
                div.innerHTML = `
                    <span class="font-medium">Plano ${plan}:</span>
                    <span class="font-bold text-blue-600">${formatCurrencyDetailed(total)}</span>
                `;
                boletoCategorySummary.appendChild(div);
            });
        }
    }

    function updatePixBoletoCharts(pixData, boletoData) {
        // Destruir gráficos existentes
        if (window.pixBoletoComparisonChart) {
            window.pixBoletoComparisonChart.destroy();
        }
        if (window.pixBoletoEvolutionChart) {
            window.pixBoletoEvolutionChart.destroy();
        }

        // Gráfico de comparação PIX vs Boleto
        const comparisonCtx = document.getElementById('pix-boleto-comparison-chart')?.getContext('2d');
        if (comparisonCtx) {
            const pixTotal = pixData.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
            const boletoTotal = boletoData.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);

            window.pixBoletoComparisonChart = new Chart(comparisonCtx, {
                type: 'doughnut',
                data: {
                    labels: ['PIX', 'Boleto'],
                    datasets: [{
                        data: [pixTotal, boletoTotal],
                        backgroundColor: ['#22c55e', '#3b82f6'],
                        borderWidth: 2,
                        borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { 
                            position: 'bottom',
                            labels: { color: '#000000' }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.label || '';
                                    const value = context.parsed || 0;
                                    const total = pixTotal + boletoTotal;
                                    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                    return `${label}: ${formatCurrencyDetailed(value)} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        }

        // Gráfico de evolução mensal (últimos 6 meses)
        const evolutionCtx = document.getElementById('pix-boleto-evolution-chart')?.getContext('2d');
        if (evolutionCtx) {
            // Calcular dados dos últimos 6 meses
            const monthlyData = calculateMonthlyPixBoletoData([...pixData, ...boletoData]);
            
            window.pixBoletoEvolutionChart = new Chart(evolutionCtx, {
                type: 'line',
                data: {
                    labels: monthlyData.labels,
                    datasets: [
                        {
                            label: 'PIX',
                            data: monthlyData.pixValues,
                            borderColor: '#22c55e',
                            backgroundColor: 'rgba(34, 197, 94, 0.1)',
                            tension: 0.4,
                            fill: false
                        },
                        {
                            label: 'Boleto',
                            data: monthlyData.boletoValues,
                            borderColor: '#3b82f6',
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            tension: 0.4,
                            fill: false
                        }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { 
                            position: 'top',
                            labels: { color: '#000000' }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `${context.dataset.label}: ${formatCurrencyDetailed(context.parsed.y)}`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: { 
                            beginAtZero: true,
                            ticks: {
                                color: '#000000',
                                callback: function(value) {
                                    return formatCurrencyDetailed(value);
                                }
                            }
                        },
                        x: {
                            ticks: { color: '#000000' }
                        }
                    }
                }
            });
        }
    }

    function calculateMonthlyPixBoletoData(allData) {
        const currentDate = new Date();
        const monthlyTotals = { pix: {}, boleto: {} };
        const labels = [];

        // Gerar labels dos últimos 6 meses
        for (let i = 5; i >= 0; i--) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
            const label = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            labels.push(label);
            monthlyTotals.pix[key] = 0;
            monthlyTotals.boleto[key] = 0;
        }

        // Agrupar dados por mês
        allData.forEach(expense => {
            const date = new Date(expense.transaction_date);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const amount = parseFloat(expense.amount);
            
            if (expense.account === 'PIX' && monthlyTotals.pix[key] !== undefined) {
                monthlyTotals.pix[key] += amount;
            } else if (expense.account === 'Boleto' && monthlyTotals.boleto[key] !== undefined) {
                monthlyTotals.boleto[key] += amount;
            }
        });

        return {
            labels: labels,
            pixValues: Object.values(monthlyTotals.pix),
            boletoValues: Object.values(monthlyTotals.boleto)
        };
    }

    function initializePixBoletoFilters() {
        // Preencher anos
        if (pixBoletoYear) {
            const currentYear = new Date().getFullYear();
            pixBoletoYear.innerHTML = '';
            for (let i = currentYear; i >= currentYear - 3; i--) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = i;
                if (i === currentYear) option.selected = true;
                pixBoletoYear.appendChild(option);
            }
        }

        // Event listeners para filtros
        [pixBoletoType, pixBoletoYear, pixBoletoMonth, pixBoletoSearch].forEach(element => {
            if (element) {
                element.addEventListener('change', loadPixBoletoData);
                if (element === pixBoletoSearch) {
                    element.addEventListener('input', debounce(loadPixBoletoData, 300));
                }
            }
        });
    }

    // Função debounce para busca
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // ========== FIM FUNÇÕES GASTOS RECORRENTES ==========

    // ========== FUNÇÕES ANÁLISE EMPRESARIAL ==========

    // Inicializar análise empresarial
    function initBusinessAnalysis() {
        console.log('Inicializando análise empresarial...');
        populateBusinessFilters();
        setupBusinessEventListeners();
        loadBusinessAnalysis();
    }

    // Popular filtros empresariais
    function populateBusinessFilters() {
        // Popular anos
        const currentYear = new Date().getFullYear();
        for (let year = currentYear; year >= currentYear - 5; year--) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            if (year === currentYear) option.selected = true;
            billingYearSelect.appendChild(option);
        }

        // Popular contas empresariais
        const businessAccounts = ['Nu Bank Ketlyn', 'Nu Vainer', 'Ourocard Ketlyn', 'PicPay Vainer', 'PIX', 'Boleto'];
        businessAccounts.forEach(account => {
            const option = document.createElement('option');
            option.value = account;
            option.textContent = account;
            businessAccountSelect.appendChild(option);
        });

        // Definir datas padrão
        const today = new Date();
        businessDateTo.value = today.toISOString().split('T')[0];
        
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        businessDateFrom.value = firstDay.toISOString().split('T')[0];
    }

    // Configurar event listeners empresariais
    function setupBusinessEventListeners() {
        // Filtro de período personalizado
        businessPeriodSelect.addEventListener('change', function() {
            if (this.value === 'custom') {
                customDateFields.classList.remove('hidden');
            } else {
                customDateFields.classList.add('hidden');
                updateBusinessDateRange();
            }
            loadBusinessAnalysis();
        });

        // Outros filtros
        [businessAccountSelect, businessInvoiceFilter, billingYearSelect, billingMonthSelect, billingAccountSelect].forEach(el => {
            if (el) el.addEventListener('change', loadBusinessAnalysis);
        });

        // Busca com debounce
        if (businessSearchInput) {
            businessSearchInput.addEventListener('input', debounce(loadBusinessAnalysis, 300));
        }

        // Filtrar por período de fatura
        if (filterBillingBtn) {
            filterBillingBtn.addEventListener('click', loadBillingPeriodAnalysis);
        }

        // Botões de exportação
        if (exportBusinessCsvBtn) {
            exportBusinessCsvBtn.addEventListener('click', exportBusinessDataToCsv);
        }
        if (exportBusinessPdfBtn) {
            exportBusinessPdfBtn.addEventListener('click', exportBusinessDataToPdf);
        }
    }

    // Atualizar range de datas baseado no período selecionado
    function updateBusinessDateRange() {
        const today = new Date();
        const period = businessPeriodSelect.value;
        
        switch (period) {
            case 'current-month':
                businessDateFrom.value = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
                businessDateTo.value = today.toISOString().split('T')[0];
                break;
            case 'last-month':
                const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
                businessDateFrom.value = lastMonth.toISOString().split('T')[0];
                businessDateTo.value = lastMonthEnd.toISOString().split('T')[0];
                break;
            case 'quarter':
                const quarterStart = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
                businessDateFrom.value = quarterStart.toISOString().split('T')[0];
                businessDateTo.value = today.toISOString().split('T')[0];
                break;
            case 'year':
                businessDateFrom.value = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
                businessDateTo.value = today.toISOString().split('T')[0];
                break;
        }
    }

    // Carregar análise empresarial
    async function loadBusinessAnalysis() {
        try {
            // Destruir gráficos existentes antes de criar novos
            destroyBusinessCharts();
            
            const businessExpenses = await fetchBusinessExpenses();
            updateBusinessMetrics(businessExpenses);
            renderBusinessCharts(businessExpenses);
            populateBusinessTable(businessExpenses);
            generateBusinessAlerts(businessExpenses);
        } catch (error) {
            console.error('Erro ao carregar análise empresarial:', error);
            showToast('Erro ao carregar dados empresariais', 'error');
        }
    }

    // Buscar gastos empresariais
    async function fetchBusinessExpenses() {
        const token = getToken();
        if (!token) return [];

        const params = new URLSearchParams({
            is_business: 'true'
        });

        // Adicionar filtros de data
        if (businessPeriodSelect.value !== 'custom') {
            updateBusinessDateRange();
        }
        
        if (businessDateFrom.value) params.append('date_from', businessDateFrom.value);
        if (businessDateTo.value) params.append('date_to', businessDateTo.value);
        if (businessAccountSelect.value) params.append('account', businessAccountSelect.value);
        if (businessSearchInput.value) params.append('search', businessSearchInput.value);
        if (businessInvoiceFilter.value) {
            if (businessInvoiceFilter.value === 'with') {
                params.append('has_invoice', '1');
            } else if (businessInvoiceFilter.value === 'without') {
                params.append('has_invoice', '0');
            }
        }

        const response = await fetch(`${API_BASE_URL}/api/expenses?${params}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Erro ao buscar gastos empresariais');
        const data = await response.json();
        
        // Filtrar apenas gastos empresariais no frontend como backup
        return data.filter(expense => expense.is_business_expense);
    }

    // Atualizar métricas empresariais
    function updateBusinessMetrics(expenses) {
        const total = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
        const withInvoice = expenses.filter(exp => exp.has_invoice).reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
        const withoutInvoice = total - withInvoice;

        // Formatação com separadores de milhares e cor preta
        document.getElementById('business-total').textContent = formatCurrencyDetailed(total);
        document.getElementById('business-total').style.color = '#000000';
        
        document.getElementById('business-invoiced').textContent = formatCurrencyDetailed(withInvoice);
        document.getElementById('business-invoiced').style.color = '#000000';
        
        document.getElementById('business-non-invoiced').textContent = formatCurrencyDetailed(withoutInvoice);
        document.getElementById('business-non-invoiced').style.color = '#000000';

        // Calcular crescimento mensal (comparação com mês anterior)
        calculateMonthlyGrowth(expenses);

        // Atualizar estatísticas da tabela filtrada
        updateFilteredStatistics(expenses);

        // Atualizar gastos por conta e por fatura
        updateBusinessByAccount(expenses);
        updateBusinessByBilling(expenses);
    }

    // Calcular crescimento mensal
    async function calculateMonthlyGrowth(currentExpenses) {
        try {
            const currentTotal = currentExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
            
            // Buscar dados do mês anterior
            const today = new Date();
            const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
            
            const params = new URLSearchParams({
                is_business: 'true',
                start_date: lastMonth.toISOString().split('T')[0],
                end_date: lastMonthEnd.toISOString().split('T')[0]
            });

            const response = await fetch(`${API_BASE_URL}/api/expenses?${params}`, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });

            if (response.ok) {
                const lastMonthData = await response.json();
                const lastMonthExpenses = lastMonthData.filter(expense => expense.is_business_expense);
                const lastMonthTotal = lastMonthExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
                
                const growth = lastMonthTotal > 0 ? ((currentTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0;
                const growthEl = document.getElementById('business-growth');
                
                if (growth > 0) {
                    growthEl.textContent = `+${growth.toFixed(1)}%`;
                    growthEl.className = 'text-xl font-bold text-red-300';
                } else if (growth < 0) {
                    growthEl.textContent = `${growth.toFixed(1)}%`;
                    growthEl.className = 'text-xl font-bold text-green-300';
                } else {
                    growthEl.textContent = '0%';
                    growthEl.className = 'text-xl font-bold text-white';
                }
            }
        } catch (error) {
            console.error('Erro ao calcular crescimento:', error);
            document.getElementById('business-growth').textContent = 'N/A';
        }
    }

    // Atualizar estatísticas filtradas
    function updateFilteredStatistics(expenses) {
        const total = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
        const count = expenses.length;
        const average = count > 0 ? total / count : 0;
        const withInvoiceCount = expenses.filter(exp => exp.has_invoice).length;
        const invoicePercentage = count > 0 ? (withInvoiceCount / count) * 100 : 0;

        // Formatação com separadores de milhares e cor preta
        document.getElementById('filtered-total').textContent = formatCurrencyDetailed(total);
        document.getElementById('filtered-total').style.color = '#000000';
        
        document.getElementById('filtered-count').textContent = count.toLocaleString('pt-BR');
        document.getElementById('filtered-count').style.color = '#000000';
        
        document.getElementById('filtered-average').textContent = formatCurrencyDetailed(average);
        document.getElementById('filtered-average').style.color = '#000000';
        
        document.getElementById('filtered-invoice-percentage').textContent = `${invoicePercentage.toFixed(1)}%`;
        document.getElementById('filtered-invoice-percentage').style.color = '#000000';
    }

    // Atualizar gastos por conta
    function updateBusinessByAccount(expenses) {
        const accountData = {};
        
        expenses.forEach(expense => {
            const account = expense.account;
            if (!accountData[account]) {
                accountData[account] = {
                    total: 0,
                    count: 0,
                    withInvoice: 0,
                    withoutInvoice: 0
                };
            }
            
            const amount = parseFloat(expense.amount);
            accountData[account].total += amount;
            accountData[account].count += 1;
            
            if (expense.has_invoice) {
                accountData[account].withInvoice += amount;
            } else {
                accountData[account].withoutInvoice += amount;
            }
        });

        // Renderizar resumo por conta
        const accountSummaryContainer = document.getElementById('business-account-summary');
        if (accountSummaryContainer) {
            accountSummaryContainer.innerHTML = '';
            
            Object.entries(accountData).forEach(([account, data]) => {
                const accountDiv = document.createElement('div');
                accountDiv.className = 'bg-white p-4 rounded-lg shadow-sm border';
                accountDiv.innerHTML = `
                    <h4 class="font-semibold text-lg mb-2" style="color: #000000;">${account}</h4>
                    <div class="grid grid-cols-2 gap-2 text-sm">
                        <div>
                            <span class="text-gray-600">Total:</span>
                            <span class="font-bold ml-2" style="color: #000000;">${formatCurrencyDetailed(data.total)}</span>
                        </div>
                        <div>
                            <span class="text-gray-600">Transações:</span>
                            <span class="font-bold ml-2" style="color: #000000;">${data.count.toLocaleString('pt-BR')}</span>
                        </div>
                        <div>
                            <span class="text-gray-600">Com NF:</span>
                            <span class="font-bold ml-2" style="color: #000000;">${formatCurrencyDetailed(data.withInvoice)}</span>
                        </div>
                        <div>
                            <span class="text-gray-600">Sem NF:</span>
                            <span class="font-bold ml-2" style="color: #000000;">${formatCurrencyDetailed(data.withoutInvoice)}</span>
                        </div>
                    </div>
                `;
                accountSummaryContainer.appendChild(accountDiv);
            });
        }
    }

    // Atualizar gastos por período de fatura
    function updateBusinessByBilling(expenses) {
        const billingPeriods = {
            'Nu Bank Ketlyn': { startDay: 2, endDay: 1 },
            'Nu Vainer': { startDay: 2, endDay: 1 },
            'Ourocard Ketlyn': { startDay: 17, endDay: 16 },
            'PicPay Vainer': { startDay: 1, endDay: 30 },
            'Ducatto': { startDay: 1, endDay: 30 },
            'Master': { startDay: 1, endDay: 30 }
        };

        const today = new Date();
        const billingData = {};

        // Para cada conta que tem período de fatura definido
        Object.keys(billingPeriods).forEach(account => {
            const period = billingPeriods[account];
            let startDate, endDate;

            if (account === 'Nu Bank Ketlyn' || account === 'Nu Vainer') {
                // Para Nu Bank: fatura atual é do dia 2 do mês passado até dia 1 do mês atual
                startDate = new Date(today.getFullYear(), today.getMonth() - 1, period.startDay);
                endDate = new Date(today.getFullYear(), today.getMonth(), period.endDay);
            } else {
                // Para outras contas: período do mês anterior
                startDate = new Date(today.getFullYear(), today.getMonth() - 1, period.startDay);
                endDate = new Date(today.getFullYear(), today.getMonth() - 1, period.endDay);
                
                // Se endDay < startDay, o período vai para o próximo mês
                if (period.endDay < period.startDay) {
                    endDate = new Date(today.getFullYear(), today.getMonth(), period.endDay);
                }
            }

            // Filtrar gastos desta conta no período vigente
            const accountExpenses = expenses.filter(expense => {
                if (expense.account !== account) return false;
                
                const expenseDate = new Date(expense.transaction_date);
                return expenseDate >= startDate && expenseDate <= endDate;
            });

            if (accountExpenses.length > 0) {
                const total = accountExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
                const withInvoice = accountExpenses.filter(exp => exp.has_invoice).reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
                
                billingData[account] = {
                    total: total,
                    count: accountExpenses.length,
                    withInvoice: withInvoice,
                    withoutInvoice: total - withInvoice,
                    period: `${startDate.toLocaleDateString('pt-BR')} - ${endDate.toLocaleDateString('pt-BR')}`
                };
            }
        });

        // Renderizar resumo por fatura
        const billingSummaryContainer = document.getElementById('business-billing-summary');
        if (billingSummaryContainer) {
            billingSummaryContainer.innerHTML = '';
            
            if (Object.keys(billingData).length === 0) {
                billingSummaryContainer.innerHTML = '<div class="text-gray-500 text-center p-4">Nenhum gasto no período vigente de fatura encontrado.</div>';
                return;
            }

            Object.entries(billingData).forEach(([account, data]) => {
                const billingDiv = document.createElement('div');
                billingDiv.className = 'bg-blue-50 p-4 rounded-lg shadow-sm border border-blue-200';
                billingDiv.innerHTML = `
                    <h4 class="font-semibold text-lg mb-2" style="color: #000000;">${account}</h4>
                    <p class="text-xs text-gray-600 mb-3">Período vigente: ${data.period}</p>
                    <div class="grid grid-cols-2 gap-2 text-sm">
                        <div>
                            <span class="text-gray-600">Total da Fatura:</span>
                            <span class="font-bold ml-2" style="color: #000000;">${formatCurrencyDetailed(data.total)}</span>
                        </div>
                        <div>
                            <span class="text-gray-600">Transações:</span>
                            <span class="font-bold ml-2" style="color: #000000;">${data.count.toLocaleString('pt-BR')}</span>
                        </div>
                        <div>
                            <span class="text-gray-600">Com NF:</span>
                            <span class="font-bold ml-2" style="color: #000000;">${formatCurrencyDetailed(data.withInvoice)}</span>
                        </div>
                        <div>
                            <span class="text-gray-600">Sem NF:</span>
                            <span class="font-bold ml-2" style="color: #000000;">${formatCurrencyDetailed(data.withoutInvoice)}</span>
                        </div>
                    </div>
                `;
                billingSummaryContainer.appendChild(billingDiv);
            });

            // Adicionar total geral das faturas
            const totalBilling = Object.values(billingData).reduce((sum, data) => sum + data.total, 0);
            const totalWithInvoice = Object.values(billingData).reduce((sum, data) => sum + data.withInvoice, 0);
            const totalWithoutInvoice = totalBilling - totalWithInvoice;

            const totalDiv = document.createElement('div');
            totalDiv.className = 'bg-gray-100 p-4 rounded-lg shadow-sm border-2 border-gray-300 mt-4';
            totalDiv.innerHTML = `
                <h4 class="font-bold text-xl mb-2" style="color: #000000;">Total de Todas as Faturas</h4>
                <div class="grid grid-cols-3 gap-4 text-lg">
                    <div class="text-center">
                        <span class="text-gray-600 block">Total:</span>
                        <span class="font-bold text-2xl" style="color: #000000;">${formatCurrencyDetailed(totalBilling)}</span>
                    </div>
                    <div class="text-center">
                        <span class="text-gray-600 block">Com NF:</span>
                        <span class="font-bold text-2xl" style="color: #000000;">${formatCurrencyDetailed(totalWithInvoice)}</span>
                    </div>
                    <div class="text-center">
                        <span class="text-gray-600 block">Sem NF:</span>
                        <span class="font-bold text-2xl" style="color: #000000;">${formatCurrencyDetailed(totalWithoutInvoice)}</span>
                    </div>
                </div>
            `;
            billingSummaryContainer.appendChild(totalDiv);
        }
    }

    // Renderizar gráficos empresariais
    function renderBusinessCharts(expenses) {
        renderBusinessEvolutionChart(expenses);
        renderBusinessAccountChart(expenses);
        renderBusinessCategoryChart(expenses);
        renderBusinessInvoiceStatusChart(expenses);
        
        // Usar debounce para evitar chamadas muito rápidas
        if (quarterlyTimeout) clearTimeout(quarterlyTimeout);
        quarterlyTimeout = setTimeout(() => renderQuarterlyComparisonChart(expenses), 100);
        
        if (projectionTimeout) clearTimeout(projectionTimeout);
        projectionTimeout = setTimeout(() => renderExpenseProjectionChart(expenses), 150);
    }

    // Destruir gráficos empresariais existentes
    function destroyBusinessCharts() {
        // Lista de IDs dos canvas de gráficos empresariais
        const canvasIds = [
            'business-evolution-chart',
            'business-account-chart', 
            'business-category-chart',
            'business-invoice-status-chart',
            'quarterly-comparison-chart',
            'expense-projection-chart',
            'billing-period-chart'  // Adicionado para corrigir o erro do gráfico de período de fatura
        ];

        // Destruir gráficos pelo objeto businessCharts
        Object.keys(businessCharts).forEach(chartKey => {
            if (businessCharts[chartKey]) {
                try {
                    businessCharts[chartKey].destroy();
                } catch (e) {
                    console.warn(`Erro ao destruir gráfico ${chartKey}:`, e);
                }
                businessCharts[chartKey] = null;
            }
        });

        // Destruir gráficos diretamente pelo canvas (método de segurança adicional)
        canvasIds.forEach(canvasId => {
            const canvas = document.getElementById(canvasId);
            if (canvas) {
                const existingChart = Chart.getChart(canvas);
                if (existingChart) {
                    try {
                        existingChart.destroy();
                    } catch (e) {
                        console.warn(`Erro ao destruir gráfico do canvas ${canvasId}:`, e);
                    }
                }
            }
        });

        // Limpar o objeto businessCharts
        businessCharts = {};
    }

    // Gráfico de evolução mensal
    function renderBusinessEvolutionChart(expenses) {
        const ctx = document.getElementById('business-evolution-chart');
        if (!ctx) return;

        // Usar função utilitária para limpar canvas
        ensureCanvasClean(ctx, 'evolution');

        // Verificar se o canvas já tem um gráfico ativo
        const existingChart = Chart.getChart(ctx);
        if (existingChart) {
            try {
                existingChart.destroy();
            } catch (e) {
                console.warn('Erro ao destruir gráfico existente do canvas:', e);
            }
        }

        // Agrupar por mês
        const monthlyData = {};
        expenses.forEach(expense => {
            const date = new Date(expense.transaction_date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthlyData[monthKey] = (monthlyData[monthKey] || 0) + parseFloat(expense.amount);
        });

        const labels = Object.keys(monthlyData).sort();
        const data = labels.map(label => monthlyData[label]);

        businessCharts.evolution = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels.map(label => {
                    const [year, month] = label.split('-');
                    return new Date(year, month - 1).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
                }),
                datasets: [{
                    label: 'Gastos Empresariais',
                    data: data,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return formatCurrencyDetailed(context.parsed.y);
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#000000',
                            callback: function(value) {
                                return formatCurrencyDetailed(value);
                            }
                        }
                    },
                    x: {
                        ticks: {
                            color: '#000000'
                        }
                    }
                }
            }
        });
    }

    // Gráfico de distribuição por conta
    function renderBusinessAccountChart(expenses) {
        const ctx = document.getElementById('business-account-chart');
        if (!ctx) return;

        // Usar função utilitária para limpar canvas
        ensureCanvasClean(ctx, 'account');

        const accountData = {};
        expenses.forEach(expense => {
            accountData[expense.account] = (accountData[expense.account] || 0) + parseFloat(expense.amount);
        });

        businessCharts.account = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(accountData),
                datasets: [{
                    data: Object.values(accountData),
                    backgroundColor: [
                        '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { 
                        position: 'bottom',
                        labels: {
                            color: '#000000'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                return `${label}: R$ ${value.toFixed(2)}`;
                            }
                        }
                    }
                }
            }
        });
    }

    // Gráfico de gastos por categoria
    function renderBusinessCategoryChart(expenses) {
        const ctx = document.getElementById('business-category-chart');
        if (!ctx) return;

        // Usar função utilitária para limpar canvas
        ensureCanvasClean(ctx, 'category');

        const categoryData = {};
        expenses.forEach(expense => {
            const category = expense.account_plan_code || 'Sem Categoria';
            categoryData[category] = (categoryData[category] || 0) + parseFloat(expense.amount);
        });

        businessCharts.category = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(categoryData),
                datasets: [{
                    label: 'Valor',
                    data: Object.values(categoryData),
                    backgroundColor: '#3b82f6'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return formatCurrencyDetailed(context.parsed.y);
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#000000',
                            callback: function(value) {
                                return formatCurrencyDetailed(value);
                            }
                        }
                    },
                    x: {
                        ticks: {
                            color: '#000000'
                        }
                    }
                }
            }
        });
    }

    // Gráfico de status de nota fiscal
    function renderBusinessInvoiceStatusChart(expenses) {
        const ctx = document.getElementById('business-invoice-status-chart');
        if (!ctx) return;

        // Usar função utilitária para limpar canvas
        ensureCanvasClean(ctx, 'invoice');

        const withInvoice = expenses.filter(exp => exp.has_invoice === 1 || exp.has_invoice === true).reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
        const withoutInvoice = expenses.filter(exp => exp.has_invoice !== 1 && exp.has_invoice !== true).reduce((sum, exp) => sum + parseFloat(exp.amount), 0);

        businessCharts.invoice = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Com Nota Fiscal', 'Sem Nota Fiscal'],
                datasets: [{
                    data: [withInvoice, withoutInvoice],
                    backgroundColor: ['#10b981', '#ef4444']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { 
                        position: 'bottom',
                        labels: {
                            color: '#000000'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                return `${label}: R$ ${value.toFixed(2)}`;
                            }
                        }
                    }
                }
            }
        });
    }

    // Gráfico de comparação trimestral
    async function renderQuarterlyComparisonChart(expenses) {
        // Evitar execução concorrente
        if (renderingQuarterly) {
            console.log('Renderização trimestral já em andamento, ignorando chamada');
            return;
        }
        renderingQuarterly = true;
        
        let ctx = document.getElementById('quarterly-comparison-chart');
        if (!ctx) {
            renderingQuarterly = false;
            return;
        }

        // Usar função utilitária para limpar canvas
        ensureCanvasClean(ctx, 'quarterly');
        
        // Obter canvas novamente caso tenha sido recriado
        ctx = document.getElementById('quarterly-comparison-chart');
        if (!ctx) {
            renderingQuarterly = false;
            return;
        }

        try {
            // Buscar dados dos últimos 12 meses para análise trimestral
            const today = new Date();
            const twelveMonthsAgo = new Date(today.getFullYear() - 1, today.getMonth(), 1);
            
            const params = new URLSearchParams({
                is_business: 'true',
                start_date: twelveMonthsAgo.toISOString().split('T')[0],
                end_date: today.toISOString().split('T')[0]
            });

            const response = await fetch(`${API_BASE_URL}/api/expenses?${params}`, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });

            if (response.ok) {
                const historicalData = await response.json();
                const businessData = historicalData.filter(expense => expense.is_business_expense);
                
                // Agrupar por trimestre
                const quarterlyData = {};
                businessData.forEach(expense => {
                    const date = new Date(expense.transaction_date);
                    const quarter = Math.floor(date.getMonth() / 3) + 1;
                    const quarterKey = `${date.getFullYear()}-Q${quarter}`;
                    quarterlyData[quarterKey] = (quarterlyData[quarterKey] || 0) + parseFloat(expense.amount);
                });

                const labels = Object.keys(quarterlyData).sort();
                const data = labels.map(label => quarterlyData[label]);

                // Verificação final antes de criar o gráfico
                const finalCheck = Chart.getChart(ctx);
                if (finalCheck) {
                    console.warn(`AVISO: Ainda existe gráfico ID ${finalCheck.id} no canvas quarterly-comparison-chart`);
                    try {
                        finalCheck.destroy();
                    } catch (e) {
                        console.error('Erro ao destruir gráfico restante:', e);
                    }
                }

                businessCharts.quarterly = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: labels,                    datasets: [{
                        label: 'Gastos Trimestrais',
                        data: data,
                        backgroundColor: '#8b5cf6'
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return formatCurrencyDetailed(context.parsed.y);
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                color: '#000000',
                                callback: function(value) {
                                    return formatCurrencyDetailed(value);
                                }
                            }
                        },
                        x: {
                            ticks: {
                                color: '#000000'
                            }
                        }
                    }
                    }
                });
            }
        } catch (error) {
            console.error('Erro ao carregar dados trimestrais:', error);
            // Usar função utilitária para limpar canvas no fallback
            ensureCanvasClean(ctx, 'quarterly');
            
            // Fallback com dados atuais
            const quarterlyData = {};
            expenses.forEach(expense => {
                const date = new Date(expense.transaction_date);
                const quarter = Math.floor(date.getMonth() / 3) + 1;
                const quarterKey = `${date.getFullYear()}-Q${quarter}`;
                quarterlyData[quarterKey] = (quarterlyData[quarterKey] || 0) + parseFloat(expense.amount);
            });

            const labels = Object.keys(quarterlyData).sort();
            const data = labels.map(label => quarterlyData[label]);

            businessCharts.quarterly = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Gastos Trimestrais',
                        data: data,
                        backgroundColor: '#8b5cf6'
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return formatCurrencyDetailed(context.parsed.y);
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                color: '#000000',
                                callback: function(value) {
                                    return `R$ ${value.toFixed(2)}`;
                                }
                            }
                        },
                        x: {
                            ticks: {
                                color: '#000000'
                            }
                        }
                    }
                }
            });
        }
        
        // Liberar flag de renderização
        renderingQuarterly = false;
    }

    // Gráfico de projeção de gastos
    async function renderExpenseProjectionChart(expenses) {
        // Evitar execução concorrente
        if (renderingProjection) {
            console.log('Renderização de projeção já em andamento, ignorando chamada');
            return;
        }
        renderingProjection = true;
        
        let ctx = document.getElementById('expense-projection-chart');
        if (!ctx) {
            renderingProjection = false;
            return;
        }

        // Usar função utilitária para limpar canvas
        ensureCanvasClean(ctx, 'projection');
        
        // Obter canvas novamente caso tenha sido recriado
        ctx = document.getElementById('expense-projection-chart');
        if (!ctx) {
            renderingProjection = false;
            return;
        }

        try {
            // Buscar dados dos últimos 6 meses para calcular projeção mais precisa
            const today = new Date();
            const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 6, 1);
            
            const params = new URLSearchParams({
                is_business: 'true',
                start_date: sixMonthsAgo.toISOString().split('T')[0],
                end_date: today.toISOString().split('T')[0]
            });

            const response = await fetch(`${API_BASE_URL}/api/expenses?${params}`, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });

            if (response.ok) {
                const historicalData = await response.json();
                const businessData = historicalData.filter(expense => expense.is_business_expense);
                
                // Calcular média mensal dos últimos 6 meses
                const monthlyTotals = {};
                businessData.forEach(expense => {
                    const date = new Date(expense.transaction_date);
                    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + parseFloat(expense.amount);
                });

                const values = Object.values(monthlyTotals);
                const average = values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;

                // Projetar próximos 3 meses
                const projectionLabels = [];
                const projectionData = [];

                for (let i = 1; i <= 3; i++) {
                    const futureDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
                    projectionLabels.push(futureDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }));
                    // Aplicar pequena variação baseada na tendência
                    const variation = i * 0.02; // 2% de crescimento por mês
                    projectionData.push(average * (1 + variation));
                }

                // Verificação final antes de criar o gráfico
                const finalCheck = Chart.getChart(ctx);
                if (finalCheck) {
                    console.warn(`AVISO: Ainda existe gráfico ID ${finalCheck.id} no canvas expense-projection-chart`);
                    try {
                        finalCheck.destroy();
                    } catch (e) {
                        console.error('Erro ao destruir gráfico restante:', e);
                    }
                }

                businessCharts.projection = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: projectionLabels,
                        datasets: [{
                            label: 'Projeção Baseada em Histórico',
                            data: projectionData,
                            borderColor: '#f59e0b',
                            backgroundColor: 'rgba(245, 158, 11, 0.1)',
                            borderDash: [5, 5],
                            tension: 0.4,
                            fill: true
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        return formatCurrencyDetailed(context.parsed.y);
                                    }
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    color: '#000000',
                                    callback: function(value) {
                                        return formatCurrencyDetailed(value);
                                    }
                                }
                            },
                            x: {
                                ticks: {
                                    color: '#000000'
                                }
                            }
                        }
                    }
                });
            }
        } catch (error) {
            console.error('Erro ao carregar dados para projeção:', error);
            // Usar função utilitária para limpar canvas no fallback
            ensureCanvasClean(ctx, 'projection');
            
            // Fallback com dados atuais
            const monthlyTotals = {};
            expenses.forEach(expense => {
                const date = new Date(expense.transaction_date);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + parseFloat(expense.amount);
            });

            const values = Object.values(monthlyTotals);
            const average = values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;

            const projectionLabels = [];
            const projectionData = [];

            for (let i = 1; i <= 3; i++) {
                const futureDate = new Date().setMonth(new Date().getMonth() + i);
                projectionLabels.push(new Date(futureDate).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }));
                projectionData.push(average);
            }

            businessCharts.projection = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: projectionLabels,
                    datasets: [{
                        label: 'Projeção',
                        data: projectionData,
                        borderColor: '#f59e0b',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        borderDash: [5, 5],
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return formatCurrency(value);
                                }
                            }
                        }
                    }
                }
            });
        }
        
        // Liberar flag de renderização
        renderingProjection = false;
    }

    // Popular tabela de gastos empresariais
    function populateBusinessTable(expenses) {
        if (!businessExpensesTable) return;

        businessExpensesTable.innerHTML = '';

        if (expenses.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="8" class="p-6 text-center text-gray-500">Nenhum gasto empresarial encontrado</td>';
            businessExpensesTable.appendChild(row);
            return;
        }

        expenses.forEach(expense => {
            const row = document.createElement('tr');
            row.className = 'business-table-row border-b hover:bg-gray-50';
            
            const billingPeriod = calculateBillingPeriod(expense.transaction_date, expense.account);
            
            // Verificar se tem nota fiscal
            const hasInvoice = expense.has_invoice === 1 || expense.has_invoice === true;
            const invoiceFile = expense.invoice_path || expense.invoice_file;
            
            row.innerHTML = `
                <td class="p-3" style="color: #000000;">${formatDate(expense.transaction_date)}</td>
                <td class="p-3 max-w-xs truncate" style="color: #000000;" title="${expense.description}">${expense.description}</td>
                <td class="p-3 font-semibold text-blue-600" style="color: #000000;">${formatCurrencyDetailed(parseFloat(expense.amount))}</td>
                <td class="p-3" style="color: #000000;">
                    <span class="px-2 py-1 bg-gray-100 rounded text-sm" style="color: #000000;">${expense.account}</span>
                </td>
                <td class="p-3" style="color: #000000;">${expense.account_plan_code || 'N/A'}</td>
                <td class="p-3">
                    <span class="${hasInvoice ? 'invoice-status-yes' : 'invoice-status-no'}" style="color: #000000;">
                        ${hasInvoice ? '✅ Sim' : '❌ Não'}
                    </span>
                </td>
                <td class="p-3">
                    <span class="billing-period-badge" style="color: #000000;">${billingPeriod}</span>
                </td>
                <td class="p-3">
                    <div class="flex gap-2">
                        <button onclick="editExpense(${expense.id})" class="text-blue-600 hover:text-blue-800 p-1 rounded" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        ${invoiceFile ? 
                            `<a href="${API_BASE_URL}/uploads/${invoiceFile}" target="_blank" 
                               class="text-green-600 hover:text-green-800 p-1 rounded" title="Ver Nota Fiscal">
                               <i class="fas fa-file-invoice"></i>
                             </a>` : 
                            `<span class="text-gray-400 p-1" title="Sem nota fiscal">
                               <i class="fas fa-file-invoice"></i>
                             </span>`
                        }
                        ${expense.total_installments > 1 ? 
                            `<span class="text-purple-600 p-1" title="Parcelado ${expense.installment_number}/${expense.total_installments}">
                               <i class="fas fa-credit-card"></i>
                             </span>` : ''
                        }
                        ${expense.is_recurring_expense ? 
                            `<span class="text-orange-600 p-1" title="Gasto Recorrente">
                               <i class="fas fa-sync-alt"></i>
                             </span>` : ''
                        }
                    </div>
                </td>
            `;
            
            businessExpensesTable.appendChild(row);
        });
    }

    // Calcular período de fatura
    function calculateBillingPeriod(transactionDate, account) {
        const date = new Date(transactionDate);
        
        // Definir períodos de fatura por conta
        const billingPeriods = {
            'Nu Bank Ketlyn': { startDay: 2, endDay: 1 },
            'Nu Vainer': { startDay: 2, endDay: 1 },
            'Ourocard Ketlyn': { startDay: 17, endDay: 16 },
            'PicPay Vainer': { startDay: 1, endDay: 30 },
            'PIX': { startDay: 1, endDay: 30, isImmediate: true },
            'Boleto': { startDay: 1, endDay: 30, isImmediate: true }
        };
        
        // PIX e Boleto são considerados imediatos
        if (account === 'PIX' || account === 'Boleto') {
            return 'Imediato';
        }
        
        // Para cartões de crédito, calcular baseado no período de fatura
        const accountConfig = billingPeriods[account];
        if (!accountConfig) {
            return 'N/A';
        }
        
        const { startDay, endDay } = accountConfig;
        let billingMonth = date.getMonth();
        let billingYear = date.getFullYear();
        
        // Se o dia da transação for maior ou igual ao dia de início do ciclo,
        // a fatura será fechada no próximo mês
        if (date.getDate() >= startDay) {
            billingMonth++;
            if (billingMonth > 11) {
                billingMonth = 0;
                billingYear++;
            }
        }
        
        // Retornar o mês de fechamento da fatura
        return new Date(billingYear, billingMonth, endDay).toLocaleDateString('pt-BR', { 
            month: 'short', 
            year: 'numeric' 
        });
    }

    // Carregar análise por período de fatura
    async function loadBillingPeriodAnalysis() {
        const year = billingYearSelect.value;
        const month = billingMonthSelect.value;
        const account = billingAccountSelect.value;
        
        if (!year) {
            showToast('Selecione um ano', 'warning');
            return;
        }

        try {
            // Usar função utilitária para limpar canvas
            const billingCanvas = document.getElementById('billing-period-chart');
            ensureCanvasClean(billingCanvas, 'billingPeriod');

            // Buscar gastos empresariais para o ano/mês/conta selecionado
            const params = new URLSearchParams({
                is_business: 'true',
                year: year
            });
            
            if (month) {
                params.append('month', month);
            }

            if (account) {
                params.append('account', account);
            }

            const response = await fetch(`${API_BASE_URL}/api/expenses?${params}`, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });

            if (!response.ok) throw new Error('Erro ao buscar dados');
            const allExpenses = await response.json();
            
            // Filtrar gastos empresariais
            let businessExpenses = allExpenses.filter(expense => expense.is_business_expense);
            
            // Filtrar por conta específica se selecionada
            if (account) {
                businessExpenses = businessExpenses.filter(expense => expense.account === account);
            }
            
            // Se mês específico foi selecionado, filtrar por período de fatura
            if (month) {
                const targetDate = new Date(year, month - 1);
                const targetPeriod = targetDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
                
                businessExpenses = businessExpenses.filter(expense => {
                    const billingPeriod = calculateBillingPeriod(expense.transaction_date, expense.account);
                    return billingPeriod === targetPeriod || billingPeriod === 'Imediato';
                });
            }

            // Mostrar resumo do período
            showBillingSummary(businessExpenses, account);
            renderBillingPeriodChart(businessExpenses, account);
            
        } catch (error) {
            console.error('Erro ao carregar análise de fatura:', error);
            showToast('Erro ao carregar dados de fatura', 'error');
        }
    }

    // Mostrar resumo do período de fatura
    function showBillingSummary(expenses, selectedAccount = '') {
        billingSummary.classList.remove('hidden');
        
        const total = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
        const count = expenses.length;
        const average = count > 0 ? total / count : 0;
        const maxExpense = expenses.length > 0 ? Math.max(...expenses.map(exp => parseFloat(exp.amount))) : 0;

        // Formatação com separadores de milhares e cor preta
        document.getElementById('billing-period-total').textContent = formatCurrencyDetailed(total);
        document.getElementById('billing-period-total').style.color = '#000000';
        
        document.getElementById('billing-period-count').textContent = count.toLocaleString('pt-BR');
        document.getElementById('billing-period-count').style.color = '#000000';
        
        document.getElementById('billing-period-avg').textContent = formatCurrencyDetailed(average);
        document.getElementById('billing-period-avg').style.color = '#000000';
        
        document.getElementById('billing-period-max').textContent = formatCurrencyDetailed(maxExpense);
        document.getElementById('billing-period-max').style.color = '#000000';

        // Atualizar título do resumo com conta selecionada
        const summaryTitle = selectedAccount ? 
            `Resumo para ${selectedAccount}` : 
            'Resumo Geral';
        
        // Adicionar indicador visual da conta filtrada
        const existingTitle = document.querySelector('#billing-summary h4');
        if (existingTitle) {
            existingTitle.textContent = summaryTitle;
        }
    }

    // Renderizar gráfico do período de fatura
    function renderBillingPeriodChart(expenses, selectedAccount = '') {
        const ctx = document.getElementById('billing-period-chart');
        if (!ctx) return;

        // Usar função utilitária para limpar canvas
        ensureCanvasClean(ctx, 'billingPeriod');

        // Agrupar por dia
        const dailyData = {};
        expenses.forEach(expense => {
            const date = new Date(expense.transaction_date).toLocaleDateString('pt-BR');
            dailyData[date] = (dailyData[date] || 0) + parseFloat(expense.amount);
        });

        const labels = Object.keys(dailyData).sort();
        const data = labels.map(label => dailyData[label]);

        const chartTitle = selectedAccount ? 
            `Gastos Diários - ${selectedAccount}` : 
            'Gastos Diários - Todas as Contas';

        businessCharts.billingPeriod = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: chartTitle,
                    data: data,
                    backgroundColor: selectedAccount ? '#10b981' : '#3b82f6'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return formatCurrencyDetailed(context.parsed.y);
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: chartTitle,
                        color: '#000000'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#000000',
                            callback: function(value) {
                                return formatCurrencyDetailed(value);
                            }
                        }
                    },
                    x: {
                        ticks: {
                            color: '#000000'
                        }
                    }
                }
            }
        });
    }

    // Gerar alertas empresariais
    function generateBusinessAlerts(expenses) {
        if (!businessAlertsContainer) return;

        businessAlertsContainer.innerHTML = '';
        const alerts = [];

        // Alerta para gastos sem nota fiscal
        const withoutInvoice = expenses.filter(exp => !exp.has_invoice);
        if (withoutInvoice.length > 0) {
            const total = withoutInvoice.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
            alerts.push({
                type: 'warning',
                title: 'Gastos sem Nota Fiscal',
                message: `${withoutInvoice.length} transações (${formatCurrency(total)}) sem nota fiscal`,
                icon: '⚠️'
            });
        }

        // Alerta para gastos altos
        const highExpenses = expenses.filter(exp => parseFloat(exp.amount) > 1000);
        if (highExpenses.length > 0) {
            alerts.push({
                type: 'warning',
                title: 'Gastos Elevados',
                message: `${highExpenses.length} transações acima de R$ 1.000`,
                icon: '📈'
            });
        }

        // Alerta positivo para organização
        const withInvoicePercent = expenses.length > 0 ? (expenses.filter(exp => exp.has_invoice).length / expenses.length) * 100 : 0;
        if (withInvoicePercent >= 80) {
            alerts.push({
                type: 'success',
                title: 'Boa Organização',
                message: `${withInvoicePercent.toFixed(1)}% dos gastos possuem nota fiscal`,
                icon: '✅'
            });
        }

        // Renderizar alertas
        alerts.forEach(alert => {
            const alertDiv = document.createElement('div');
            alertDiv.className = `business-alert ${alert.type} p-4 rounded-lg`;
            alertDiv.innerHTML = `
                <div class="flex items-center gap-3">
                    <span class="text-2xl">${alert.icon}</span>
                    <div>
                        <h4 class="font-semibold">${alert.title}</h4>
                        <p class="text-sm">${alert.message}</p>
                    </div>
                </div>
            `;
            businessAlertsContainer.appendChild(alertDiv);
        });

        if (alerts.length === 0) {
            businessAlertsContainer.innerHTML = '<p class="text-gray-500 text-center py-4">Nenhum alerta no momento</p>';
        }
    }

    // Exportar dados para CSV
    async function exportBusinessDataToCsv() {
        try {
            const expenses = await fetchBusinessExpenses();
            
            if (expenses.length === 0) {
                showToast('Nenhum dado para exportar', 'warning');
                return;
            }

            // Criar cabeçalho CSV
            const headers = [
                'Data',
                'Descrição', 
                'Valor',
                'Conta',
                'Categoria',
                'Nota Fiscal',
                'Período Fatura',
                'Tipo',
                'Parcela',
                'Recorrente'
            ];

            // Converter dados para CSV
            const csvData = expenses.map(expense => {
                const hasInvoice = expense.has_invoice === 1 || expense.has_invoice === true;
                const billingPeriod = calculateBillingPeriod(expense.transaction_date, expense.account);
                
                return [
                    formatDate(expense.transaction_date),
                    `"${expense.description}"`,
                    expense.amount,
                    expense.account,
                    expense.account_plan_code || 'N/A',
                    hasInvoice ? 'Sim' : 'Não',
                    billingPeriod,
                    'Empresarial',
                    expense.total_installments > 1 ? `${expense.installment_number}/${expense.total_installments}` : '1/1',
                    expense.is_recurring_expense ? 'Sim' : 'Não'
                ].join(',');
            });

            // Criar arquivo CSV
            const csvContent = [headers.join(','), ...csvData].join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            
            // Download do arquivo
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `gastos_empresariais_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showToast('Dados exportados com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao exportar CSV:', error);
            showToast('Erro ao exportar dados', 'error');
        }
    }

    // Exportar dados para PDF
    async function exportBusinessDataToPdf() {
        try {
            const expenses = await fetchBusinessExpenses();
            
            if (expenses.length === 0) {
                showToast('Nenhum dado para exportar', 'warning');
                return;
            }

            // Preparar dados para o relatório
            const reportData = {
                expenses: expenses,
                filters: {
                    periodo: businessPeriodSelect.options[businessPeriodSelect.selectedIndex].text,
                    conta: businessAccountSelect.value || 'Todas',
                    notaFiscal: businessInvoiceFilter.options[businessInvoiceFilter.selectedIndex].text
                },
                summary: {
                    total: expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0),
                    count: expenses.length,
                    average: expenses.length > 0 ? expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0) / expenses.length : 0,
                    withInvoice: expenses.filter(exp => exp.has_invoice === 1 || exp.has_invoice === true).length
                }
            };

            // Criar formulário para envio ao backend
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = `${API_BASE_URL}/api/reports/business-analysis`;
            form.target = '_blank';

            const tokenInput = document.createElement('input');
            tokenInput.type = 'hidden';
            tokenInput.name = 'token';
            tokenInput.value = getToken();

            const dataInput = document.createElement('input');
            dataInput.type = 'hidden';
            dataInput.name = 'data';
            dataInput.value = JSON.stringify(reportData);

            form.appendChild(tokenInput);
            form.appendChild(dataInput);
            document.body.appendChild(form);
            form.submit();
            document.body.removeChild(form);

            showToast('Gerando relatório PDF...', 'info');
        } catch (error) {
            console.error('Erro ao exportar PDF:', error);
            showToast('Erro ao gerar relatório PDF', 'error');
        }
    }

    // ========== FIM FUNÇÕES ANÁLISE EMPRESARIAL ==========
});