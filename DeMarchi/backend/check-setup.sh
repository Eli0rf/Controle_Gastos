#!/bin/bash

echo "🚀 Verificando dependências..."

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado"
    exit 1
fi

echo "✅ Node.js versão: $(node --version)"

# Instalar dependências
echo "📦 Instalando dependências..."
npm install

# Verificar se canvas está funcionando
echo "🎨 Testando canvas..."
node -e "
try {
  const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
  console.log('✅ Canvas funcionando');
} catch (error) {
  console.log('⚠️  Canvas não disponível, mas aplicação funcionará sem gráficos');
}
"

echo "🏁 Verificação concluída!"
echo "Para iniciar: npm start"
