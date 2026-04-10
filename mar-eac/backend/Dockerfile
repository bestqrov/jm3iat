FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .
RUN npx prisma generate

RUN mkdir -p uploads

EXPOSE 5000

CMD ["node", "--max-http-header-size=32768", "src/server.js"]
