FROM node:18-alpine

# Criar diretório de trabalho
WORKDIR /app

# Copiar package.json e package-lock.json
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production

# Copiar arquivos estáticos
COPY *.html ./
COPY *.js ./
COPY *.css ./

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S frontend -u 1001

# Mudar para usuário não-root
USER frontend

# Expor porta
EXPOSE 3000

# Comando de inicialização
CMD ["npm", "start"]
