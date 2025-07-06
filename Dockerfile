# Builder stage
FROM node:20-alpine AS builder

WORKDIR /app/zent-bot

COPY package*.json ./
COPY tsconfig*.json ./

RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build

# Final stage
FROM node:20-alpine

WORKDIR /app/zent-bot

COPY --from=builder /app/zent-bot/package*.json ./
COPY --from=builder /app/zent-bot/node_modules ./node_modules
COPY --from=builder /app/zent-bot/dist ./dist

ENV NODE_ENV=production

RUN npm run deloy

CMD ["npm", "start"]
