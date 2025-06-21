document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const feedbackMessage = document.getElementById('feedback-message');
    const registerButton = document.getElementById('register-button');

    // ALTERAÇÃO 1: Usando a URL pública e correta do backend.
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
            // ALTERAÇÃO 2: Corrigido o caminho da rota para /register, conforme definido no server.js.
            const response = await fetch(`${API_URL}/register`, {
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
