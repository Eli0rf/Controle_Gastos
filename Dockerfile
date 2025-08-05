FROM node:18-alpine

WORKDIR /app

# Copiar package.json e package-lock.json primeiro para aproveitar o cache
COPY DeMarchi/backend/package*.json ./

# Instalar dependências
RUN npm install --production

# Copiar o resto dos arquivos
COPY DeMarchi/backend .

# Expor a porta que o app usa
EXPOSE 3000

# Comando para iniciar o app
CMD ["npm", "start"]
