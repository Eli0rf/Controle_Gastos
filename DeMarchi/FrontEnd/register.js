// eli0rf/controle_gastos/Controle_Gastos-60197f8d21e2307975da598077e1e1fa8b4b7de9/DeMarchi/FrontEnd/register.js

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const feedbackMessage = document.getElementById('feedback-message');
    const registerButton = document.getElementById('register-button');

    // ALTERAÇÃO 1: Defina a API_URL para o URL base do seu backend no Railway.
    const API_URL = 'https://controlegastos-production.up.railway.app';

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Impede o envio padrão do formulário

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        // Limpa mensagens anteriores e desativa o botão para evitar cliques múltiplos
        feedbackMessage.textContent = '';
        feedbackMessage.className = 'mb-4 text-center text-sm';
        registerButton.disabled = true;
        registerButton.textContent = 'A processar...';

        try {
            // ALTERAÇÃO 2: Corrija o caminho da rota para /api/register.
            const response = await fetch(`${API_URL}/api/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (!response.ok) {
                // Se a resposta não for bem-sucedida, lança um erro com a mensagem do servidor
                throw new Error(data.message || 'Ocorreu um erro.');
            }

            // Sucesso!
            feedbackMessage.textContent = 'Conta criada com sucesso! A redirecionar para o login...';
            feedbackMessage.classList.add('text-green-600');

            // Redireciona para a página de login após um curto intervalo
            setTimeout(() => {
                // ALTERAÇÃO 3: Corrija o link para a página de login/dashboard.
                // Se a página de login for a `dashboard.html`, está correto.
                window.location.href = 'dashboard.html';
            }, 2000);

        } catch (error) {
            // Exibe a mensagem de erro
            feedbackMessage.textContent = error.message;
            feedbackMessage.classList.add('text-red-600');
            
            // Reativa o botão em caso de erro
            registerButton.disabled = false;
            registerButton.textContent = 'Registar';
        }
    });
});
