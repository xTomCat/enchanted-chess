FROM node:20-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY server.js chessAI.js ./
COPY public ./public

EXPOSE 3000

USER node

CMD ["node", "server.js"]
