# Use uma imagem Node.js com bibliotecas necessárias para canvas
FROM node:18-bullseye

# Instalar dependências do sistema para canvas
RUN apt-get update && apt-get install -y \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Definir diretório de trabalho
WORKDIR /app

# Copiar apenas package.json primeiro
COPY package.json ./

# Instalar dependências com handling para canvas
RUN npm install --omit=dev --no-package-lock && \
    npm rebuild canvas || echo 'Canvas rebuild failed, continuing without it' && \
    npm cache clean --force

# Copiar código fonte
COPY . .

# Criar diretório de uploads com permissões adequadas
RUN mkdir -p uploads && chmod 755 uploads

# Criar usuário não-root para segurança
RUN groupadd -r appuser && useradd -r -g appuser appuser
RUN chown -R appuser:appuser /app
USER appuser

# Expor porta
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Comando para iniciar o servidor
CMD ["npm", "start"]

# Comando de start
CMD ["npm", "start"]
