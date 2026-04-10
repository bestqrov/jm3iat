FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY mar-eac/backend/package*.json ./
RUN npm ci --omit=dev

COPY mar-eac/backend/ .
RUN npx prisma generate

RUN mkdir -p uploads

EXPOSE 5000

CMD ["node", "src/server.js"]
