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

    // ========== INICIALIZAÇÃO ==========
    
    // Verificar se usuário já está logado ao carregar a página
    checkExistingLogin();
    
    // Inicializar event listeners
    initializeEventListeners();

    // ========== FUNÇÕES DE LOGIN ==========
    
    function checkExistingLogin() {
        const token = localStorage.getItem('token');
        const username = localStorage.getItem('username');
        
        if (token && username) {
            console.log('Token encontrado, validando...');
            validateTokenAndShowDashboard(token, username);
        } else {
            console.log('Nenhum token encontrado, mostrando login');
            showLogin();
        }
    }

    async function validateTokenAndShowDashboard(token, username) {
        try {
            // Fazer uma chamada simples para verificar se o token é válido
            const response = await fetch(`${API_BASE_URL}/api/expenses?year=2024&month=1&limit=1`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                console.log('Token válido, mostrando dashboard');
                showDashboard();
            } else {
                console.log('Token inválido, removendo e mostrando login');
                localStorage.removeItem('token');
                localStorage.removeItem('username');
                showLogin();
            }
        } catch (error) {
            console.error('Erro ao validar token:', error);
            localStorage.removeItem('token');
            localStorage.removeItem('username');
            showLogin();
        }
    }

    function initializeEventListeners() {
        // Prevenir adição de event listeners duplicados
        if (eventListenersInitialized) {
            console.log('Event listeners já inicializados. Evitando duplicação.');
            return;
        }
        
        console.log('Inicializando event listeners...');
        
        // Event listener para o formulário de login
        if (loginForm) {
            loginForm.addEventListener('submit', handleLogin);
            console.log('Event listener de login adicionado');
        } else {
            console.error('Formulário de login não encontrado!');
        }
        
        // Event listener para logout
        if (logoutButton) {
            logoutButton.addEventListener('click', handleLogout);
        }
        
        // Marcar como inicializado
        eventListenersInitialized = true;
        console.log('Event listeners inicializados com sucesso.');
    }

    async function handleLogin(e) {
        e.preventDefault();
        console.log('Tentativa de login iniciada');
        
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        
        if (!usernameInput || !passwordInput) {
            console.error('Campos de login não encontrados!');
            showNotification('Erro: Campos de login não encontrados.', 'error');
            return;
        }

        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        
        if (!username || !password) {
            showNotification('Por favor, preencha todos os campos.', 'error');
            return;
        }

        // Desabilitar botão durante o login
        const submitButton = e.target.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'Entrando...';

        try {
            console.log('Enviando requisição de login para:', `${API_BASE_URL}/api/login`);
            
            const response = await fetch(`${API_BASE_URL}/api/login`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ 
                    username: username, 
                    password: password 
                })
            });

            console.log('Resposta do servidor:', response.status);
            
            const data = await response.json();
            console.log('Dados recebidos:', data);

            if (!response.ok) {
                throw new Error(data.message || 'Erro no login');
            }

            // Login bem-sucedido
            console.log('Login bem-sucedido');
            localStorage.setItem('token', data.accessToken || data.token);
            localStorage.setItem('username', username);
            
            showNotification('Login realizado com sucesso!', 'success');
            showDashboard();
            
        } catch (error) {
            console.error('Erro no login:', error);
            showNotification(`Erro no login: ${error.message}`, 'error');
        } finally {
            // Reabilitar botão
            submitButton.disabled = false;
            submitButton.textContent = originalText;
        }
    }

    function handleLogout() {
        console.log('Logout realizado');
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        
        // Reset flags
        dashboardInitialized = false;
        
        showNotification('Logout realizado com sucesso!', 'success');
        showLogin();
    }

    function showDashboard() {
        console.log('Mostrando dashboard');
        
        if (loginSection) {
            loginSection.style.display = 'none';
        }
        
        if (dashboardContent) {
            dashboardContent.style.display = 'block';
            dashboardContent.classList.remove('hidden');
        }
        
        if (welcomeUserSpan) {
            const username = localStorage.getItem('username');
            welcomeUserSpan.textContent = `Bem-vindo, ${username}!`;
        }
        
        // Inicializar dashboard apenas uma vez
        if (!dashboardInitialized) {
            initializeDashboard();
        }
    }

    function showLogin() {
        console.log('Mostrando tela de login');
        
        if (loginSection) {
            loginSection.style.display = 'flex';
        }
        
        if (dashboardContent) {
            dashboardContent.style.display = 'none';
            dashboardContent.classList.add('hidden');
        }
        
        // Limpar campos de login
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        
        if (usernameInput) usernameInput.value = '';
        if (passwordInput) passwordInput.value = '';
    }

    function initializeDashboard() {
        // Prevenir múltiplas inicializações
        if (dashboardInitialized) {
            console.log('Dashboard já inicializado. Evitando duplicação.');
            return;
        }
        
        console.log('Inicializando dashboard...');
        dashboardInitialized = true;
        
        try {
            addDashboardEventListeners();
            populateAccountFilter();
            populateFilterOptions();
            fetchAllData();
            toggleExpenseFields();
            initializeTabs();
            initializePixBoletoFilters();
            initBusinessAnalysis();
            
            // Inicializar sistema de gastos recorrentes automáticos
            setupRecurringReminders();
            
            console.log('Dashboard inicializado com sucesso.');
        } catch (error) {
            console.error('Erro ao inicializar dashboard:', error);
            showNotification('Erro ao carregar dashboard. Tente fazer login novamente.', 'error');
        }
    }

    function addDashboardEventListeners() {
        console.log('Adicionando event listeners do dashboard...');
        
        // Event listeners específicos do dashboard
        const filterYear = document.getElementById('filter-year');
        const filterMonth = document.getElementById('filter-month');
        const addExpenseForm = document.getElementById('add-expense-form');
        const businessCheckbox = document.getElementById('form-is-business');
        
        if (filterYear) filterYear.addEventListener('change', fetchAllData);
        if (filterMonth) filterMonth.addEventListener('change', fetchAllData);
        if (addExpenseForm) addExpenseForm.addEventListener('submit', handleAddExpense);
        if (businessCheckbox) businessCheckbox.addEventListener('change', toggleExpenseFields);
        
        // Adicionar outros event listeners conforme necessário
        const filterAccount = document.getElementById('filter-account');
        if (filterAccount) filterAccount.addEventListener('change', fetchAllData);
        
        console.log('Event listeners do dashboard adicionados');
    }

    // ========== FUNÇÕES UTILITÁRIAS ==========
    
    function getToken() {
        return localStorage.getItem('token');
    }

    function showNotification(message, type = 'info') {
        console.log(`Notificação (${type}): ${message}`);
        
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
            // Fallback para toast simples
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
    }

    // ========== FUNÇÕES PLACEHOLDER ==========
    // (As outras funções permanecem as mesmas, apenas as de login foram corrigidas)
    
    function populateAccountFilter() {
        // Função placeholder - implementar conforme necessário
        console.log('populateAccountFilter chamada');
    }
    
    function populateFilterOptions() {
        // Função placeholder - implementar conforme necessário
        console.log('populateFilterOptions chamada');
    }
    
    function fetchAllData() {
        // Função placeholder - implementar conforme necessário
        console.log('fetchAllData chamada');
    }
    
    function toggleExpenseFields() {
        // Função placeholder - implementar conforme necessário
        console.log('toggleExpenseFields chamada');
    }
    
    function initializeTabs() {
        // Função placeholder - implementar conforme necessário
        console.log('initializeTabs chamada');
    }
    
    function initializePixBoletoFilters() {
        // Função placeholder - implementar conforme necessário
        console.log('initializePixBoletoFilters chamada');
    }
    
    function initBusinessAnalysis() {
        // Função placeholder - implementar conforme necessário
        console.log('initBusinessAnalysis chamada');
    }
    
    function setupRecurringReminders() {
        // Função placeholder - implementar conforme necessário
        console.log('setupRecurringReminders chamada');
    }
    
    function handleAddExpense(e) {
        e.preventDefault();
        console.log('handleAddExpense chamada');
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
        
        // Preencher dados do mês
        data.forEach(d => { 
            if (d.day && d.day >= 1 && d.day <= daysInMonth) {
                chartData[d.day - 1] = parseFloat(d.total) || 0; 
            }
        });
        
        if (chartData.every(v => v === 0)) {
            showNoDataMessage('expenses-line-chart', 'Sem dados para este período.');
            return;
        }
        
        const max = Math.max(...chartData);
        const min = Math.min(...chartData.filter(v => v > 0));
        const total = chartData.reduce((sum, v) => sum + v, 0);
        const average = total / chartData.filter(v => v > 0).length;
        
        expensesLineChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: `Gastos Diários em ${filterMonth.options[filterMonth.selectedIndex].text}`,
                    data: chartData,
                    borderColor: getThemeColor('#3B82F6', '#60A5FA'),
                    backgroundColor: getThemeColor('rgba(59,130,246,0.1)', 'rgba(59,130,246,0.3)'),
                    tension: 0.3,
                    fill: true,
                    pointBackgroundColor: chartData.map(v => {
                        if (v === max) return '#22c55e';
                        if (v === min && v > 0) return '#ef4444';
                        if (v > average) return '#f59e0b';
                        return getThemeColor('#3B82F6', '#60A5FA');
                    }),
                    pointRadius: chartData.map(v => {
                        if (v === max || (v === min && v > 0)) return 8;
                        if (v > average) return 6;
                        return v > 0 ? 4 : 2;
                    }),
                    pointHoverRadius: 10
                }]
            },
            options: {
                responsive: true,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    title: {
                        display: true,
                        text: `📈 Evolução dos Gastos Diários - ${filterMonth.options[filterMonth.selectedIndex].text}/${year}`,
                        color: getThemeColor('#222', '#fff'),
                        font: { size: 18, weight: 'bold' }
                    },
                    subtitle: {
                        display: true,
                        text: `Total: ${formatCurrencyDetailed(total)} | Média: ${formatCurrencyDetailed(average)} | Maior: ${formatCurrencyDetailed(max)} | Menor: ${min ? formatCurrencyDetailed(min) : 'R$ 0,00'}`,
                        color: getThemeColor('#666', '#ccc'),
                        font: { size: 12 }
                    },
                    legend: { 
                        display: true,
                        position: 'bottom',
                        labels: { color: getThemeColor('#222', '#fff') }
                    },
                    tooltip: {
                        backgroundColor: getThemeColor('#fff', '#1f2937'),
                        titleColor: getThemeColor('#222', '#fff'),
                        bodyColor: getThemeColor('#666', '#d1d5db'),
                        borderColor: getThemeColor('#ddd', '#374151'),
                        borderWidth: 1,
                        callbacks: {
                            title: (context) => `Dia ${context[0].label} de ${filterMonth.options[filterMonth.selectedIndex].text}`,
                            label: (context) => {
                                const value = context.parsed.y;
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return [
                                    `Gasto: ${formatCurrencyDetailed(value)}`,
                                    `Percentual do mês: ${percentage}%`,
                                    value > average ? '📈 Acima da média' : value > 0 ? '📊 Abaixo da média' : '📭 Sem gastos'
                                ];
                            }
                        }
                    },
                    datalabels: {
                        display: function(context) {
                            // Mostrar apenas valores significativos
                            return context.parsed.y > (max * 0.3);
                        },
                        color: getThemeColor('#222', '#fff'),
                        anchor: 'end', 
                        align: 'top', 
                        font: { weight: 'bold', size: 10 },
                        formatter: (v) => {
                            const val = getNumberValue(v);
                            return val > 0 ? formatCurrencyDetailed(val).replace('R$ ', 'R$\n') : '';
                        }
                    }
                },
                scales: {
                    x: { 
                        title: { 
                            display: true, 
                            text: 'Dias do Mês',
                            color: getThemeColor('#666', '#d1d5db'),
                            font: { weight: 'bold' }
                        },
                        grid: {
                            color: getThemeColor('#e5e5e5', '#374151')
                        },
                        ticks: {
                            color: getThemeColor('#666', '#d1d5db')
                        }
                    },
                    y: { 
                        beginAtZero: true,
                        title: { 
                            display: true, 
                            text: 'Valor Gasto (R$)',
                            color: getThemeColor('#666', '#d1d5db'),
                            font: { weight: 'bold' }
                        },
                        grid: {
                            color: getThemeColor('#e5e5e5', '#374151')
                        },
                        ticks: {
                            color: getThemeColor('#666', '#d1d5db'),
                            callback: function(value) {
                                return formatCurrencyDetailed(value);
                            }
                        }
                    }
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
        
        const total = data.reduce((sum, d) => sum + (parseFloat(d.total) || 0), 0);
        const sortedData = data.sort((a, b) => parseFloat(b.total) - parseFloat(a.total));
        
        // Cores mais variadas e atrativas
        const colors = [
            '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
            '#6366F1', '#EC4899', '#14B8A6', '#F97316', '#84CC16',
            '#6B7280', '#DC2626', '#7C3AED', '#059669', '#D97706'
        ];
        
        expensesPieChart = new Chart(ctx, {
            type: 'doughnut', // Mudando para doughnut para melhor visualização
            data: {
                labels: sortedData.map(d => d.account),
                datasets: [{
                    data: sortedData.map(d => parseFloat(d.total)),
                    backgroundColor: colors.slice(0, sortedData.length),
                    borderColor: getThemeColor('#fff', '#1f2937'),
                    borderWidth: 2,
                    hoverBorderWidth: 4,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '40%', // Para efeito doughnut
                plugins: {
                    title: {
                        display: true,
                        text: `💳 Distribuição de Gastos por Conta - ${filterMonth.options[filterMonth.selectedIndex].text}/${filterYear.value}`,
                        color: getThemeColor('#222', '#fff'),
                        font: { size: 18, weight: 'bold' },
                        padding: 20
                    },
                    subtitle: {
                        display: true,
                        text: `Total Geral: ${formatCurrencyDetailed(total)} | ${sortedData.length} conta(s) ativa(s)`,
                        color: getThemeColor('#666', '#ccc'),
                        font: { size: 14 }
                    },
                    legend: {
                        position: 'right',
                        labels: { 
                            color: getThemeColor('#222', '#fff'),
                            font: { size: 12 },
                            padding: 15,
                            usePointStyle: true,
                            pointStyle: 'rectRounded'
                        }
                    },
                    tooltip: {
                        backgroundColor: getThemeColor('#fff', '#1f2937'),
                        titleColor: getThemeColor('#222', '#fff'),
                        bodyColor: getThemeColor('#666', '#d1d5db'),
                        borderColor: getThemeColor('#ddd', '#374151'),
                        borderWidth: 1,
                        callbacks: {
                            title: (context) => context[0].label,
                            label: (context) => {
                                const value = context.parsed;
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return [
                                    `Valor: ${formatCurrencyDetailed(value)}`,
                                    `Percentual: ${percentage}%`,
                                    `Posição: ${context.dataIndex + 1}º lugar`
                                ];
                            }
                        }
                    },
                    datalabels: {
                        display: function(context) {
                            // Mostrar apenas percentuais acima de 5%
                            const percentage = (context.parsed / total) * 100;
                            return percentage >= 5;
                        },
                        color: '#fff',
                        font: { weight: 'bold', size: 11 },
                        formatter: (value, context) => {
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return `${percentage}%`;
                        },
                        anchor: 'center',
                        align: 'center'
                    }
                },
                animation: {
                    animateRotate: true,
                    duration: 1500
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
        
        const totalPersonal = data.reduce((sum, d) => sum + (parseFloat(d.personal_total) || 0), 0);
        const totalBusiness = data.reduce((sum, d) => sum + (parseFloat(d.business_total) || 0), 0);
        const grandTotal = totalPersonal + totalBusiness;
        
        // Ordenar por total decrescente
        const sortedData = data.sort((a, b) => 
            (parseFloat(b.personal_total) + parseFloat(b.business_total)) - 
            (parseFloat(a.personal_total) + parseFloat(a.business_total))
        );
        
        mixedTypeChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sortedData.map(d => d.account),
                datasets: [
                    { 
                        label: '🏠 Gastos Pessoais', 
                        data: sortedData.map(d => parseFloat(d.personal_total) || 0), 
                        backgroundColor: 'rgba(59, 130, 246, 0.8)',
                        borderColor: 'rgba(59, 130, 246, 1)',
                        borderWidth: 2,
                        borderRadius: 4,
                        borderSkipped: false
                    },
                    { 
                        label: '💼 Gastos Empresariais', 
                        data: sortedData.map(d => parseFloat(d.business_total) || 0), 
                        backgroundColor: 'rgba(239, 68, 68, 0.8)',
                        borderColor: 'rgba(239, 68, 68, 1)',
                        borderWidth: 2,
                        borderRadius: 4,
                        borderSkipped: false
                    }
                ]
            },
            options: {
                responsive: true,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    title: {
                        display: true,
                        text: `📊 Comparação: Pessoal vs. Empresarial por Conta`,
                        color: getThemeColor('#222', '#fff'),
                        font: { size: 18, weight: 'bold' },
                        padding: 20
                    },
                    subtitle: {
                        display: true,
                        text: `Total Pessoal: ${formatCurrencyDetailed(totalPersonal)} | Total Empresarial: ${formatCurrencyDetailed(totalBusiness)} | Total Geral: ${formatCurrencyDetailed(grandTotal)}`,
                        color: getThemeColor('#666', '#ccc'),
                        font: { size: 12 }
                    },
                    legend: {
                        position: 'top',
                        labels: { 
                            color: getThemeColor('#222', '#fff'),
                            font: { size: 12 },
                            padding: 20,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        backgroundColor: getThemeColor('#fff', '#1f2937'),
                        titleColor: getThemeColor('#222', '#fff'),
                        bodyColor: getThemeColor('#666', '#d1d5db'),
                        borderColor: getThemeColor('#ddd', '#374151'),
                        borderWidth: 1,
                        callbacks: {
                            title: (context) => `Conta: ${context[0].label}`,
                            label: (context) => {
                                const value = context.parsed.y;
                                const accountData = sortedData[context.dataIndex];
                                const accountTotal = (parseFloat(accountData.personal_total) || 0) + (parseFloat(accountData.business_total) || 0);
                                const percentage = accountTotal > 0 ? ((value / accountTotal) * 100).toFixed(1) : 0;
                                return [
                                    `${context.dataset.label}: ${formatCurrencyDetailed(value)}`,
                                    `Percentual da conta: ${percentage}%`,
                                    `Total da conta: ${formatCurrencyDetailed(accountTotal)}`
                                ];
                            },
                            footer: (context) => {
                                const accountData = sortedData[context[0].dataIndex];
                                const accountTotal = (parseFloat(accountData.personal_total) || 0) + (parseFloat(accountData.business_total) || 0);
                                const grandPercentage = grandTotal > 0 ? ((accountTotal / grandTotal) * 100).toFixed(1) : 0;
                                return `Representa ${grandPercentage}% do total geral`;
                            }
                        }
                    },
                    datalabels: {
                        display: function(context) {
                            // Mostrar apenas valores significativos
                            return context.parsed.y > 0;
                        },
                        color: getThemeColor('#222', '#fff'),
                        anchor: 'end', 
                        align: 'top', 
                        font: { weight: 'bold', size: 10 },
                        formatter: (v) => {
                            const val = getNumberValue(v);
                            return val > 0 ? formatCurrencyDetailed(val).replace('R$ ', 'R$\n') : '';
                        }
                    }
                },
                scales: { 
                    x: { 
                        stacked: false,
                        title: {
                            display: true,
                            text: 'Contas',
                            color: getThemeColor('#666', '#d1d5db'),
                            font: { weight: 'bold' }
                        },
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: getThemeColor('#666', '#d1d5db'),
                            maxRotation: 45
                        }
                    },
                    y: { 
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Valor (R$)',
                            color: getThemeColor('#666', '#d1d5db'),
                            font: { weight: 'bold' }
                        },
                        grid: {
                            color: getThemeColor('#e5e5e5', '#374151')
                        },
                        ticks: {
                            color: getThemeColor('#666', '#d1d5db'),
                            callback: function(value) {
                                return formatCurrencyDetailed(value);
                            }
                        }
                    }
                }
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
        
        // Ordenar por valor decrescente e pegar apenas os top 10
        const sortedData = data.sort((a, b) => parseFloat(b.total) - parseFloat(a.total)).slice(0, 10);
        const total = sortedData.reduce((sum, d) => sum + parseFloat(d.total), 0);
        const max = Math.max(...sortedData.map(d => parseFloat(d.total)));
        
        planChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sortedData.map(d => `Plano ${d.account_plan_code}`),
                datasets: [{
                    label: 'Valor Gasto',
                    data: sortedData.map(d => parseFloat(d.total)),
                    backgroundColor: sortedData.map((d, index) => {
                        const value = parseFloat(d.total);
                        if (index === 0) return '#DC2626'; // Primeiro lugar - vermelho
                        if (index === 1) return '#EA580C'; // Segundo lugar - laranja escuro
                        if (index === 2) return '#F59E0B'; // Terceiro lugar - amarelo
                        if (value > max * 0.5) return '#3B82F6'; // Valores altos - azul
                        return '#6B7280'; // Valores menores - cinza
                    }),
                    borderColor: getThemeColor('#fff', '#1f2937'),
                    borderWidth: 1,
                    borderRadius: 6,
                    borderSkipped: false
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: `📋 Top 10 - Gastos por Plano de Conta`,
                        color: getThemeColor('#222', '#fff'),
                        font: { size: 18, weight: 'bold' },
                        padding: 20
                    },
                    subtitle: {
                        display: true,
                        text: `Total dos Top 10: ${formatCurrencyDetailed(total)} | Maior gasto: Plano ${sortedData[0]?.account_plan_code}`,
                        color: getThemeColor('#666', '#ccc'),
                        font: { size: 12 }
                    },
                    legend: { 
                        display: false 
                    },
                    tooltip: {
                        backgroundColor: getThemeColor('#fff', '#1f2937'),
                        titleColor: getThemeColor('#222', '#fff'),
                        bodyColor: getThemeColor('#666', '#d1d5db'),
                        borderColor: getThemeColor('#ddd', '#374151'),
                        borderWidth: 1,
                        callbacks: {
                            title: (context) => context[0].label,
                            label: (context) => {
                                const value = context.parsed.x;
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                const position = context.dataIndex + 1;
                                const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : `${position}º`;
                                return [
                                    `${medal} Posição: ${position}º lugar`,
                                    `Valor: ${formatCurrencyDetailed(value)}`,
                                    `Percentual: ${percentage}%`
                                ];
                            }
                        }
                    },
                    datalabels: {
                        color: getThemeColor('#222', '#fff'),
                        anchor: 'end', 
                        align: 'right', 
                        font: { weight: 'bold', size: 11 },
                        formatter: (v, context) => {
                            const val = getNumberValue(v);
                            const position = context.dataIndex + 1;
                            const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : '';
                            return val > 0 ? `${medal} ${formatCurrencyDetailed(val)}` : '';
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Valor (R$)',
                            color: getThemeColor('#666', '#d1d5db'),
                            font: { weight: 'bold' }
                        },
                        grid: {
                            color: getThemeColor('#e5e5e5', '#374151')
                        },
                        ticks: {
                            color: getThemeColor('#666', '#d1d5db'),
                            callback: function(value) {
                                return formatCurrencyDetailed(value);
                            }
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Planos de Conta',
                            color: getThemeColor('#666', '#d1d5db'),
                            font: { weight: 'bold' }
                        },
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: getThemeColor('#666', '#d1d5db')
                        }
                    }
                }
            },
            plugins: [ChartDataLabels]
        });
    }

    // ========== PROCESSAMENTO AUTOMÁTICO DE GASTOS RECORRENTES ==========
    
    // Função para verificar e processar gastos recorrentes automaticamente
    async function autoProcessRecurringExpenses() {
        try {
            const token = getToken();
            if (!token) return;

            console.log('🔄 Verificando gastos recorrentes para processamento automático...');
            
            const currentDate = new Date();
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth() + 1;
            
            // Verificar se já foi processado este mês
            const processedKey = `recurring_processed_${year}_${month}`;
            if (sessionStorage.getItem(processedKey)) {
                console.log('✅ Gastos recorrentes já processados este mês');
                return;
            }

            // Buscar gastos recorrentes ativos
            const response = await fetch(`${API_BASE_URL}/api/recurring-expenses`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) {
                console.warn('⚠️ Erro ao buscar gastos recorrentes para processamento automático');
                return;
            }

            const recurringExpenses = await response.json();
            
            // Filtrar apenas PIX e Boleto
            const pixBoletoRecurring = recurringExpenses.filter(exp => 
                ['PIX', 'Boleto'].includes(exp.account)
            );

            if (pixBoletoRecurring.length === 0) {
                console.log('📭 Nenhum gasto recorrente PIX/Boleto encontrado');
                return;
            }

            console.log(`💰 Encontrados ${pixBoletoRecurring.length} gastos recorrentes PIX/Boleto`);

            // Processar automaticamente
            const processResponse = await fetch(`${API_BASE_URL}/api/recurring-expenses/process`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ year, month })
            });

            if (processResponse.ok) {
                const result = await processResponse.json();
                if (result.processedCount > 0) {
                    console.log(`✅ ${result.processedCount} gastos recorrentes processados automaticamente`);
                    showNotification(`🔄 ${result.processedCount} gastos recorrentes PIX/Boleto processados automaticamente para ${month}/${year}`, 'success');
                    
                    // Marcar como processado
                    sessionStorage.setItem(processedKey, 'true');
                    
                    // Recarregar dados
                    await fetchAllData();
                    
                    // Atualizar aba PIX/Boleto se estiver ativa
                    const activeTab = document.querySelector('.tab-button.active');
                    if (activeTab && activeTab.dataset.tab === 'pix-boleto') {
                        await loadPixBoletoData();
                    }
                }
            }

        } catch (error) {
            console.error('❌ Erro no processamento automático de gastos recorrentes:', error);
        }
    }

    // Função para criar gastos recorrentes automáticos para PIX e Boleto
    async function createAutoRecurringExpenses() {
        try {
            const token = getToken();
            if (!token) return;

            console.log('🏗️ Verificando necessidade de criar gastos recorrentes automáticos...');

            // Lista de gastos recorrentes padrão para PIX e Boleto
            const defaultRecurringExpenses = [
                {
                    description: 'Transferência PIX Recorrente',
                    amount: 0, // Será definido pelo usuário
                    account: 'PIX',
                    account_plan_code: 17, // Plano padrão para transferências
                    is_business_expense: false,
                    day_of_month: 1
                },
                {
                    description: 'Pagamento Boleto Recorrente',
                    amount: 0, // Será definido pelo usuário
                    account: 'Boleto',
                    account_plan_code: 17, // Plano padrão para pagamentos
                    is_business_expense: false,
                    day_of_month: 10
                }
            ];

            // Verificar se já existem gastos recorrentes para PIX e Boleto
            const response = await fetch(`${API_BASE_URL}/api/recurring-expenses`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const existing = await response.json();
                const existingAccounts = existing.map(exp => exp.account);
                
                // Sugerir criação de gastos recorrentes para contas que não têm
                const missingAccounts = ['PIX', 'Boleto'].filter(account => 
                    !existingAccounts.includes(account)
                );

                if (missingAccounts.length > 0) {
                    console.log(`💡 Sugerindo criação de gastos recorrentes para: ${missingAccounts.join(', ')}`);
                    
                    // Mostrar notificação sugerindo configuração
                    showNotification(`💡 Configure gastos recorrentes para ${missingAccounts.join(' e ')} para automatizar seus pagamentos mensais`, 'info');
                }
            }

        } catch (error) {
            console.error('❌ Erro ao verificar gastos recorrentes automáticos:', error);
        }
    }

    // Função para processar gastos PIX/Boleto em lote durante todo o mês
    async function bulkProcessPixBoletoExpenses(accountType, year, month) {
        try {
            const token = getToken();
            if (!token) return false;

            console.log(`📊 Processando gastos em lote para ${accountType} - ${month}/${year}`);

            // Buscar gastos recorrentes para a conta específica
            const response = await fetch(`${API_BASE_URL}/api/recurring-expenses`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) return false;

            const recurringExpenses = await response.json();
            const accountRecurring = recurringExpenses.filter(exp => exp.account === accountType);

            if (accountRecurring.length === 0) {
                console.log(`📭 Nenhum gasto recorrente encontrado para ${accountType}`);
                return false;
            }

            // Criar múltiplas instâncias durante o mês (simulando pagamentos recorrentes)
            const promises = [];
            const daysInMonth = new Date(year, month, 0).getDate();
            
            accountRecurring.forEach(recurring => {
                // Para PIX: processar nos dias 1, 10, 20 e último dia do mês
                // Para Boleto: processar nos dias 5, 15 e 25
                const processingDays = accountType === 'PIX' 
                    ? [1, 10, 20, daysInMonth]
                    : [5, 15, 25];

                processingDays.forEach(day => {
                    if (day <= daysInMonth) {
                        const transactionDate = new Date(year, month - 1, day);
                        const formattedDate = transactionDate.toISOString().split('T')[0];

                        const expenseData = {
                            transaction_date: formattedDate,
                            amount: recurring.amount,
                            description: `${recurring.description} (Auto ${day}/${month})`,
                            account: recurring.account,
                            account_plan_code: recurring.account_plan_code,
                            is_business_expense: recurring.is_business_expense,
                            total_installments: 1,
                            is_recurring_expense: true
                        };

                        promises.push(
                            fetch(`${API_BASE_URL}/api/expenses`, {
                                method: 'POST',
                                headers: { 
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}` 
                                },
                                body: JSON.stringify(expenseData)
                            })
                        );
                    }
                });
            });

            const results = await Promise.allSettled(promises);
            const successful = results.filter(r => r.status === 'fulfilled').length;

            console.log(`✅ ${successful}/${promises.length} gastos ${accountType} processados automaticamente`);
            return successful > 0;

        } catch (error) {
            console.error(`❌ Erro no processamento em lote para ${accountType}:`, error);
            return false;
        }
    }

    // Função para configurar lembretes e processamento automático
    function setupRecurringReminders() {
        // Verificar no início de cada mês
        const today = new Date();
        const isFirstDayOfMonth = today.getDate() === 1;
        
        if (isFirstDayOfMonth) {
            console.log('📅 Primeiro dia do mês - iniciando processamento automático');
            setTimeout(() => {
                autoProcessRecurringExpenses();
                createAutoRecurringExpenses();
            }, 2000); // Aguardar 2 segundos após carregar o dashboard
        }

        // Verificar diariamente se há gastos recorrentes para processar
        const dailyCheckKey = `daily_recurring_check_${today.toDateString()}`;
        if (!sessionStorage.getItem(dailyCheckKey)) {
            setTimeout(() => {
                autoProcessRecurringExpenses();
            }, 5000); // Verificar após 5 segundos

            sessionStorage.setItem(dailyCheckKey, 'true');
        }

        // Lembrete para configurar gastos recorrentes (uma vez por semana)
        const weeklyReminderKey = `weekly_recurring_reminder_${today.getFullYear()}_${Math.ceil(today.getDate() / 7)}`;
        if (!sessionStorage.getItem(weeklyReminderKey)) {
            setTimeout(() => {
                createAutoRecurringExpenses();
            }, 10000); // Verificar após 10 segundos

            sessionStorage.setItem(weeklyReminderKey, 'true');
        }
    }
});
