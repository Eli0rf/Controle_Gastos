/**
 * dashboard.js - Versão Otimizada para Railway
 * Atualizado com melhorias de segurança e performance
 */
document.addEventListener('DOMContentLoaded', function() {

    // ===== CONFIGURAÇÕES DO AMBIENTE =====
    const CONFIG = {
        // URLs do Railway
        API_BASE_URL: 'https://controlegastos-production.up.railway.app',
        
        // Configurações de segurança
        TOKEN_STORAGE_KEY: 'cg_auth_token',
        USER_STORAGE_KEY: 'cg_user_data',
        
        // Configurações de timeout
        REQUEST_TIMEOUT: 30000, // 30 segundos
        
        // Cache settings
        CACHE_DURATION: 5 * 60 * 1000, // 5 minutos
        
        // Retry settings
        MAX_RETRIES: 3,
        RETRY_DELAY: 1000
    };

    // ===== CACHE INTELIGENTE =====
    class CacheManager {
        constructor() {
            this.cache = new Map();
        }

        set(key, data, ttl = CONFIG.CACHE_DURATION) {
            this.cache.set(key, {
                data,
                expires: Date.now() + ttl
            });
        }

        get(key) {
            const item = this.cache.get(key);
            if (!item) return null;
            
            if (Date.now() > item.expires) {
                this.cache.delete(key);
                return null;
            }
            
            return item.data;
        }

        clear() {
            this.cache.clear();
        }
    }

    const cache = new CacheManager();

    // ===== ELEMENTOS DOM =====
    const elements = {
        loginSection: document.getElementById('login-section'),
        dashboardContent: document.getElementById('dashboard-content'),
        loginForm: document.getElementById('login-form'),
        logoutButton: document.getElementById('logout-button'),
        welcomeUserSpan: document.getElementById('welcome-user'),
        addExpenseForm: document.getElementById('add-expense-form'),
        businessCheckbox: document.getElementById('form-is-business'),
        personalFields: document.getElementById('personal-fields-container'),
        businessFields: document.getElementById('business-fields-container'),
        expensesTableBody: document.getElementById('expenses-table-body'),
        
        // Filtros
        filterYear: document.getElementById('filter-year'),
        filterMonth: document.getElementById('filter-month'),
        filterSearchInput: document.getElementById('filter-search'),
        filterType: document.getElementById('filter-type'),
        filterMin: document.getElementById('filter-min'),
        filterMax: document.getElementById('filter-max'),
        filterPlan: document.getElementById('filter-plan'),
        filterAccount: document.getElementById('filter-account'),
        
        // Estatísticas
        totalSpentEl: document.getElementById('total-spent'),
        totalTransactionsEl: document.getElementById('total-transactions'),
        projectionEl: document.getElementById('next-month-projection'),
        
        // Botões de relatório
        monthlyReportBtn: document.getElementById('monthly-report-btn'),
        weeklyReportBtn: document.getElementById('weekly-report-btn'),
        interactiveReportBtn: document.getElementById('interactive-report-btn'),
        
        // Modais
        reportModal: document.getElementById('report-modal'),
        reportForm: document.getElementById('report-form'),
        cancelReportBtn: document.getElementById('cancel-report-btn'),
        reportGenerateText: document.getElementById('report-generate-text'),
        reportLoadingText: document.getElementById('report-loading-text'),
        
        interactiveReportModal: document.getElementById('interactive-report-modal'),
        closeIrModalBtn: document.getElementById('close-ir-modal'),
        irForm: document.getElementById('interactive-report-form'),
        irAccount: document.getElementById('ir-account'),
        irCharts: document.getElementById('ir-charts'),
        irDetails: document.getElementById('ir-details'),
        
        // Gastos recorrentes
        recurringExpensesBtn: document.getElementById('recurring-expenses-btn'),
        recurringModal: document.getElementById('recurring-modal'),
        closeRecurringModalBtn: document.getElementById('close-recurring-modal'),
        recurringForm: document.getElementById('recurring-form'),
        recurringList: document.getElementById('recurring-list'),
        processRecurringBtn: document.getElementById('process-recurring-btn')
    };

    // ===== VARIÁVEIS GLOBAIS =====
    let expensesLineChart, expensesPieChart, planChart, mixedTypeChart, goalsChart, goalsPlanChart;
    let allExpensesCache = [];
    let currentUser = null;

    // ===== GERENCIAMENTO DE TOKEN =====
    function getToken() {
        try {
            const token = localStorage.getItem(CONFIG.TOKEN_STORAGE_KEY);
            if (!token) return null;
            
            // Verificar se o token não está expirado
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload.exp * 1000 < Date.now()) {
                console.log('🔒 Token expirado, removendo...');
                removeAuthData();
                return null;
            }
            
            return token;
        } catch (error) {
            console.error('❌ Erro ao verificar token:', error);
            removeAuthData();
            return null;
        }
    }

    function setAuthData(token, userData) {
        try {
            localStorage.setItem(CONFIG.TOKEN_STORAGE_KEY, token);
            localStorage.setItem(CONFIG.USER_STORAGE_KEY, JSON.stringify(userData));
            currentUser = userData;
        } catch (error) {
            console.error('❌ Erro ao salvar dados de autenticação:', error);
        }
    }

    function removeAuthData() {
        localStorage.removeItem(CONFIG.TOKEN_STORAGE_KEY);
        localStorage.removeItem(CONFIG.USER_STORAGE_KEY);
        currentUser = null;
        cache.clear();
    }

    function getCurrentUser() {
        if (currentUser) return currentUser;
        
        try {
            const userData = localStorage.getItem(CONFIG.USER_STORAGE_KEY);
            if (userData) {
                currentUser = JSON.parse(userData);
                return currentUser;
            }
        } catch (error) {
            console.error('❌ Erro ao recuperar dados do usuário:', error);
        }
        
        return null;
    }

    // ===== VERIFICAÇÃO DE AUTENTICAÇÃO =====
    function checkAuthentication() {
        const token = getToken();
        if (!token) {
            console.log('🔒 Autenticação falhou - token ausente');
            showLogin();
            return false;
        }
        return true;
    }

    // ===== REQUISIÇÕES COM RETRY E TIMEOUT =====
    async function fetchWithRetry(url, options = {}, retries = CONFIG.MAX_RETRIES) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT);

        const requestOptions = {
            ...options,
            signal: controller.signal
        };

        try {
            const response = await fetch(url, requestOptions);
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (retries > 0 && error.name !== 'AbortError') {
                console.log(`🔄 Tentativa ${CONFIG.MAX_RETRIES - retries + 1} falhou, tentando novamente...`);
                await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
                return fetchWithRetry(url, options, retries - 1);
            }
            
            throw error;
        }
    }

    // ===== REQUISIÇÕES AUTENTICADAS =====
    async function authenticatedFetch(url, options = {}) {
        const token = getToken();
        if (!token) {
            console.log('🔒 authenticatedFetch: Token não encontrado');
            showLogin();
            throw new Error('Token não encontrado');
        }

        // Preparar headers
        const headers = {
            'Authorization': `Bearer ${token}`,
            ...options.headers
        };

        // Só adicionar Content-Type se não for FormData
        if (!(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }

        const requestOptions = {
            ...options,
            headers
        };

        try {
            const response = await fetchWithRetry(url, requestOptions);
            
            // Verificar se é erro de autenticação
            if (response.status === 401 || response.status === 403) {
                console.log('🔒 Erro de autenticação:', response.status);
                handleAuthError(response);
                throw new Error('Autenticação falhou');
            }

            return response;
        } catch (error) {
            if (error.message.includes('401') || error.message.includes('403')) {
                handleAuthError({ status: 401 });
            }
            throw error;
        }
    }

    // ===== TRATAMENTO DE ERROS DE AUTENTICAÇÃO =====
    function handleAuthError(response) {
        if (response.status === 401 || response.status === 403) {
            console.log('🔒 Erro de autenticação detectado:', response.status);
            showNotification('Sessão expirada. Faça login novamente.', 'error');
            removeAuthData();
            showLogin();
            return true;
        }
        return false;
    }

    // ===== EVENT LISTENERS OTIMIZADOS =====
    function addEventListeners() {
        // Login e logout
        if (elements.loginForm) elements.loginForm.addEventListener('submit', handleLogin);
        if (elements.logoutButton) elements.logoutButton.addEventListener('click', handleLogout);
        
        // Filtros com debounce
        if (elements.filterYear) elements.filterYear.addEventListener('change', debounce(fetchAllData, 300));
        if (elements.filterMonth) elements.filterMonth.addEventListener('change', debounce(fetchAllData, 300));
        if (elements.filterAccount) elements.filterAccount.addEventListener('change', debounce(fetchAllData, 300));
        if (elements.filterPlan) elements.filterPlan.addEventListener('input', debounce(applyAllFilters, 500));
        
        // Formulários
        if (elements.addExpenseForm) elements.addExpenseForm.addEventListener('submit', handleAddExpense);
        if (elements.businessCheckbox) elements.businessCheckbox.addEventListener('change', toggleExpenseFields);
        
        // Tabela
        if (elements.expensesTableBody) elements.expensesTableBody.addEventListener('click', handleTableClick);
        
        // Relatórios
        if (elements.weeklyReportBtn) elements.weeklyReportBtn.addEventListener('click', handleWeeklyReportDownload);
        if (elements.monthlyReportBtn) elements.monthlyReportBtn.addEventListener('click', openReportModal);
        if (elements.cancelReportBtn) elements.cancelReportBtn.addEventListener('click', closeReportModal);
        if (elements.reportForm) elements.reportForm.addEventListener('submit', handleMonthlyReportDownload);
        
        // Modal relatório interativo
        if (elements.interactiveReportBtn) {
            elements.interactiveReportBtn.addEventListener('click', () => {
                if (elements.interactiveReportModal) {
                    elements.interactiveReportModal.classList.remove('hidden');
                    setTimeout(() => elements.interactiveReportModal.classList.remove('opacity-0'), 10);
                    populateIrAccounts();
                }
            });
        }
        
        if (elements.closeIrModalBtn) {
            elements.closeIrModalBtn.addEventListener('click', () => {
                if (elements.interactiveReportModal) {
                    elements.interactiveReportModal.classList.add('opacity-0');
                    setTimeout(() => elements.interactiveReportModal.classList.add('hidden'), 300);
                }
            });
        }
        
        // Gastos recorrentes
        if (elements.recurringExpensesBtn) elements.recurringExpensesBtn.addEventListener('click', openRecurringModal);
        if (elements.closeRecurringModalBtn) elements.closeRecurringModalBtn.addEventListener('click', closeRecurringModal);
        if (elements.recurringForm) elements.recurringForm.addEventListener('submit', handleRecurringExpenseSubmit);
        if (elements.processRecurringBtn) elements.processRecurringBtn.addEventListener('click', processRecurringExpenses);
    }

    // ===== UTILITÁRIOS =====
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

    function showNotification(message, type = 'info', duration = 5000) {
        // Criar elemento de notificação
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 max-w-sm animate-fade-in ${
            type === 'error' ? 'bg-red-500 text-white' :
            type === 'success' ? 'bg-green-500 text-white' :
            type === 'warning' ? 'bg-yellow-500 text-black' :
            'bg-blue-500 text-white'
        }`;
        
        notification.innerHTML = `
            <div class="flex items-center justify-between">
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-xl">&times;</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto remover após duração especificada
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, duration);
    }

    // ===== FUNÇÕES DE LOGIN E LOGOUT =====
    async function handleLogin(e) {
        e.preventDefault();
        
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        const loginButton = document.querySelector('#login-form button[type="submit"]');
        
        if (!usernameInput || !passwordInput) {
            showNotification('Erro de configuração do formulário.', 'error');
            return;
        }

        try {
            // Desabilitar botão durante o login
            if (loginButton) {
                loginButton.disabled = true;
                loginButton.textContent = 'Entrando...';
            }

            const response = await fetchWithRetry(`${CONFIG.API_BASE_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    username: usernameInput.value.trim(), 
                    password: passwordInput.value 
                })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Erro no login');
            }

            // Salvar dados de autenticação
            setAuthData(data.accessToken, data.user);
            
            showNotification('Login realizado com sucesso!', 'success');
            showDashboard();
            
            // Limpar formulário
            usernameInput.value = '';
            passwordInput.value = '';

        } catch (error) {
            console.error('❌ Erro no login:', error);
            showNotification(`Erro no login: ${error.message}`, 'error');
        } finally {
            // Reabilitar botão
            if (loginButton) {
                loginButton.disabled = false;
                loginButton.textContent = 'Entrar';
            }
        }
    }

    function handleLogout() {
        // Confirmar logout
        if (confirm('Tem certeza que deseja sair?')) {
            removeAuthData();
            showNotification('Logout realizado com sucesso!', 'success');
            showLogin();
        }
    }

    function showDashboard() {
        if (elements.loginSection) elements.loginSection.style.display = 'none';
        if (elements.dashboardContent) elements.dashboardContent.style.display = 'block';
        
        const user = getCurrentUser();
        if (elements.welcomeUserSpan && user) {
            elements.welcomeUserSpan.textContent = `Bem-vindo, ${user.username}!`;
        }
        
        initializeDashboard();
        checkMonthlyReportReminder();
    }

    function showLogin() {
        if (elements.loginSection) elements.loginSection.style.display = 'flex';
        if (elements.dashboardContent) elements.dashboardContent.style.display = 'none';
        
        // Limpar dados cached
        cache.clear();
        
        // Reset charts
        if (expensesLineChart) expensesLineChart.destroy();
        if (expensesPieChart) expensesPieChart.destroy();
        if (planChart) planChart.destroy();
        if (mixedTypeChart) mixedTypeChart.destroy();
        if (goalsChart) goalsChart.destroy();
        if (goalsPlanChart) goalsPlanChart.destroy();
    }

    // ===== INICIALIZAÇÃO DO DASHBOARD =====
    function initializeDashboard() {
        populateAccountFilter();
        populateFilterOptions();
        fetchAllData();
        toggleExpenseFields();
        initializeTabs(); // Adicionar inicialização das tabs
    }

    function populateFilterOptions() {
        if (!elements.filterYear || !elements.filterMonth) return;
        elements.filterYear.innerHTML = '';
        elements.filterMonth.innerHTML = '';
        const currentYear = new Date().getFullYear();
        for (let i = currentYear; i >= currentYear - 5; i--) elements.filterYear.add(new Option(i, i));
        const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        months.forEach((month, index) => elements.filterMonth.add(new Option(month, index + 1)));
        elements.filterYear.value = currentYear;
        elements.filterMonth.value = new Date().getMonth() + 1;
    }

    function toggleExpenseFields() {
        if (!elements.personalFields || !elements.businessFields || !elements.businessCheckbox) return;
        elements.personalFields.classList.toggle('hidden', elements.businessCheckbox.checked);
        elements.businessFields.classList.toggle('hidden', !elements.businessCheckbox.checked);
    }

    // ===== FETCH DE DADOS =====
    async function fetchAllData() {
        try {
            if (!checkAuthentication()) {
                console.log('🔒 Autenticação falhou em fetchAllData');
                return;
            }

            console.log('📊 Iniciando fetchAllData...');
            showLoadingState(true);
            
            await Promise.all([
                fetchAndRenderExpenses(),
                fetchAndRenderDashboardMetrics(),
                fetchAndRenderGoalsChart()
            ]);
            
            console.log('✅ fetchAllData concluído');
        } catch (error) {
            console.error('❌ Erro em fetchAllData:', error);
            showNotification('Erro ao carregar dados', 'error');
        } finally {
            showLoadingState(false);
        }
    }

    function showLoadingState(isLoading) {
        const loadingElements = document.querySelectorAll('.loading-indicator');
        loadingElements.forEach(el => {
            el.style.display = isLoading ? 'block' : 'none';
        });
    }

    // ===== GRÁFICOS DE METAS =====
    async function fetchAndRenderGoalsChart() {
        try {
            if (!checkAuthentication()) return;

            const params = new URLSearchParams({
                year: filterYear.value,
                month: filterMonth.value
            });

            const response = await authenticatedFetch(`${API_BASE_URL}/api/expenses-goals?${params.toString()}`);
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Erro ao buscar limites.');
            }
            
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
            showNotification('Erro ao carregar limites de gastos', 'error');
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
        try {
            if (!checkAuthentication()) return;

            const params = new URLSearchParams({
                year: filterYear.value,
                month: filterMonth.value,
                account: document.getElementById('filter-account')?.value || ''
            });

            const response = await authenticatedFetch(`${API_BASE_URL}/api/expenses?${params.toString()}`);

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Erro ao buscar despesas.');
            }

            const expenses = await response.json();
            allExpensesCache = expenses; // Salva para filtros
            applyAllFilters(); // Aplica filtros após buscar
        } catch (error) {
            console.error(error);
            showNotification('Erro ao carregar despesas', 'error');
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
        try {
            if (!checkAuthentication()) return;

            const params = new URLSearchParams({ year: filterYear.value, month: filterMonth.value });
            
            const response = await authenticatedFetch(`${API_BASE_URL}/api/dashboard?${params}`);
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Erro ao buscar métricas do dashboard.');
            }
            
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
            showNotification('Erro ao carregar métricas', 'error');
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
                        text: `Maior gasto: R$ ${max.toFixed(2)} | Menor gasto: R$ ${min ? min.toFixed(2) : '0.00'}`,
                        color: getThemeColor('#666', '#ccc'),
                        font: { size: 13 }
                    },
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: ctx => `Dia ${ctx.label}: R$ ${ctx.parsed.y.toFixed(2)}`
                        }
                    },
                    datalabels: {
                        color: getThemeColor('#222', '#fff'),
                        anchor: 'end', align: 'top', font: { weight: 'bold' },
                        formatter: v => {
                            const val = getNumberValue(v);
                            return val > 0 ? `R$ ${val.toFixed(2)}` : '';
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
                        text: `Total: R$ ${total.toFixed(2)}`,
                        color: getThemeColor('#666', '#ccc'),
                        font: { size: 13 }
                    },
                    legend: {
                        position: 'bottom',
                        labels: { color: getThemeColor('#222', '#fff') }
                    },
                    tooltip: {
                        callbacks: {
                            label: ctx => `${ctx.label}: R$ ${ctx.parsed.toFixed(2)} (${((ctx.parsed/total)*100).toFixed(1)}%)`
                        }
                    },
                    datalabels: {
                        color: '#fff',
                        font: { weight: 'bold' },
                        formatter: v => {
                            const val = getNumberValue(v);
                            return val > 0 ? `R$ ${val.toFixed(2)}` : '';
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
                            label: ctx => `${ctx.dataset.label}: R$ ${ctx.parsed.y.toFixed(2)}`
                        }
                    },
                    datalabels: {
                        color: getThemeColor('#222', '#fff'),
                        anchor: 'end', align: 'top', font: { weight: 'bold' },
                        formatter: v => {
                            const val = getNumberValue(v);
                            return val > 0 ? `R$ ${val.toFixed(2)}` : '';
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
                    label: 'Total Gasto (R$)',
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
                            label: ctx => `R$ ${ctx.parsed.x.toFixed(2)}`
                        }
                    },
                    datalabels: {
                        color: getThemeColor('#222', '#fff'),
                        anchor: 'end', align: 'right', font: { weight: 'bold' },
                        formatter: v => {
                            const val = getNumberValue(v);
                            return val > 0 ? `R$ ${val.toFixed(2)}` : '';
                        }
                    }
                }
            },
            plugins: [ChartDataLabels]
        });
    }

    async function handleAddExpense(e) {
        e.preventDefault();
        
        try {
            if (!checkAuthentication()) return;

            const formData = new FormData(addExpenseForm);
            formData.set('is_business_expense', businessCheckbox.checked);
            
            const response = await authenticatedFetch(`${API_BASE_URL}/api/expenses`, { 
                method: 'POST', 
                body: formData 
            });
            
            if (!response.ok) { 
                const err = await response.json(); 
                throw new Error(err.message); 
            }
            
            showNotification('Gasto adicionado com sucesso!', 'success');
            addExpenseForm.reset();
            toggleExpenseFields();
            fetchAllData();
        } catch (error) { 
            console.error('Erro ao adicionar gasto:', error);
            showNotification(`Erro: ${error.message}`, 'error');
        }
    }

    function handleTableClick(e) {
        if (e.target.closest('.edit-btn')) alert('Funcionalidade de edição não implementada.');
        if (e.target.closest('.delete-btn')) { if (confirm('Tem a certeza?')) deleteExpense(e.target.closest('.delete-btn').dataset.id); }
    }

    async function deleteExpense(id) {
        try {
            if (!checkAuthentication()) return;

            const response = await authenticatedFetch(`${API_BASE_URL}/api/expenses/${id}`, { 
                method: 'DELETE' 
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Falha ao apagar despesa.');
            }
            
            showNotification('Gasto removido com sucesso!', 'success');
            fetchAllData();
        } catch (error) { 
            console.error('Erro ao deletar gasto:', error);
            showNotification(`Erro: ${error.message}`, 'error');
        }
    }

    async function handleWeeklyReportDownload() {
        try {
            if (!checkAuthentication()) return;

            const response = await authenticatedFetch(`${API_BASE_URL}/api/reports/weekly`);
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Erro ao gerar relatório semanal.');
            }
            
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
            const response = await authenticatedFetch(`${API_BASE_URL}/api/reports/monthly`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
        const select = document.getElementById('filter-account');
        if (!select) return;

        try {
            if (!checkAuthentication()) return;

            const response = await authenticatedFetch(`${API_BASE_URL}/api/accounts`);
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Erro ao buscar contas.');
            }
            
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
            console.error('Erro ao carregar contas:', error);
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

    // ========== RELATÓRIO INTERATIVO ==========
    async function populateIrAccounts() {
        if (!irAccount) return;
        
        try {
            if (!checkAuthentication()) return;

            const response = await authenticatedFetch(`${API_BASE_URL}/api/accounts`);
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Erro ao buscar contas.');
            }
            
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
            console.error('Erro ao carregar contas IR:', error);
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
        if (!checkAuthentication()) return [];
        
        year = parseInt(year, 10);
        month = parseInt(month, 10);
        const params = new URLSearchParams({ year, month });
        if (account) params.append('account', account);
        try {
            const response = await authenticatedFetch(`${API_BASE_URL}/api/expenses?${params.toString()}`);
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
                            label: ctx => `R$ ${ctx.parsed.y.toFixed(2)}`
                        }
                    },
                    datalabels: {
                        color: '#222',
                        anchor: 'end', align: 'top', font: { weight: 'bold' },
                        formatter: v => typeof v === 'number' ? `R$ ${v.toFixed(2)}` : ''
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
            <span class='bg-blue-100 text-blue-800 px-3 py-1 rounded font-mono'>Total: R$ ${total.toFixed(2)}</span>
            <button id="ir-export-csv" class="bg-green-500 text-white px-3 py-1 rounded ml-4"><i class="fa fa-file-csv"></i> Exportar CSV</button>
        </div>`;
        if (filtered.length === 0) {
            html += `<div class='text-gray-500 italic'>Nenhuma transação encontrada para este plano neste período.</div>`;
            irDetails.innerHTML = html;
            return;
        }
        html += `<div style="max-height:320px;overflow:auto;"><table class="table table-sm table-bordered align-middle"><thead class='sticky-top bg-white'><tr><th>Data</th><th>Descrição</th><th class='text-end'>Valor</th><th>Conta</th><th>Tipo</th></tr></thead><tbody>`;
        filtered.forEach(e => {
            html += `<tr><td>${new Date(e.transaction_date).toLocaleDateString('pt-BR')}</td><td>${e.description}</td><td class='text-end'>R$ ${parseFloat(e.amount).toFixed(2)}</td><td>${e.account}</td><td>${e.is_business_expense ? 'Empresarial' : 'Pessoal'}</td></tr>`;
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
        const year = filterYearEl && filterYearEl.value ? parseInt(filterYearEl.value, 10) : new Date().getFullYear();
        const month = filterMonthEl && filterMonthEl.value ? parseInt(filterMonthEl.value, 10) : (new Date().getMonth() + 1);

        // Alternativamente, se quiser usar o mês do select do quadro de fatura:
        // const month = parseInt(document.getElementById('billing-month').value, 10);

        if (!month) {
            alert('Por favor, selecione um mês.');
            return;
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
                const response = await authenticatedFetch(
                    `${API_BASE_URL}/api/expenses?account=${encodeURIComponent(account)}&start_date=${startDate.toISOString().slice(0, 10)}&end_date=${endDate.toISOString().slice(0, 10)}`
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
                            <td>R$ ${groupedByDay[day].reduce((sum, expense) => sum + parseFloat(expense.amount), 0).toFixed(2)}</td>
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
        try {
            const response = await authenticatedFetch(`${API_BASE_URL}/api/recurring-expenses`);

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
                            <strong>Valor:</strong> €${parseFloat(expense.amount).toFixed(2)} | 
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

        const formData = new FormData(recurringForm);
        const data = {
            description: formData.get('description'),
            amount: parseFloat(formData.get('amount')),
            account: formData.get('account'),
            account_plan_code: formData.get('account_plan_code') || null,
            is_business_expense: formData.get('is_business_expense') === 'on',
            day_of_month: parseInt(formData.get('day_of_month')) || 1
        };

        // Validar se é conta permitida
        if (!['PIX', 'Boleto'].includes(data.account)) {
            showNotification('Gastos recorrentes só são permitidos para contas PIX e Boleto', 'error');
            return;
        }

        try {
            const response = await authenticatedFetch(`${API_BASE_URL}/api/recurring-expenses`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) throw new Error('Erro ao criar gasto recorrente');

            showNotification('Gasto recorrente criado com sucesso!', 'success');
            recurringForm.reset();
            await loadRecurringExpenses();
        } catch (error) {
            console.error('Erro ao criar gasto recorrente:', error);
            showNotification('Erro ao criar gasto recorrente', 'error');
        }
    }

    async function deleteRecurringExpense(id) {
        if (!confirm('Tem certeza que deseja remover este gasto recorrente?')) return;

        try {
            const response = await authenticatedFetch(`${API_BASE_URL}/api/recurring-expenses/${id}`, {
                method: 'DELETE'
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
        const year = filterYear.value;
        const month = filterMonth.value;

        if (!year || !month) {
            showNotification('Selecione ano e mês para processar', 'error');
            return;
        }

        try {
            const response = await authenticatedFetch(`${API_BASE_URL}/api/recurring-expenses/process`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ year: parseInt(year), month: parseInt(month) })
            });

            const result = await response.json();

            if (!response.ok) throw new Error(result.message);

            showNotification(result.message, 'success');
            await fetchAllData(); // Recarregar dados do dashboard
        } catch (error) {
            console.error('Erro ao processar gastos recorrentes:', error);
            showNotification('Erro ao processar gastos recorrentes', 'error');
        }
    }

    // Tornar funções globais para uso nos botões
    window.editRecurringExpense = async function(id) {
        // Implementar funcionalidade de edição
        showNotification('Funcionalidade de edição em desenvolvimento', 'info');
    };

    window.deleteRecurringExpense = deleteRecurringExpense;

    // ========== SISTEMA DE TABS ==========
    function initializeTabs() {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.dataset.tab;
                
                // Remove active class from all buttons and contents
                tabButtons.forEach(btn => btn.classList.remove('active', 'bg-blue-50', 'text-blue-600', 'border-b-2', 'border-blue-500'));
                tabContents.forEach(content => content.classList.add('hidden'));
                
                // Add active class to clicked button
                button.classList.add('active', 'bg-blue-50', 'text-blue-600', 'border-b-2', 'border-blue-500');
                
                // Show target tab content
                const targetContent = document.getElementById(`${targetTab}-tab`);
                if (targetContent) {
                    targetContent.classList.remove('hidden');
                    
                    // Load specific content based on tab
                    if (targetTab === 'business-analysis') {
                        loadBusinessAnalysis();
                    } else if (targetTab === 'invoices') {
                        loadInvoicesAnalysis();
                    }
                }
            });
        });

        // Initialize first tab as active
        if (tabButtons.length > 0) {
            tabButtons[0].click();
        }
    }

    // ========== ANÁLISE EMPRESARIAL ==========
    async function loadBusinessAnalysis() {
        try {
            const token = getToken();
            if (!token) return;

            const year = filterYear.value;
            const month = filterMonth.value;

            // Carregar dados empresariais
            const businessData = await fetchBusinessData(year, month);
            updateBusinessMetrics(businessData);
            updateBusinessCharts(businessData);
            populateBusinessFilters();
            loadBusinessExpensesList();

        } catch (error) {
            console.error('Erro ao carregar análise empresarial:', error);
            showNotification('Erro ao carregar dados empresariais', 'error');
        }
    }

    async function fetchBusinessData(year, month) {
        const response = await authenticatedFetch(`${API_BASE_URL}/api/expenses?year=${year}&month=${month}`);
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Erro ao buscar dados');
        }
        
        const allExpenses = await response.json();
        const businessExpenses = allExpenses.filter(expense => expense.is_business_expense);
        
        return {
            total: businessExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0),
            expenses: businessExpenses,
            invoiced: businessExpenses.filter(exp => exp.invoice_path).reduce((sum, exp) => sum + parseFloat(exp.amount), 0),
            nonInvoiced: businessExpenses.filter(exp => !exp.invoice_path).reduce((sum, exp) => sum + parseFloat(exp.amount), 0),
            byAccount: groupByAccount(businessExpenses),
            byCategory: groupByCategory(businessExpenses)
        };
    }

    function updateBusinessMetrics(data) {
        const businessTotal = document.getElementById('business-total');
        const businessGrowth = document.getElementById('business-growth');
        const businessInvoiced = document.getElementById('business-invoiced');
        const businessNonInvoiced = document.getElementById('business-non-invoiced');

        if (businessTotal) businessTotal.textContent = `R$ ${data.total.toFixed(2)}`;
        if (businessInvoiced) businessInvoiced.textContent = `R$ ${data.invoiced.toFixed(2)}`;
        if (businessNonInvoiced) businessNonInvoiced.textContent = `R$ ${data.nonInvoiced.toFixed(2)}`;
        
        // Calcular crescimento (exemplo básico)
        if (businessGrowth) businessGrowth.textContent = '+0%'; // Implementar cálculo de crescimento
    }

    function updateBusinessCharts(data) {
        // Chart de evolução mensal
        updateBusinessEvolutionChart(data);
        
        // Chart por conta
        updateBusinessAccountChart(data);
        
        // Chart por categoria
        updateBusinessCategoryChart(data);
    }

    function updateBusinessEvolutionChart(data) {
        const ctx = document.getElementById('business-evolution-chart');
        if (!ctx) return;

        if (window.businessEvolutionChart) {
            window.businessEvolutionChart.destroy();
        }

        window.businessEvolutionChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
                datasets: [{
                    label: 'Gastos Empresariais',
                    data: [data.total, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // Implementar dados reais
                    borderColor: 'rgb(239, 68, 68)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: true }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }

    function updateBusinessAccountChart(data) {
        const ctx = document.getElementById('business-account-chart');
        if (!ctx) return;

        if (window.businessAccountChart) {
            window.businessAccountChart.destroy();
        }

        const accounts = Object.keys(data.byAccount);
        const values = Object.values(data.byAccount);

        window.businessAccountChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: accounts,
                datasets: [{
                    data: values,
                    backgroundColor: [
                        'rgba(59, 130, 246, 0.8)',
                        'rgba(16, 185, 129, 0.8)',
                        'rgba(245, 158, 11, 0.8)',
                        'rgba(239, 68, 68, 0.8)',
                        'rgba(139, 92, 246, 0.8)'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    }

    function updateBusinessCategoryChart(data) {
        const ctx = document.getElementById('business-category-chart');
        if (!ctx) return;

        if (window.businessCategoryChart) {
            window.businessCategoryChart.destroy();
        }

        const categories = Object.keys(data.byCategory);
        const values = Object.values(data.byCategory);

        window.businessCategoryChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: categories,
                datasets: [{
                    label: 'Valor por Categoria',
                    data: values,
                    backgroundColor: 'rgba(59, 130, 246, 0.8)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }

    function populateBusinessFilters() {
        // Populá filtros específicos da análise empresarial
        const businessPeriod = document.getElementById('business-period');
        const businessAccount = document.getElementById('business-account');
        
        if (businessPeriod && !businessPeriod.hasChildNodes()) {
            const periods = ['Este mês', 'Últimos 3 meses', 'Últimos 6 meses', 'Este ano'];
            periods.forEach(period => {
                const option = document.createElement('option');
                option.value = period.toLowerCase().replace(/\s+/g, '-');
                option.textContent = period;
                businessPeriod.appendChild(option);
            });
        }

        // Adicionar event listeners para filtros
        if (businessPeriod) businessPeriod.addEventListener('change', loadBusinessAnalysis);
        if (businessAccount) businessAccount.addEventListener('change', loadBusinessAnalysis);
    }

    async function loadBusinessExpensesList() {
        try {
            if (!checkAuthentication()) return;

            const year = filterYear.value;
            const month = filterMonth.value;
            
            const response = await authenticatedFetch(`${API_BASE_URL}/api/expenses?year=${year}&month=${month}`);
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Erro ao buscar gastos');
            }
            
            const expenses = await response.json();
            const businessExpenses = expenses.filter(exp => exp.is_business_expense);
            
            displayBusinessExpensesList(businessExpenses);
        } catch (error) {
            console.error('Erro ao carregar lista de gastos empresariais:', error);
            showNotification('Erro ao carregar gastos empresariais', 'error');
        }
    }

    function displayBusinessExpensesList(expenses) {
        const container = document.getElementById('business-expenses-table');
        if (!container) return;

        if (expenses.length === 0) {
            container.innerHTML = '<tr><td colspan="8" class="text-gray-500 text-center py-4">Nenhum gasto empresarial encontrado</td></tr>';
            return;
        }

        const html = expenses.map(expense => `
            <tr class="business-table-row border-b hover:bg-gray-50">
                <td class="p-3">${new Date(expense.transaction_date).toLocaleDateString('pt-BR')}</td>
                <td class="p-3">${expense.description}</td>
                <td class="p-3 text-right font-medium">R$ ${parseFloat(expense.amount).toFixed(2)}</td>
                <td class="p-3">${expense.account}</td>
                <td class="p-3">${expense.category || 'N/A'}</td>
                <td class="p-3">
                    ${expense.invoice_path 
                        ? '<span class="text-green-600">✓ Com NF</span>' 
                        : '<span class="text-red-600">✗ Sem NF</span>'
                    }
                </td>
                <td class="p-3">${getBillingPeriod(expense.transaction_date, expense.account)}</td>
                <td class="p-3">
                    <button onclick="editExpense(${expense.id})" class="text-blue-600 hover:text-blue-800 mr-2">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteExpense(${expense.id})" class="text-red-600 hover:text-red-800">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        container.innerHTML = html;
        updateBusinessStats(expenses);
    }

    function updateBusinessStats(expenses) {
        const total = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
        const count = expenses.length;
        const average = count > 0 ? total / count : 0;
        const withInvoice = expenses.filter(exp => exp.invoice_path).length;
        const invoicePercentage = count > 0 ? (withInvoice / count * 100) : 0;

        const filteredTotal = document.getElementById('filtered-total');
        const filteredCount = document.getElementById('filtered-count');
        const filteredAverage = document.getElementById('filtered-average');
        const filteredInvoicePercentage = document.getElementById('filtered-invoice-percentage');

        if (filteredTotal) filteredTotal.textContent = `R$ ${total.toFixed(2)}`;
        if (filteredCount) filteredCount.textContent = count.toString();
        if (filteredAverage) filteredAverage.textContent = `R$ ${average.toFixed(2)}`;
        if (filteredInvoicePercentage) filteredInvoicePercentage.textContent = `${invoicePercentage.toFixed(1)}%`;
    }

    function getBillingPeriod(transactionDate, account) {
        // Implementar lógica de período de fatura baseado na conta
        const date = new Date(transactionDate);
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        return `${month.toString().padStart(2, '0')}/${year}`;
    }

    function groupByAccount(expenses) {
        return expenses.reduce((acc, expense) => {
            const account = expense.account || 'Não especificado';
            acc[account] = (acc[account] || 0) + parseFloat(expense.amount);
            return acc;
        }, {});
    }

    function groupByCategory(expenses) {
        return expenses.reduce((acc, expense) => {
            const category = expense.category || 'Não especificado';
            acc[category] = (acc[category] || 0) + parseFloat(expense.amount);
            return acc;
        }, {});
    }

    // ========== INICIALIZAÇÃO ==========
    // Adicionar inicialização das tabs no final da inicialização
    function initializeDashboard() {
        populateAccountFilter();
        populateFilterOptions();
        fetchAllData();
        toggleExpenseFields();
        initializeTabs(); // Adicionar inicialização das tabs
    }

    // ========== INICIALIZAÇÃO AUTOMÁTICA ==========
    // Verificar se o usuário já está logado quando a página carrega
    async function init() {
        addEventListeners();
        
        const token = getToken();
        if (token) {
            try {
                // Verificar se o token ainda é válido
                console.log('Verificando token...');
                const response = await authenticatedFetch(`${API_BASE_URL}/api/accounts`);
                
                if (response.ok) {
                    console.log('Token válido, mostrando dashboard');
                    showDashboard();
                } else {
                    console.log('Token inválido, limpando e mostrando login');
                    // Token inválido, limpar e mostrar login
                    localStorage.removeItem('token');
                    localStorage.removeItem('username');
                    showLogin();
                }
            } catch (error) {
                console.log('Erro ao verificar token, mostrando login:', error);
                // Erro de rede ou autenticação, mostrar login
                showLogin();
            }
        } else {
            console.log('Nenhum token encontrado, mostrando login');
            showLogin();
        }
    }

    // ========== ANÁLISE DE FATURAS ==========
    
    let currentFilterType = 'simple';
    
    async function loadInvoicesAnalysis() {
        try {
            console.log('Carregando análise de faturas...');
            
            // Inicializar filtros
            initializeInvoiceFilters();
            populateInvoiceFilters();
            
            // Carregar dados iniciais
            await filterInvoices();
            
        } catch (error) {
            console.error('Erro ao carregar análise de faturas:', error);
            showNotification('Erro ao carregar dados de faturas', 'error');
        }
    }

    function initializeInvoiceFilters() {
        // Configurar botões de tipo de filtro
        const filterTypeBtns = document.querySelectorAll('.filter-type-btn');
        filterTypeBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const filterType = this.dataset.filterType;
                switchFilterType(filterType);
            });
        });

        // Configurar campo de período personalizado
        const periodBase = document.getElementById('period-base');
        if (periodBase) {
            periodBase.addEventListener('change', function() {
                const customFields = document.getElementById('custom-period-fields');
                if (this.value === 'custom') {
                    customFields.classList.remove('hidden');
                } else {
                    customFields.classList.add('hidden');
                }
            });
        }

        // Configurar valores padrão para filtro mensal
        const currentDate = new Date();
        const monthlyYear = document.getElementById('monthly-year');
        const monthlyStart = document.getElementById('monthly-start');
        const monthlyEnd = document.getElementById('monthly-end');

        if (monthlyStart) monthlyStart.value = '1'; // Janeiro
        if (monthlyEnd) monthlyEnd.value = '12'; // Dezembro
    }

    function switchFilterType(filterType) {
        currentFilterType = filterType;
        
        // Atualizar botões ativos
        document.querySelectorAll('.filter-type-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-filter-type="${filterType}"]`).classList.add('active');

        // Mostrar/ocultar seções de filtro
        document.querySelectorAll('.filter-section').forEach(section => {
            section.classList.add('hidden');
        });

        const targetSection = document.getElementById(`${filterType}-filter`);
        if (targetSection) {
            targetSection.classList.remove('hidden');
        }

        // Aplicar filtro automaticamente
        setTimeout(() => {
            if (filterType === 'simple') {
                filterInvoices();
            } else if (filterType === 'monthly') {
                filterInvoicesByMonth();
            } else if (filterType === 'period') {
                filterInvoicesByPeriod();
            }
        }, 100);
    }

    function populateInvoiceFilters() {
        const currentYear = new Date().getFullYear();
        
        // Preencher anos para filtros simples e mensais
        const yearSelects = ['invoice-year', 'monthly-year'];
        yearSelects.forEach(selectId => {
            const yearSelect = document.getElementById(selectId);
            if (!yearSelect) return;
            
            yearSelect.innerHTML = '<option value="">Todos os anos</option>';
            for (let year = currentYear; year >= currentYear - 5; year--) {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                if (year === currentYear && selectId === 'invoice-year') option.selected = true;
                if (year === currentYear && selectId === 'monthly-year') option.selected = true;
                yearSelect.appendChild(option);
            }
        });
    }

    async function filterInvoices() {
        if (currentFilterType === 'monthly') {
            return await filterInvoicesByMonth();
        } else if (currentFilterType === 'period') {
            return await filterInvoicesByPeriod();
        }
        
        // Filtro simples (padrão)
        try {
            const year = document.getElementById('invoice-year')?.value || '';
            const month = document.getElementById('invoice-month')?.value || '';
            const account = document.getElementById('invoice-account')?.value || '';
            const status = document.getElementById('invoice-status')?.value || '';
            const search = document.getElementById('invoice-search')?.value || '';

            console.log('Filtrando faturas (simples):', { year, month, account, status, search });

            const expenses = await fetchExpensesForInvoices(year, month, account);
            const invoiceData = processInvoicesData(expenses, status, search);
            
            updateInvoiceInterface(invoiceData);

        } catch (error) {
            console.error('Erro ao filtrar faturas:', error);
            showNotification('Erro ao carregar dados de faturas', 'error');
        }
    }

    async function filterInvoicesByMonth() {
        try {
            const year = document.getElementById('monthly-year')?.value || new Date().getFullYear();
            const startMonth = parseInt(document.getElementById('monthly-start')?.value || '1');
            const endMonth = parseInt(document.getElementById('monthly-end')?.value || '12');
            const account = document.getElementById('monthly-account')?.value || '';
            const search = document.getElementById('monthly-search')?.value || '';

            console.log('Filtrando faturas por meses:', { year, startMonth, endMonth, account, search });

            // Buscar gastos para todo o ano
            const expenses = await fetchExpensesForInvoices(year, '', account);
            
            // Filtrar por período de meses das datas de término
            const filteredExpenses = expenses.filter(expense => {
                if (!expense.total_installments || parseInt(expense.total_installments) <= 1) return false;
                
                const purchaseDate = new Date(expense.transaction_date);
                const totalInstallments = parseInt(expense.total_installments);
                const endDate = new Date(purchaseDate);
                endDate.setMonth(endDate.getMonth() + totalInstallments - 1);
                
                const endMonth = endDate.getMonth() + 1; // getMonth() retorna 0-11
                return endMonth >= startMonth && endMonth <= endMonth;
            });

            const invoiceData = processInvoicesData(filteredExpenses, '', search);
            updateInvoiceInterface(invoiceData);
            
            // Mostrar informação do período selecionado
            showPeriodInfo(`Meses ${startMonth} a ${endMonth} de ${year}`);

        } catch (error) {
            console.error('Erro ao filtrar por meses:', error);
            showNotification('Erro ao filtrar por meses', 'error');
        }
    }

    async function filterInvoicesByPeriod() {
        try {
            const periodBase = document.getElementById('period-base')?.value || 'current';
            const duration = parseInt(document.getElementById('period-duration')?.value || '30');
            const account = document.getElementById('period-account')?.value || '';
            const status = document.getElementById('period-status')?.value || '';
            const search = document.getElementById('period-search')?.value || '';

            console.log('Filtrando faturas por período:', { periodBase, duration, account, status, search });

            let startDate, endDate;
            const today = new Date();

            if (periodBase === 'custom') {
                const startInput = document.getElementById('period-start-date')?.value;
                const endInput = document.getElementById('period-end-date')?.value;
                
                if (!startInput || !endInput) {
                    showNotification('Por favor, selecione as datas de início e fim', 'warning');
                    return;
                }
                
                startDate = new Date(startInput);
                endDate = new Date(endInput);
            } else {
                // Calcular período baseado na seleção
                if (periodBase === 'current') {
                    startDate = new Date(today);
                    endDate = new Date(today);
                    endDate.setDate(endDate.getDate() + duration);
                } else if (periodBase === 'next') {
                    startDate = new Date(today);
                    startDate.setDate(startDate.getDate() + duration);
                    endDate = new Date(startDate);
                    endDate.setDate(endDate.getDate() + duration);
                } else if (periodBase === 'previous') {
                    endDate = new Date(today);
                    startDate = new Date(today);
                    startDate.setDate(startDate.getDate() - duration);
                }
            }

            // Buscar gastos sem filtro de data específico
            const expenses = await fetchExpensesForInvoices('', '', account);
            
            // Filtrar por período de término das parcelas
            const filteredExpenses = expenses.filter(expense => {
                if (!expense.total_installments || parseInt(expense.total_installments) <= 1) return false;
                
                const purchaseDate = new Date(expense.transaction_date);
                const totalInstallments = parseInt(expense.total_installments);
                const expenseEndDate = new Date(purchaseDate);
                expenseEndDate.setMonth(expenseEndDate.getMonth() + totalInstallments - 1);
                
                return expenseEndDate >= startDate && expenseEndDate <= endDate;
            });

            const invoiceData = processInvoicesData(filteredExpenses, status, search);
            updateInvoiceInterface(invoiceData);
            
            // Mostrar informação do período selecionado
            const periodDesc = `${startDate.toLocaleDateString('pt-BR')} a ${endDate.toLocaleDateString('pt-BR')} (${duration} dias)`;
            showPeriodInfo(periodDesc);

        } catch (error) {
            console.error('Erro ao filtrar por período:', error);
            showNotification('Erro ao filtrar por período', 'error');
        }
    }

    async function fetchExpensesForInvoices(year, month, account) {
        let url = `${API_BASE_URL}/api/expenses`;
        const params = new URLSearchParams();
        
        if (year) params.append('year', year);
        if (month) params.append('month', month);
        if (account) params.append('account', account);
        
        if (params.toString()) {
            url += '?' + params.toString();
        }

        const response = await authenticatedFetch(url);
        if (!response.ok) throw new Error('Erro ao buscar gastos');
        
        return await response.json();
    }

    function processInvoicesData(expenses, statusFilter, searchFilter) {
        // Filtrar apenas gastos com parcelas
        let expensesWithInstallments = expenses.filter(expense => 
            expense.total_installments && parseInt(expense.total_installments) > 1
        );

        // Aplicar filtro de busca se especificado
        if (searchFilter) {
            expensesWithInstallments = expensesWithInstallments.filter(expense =>
                expense.description.toLowerCase().includes(searchFilter.toLowerCase())
            );
        }

        // Calcular dados das faturas
        return calculateInvoiceData(expensesWithInstallments, statusFilter);
    }

    function updateInvoiceInterface(invoiceData) {
        updateInvoiceSummary(invoiceData);
        updateInvoiceCharts(invoiceData);
        updateInvoiceAccountCards(invoiceData);
        updateInvoiceDetailsTable(invoiceData.filteredExpenses);
        updateInvoiceAlerts(invoiceData.alerts);
    }

    function showPeriodInfo(description) {
        const periodInfo = document.getElementById('period-info');
        const periodDescription = document.getElementById('period-description');
        
        if (periodInfo && periodDescription) {
            periodDescription.textContent = description;
            periodInfo.classList.remove('hidden');
        }
    }

    function calculateInvoiceData(expenses, statusFilter) {
        const today = new Date();
        
        const processedExpenses = expenses.map(expense => {
            const purchaseDate = new Date(expense.transaction_date);
            const totalInstallments = parseInt(expense.total_installments) || 1;
            
            // Calcular data de término (último mês da parcela)
            const endDate = new Date(purchaseDate);
            endDate.setMonth(endDate.getMonth() + totalInstallments - 1);
            
            // Determinar status
            let status = 'finalizado';
            let daysRemaining = 0;
            
            if (endDate > today) {
                const daysUntilEnd = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
                daysRemaining = daysUntilEnd;
                
                if (daysUntilEnd <= 30) {
                    status = 'vencendo';
                } else {
                    status = 'em-andamento';
                }
            }
            
            return {
                ...expense,
                endDate: endDate.toISOString().split('T')[0],
                status,
                daysRemaining,
                installmentValue: parseFloat(expense.amount),
                totalValue: parseFloat(expense.amount) * totalInstallments
            };
        });

        // Filtrar por status se especificado
        let filteredExpenses = processedExpenses;
        if (statusFilter) {
            filteredExpenses = processedExpenses.filter(exp => exp.status === statusFilter);
        }

        // Agrupar por conta
        const byAccount = filteredExpenses.reduce((acc, expense) => {
            if (!acc[expense.account]) {
                acc[expense.account] = [];
            }
            acc[expense.account].push(expense);
            return acc;
        }, {});

        // Calcular totais
        const totalFiltered = filteredExpenses.reduce((sum, exp) => sum + exp.totalValue, 0);
        const ongoingCount = processedExpenses.filter(exp => exp.status === 'em-andamento').length;
        const endingCount = processedExpenses.filter(exp => exp.status === 'vencendo').length;

        // Gerar alertas
        const alerts = generateInvoiceAlerts(processedExpenses);

        return {
            allExpenses: processedExpenses,
            filteredExpenses,
            byAccount,
            totalFiltered,
            transactionCount: filteredExpenses.length,
            ongoingCount,
            endingCount,
            alerts
        };
    }

    function generateInvoiceAlerts(expenses) {
        const alerts = [];
        
        // Alertas para vencimentos próximos (próximos 30 dias)
        const soonToExpire = expenses.filter(exp => exp.status === 'vencendo');
        
        if (soonToExpire.length > 0) {
            alerts.push({
                type: 'warning',
                title: `${soonToExpire.length} fatura(s) terminam em até 30 dias`,
                description: soonToExpire.map(exp => 
                    `${exp.description} (${exp.account}) - ${exp.daysRemaining} dias`
                ).slice(0, 3).join(', ') + (soonToExpire.length > 3 ? '...' : ''),
                count: soonToExpire.length
            });
        }

        // Alertas informativos para faturas em andamento
        const ongoing = expenses.filter(exp => exp.status === 'em-andamento');
        if (ongoing.length > 0) {
            alerts.push({
                type: 'info',
                title: `${ongoing.length} fatura(s) em andamento`,
                description: `Parcelas sendo pagas regularmente.`,
                count: ongoing.length
            });
        }

        return alerts;
    }

    function updateInvoiceSummary(data) {
        const totalElement = document.getElementById('invoice-total-filtered');
        const countElement = document.getElementById('invoice-count-filtered');
        const ongoingElement = document.getElementById('invoice-ongoing-count');
        const endingElement = document.getElementById('invoice-ending-count');
        
        if (totalElement) totalElement.textContent = 'R$ ' + data.totalFiltered.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        if (countElement) countElement.textContent = data.transactionCount;
        if (ongoingElement) ongoingElement.textContent = data.ongoingCount;
        if (endingElement) endingElement.textContent = data.endingCount;
    }

    function updateInvoiceCharts(data) {
        // Gráfico de evolução mensal
        updateInvoiceEvolutionChart(data.filteredExpenses);
        
        // Gráfico de distribuição por conta
        updateInvoiceAccountChart(data.byAccount);
    }

    function updateInvoiceEvolutionChart(expenses) {
        const ctx = document.getElementById('invoice-evolution-chart');
        if (!ctx) return;

        // Agrupar por mês de término
        const monthlyData = expenses.reduce((acc, expense) => {
            const endDate = new Date(expense.endDate);
            const monthKey = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`;
            
            if (!acc[monthKey]) {
                acc[monthKey] = { total: 0, count: 0 };
            }
            acc[monthKey].total += expense.totalValue;
            acc[monthKey].count += 1;
            
            return acc;
        }, {});

        const sortedMonths = Object.keys(monthlyData).sort();
        const labels = sortedMonths.map(month => {
            const [year, monthNum] = month.split('-');
            const date = new Date(year, monthNum - 1);
            return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
        });
        const values = sortedMonths.map(month => monthlyData[month].total);

        if (window.invoiceEvolutionChart) {
            window.invoiceEvolutionChart.destroy();
        }

        window.invoiceEvolutionChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Valor das Faturas',
                    data: values,
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Evolução Mensal das Faturas'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return 'R$ ' + value.toLocaleString('pt-BR');
                            }
                        }
                    }
                }
            }
        });
    }

    function updateInvoiceAccountChart(accountData) {
        const ctx = document.getElementById('invoice-account-chart');
        if (!ctx) return;

        const accounts = Object.keys(accountData);
        const values = accounts.map(account => 
            accountData[account].reduce((sum, exp) => sum + exp.totalValue, 0)
        );

        if (window.invoiceAccountChart) {
            window.invoiceAccountChart.destroy();
        }

        window.invoiceAccountChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: accounts,
                datasets: [{
                    data: values,
                    backgroundColor: [
                        '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', 
                        '#ef4444', '#6366f1', '#ec4899', '#84cc16'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Distribuição por Conta'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${context.label}: R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    function updateInvoiceAccountCards(data) {
        const container = document.getElementById('invoice-accounts-container');
        if (!container) return;

        container.innerHTML = '';

        Object.keys(data.byAccount).forEach(account => {
            const accountExpenses = data.byAccount[account];
            const accountTotal = accountExpenses.reduce((sum, exp) => sum + exp.totalValue, 0);
            const ongoingCount = accountExpenses.filter(exp => exp.status === 'em-andamento').length;
            const endingCount = accountExpenses.filter(exp => exp.status === 'vencendo').length;

            const cardHtml = `
                <div class="bg-white p-6 rounded-lg shadow-md mb-6 invoice-account-card">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-semibold text-gray-700">${account}</h3>
                        <div class="text-right">
                            <p class="text-2xl font-bold text-purple-600">R$ ${accountTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            <p class="text-sm text-gray-500">${accountExpenses.length} faturas</p>
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-3 gap-4 mb-4">
                        <div class="text-center p-3 bg-green-50 rounded-lg">
                            <p class="text-sm text-green-600">Finalizadas</p>
                            <p class="text-lg font-bold text-green-700">${accountExpenses.filter(exp => exp.status === 'finalizado').length}</p>
                        </div>
                        <div class="text-center p-3 bg-blue-50 rounded-lg">
                            <p class="text-sm text-blue-600">Em Andamento</p>
                            <p class="text-lg font-bold text-blue-700">${ongoingCount}</p>
                        </div>
                        <div class="text-center p-3 bg-yellow-50 rounded-lg">
                            <p class="text-sm text-yellow-600">Vencendo</p>
                            <p class="text-lg font-bold text-yellow-700">${endingCount}</p>
                        </div>
                    </div>

                    <div class="overflow-x-auto">
                        <table class="w-full text-sm">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="p-2 text-left">Descrição</th>
                                    <th class="p-2 text-left">Valor Total</th>
                                    <th class="p-2 text-left">Status</th>
                                    <th class="p-2 text-left">Término</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${accountExpenses.map(expense => `
                                    <tr class="invoice-table-row border-t">
                                        <td class="p-2">${expense.description}</td>
                                        <td class="p-2">R$ ${expense.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                        <td class="p-2">
                                            <span class="invoice-status-badge invoice-status-${expense.status}">
                                                ${expense.status === 'em-andamento' ? 'Em Andamento' : 
                                                  expense.status === 'finalizado' ? 'Finalizado' : 'Vencendo'}
                                            </span>
                                        </td>
                                        <td class="p-2">${new Date(expense.endDate).toLocaleDateString('pt-BR')}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            
            container.innerHTML += cardHtml;
        });
    }

    function updateInvoiceDetailsTable(expenses) {
        const tbody = document.getElementById('invoice-details-table');
        if (!tbody) return;

        tbody.innerHTML = expenses.map(expense => `
            <tr class="invoice-table-row border-t">
                <td class="p-3">${new Date(expense.transaction_date).toLocaleDateString('pt-BR')}</td>
                <td class="p-3">${expense.description}</td>
                <td class="p-3">R$ ${expense.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td class="p-3">${expense.account}</td>
                <td class="p-3">${expense.total_installments}x de R$ ${expense.installmentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td class="p-3">${new Date(expense.endDate).toLocaleDateString('pt-BR')}</td>
                <td class="p-3">
                    <span class="invoice-status-badge invoice-status-${expense.status}">
                        ${expense.status === 'em-andamento' ? 'Em Andamento' : 
                          expense.status === 'finalizado' ? 'Finalizado' : 'Vencendo'}
                    </span>
                </td>
                <td class="p-3">
                    ${expense.status === 'em-andamento' || expense.status === 'vencendo' ? 
                        `${expense.daysRemaining} dias` : 
                        'Finalizado'}
                </td>
            </tr>
        `).join('');
    }

    function updateInvoiceAlerts(alerts) {
        const container = document.getElementById('invoice-alerts');
        if (!container) return;

        if (alerts.length === 0) {
            container.innerHTML = '<p class="text-gray-500">Nenhum alerta no momento.</p>';
            return;
        }

        container.innerHTML = alerts.map(alert => `
            <div class="p-4 rounded-lg ${alert.type === 'warning' ? 'invoice-warning' : 'bg-blue-50 border-l-4 border-blue-400'}">
                <div class="flex items-center gap-3">
                    <span class="text-2xl">${alert.type === 'warning' ? '⚠️' : 'ℹ️'}</span>
                    <div>
                        <h4 class="font-semibold">${alert.title}</h4>
                        <p class="text-sm mt-1">${alert.description}</p>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Event listeners para a aba de faturas
    function initializeInvoiceEventListeners() {
        // Botões de filtro principal
        const filterInvoicesBtn = document.getElementById('filter-invoices-btn');
        if (filterInvoicesBtn) {
            filterInvoicesBtn.addEventListener('click', filterInvoices);
        }

        // Botões específicos para cada tipo de filtro
        const filterMonthlyBtn = document.getElementById('filter-monthly-btn');
        if (filterMonthlyBtn) {
            filterMonthlyBtn.addEventListener('click', filterInvoicesByMonth);
        }

        const filterPeriodBtn = document.getElementById('filter-period-btn');
        if (filterPeriodBtn) {
            filterPeriodBtn.addEventListener('click', filterInvoicesByPeriod);
        }

        // Auto-filtrar quando mudar filtros simples
        ['invoice-year', 'invoice-month', 'invoice-account', 'invoice-status'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => {
                    if (currentFilterType === 'simple') {
                        filterInvoices();
                    }
                });
            }
        });

        // Auto-filtrar quando mudar filtros mensais
        ['monthly-year', 'monthly-start', 'monthly-end', 'monthly-account'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => {
                    if (currentFilterType === 'monthly') {
                        filterInvoicesByMonth();
                    }
                });
            }
        });

        // Auto-filtrar quando mudar filtros de período
        ['period-base', 'period-duration', 'period-account', 'period-status'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => {
                    if (currentFilterType === 'period') {
                        filterInvoicesByPeriod();
                    }
                });
            }
        });

        // Campos de data personalizada
        ['period-start-date', 'period-end-date'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => {
                    if (currentFilterType === 'period' && 
                        document.getElementById('period-base')?.value === 'custom') {
                        filterInvoicesByPeriod();
                    }
                });
            }
        });

        // Busca por texto com debounce
        const searchElements = [
            { id: 'invoice-search', filterType: 'simple' },
            { id: 'monthly-search', filterType: 'monthly' },
            { id: 'period-search', filterType: 'period' }
        ];

        searchElements.forEach(({ id, filterType }) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', debounce(() => {
                    if (currentFilterType === filterType) {
                        if (filterType === 'simple') filterInvoices();
                        else if (filterType === 'monthly') filterInvoicesByMonth();
                        else if (filterType === 'period') filterInvoicesByPeriod();
                    }
                }, 500));
            }
        });

        // Botões de exportação
        const exportCsvBtn = document.getElementById('export-invoices-csv');
        const exportPdfBtn = document.getElementById('export-invoices-pdf');
        
        if (exportCsvBtn) {
            exportCsvBtn.addEventListener('click', exportInvoicesCSV);
        }
        
        if (exportPdfBtn) {
            exportPdfBtn.addEventListener('click', exportInvoicesPDF);
        }
    }

    function exportInvoicesCSV() {
        showNotification('Funcionalidade de exportação CSV em desenvolvimento', 'info');
    }

    function exportInvoicesPDF() {
        showNotification('Funcionalidade de exportação PDF em desenvolvimento', 'info');
    }

    // ===== INICIALIZAÇÃO PRINCIPAL =====
    function init() {
        // Verificar autenticação inicial
        if (checkAuthentication()) {
            showDashboard();
        } else {
            showLogin();
        }
        
        // Adicionar event listeners
        addEventListeners();
    }

    // ===== INICIALIZAR QUANDO DOM ESTIVER PRONTO =====
    init();

});
