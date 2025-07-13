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
                        formatter: v => {
                            const val = getNumberValue(v);
                            return val > 0 ? formatCurrencyDetailed(val) : '';
                        }
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

    // ========== SISTEMA AVANÇADO DE ANÁLISE DE FATURAS ==========
    const billingForm = document.getElementById('billing-period-form');
    const billingResults = document.getElementById('billing-results');
    const billingLoading = document.getElementById('billing-loading');
    const setCurrentMonthBtn = document.getElementById('set-current-month-btn');
    const billingAccountFilter = document.getElementById('billing-account-filter');

    // Configuração completa dos períodos de fatura
    const billingPeriods = {
        'Nu Bank Ketlyn': { 
            startDay: 2, 
            endDay: 1, 
            type: 'cross_month',
            description: 'Dia 2 ao dia 1 do mês seguinte',
            color: '#8B5CF6'
        },
        'Nu Vainer': { 
            startDay: 2, 
            endDay: 1, 
            type: 'cross_month',
            description: 'Dia 2 ao dia 1 do mês seguinte',
            color: '#8B5CF6'
        },
        'Ourocard Ketlyn': { 
            startDay: 17, 
            endDay: 16, 
            type: 'cross_month',
            description: 'Dia 17 ao dia 16 do mês seguinte',
            color: '#F59E0B'
        },
        'PicPay Vainer': { 
            startDay: 1, 
            endDay: 30, 
            type: 'same_month',
            description: 'Dia 1 ao dia 30/31 do mês',
            color: '#10B981'
        },
        'Ducatto': { 
            startDay: 1, 
            endDay: 30, 
            type: 'same_month',
            description: 'Dia 1 ao dia 30/31 do mês',
            color: '#3B82F6'
        },
        'Master': { 
            startDay: 1, 
            endDay: 30, 
            type: 'same_month',
            description: 'Dia 1 ao dia 30/31 do mês',
            color: '#EF4444'
        }
    };

    // Inicializar valores padrão para o sistema de faturas
    function initializeBillingSystem() {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;

        // Definir ano atual
        if (billingYearSelect) {
            // Limpar e preencher opções de ano
            billingYearSelect.innerHTML = '';
            for (let year = currentYear; year >= currentYear - 3; year--) {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                billingYearSelect.appendChild(option);
            }
            billingYearSelect.value = currentYear;
        }

        // Definir mês atual
        if (billingMonthSelect) {
            billingMonthSelect.value = currentMonth;
        }
    }

    // Botão para definir mês atual
    if (setCurrentMonthBtn) {
        setCurrentMonthBtn.addEventListener('click', function() {
            const currentDate = new Date();
            const currentYear = currentDate.getFullYear();
            const currentMonth = currentDate.getMonth() + 1;

            if (billingYearSelect) billingYearSelect.value = currentYear;
            if (billingMonthSelect) billingMonthSelect.value = currentMonth;

            showNotification('Mês atual definido com sucesso!', 'success');
        });
    }

    // Função unificada para calcular período de fatura específico
    function calculateBillingPeriodForAnalysis(account, year, month) {
        console.log(`🔍 Calculando período para ${account} - ${month}/${year}`);
        
        const config = billingPeriods[account];
        if (!config) {
            console.error(`❌ Configuração não encontrada para ${account}`);
            return { error: `Configuração de fatura não encontrada para ${account}` };
        }

        // Validar parâmetros de entrada
        if (!year || !month || isNaN(year) || isNaN(month) || month < 1 || month > 12) {
            console.error(`❌ Parâmetros inválidos:`, { year, month });
            return { error: 'Parâmetros de ano e mês inválidos' };
        }

        let startDate, endDate;
        
        try {
            if (config.type === 'cross_month') {
                // Para contas que cruzam mês (Nu Bank, Ourocard)
                // O mês selecionado é o de fechamento, buscar gastos do período anterior
                const previousMonth = month === 1 ? 12 : month - 1;
                const previousYear = month === 1 ? year - 1 : year;
                
                startDate = new Date(previousYear, previousMonth - 1, config.startDay);
                endDate = new Date(year, month - 1, config.endDay);
            } else {
                // Para contas de mesmo mês (PicPay, Ducatto, Master)
                // O mês selecionado é o de fechamento, buscar gastos do mesmo período
                const targetMonth = month === 1 ? 12 : month - 1;
                const targetYear = month === 1 ? year - 1 : year;
                
                startDate = new Date(targetYear, targetMonth - 1, config.startDay);
                
                // Calcular último dia do mês
                const lastDay = new Date(targetYear, targetMonth, 0).getDate();
                endDate = new Date(targetYear, targetMonth - 1, Math.min(config.endDay, lastDay));
            }

            // Validar se as datas foram criadas corretamente
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                console.error(`❌ Datas inválidas calculadas:`, { startDate, endDate });
                return { error: 'Erro ao calcular datas do período de fatura' };
            }

            // Verificar se startDate não é posterior a endDate
            if (startDate > endDate) {
                console.error(`❌ Data início posterior à data fim:`, { startDate, endDate });
                return { error: 'Data de início não pode ser posterior à data de fim' };
            }

            const periodDescription = `${startDate.toLocaleDateString('pt-BR')} a ${endDate.toLocaleDateString('pt-BR')}`;
            console.log(`✅ Período calculado para ${account}: ${periodDescription}`);

            return {
                startDate,
                endDate,
                config,
                periodDescription
            };
        } catch (error) {
            console.error('❌ Erro ao calcular período de fatura:', error);
            return { error: 'Erro interno ao calcular período de fatura' };
        }
    }

    // Testar conexão com o banco de dados
    async function testDatabaseConnection() {
        try {
            const token = getToken();
            if (!token) {
                console.warn('⚠️ Token de autenticação não encontrado para teste de conectividade');
                return false;
            }

            console.log('🔗 Testando conexão com o banco de dados...');
            
            // Fazer uma requisição simples para testar a conectividade
            const response = await fetch(`${API_BASE_URL}/api/expenses?limit=1`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('✅ Conexão com banco de dados OK - Dados disponíveis:', data.length, 'registro(s)');
                showDatabaseStatus(true, data.length);
                return true;
            } else {
                console.error('❌ Erro na conexão com banco de dados:', response.status, response.statusText);
                showDatabaseStatus(false, 0);
                return false;
            }
        } catch (error) {
            console.error('❌ Erro ao testar conexão com banco:', error.message);
            showDatabaseStatus(false, 0);
            return false;
        }
    }

    // Mostrar status da conexão com banco
    function showDatabaseStatus(connected, recordCount) {
        // Remove status anterior se existir
        const existingStatus = document.getElementById('db-status');
        if (existingStatus) {
            existingStatus.remove();
        }
        
        // Cria um pequeno indicador de status
        const statusDiv = document.createElement('div');
        statusDiv.id = 'db-status';
        statusDiv.className = `fixed bottom-4 right-4 z-50 px-3 py-2 rounded-lg text-sm font-medium shadow-lg ${
            connected ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'
        }`;
        statusDiv.innerHTML = connected 
            ? `<i class="fas fa-database"></i> Banco Conectado (${recordCount > 0 ? recordCount + ' registros' : 'sem dados'})`
            : `<i class="fas fa-exclamation-triangle"></i> Banco Desconectado`;
        
        // Adiciona à página
        document.body.appendChild(statusDiv);
        
        // Remove automaticamente após 5 segundos
        setTimeout(() => {
            if (statusDiv.parentNode) {
                statusDiv.remove();
            }
        }, 5000);
    }

    // Configurar botão de teste de conexão
    const testDbConnectionBtn = document.getElementById('test-db-connection-btn');
    if (testDbConnectionBtn) {
        testDbConnectionBtn.addEventListener('click', async function() {
            this.disabled = true;
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testando...';
            
            const success = await testDatabaseConnection();
            
            if (success) {
                showNotification('Conexão com banco de dados estabelecida com sucesso!', 'success');
            } else {
                showNotification('Falha na conexão com banco de dados. Verifique sua conexão e autenticação.', 'error');
            }
            
            this.disabled = false;
            this.innerHTML = '<i class="fas fa-database"></i> Testar Conexão';
        });
    }

    // Inicializar sistema de faturas
    if (billingForm) {
        initializeBillingSystem();
        testDatabaseConnection();
    }

    // Função principal de busca de faturas
    if (billingForm) {
        billingForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const year = parseInt(billingYearSelect?.value, 10);
            const month = parseInt(billingMonthSelect?.value, 10);
            const accountFilter = billingAccountFilter?.value || '';

           
           

            console.log('🚀 Iniciando busca de faturas:', { year, month, accountFilter });

            // Validações mais robustas
            if (!year || !month || isNaN(year) || isNaN(month)) {
                showNotification('Por favor, selecione ano e mês válidos.', 'error');
                return;
            }

            if (year < 2020 || year > 2030) {
                showNotification('Ano deve estar entre 2020 e 2030.', 'error');
                return;
            }

            if (month < 1 || month > 12) {
                showNotification('Mês deve estar entre 1 e 12.', 'error');
                return;
            }

            // Verificar se a conta especificada existe nas configurações
            if (accountFilter && !billingPeriods[accountFilter]) {
                showNotification('Conta selecionada não tem configuração de fatura.', 'error');
                return;
            }

            // Verificar se há token de autenticação
            const token = getToken();
            if (!token) {
                showNotification('Sessão expirada. Faça login novamente.', 'error');
                showLogin();
                return;
            }

            // Mostrar loading com informações detalhadas
            if (billingLoading) {
                const accountsToAnalyze = accountFilter 
                    ? [accountFilter] 
                    : Object.keys(billingPeriods);

                billingLoading.innerHTML = `
                    <i class="fas fa-spinner fa-spin text-3xl text-blue-600 mb-4"></i>
                    <p class="text-gray-600 mb-2">Analisando faturas...</p>
                    <div class="text-sm text-gray-500">
                        <p>📅 Período: ${getMonthName(month)}/${year}</p>
                        <p>🏦 Contas: ${accountsToAnalyze.length} conta(s)</p>
                        <p>🔍 Buscando dados no banco...</p>
                    </div>
                `;
                billingLoading.classList.remove('hidden');
            }
            if (billingResults) {
                billingResults.innerHTML = '';
            }

            try {
                // Determinar contas a analisar
                const accountsToAnalyze = accountFilter 
                    ? [accountFilter] 
                    : Object.keys(billingPeriods);

                console.log('📋 Contas a analisar:', accountsToAnalyze);

                // Buscar dados para cada conta
                const results = await Promise.all(
                    accountsToAnalyze.map(account => analyzeBillingForAccount(account, year, month))
                );

                console.log('📊 Resultados obtidos:', results);

                // Verificar se obteve algum resultado válido
                const successfulResults = results.filter(r => r.success);
                if (successfulResults.length === 0) {
                    showNotification('Nenhuma fatura encontrada para o período selecionado.', 'info');
                    if (billingResults) {
                        billingResults.innerHTML = `
                            <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                                <i class="fas fa-info-circle text-yellow-600 text-3xl mb-3"></i>
                                <h4 class="text-lg font-semibold text-yellow-800 mb-2">Nenhum Dado Encontrado</h4>
                                <p class="text-yellow-700">
                                    Não foram encontrados gastos para o período de ${getMonthName(month)}/${year}.
                                    <br>Verifique se existem gastos cadastrados para essas datas.
                                </p>
                            </div>
                        `;
                    }
                    return;
                }

                // Renderizar resultados
                await renderBillingResults(results, year, month);

                // Notificar sucesso
                const totalExpenses = successfulResults.reduce((sum, r) => sum + (r.stats?.count || 0), 0);
                showNotification(`Análise concluída! ${totalExpenses} gastos encontrados em ${successfulResults.length} conta(s).`, 'success');

            } catch (error) {
                console.error('❌ Erro na busca de faturas:', error);
                showNotification('Erro ao buscar dados das faturas: ' + error.message, 'error');
                
                // Mostrar informações de debug no console
                console.error('Detalhes do erro:', {
                    url: API_BASE_URL,
                    token: token ? 'Presente' : 'Ausente',
                    year,
                    month,
                    accountFilter,
                    accountsToAnalyze: accountFilter ? [accountFilter] : Object.keys(billingPeriods)
                });
                
                if (billingResults) {
                    billingResults.innerHTML = `
                        <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                            <i class="fas fa-exclamation-triangle text-red-600 text-3xl mb-3"></i>
                            <h4 class="text-lg font-semibold text-red-800 mb-2">Erro na Busca</h4>
                            <p class="text-red-700">
                                Ocorreu um erro ao buscar os dados das faturas.
                                <br>Verifique sua conexão e tente novamente.
                            </p>
                            <p class="text-red-600 text-sm mt-2">Erro: ${error.message}</p>
                        </div>
                    `;
                }
            } finally {
                // Ocultar loading
                if (billingLoading) {
                    billingLoading.classList.add('hidden');
                }
            }
        });
    }

    // Renderizar resultados completos da busca de faturas
    async function renderBillingResults(results, year, month) {
        if (!billingResults) return;

        // Preparar dados do resumo
        const summary = {
            totalAccounts: results.length,
            successfulAccounts: results.filter(r => r.success).length,
            totalAmount: 0,
            totalTransactions: 0
        };

        results.forEach(result => {
            if (result.success && result.stats) {
                summary.totalAmount += result.stats.total;
                summary.totalTransactions += result.stats.count;
            }
        });

        // Renderizar cabeçalho com resumo
        let html = `
            <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mb-6">
                <h4 class="text-xl font-bold text-gray-800 mb-4">
                    📊 Resumo das Faturas - ${getMonthName(month)}/${year}
                </h4>
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div class="bg-white p-4 rounded-lg border shadow-sm">
                        <div class="text-sm text-gray-600">Contas Analisadas</div>
                        <div class="text-2xl font-bold text-blue-600">${summary.successfulAccounts}/${summary.totalAccounts}</div>
                    </div>
                    <div class="bg-white p-4 rounded-lg border shadow-sm">
                        <div class="text-sm text-gray-600">Total Gasto</div>
                        <div class="text-2xl font-bold text-green-600">${formatCurrencyDetailed(summary.totalAmount)}</div>
                    </div>
                    <div class="bg-white p-4 rounded-lg border shadow-sm">
                        <div class="text-sm text-gray-600">Transações</div>
                        <div class="text-2xl font-bold text-purple-600">${summary.totalTransactions}</div>
                    </div>
                    <div class="bg-white p-4 rounded-lg border shadow-sm">
                        <div class="text-sm text-gray-600">Média por Transação</div>
                        <div class="text-2xl font-bold text-orange-600">
                            ${summary.totalTransactions > 0 ? formatCurrencyDetailed(summary.totalAmount / summary.totalTransactions) : formatCurrencyDetailed(0)}
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Renderizar cada conta
        results.forEach(result => {
            if (result.error) {
                html += renderErrorCard(result);
            } else {
                html += renderAccountBillingCard(result);
            }
        });

        // Adicionar botão de exportação se houver dados
        if (summary.totalTransactions > 0) {
            html += `
                <div class="mt-6 text-center">
                    <button onclick="exportBillingData(${JSON.stringify(results).replace(/"/g, '&quot;')}, ${year}, ${month})" 
                            class="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors">
                        <i class="fas fa-file-excel"></i> Exportar Dados (CSV)
                    </button>
                </div>
            `;
        }

        billingResults.innerHTML = html;
    }

    // Renderizar card de erro
    function renderErrorCard(result) {
        return `
            <div class="bg-red-50 border border-red-200 rounded-lg p-6 mb-4">
                <div class="flex items-center mb-3">
                    <i class="fas fa-exclamation-triangle text-red-600 text-2xl mr-3"></i>
                    <h5 class="text-lg font-semibold text-red-800">${result.account}</h5>
                </div>
                <p class="text-red-700">
                    <strong>Erro:</strong> ${result.error}
                </p>
                <p class="text-red-600 text-sm mt-2">
                    Verifique se existem gastos cadastrados para esta conta no período selecionado.
                </p>
            </div>
        `;
    }

    // Renderizar card completo para uma conta
    function renderAccountBillingCard(result) {
        const { account, period, stats, expenses, config } = result;
        
        // Calcular categorias mais gastas
        const topCategories = Object.entries(stats.byCategory)
            .sort((a, b) => b[1].total - a[1].total)
            .slice(0, 3);

        return `
            <div class="bg-white border border-gray-200 rounded-lg shadow-lg mb-6 overflow-hidden">
                <!-- Cabeçalho da conta -->
                <div class="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <h5 class="text-xl font-bold mb-2">${account}</h5>
                            <p class="text-blue-100 text-sm">
                                <i class="fas fa-calendar-alt mr-2"></i>
                                Período: ${period}
                            </p>
                            <p class="text-blue-100 text-sm">
                                <i class="fas fa-info-circle mr-2"></i>
                                ${config.description}
                            </p>
                        </div>
                        <div class="text-right">
                            <div class="text-3xl font-bold">
                                ${formatCurrencyDetailed(stats.total)}
                            </div>
                            <div class="text-sm text-gray-200">${stats.count} transações</div>
                        </div>
                    </div>
                </div>

                <!-- Estatísticas -->
                <div class="p-4 bg-gray-50 border-b">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div class="text-center">
                            <div class="text-sm text-gray-600">Gasto Médio</div>
                            <div class="text-lg font-semibold text-blue-600">
                                ${formatCurrencyDetailed(stats.average)}
                            </div>
                        </div>
                        <div class="text-center">
                            <div class="text-sm text-gray-600">Maior Gasto</div>
                            <div class="text-lg font-semibold text-red-600">
                                ${formatCurrencyDetailed(stats.maxAmount)}
                            </div>
                        </div>
                        <div class="text-center">
                            <div class="text-sm text-gray-600">Menor Gasto</div>
                            <div class="text-lg font-semibold text-green-600">
                                ${formatCurrencyDetailed(stats.minAmount)}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Top categorias -->
                ${topCategories.length > 0 ? `
                <div class="p-4 border-b">
                    <h6 class="font-semibold text-gray-700 mb-3">🏆 Top 3 Categorias</h6>
                    <div class="space-y-2">
                        ${topCategories.map(([category, data], index) => `
                            <div class="flex justify-between items-center">
                                <span class="text-sm text-gray-600">
                                    ${index + 1}. Plano ${category} (${data.count} transações)
                                </span>
                                <span class="font-medium text-gray-800">
                                    ${formatCurrency(data.total)}
                                </span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}

                <!-- Lista de transações -->
                <div class="p-4">
                    <div class="flex justify-between items-center mb-3">
                        <h6 class="font-semibold text-gray-700">📋 Transações do Período</h6>
                        <button onclick="toggleTransactions('${account.replace(/'/g, "\\'")}')" 
                                class="text-blue-600 hover:text-blue-800 text-sm">
                            <i class="fas fa-eye"></i> Ver Detalhes
                        </button>
                    </div>
                    
                    <div id="transactions-${account.replace(/\s+/g, '-')}" class="hidden">
                        <div class="max-h-60 overflow-y-auto">
                            <table class="w-full text-sm">
                                <thead class="bg-gray-100 sticky top-0">
                                    <tr>
                                        <th class="text-left p-2">Data</th>
                                        <th class="text-left p-2">Descrição</th>
                                        <th class="text-right p-2">Valor</th>
                                        <th class="text-center p-2">Categoria</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${expenses.map(expense => `
                                        <tr class="border-b hover:bg-gray-50">
                                            <td class="p-2">${new Date(expense.transaction_date).toLocaleDateString('pt-BR')}</td>
                                            <td class="p-2">${expense.description}</td>
                                            <td class="p-2 text-right font-medium">${formatCurrencyDetailed(parseFloat(expense.amount))}</td>
                                            <td class="p-2 text-center">
                                                <span class="bg-gray-100 px-2 py-1 rounded text-xs">
                                                    ${expense.account_plan_code || 'N/A'}
                                                </span>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Função para alternar visibilidade das transações
    window.toggleTransactions = function(account) {
        const accountId = account.replace(/\s+/g, '-');
        const element = document.getElementById(`transactions-${accountId}`);
        if (element) {
            element.classList.toggle('hidden');
            const button = element.previousElementSibling.querySelector('button');
            if (button) {
                const icon = button.querySelector('i');
                if (element.classList.contains('hidden')) {
                    icon.className = 'fas fa-eye';
                    button.innerHTML = '<i class="fas fa-eye"></i> Ver Detalhes';
                } else {
                    icon.className = 'fas fa-eye-slash';
                    button.innerHTML = '<i class="fas fa-eye-slash"></i> Ocultar Detalhes';
                }
            }
        }
    };

    // Função para exportar dados de fatura
    window.exportBillingData = function(results, year, month) {
        try {
            let csv = 'Conta,Data,Descrição,Valor,Categoria,Tipo,Período\n';
            
            results.forEach(result => {
                if (result.success && result.expenses) {
                    result.expenses.forEach(expense => {
                        csv += `"${result.account}","${new Date(expense.transaction_date).toLocaleDateString('pt-BR')}","${expense.description}","${parseFloat(expense.amount).toFixed(2)}","${expense.account_plan_code || 'N/A'}","${expense.is_business_expense ? 'Empresarial' : 'Pessoal'}","${result.period}"\n`;
                    });
                }
            });

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `faturas_${getMonthName(month)}_${year}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showToast('Dados exportados com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao exportar dados:', error);
            showToast('Erro ao exportar dados', 'error');
        }
    };

    // Inicializar sistema de faturas quando o DOM carregar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeBillingSystem);
    } else {
        initializeBillingSystem();
    }

    // Função auxiliar para obter nome do mês
    function getMonthName(monthNumber) {
        const months = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        return months[monthNumber - 1] || 'Mês Inválido';
    }

    // Analisar fatura para uma conta específica
    async function analyzeBillingForAccount(account, year, month) {
        try {
            console.log(`🔍 Iniciando análise para ${account} - ${month}/${year}`);
            
            // Obter token de autenticação primeiro
            const token = getToken();
            if (!token) {
                console.error('❌ Token de autenticação não encontrado');
                return { 
                    account, 
                    error: 'Sessão expirada. Faça login novamente.', 
                    success: false 
                };
            }
            
            const period = calculateBillingPeriodForAnalysis(account, year, month);
            
            if (period.error) {
                console.error(`❌ Erro no cálculo do período para ${account}:`, period.error);
                return { account, error: period.error, success: false };
            }

            const { startDate, endDate, config, periodDescription } = period;

            // Validação adicional das datas
            if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                console.error(`❌ Datas inválidas para ${account}:`, { startDate, endDate });
                return { 
                    account, 
                    error: 'Datas de período inválidas', 
                    success: false 
                };
            }

            // Buscar gastos no período
            const startDateStr = startDate.toISOString().slice(0, 10);
            const endDateStr = endDate.toISOString().slice(0, 10);
            
            console.log(`📅 Buscando gastos para ${account} de ${startDateStr} a ${endDateStr}`);
            
            const url = `${API_BASE_URL}/api/expenses?account=${encodeURIComponent(account)}&start_date=${startDateStr}&end_date=${endDateStr}`;
            console.log(`🌐 URL da API:`, url);
            
            const response = await fetch(url, { 
                headers: { Authorization: `Bearer ${token}` } 
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`❌ Erro HTTP para ${account}:`, response.status, errorText);
                throw new Error(`Erro ao buscar dados para ${account}: ${response.status} - ${errorText}`);
            }

            const expenses = await response.json();
            console.log(`💰 Gastos encontrados para ${account}:`, expenses.length, 'registros');

            // Filtrar e validar gastos
            const validExpenses = expenses.filter(expense => {
                const expenseDate = new Date(expense.transaction_date);
                const isValid = expenseDate >= startDate && expenseDate <= endDate;
                if (!isValid) {
                    console.log(`⚠️ Gasto fora do período filtrado:`, expense.transaction_date, expense.description);
                }
                return isValid;
            });

            console.log(`✅ Gastos válidos para ${account}:`, validExpenses.length, 'de', expenses.length);

            // Calcular estatísticas
            const stats = calculateBillingStats(validExpenses);
            console.log(`📊 Estatísticas para ${account}:`, stats);

            return {
                account,
                config,
                period: periodDescription,
                startDate,
                endDate,
                expenses: validExpenses,
                stats,
                success: true
            };

        } catch (error) {
            console.error(`❌ Erro ao analisar ${account}:`, error);
            return { 
                account, 
                error: error.message || 'Erro desconhecido',
                success: false
            };
        }
    }

    // Calcular estatísticas da fatura
    function calculateBillingStats(expenses) {
        const total = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);
        const count = expenses.length;
        const average = count > 0 ? total / count : 0;
        
        const amounts = expenses.map(exp => parseFloat(exp.amount || 0));
        const maxAmount = Math.max(...amounts, 0);
        const minAmount = count > 0 ? Math.min(...amounts) : 0;

        // Agrupar por categoria
        const byCategory = {};
        expenses.forEach(exp => {
            const category = exp.account_plan_code || 'Sem categoria';
            if (!byCategory[category]) {
                byCategory[category] = { count: 0, total: 0 };
            }
            byCategory[category].count++;
            byCategory[category].total += parseFloat(exp.amount || 0);
        });

        return {
            total,
            count,
            average,
            maxAmount,
            minAmount,
            byCategory
        };
    }

    // Função para destruir instância de gráfico de forma segura
    function destroyChartInstance(chartInstance, canvasId) {
        if (chartInstance) {
            try {
                chartInstance.destroy();
            } catch (e) {
                console.warn(`Erro ao destruir gráfico ${canvasId}:`, e);
            }
        }
        return null;
    }

    // ========== FUNÇÕES DE GASTOS RECORRENTES ==========
    
    // Abrir modal de gastos recorrentes
    function openRecurringModal() {
        if (recurringModal) {
            recurringModal.classList.remove('hidden', 'opacity-0');
            setTimeout(() => recurringModal.classList.remove('opacity-0'), 10);
            loadRecurringExpenses();
        }
    }

    // Fechar modal de gastos recorrentes
    function closeRecurringModal() {
        if (recurringModal) {
            recurringModal.classList.add('opacity-0');
            setTimeout(() => recurringModal.classList.add('hidden'), 300);
        }
    }

    // Carregar lista de gastos recorrentes
    async function loadRecurringExpenses() {
        try {
            const token = getToken();
            if (!token) return;

            const response = await fetch(`${API_BASE_URL}/api/recurring-expenses`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Erro ao buscar gastos recorrentes');

            const recurringExpenses = await response.json();
            renderRecurringExpensesList(recurringExpenses);
        } catch (error) {
            console.error('Erro ao carregar gastos recorrentes:', error);
            showNotification('Erro ao carregar gastos recorrentes', 'error');
        }
    }

    // Renderizar lista de gastos recorrentes
    function renderRecurringExpensesList(expenses) {
        if (!recurringList) return;

        if (expenses.length === 0) {
            recurringList.innerHTML = '<div class="text-gray-500 text-center p-4">Nenhum gasto recorrente cadastrado.</div>';
            return;
        }

        recurringList.innerHTML = expenses.map(expense => `
            <div class="bg-white border rounded-lg p-4 shadow-sm">
                <div class="flex justify-between items-start mb-2">
                    <h4 class="font-semibold text-gray-800">${expense.description}</h4>
                    <div class="flex gap-2">
                        <button onclick="editRecurringExpense(${expense.id})" class="text-blue-600 hover:text-blue-800 text-sm">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button onclick="deleteRecurringExpense(${expense.id})" class="text-red-600 hover:text-red-800 text-sm">
                            <i class="fas fa-trash"></i> Remover
                        </button>
                    </div>
                </div>
                <div class="text-sm text-gray-600 space-y-1">
                    <p><strong>Valor:</strong> ${formatCurrency(parseFloat(expense.amount))}</p>
                    <p><strong>Conta:</strong> ${expense.account}</p>
                    <p><strong>Dia do mês:</strong> ${expense.day_of_month}</p>
                    <p><strong>Tipo:</strong> ${expense.is_business_expense ? 'Empresarial' : 'Pessoal'}</p>
                    ${expense.account_plan_code ? `<p><strong>Plano de conta:</strong> ${expense.account_plan_code}</p>` : ''}
                </div>
            </div>
        `).join('');
    }

    // Submeter novo gasto recorrente
    async function handleRecurringExpenseSubmit(e) {
        e.preventDefault();
        
        // Prevenir submissões duplicadas
        if (isSubmittingRecurringExpense) {
            console.log('Submissão de gasto recorrente já em andamento. Ignorando duplicata.');
            showNotification('Aguarde, processando gasto recorrente anterior...', 'warning');
            return;
        }
        
        isSubmittingRecurringExpense = true;
        console.log('Iniciando submissão de gasto recorrente...');
        
        const formData = new FormData(recurringForm);
        const submitButton = recurringForm.querySelector('button[type="submit"]');
        
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Criando...';
        }
        
        try {
            const token = getToken();
            if (!token) {
                showNotification('Sessão expirada. Faça login novamente.', 'error');
                showLogin();
                return;
            }

            // Converter FormData para objeto JSON
            const data = {
                description: formData.get('description'),
                amount: parseFloat(formData.get('amount')),
                account: formData.get('account'),
                day_of_month: parseInt(formData.get('day_of_month')),
                account_plan_code: formData.get('account_plan_code') || null,
                is_business_expense: formData.has('is_business_expense')
            };

            const response = await fetch(`${API_BASE_URL}/api/recurring-expenses`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message);
            }

            recurringForm.reset();
            loadRecurringExpenses();
            showNotification('Gasto recorrente criado com sucesso!', 'success');
            console.log('Gasto recorrente criado com sucesso');
            
        } catch (error) {
            console.error('Erro ao criar gasto recorrente:', error);
            showNotification(`Erro: ${error.message}`, 'error');
        } finally {
            isSubmittingRecurringExpense = false;
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.innerHTML = 'Criar Gasto Recorrente';
            }
            console.log('Submissão de gasto recorrente finalizada');
        }
    }

    // Processar gastos recorrentes para o mês atual
    async function processRecurringExpenses() {
        // Prevenir processamento duplicado
        if (isProcessingRecurringExpenses) {
            console.log('Processamento de gastos recorrentes já em andamento. Ignorando duplicata.');
            showNotification('Aguarde, processamento já em andamento...', 'warning');
            return;
        }
        
        isProcessingRecurringExpenses = true;
        console.log('Iniciando processamento de gastos recorrentes...');
        
        const button = processRecurringBtn;
        if (button) {
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Processando...';
        }
        
        try {
            const currentDate = new Date();
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth() + 1;

            const token = getToken();
            if (!token) {
                showNotification('Sessão expirada. Faça login novamente.', 'error');
                showLogin();
                return;
            }

            const response = await fetch(`${API_BASE_URL}/api/recurring-expenses/process`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ year, month })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message);
            }

            const result = await response.json();
            
            if (result.processedCount > 0) {
                showNotification(`${result.processedCount} gastos recorrentes processados para ${month}/${year}!`, 'success');
                // Recarregar dados do dashboard
                await fetchAllData();
            } else {
                showNotification('Nenhum gasto recorrente pendente para processar.', 'info');
            }
            
            console.log('Processamento de gastos recorrentes concluído:', result);
            
        } catch (error) {
            console.error('Erro ao processar gastos recorrentes:', error);
            showNotification(`Erro: ${error.message}`, 'error');
        } finally {
            isProcessingRecurringExpenses = false;
            if (button) {
                button.disabled = false;
                button.innerHTML = 'Processar Mês Atual';
            }
            console.log('Processamento de gastos recorrentes finalizado');
        }
    }

    // Editar gasto recorrente (placeholder)
    window.editRecurringExpense = function(id) {
        showNotification('Funcionalidade de edição não implementada ainda.', 'info');
    };

    // Deletar gasto recorrente
    window.deleteRecurringExpense = async function(id) {
        if (!confirm('Tem certeza que deseja remover este gasto recorrente?')) {
            return;
        }

        try {
            const token = getToken();
            if (!token) {
                showNotification('Sessão expirada. Faça login novamente.', 'error');
                showLogin();
                return;
            }

            const response = await fetch(`${API_BASE_URL}/api/recurring-expenses/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message);
            }

            showNotification('Gasto recorrente removido com sucesso!', 'success');
            loadRecurringExpenses();
            
        } catch (error) {
            console.error('Erro ao remover gasto recorrente:', error);
            showNotification(`Erro: ${error.message}`, 'error');
        }
    };

    // ========== SISTEMA DE ABAS (TABS) ==========
    
    function initializeTabs() {
        if (!tabButtons || !tabContents) return;
        
        tabButtons.forEach(button => {
            button.addEventListener('click', function() {
                const targetTab = this.dataset.tab;
                switchTab(targetTab);
            });
        });
    }
    
    function switchTab(targetTab) {
        // Remove active class de todos os botões
        tabButtons.forEach(btn => {
            btn.classList.remove('active', 'bg-blue-500', 'text-white');
            btn.classList.add('hover:bg-gray-50');
        });
        
        // Adiciona active class ao botão clicado
        const activeButton = document.querySelector(`[data-tab="${targetTab}"]`);
        if (activeButton) {
            activeButton.classList.add('active', 'bg-blue-500', 'text-white');
            activeButton.classList.remove('hover:bg-gray-50');
        }
        
        // Oculta todos os conteúdos das abas
        tabContents.forEach(content => {
            content.classList.add('hidden');
        });
        
        // Mostra o conteúdo da aba selecionada
        const targetContent = document.getElementById(`${targetTab}-tab`);
        if (targetContent) {
            targetContent.classList.remove('hidden');
        }
        
        // Carrega dados específicos da aba se necessário
        loadTabSpecificData(targetTab);
    }
    
    async function loadTabSpecificData(tabName) {
        try {
            switch (tabName) {
                case 'pix-boleto':
                    await loadPixBoletoData();
                    break;
                case 'business-analysis':
                    await loadBusinessAnalysis();
                    break;
                case 'dashboard':
                    // Dashboard já carrega automaticamente
                    break;
                case 'expenses':
                    // Lista de gastos já carrega automaticamente
                    break;
                case 'reports':
                    // Relatórios são gerados sob demanda
                    break;
            }
        } catch (error) {
            console.error(`Erro ao carregar dados da aba ${tabName}:`, error);
        }
    }

    // ========== FUNÇÕES PIX & BOLETO ==========
    
    function initializePixBoletoFilters() {
        // Preencher anos disponíveis
        if (pixBoletoYear) {
            const currentYear = new Date().getFullYear();
            pixBoletoYear.innerHTML = '';
            for (let year = currentYear; year >= currentYear - 3; year--) {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                pixBoletoYear.appendChild(option);
            }
            pixBoletoYear.value = currentYear;
        }
    }
    
    async function loadPixBoletoData() {
        const token = getToken();
        if (!token) return;
        
        try {
            const params = new URLSearchParams();
            if (pixBoletoType?.value) params.append('account', pixBoletoType.value);
            if (pixBoletoYear?.value) params.append('year', pixBoletoYear.value);
            if (pixBoletoMonth?.value) params.append('month', pixBoletoMonth.value);
            
            // Incluir gastos recorrentes para PIX e Boleto
            params.append('include_recurring', 'true');
            
            const response = await fetch(`${API_BASE_URL}/api/expenses?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (!response.ok) throw new Error('Erro ao buscar dados PIX/Boleto');
            
            const expenses = await response.json();
            
            // Filtrar por PIX e Boleto
            const pixExpenses = expenses.filter(exp => exp.account === 'PIX');
            const boletoExpenses = expenses.filter(exp => exp.account === 'Boleto');
            
            // Aplicar filtro de busca se especificado
            const searchTerm = pixBoletoSearch?.value?.toLowerCase() || '';
            const filteredPixExpenses = searchTerm 
                ? pixExpenses.filter(exp => exp.description.toLowerCase().includes(searchTerm))
                : pixExpenses;
            const filteredBoletoExpenses = searchTerm 
                ? boletoExpenses.filter(exp => exp.description.toLowerCase().includes(searchTerm))
                : boletoExpenses;
            
            // Atualizar totais
            updatePixBoletoTotals(filteredPixExpenses, filteredBoletoExpenses);
            
            // Renderizar tabelas
            renderPixBoletoTables(filteredPixExpenses, filteredBoletoExpenses);
            
            // Renderizar resumos por categoria
            renderPixBoletoCategorySummaries(filteredPixExpenses, filteredBoletoExpenses);
            
        } catch (error) {
            console.error('Erro ao carregar dados PIX/Boleto:', error);
            showNotification('Erro ao carregar dados PIX/Boleto', 'error');
        }
    }
    
    function updatePixBoletoTotals(pixExpenses, boletoExpenses) {
        const pixTotal = pixExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
        const boletoTotal = boletoExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
        const totalTransactions = pixExpenses.length + boletoExpenses.length;
        const grandTotal = pixTotal + boletoTotal;
        
        if (document.getElementById('pix-total')) {
            document.getElementById('pix-total').textContent = formatCurrency(pixTotal);
        }
        if (document.getElementById('boleto-total')) {
            document.getElementById('boleto-total').textContent = formatCurrency(boletoTotal);
        }
        if (document.getElementById('pix-boleto-transactions')) {
            document.getElementById('pix-boleto-transactions').textContent = totalTransactions;
        }
        if (document.getElementById('pix-boleto-grand-total')) {
            document.getElementById('pix-boleto-grand-total').textContent = formatCurrency(grandTotal);
        }
    }
    
    function renderPixBoletoTables(pixExpenses, boletoExpenses) {
        // Renderizar tabela PIX
        if (pixDetailsTable) {
            if (pixExpenses.length === 0) {
                pixDetailsTable.innerHTML = '<tr><td colspan="6" class="text-center p-4 text-gray-500">Nenhuma transação PIX encontrada</td></tr>';
            } else {
                pixDetailsTable.innerHTML = pixExpenses.map(expense => `
                    <tr class="pix-row">
                        <td class="p-3">${new Date(expense.transaction_date).toLocaleDateString('pt-BR')}</td>
                        <td class="p-3">${expense.description}</td>
                        <td class="p-3 font-medium">${formatCurrency(parseFloat(expense.amount))}</td>
                        <td class="p-3">${expense.is_business_expense ? 'Empresarial' : 'Pessoal'}</td>
                        <td class="p-3">${expense.account_plan_code || '-'}</td>
                        <td class="p-3">
                            ${expense.is_recurring_expense ? '<span class="recurring-badge">Recorrente</span>' : '-'}
                        </td>
                    </tr>
                `).join('');
            }
        }
        
        // Renderizar tabela Boleto
        if (boletoDetailsTable) {
            if (boletoExpenses.length === 0) {
                boletoDetailsTable.innerHTML = '<tr><td colspan="6" class="text-center p-4 text-gray-500">Nenhuma transação Boleto encontrada</td></tr>';
            } else {
                boletoDetailsTable.innerHTML = boletoExpenses.map(expense => `
                    <tr class="boleto-row">
                        <td class="p-3">${new Date(expense.transaction_date).toLocaleDateString('pt-BR')}</td>
                        <td class="p-3">${expense.description}</td>
                        <td class="p-3 font-medium">${formatCurrency(parseFloat(expense.amount))}</td>
                        <td class="p-3">${expense.is_business_expense ? 'Empresarial' : 'Pessoal'}</td>
                        <td class="p-3">${expense.account_plan_code || '-'}</td>
                        <td class="p-3">
                            ${expense.is_recurring_expense ? '<span class="recurring-badge">Recorrente</span>' : '-'}
                        </td>
                    </tr>
                `).join('');
            }
        }
    }
    
    function renderPixBoletoCategorySummaries(pixExpenses, boletoExpenses) {
        // Resumo PIX por categoria
        if (pixCategorySummary) {
            const pixByCategory = {};
            pixExpenses.forEach(exp => {
                const category = exp.account_plan_code || 'Sem Plano';
                if (!pixByCategory[category]) {
                    pixByCategory[category] = { count: 0, total: 0 };
                }
                pixByCategory[category].count++;
                pixByCategory[category].total += parseFloat(exp.amount);
            });
            
            if (Object.keys(pixByCategory).length === 0) {
                pixCategorySummary.innerHTML = '<p class="text-gray-500 text-sm">Nenhum dado disponível</p>';
            } else {
                pixCategorySummary.innerHTML = Object.entries(pixByCategory)
                    .sort((a, b) => b[1].total - a[1].total)
                    .map(([category, data]) => `
                        <div class="flex justify-between items-center py-2 border-b border-gray-100">
                            <span class="text-sm text-gray-600">
                                ${category === 'Sem Plano' ? 'Sem Plano' : `Plano ${category}`} (${data.count}x)
                            </span>
                            <span class="font-medium">${formatCurrency(data.total)}</span>
                        </div>
                    `).join('');
            }
        }
        
        // Resumo Boleto por categoria
        if (boletoCategorySummary) {
            const boletoByCategory = {};
            boletoExpenses.forEach(exp => {
                const category = exp.account_plan_code || 'Sem Plano';
                if (!boletoByCategory[category]) {
                    boletoByCategory[category] = { count: 0, total: 0 };
                }
                boletoByCategory[category].count++;
                boletoByCategory[category].total += parseFloat(exp.amount);
            });
            
            if (Object.keys(boletoByCategory).length === 0) {
                boletoCategorySummary.innerHTML = '<p class="text-gray-500 text-sm">Nenhum dado disponível</p>';
            } else {
                boletoCategorySummary.innerHTML = Object.entries(boletoByCategory)
                    .sort((a, b) => b[1].total - a[1].total)
                    .map(([category, data]) => `
                        <div class="flex justify-between items-center py-2 border-b border-gray-100">
                            <span class="text-sm text-gray-600">
                                ${category === 'Sem Plano' ? 'Sem Plano' : `Plano ${category}`} (${data.count}x)
                            </span>
                            <span class="font-medium">${formatCurrency(data.total)}</span>
                        </div>
                    `).join('');
            }
        }
    }

    // ========== ANÁLISE EMPRESARIAL ==========
    
    function initBusinessAnalysis() {
        // Event listener para mudança de período
        if (businessPeriodSelect) {
            businessPeriodSelect.addEventListener('change', function() {
                if (this.value === 'custom') {
                    customDateFields?.classList.remove('hidden');
                } else {
                    customDateFields?.classList.add('hidden');
                }
            });
        }
        
        // Event listeners para filtros
        if (businessAccountSelect) businessAccountSelect.addEventListener('change', loadBusinessAnalysis);
        if (businessInvoiceFilter) businessInvoiceFilter.addEventListener('change', loadBusinessAnalysis);
        if (businessSearchInput) businessSearchInput.addEventListener('input', debounce(loadBusinessAnalysis, 300));
    }
    
    async function loadBusinessAnalysis() {
        const token = getToken();
        if (!token) return;
        
        try {
            // Determinar período baseado na seleção
            const period = businessPeriodSelect?.value || 'current-month';
            let startDate, endDate;
            
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth();
            
            switch (period) {
                case 'current-month':
                    startDate = new Date(currentYear, currentMonth, 1);
                    endDate = new Date(currentYear, currentMonth + 1, 0);
                    break;
                case 'last-month':
                    startDate = new Date(currentYear, currentMonth - 1, 1);
                    endDate = new Date(currentYear, currentMonth, 0);
                    break;
                case 'quarter':
                    const quarterStart = Math.floor(currentMonth / 3) * 3;
                    startDate = new Date(currentYear, quarterStart, 1);
                    endDate = new Date(currentYear, quarterStart + 3, 0);
                    break;
                case 'year':
                    startDate = new Date(currentYear, 0, 1);
                    endDate = new Date(currentYear, 11, 31);
                    break;
                case 'custom':
                    if (businessDateFrom?.value && businessDateTo?.value) {
                        startDate = new Date(businessDateFrom.value);
                        endDate = new Date(businessDateTo.value);
                    } else {
                        showNotification('Selecione as datas personalizadas', 'warning');
                        return;
                    }
                    break;
                default:
                    startDate = new Date(currentYear, currentMonth, 1);
                    endDate = new Date(currentYear, currentMonth + 1, 0);
            }
            
            // Buscar dados empresariais
            const params = new URLSearchParams({
                start_date: startDate.toISOString().slice(0, 10),
                end_date: endDate.toISOString().slice(0, 10)
            });
            
            const response = await fetch(`${API_BASE_URL}/api/expenses?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (!response.ok) throw new Error('Erro ao buscar dados empresariais');
            
            const allExpenses = await response.json();
            
            // Filtrar apenas gastos empresariais
            let businessExpenses = allExpenses.filter(exp => exp.is_business_expense);
            
            // Aplicar filtros adicionais
            const accountFilter = businessAccountSelect?.value;
            const invoiceFilter = businessInvoiceFilter?.value;
            const searchTerm = businessSearchInput?.value?.toLowerCase();
            
            if (accountFilter) {
                businessExpenses = businessExpenses.filter(exp => exp.account === accountFilter);
            }
            
            if (invoiceFilter) {
                if (invoiceFilter === 'with') {
                    businessExpenses = businessExpenses.filter(exp => exp.has_invoice);
                } else if (invoiceFilter === 'without') {
                    businessExpenses = businessExpenses.filter(exp => !exp.has_invoice);
                }
            }
            
            if (searchTerm) {
                businessExpenses = businessExpenses.filter(exp => 
                    exp.description.toLowerCase().includes(searchTerm)
                );
            }
            
            // Atualizar métricas
            updateBusinessMetrics(businessExpenses);
            
            // Renderizar tabela
            renderBusinessExpensesTable(businessExpenses);
            
        } catch (error) {
            console.error('Erro ao carregar análise empresarial:', error);
            showNotification('Erro ao carregar dados empresariais', 'error');
        }
    }
    
    function updateBusinessMetrics(expenses) {
        const total = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
        const withInvoice = expenses.filter(exp => exp.has_invoice);
        const withoutInvoice = expenses.filter(exp => !exp.has_invoice);
        
        const totalWithInvoice = withInvoice.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
        const totalWithoutInvoice = withoutInvoice.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
        
        // Atualizar elementos da UI
        if (document.getElementById('business-total')) {
            document.getElementById('business-total').textContent = formatCurrency(total);
        }
        if (document.getElementById('business-invoiced')) {
            document.getElementById('business-invoiced').textContent = formatCurrency(totalWithInvoice);
        }
        if (document.getElementById('business-non-invoiced')) {
            document.getElementById('business-non-invoiced').textContent = formatCurrency(totalWithoutInvoice);
        }
        
        // Calcular crescimento (placeholder - seria necessário dados históricos)
        if (document.getElementById('business-growth')) {
            document.getElementById('business-growth').textContent = '+0%';
        }
    }
    
    function renderBusinessExpensesTable(expenses) {
        if (!businessExpensesTable) return;
        
        if (expenses.length === 0) {
            businessExpensesTable.innerHTML = '<tr><td colspan="8" class="text-center p-4 text-gray-500">Nenhum gasto empresarial encontrado</td></tr>';
            return;
        }
        
        businessExpensesTable.innerHTML = expenses.map(expense => `
            <tr class="business-table-row">
                <td class="p-3">${new Date(expense.transaction_date).toLocaleDateString('pt-BR')}</td>
                <td class="p-3">${expense.description}</td>
                <td class="p-3 font-medium">${formatCurrency(parseFloat(expense.amount))}</td>
                <td class="p-3">${expense.account}</td>
                <td class="p-3">${expense.account_plan_code || '-'}</td>
                <td class="p-3">
                    <span class="${expense.has_invoice ? 'invoice-status-yes' : 'invoice-status-no'}">
                        ${expense.has_invoice ? 'Sim' : 'Não'}
                    </span>
                </td>
                <td class="p-3">
                    <span class="billing-period-badge">
                        ${calculateBillingPeriod(expense.transaction_date, expense.account)}
                    </span>
                </td>
                <td class="p-3">
                    <button class="text-blue-600 hover:text-blue-800 text-sm mr-2">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="text-red-600 hover:text-red-800 text-sm">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }
    
    // Função para calcular período de fatura (versão simplificada)
    function calculateBillingPeriod(transactionDate, account) {
        const date = new Date(transactionDate);
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        return `${monthNames[date.getMonth()]}/${date.getFullYear()}`;
    }
    
    // Função debounce para evitar muitas chamadas
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
});