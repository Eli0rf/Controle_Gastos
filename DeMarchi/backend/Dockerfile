# Dockerfile otimizado para Railway - versão estável
FROM node:18-bullseye-slim

# Instalar dependências do sistema essenciais
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Definir diretório de trabalho
WORKDIR /app

# Copiar package.json e package-lock.json (se existir)
COPY package*.json ./

# Instalar dependências com fallback robusto
RUN npm install --only=production --no-package-lock || \
    npm install --production --force || \
    npm install --production

# Copiar código fonte
COPY . .

# Criar diretório de uploads
RUN mkdir -p uploads && chmod 755 uploads

# Expor porta
EXPOSE 3000

# Health check com múltiplos fallbacks
HEALTHCHECK --interval=30s --timeout=15s --start-period=90s --retries=3 \
    CMD curl -f http://localhost:${PORT:-3000}/ping || \
        curl -f http://localhost:${PORT:-3000}/health-simple || \
        exit 1

# Comando de inicialização
CMD ["npm", "start"]
