# Dockerfile otimizado para Railway com healthcheck robusto
FROM node:18-bullseye-slim

# Instalar dependências do sistema necessárias
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Definir diretório de trabalho
WORKDIR /app

# Copiar package.json primeiro para cache de dependências
COPY package*.json ./

# Instalar dependências com retry e error handling
RUN npm ci --only=production || npm install --only=production --no-optional

# Copiar código fonte
COPY . .

# Criar diretório de uploads
RUN mkdir -p uploads && chmod 755 uploads

# Criar usuário não-root para segurança
RUN groupadd -r appuser && useradd -r -g appuser appuser
RUN chown -R appuser:appuser /app
USER appuser

# Expor porta
EXPOSE 3000

# Health check robusto com fallbacks
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=5 \
    CMD curl -f http://localhost:${PORT:-3000}/health-simple || \
        curl -f http://localhost:${PORT:-3000}/health || \
        curl -f http://localhost:${PORT:-3000}/ || exit 1

# Comando de inicialização
CMD ["npm", "start"]
