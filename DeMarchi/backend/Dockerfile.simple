# Dockerfile alternativo mais simples
FROM node:18-alpine

# Instalar dependências básicas
RUN apk add --no-cache \
    build-base \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev \
    librsvg-dev \
    curl

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de configuração
COPY package.json .npmrc ./

# Instalar dependências
RUN npm install --production --no-package-lock || npm install --production --force

# Copiar código
COPY . .

# Criar uploads directory
RUN mkdir -p uploads

# Expor porta
EXPOSE 3000

# Health check simples
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

# Comando start
CMD ["npm", "start"]
