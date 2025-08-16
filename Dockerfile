# Builder stage
FROM node:20-alpine AS builder

RUN npm install --global corepack@latest && corepack enable pnpm

WORKDIR /app/zent-bot

COPY package.json ./
COPY pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm run build

# Final stage
FROM node:20-alpine

RUN npm install --global corepack@latest && corepack enable pnpm

WORKDIR /app/zent-bot

COPY --from=builder /app/zent-bot/package.json ./ 
COPY --from=builder /app/zent-bot/pnpm-lock.yaml ./
COPY --from=builder /app/zent-bot/node_modules ./node_modules
COPY --from=builder /app/zent-bot/dist ./dist

ENV NODE_ENV=production

CMD ["sh", "-c", "pnpm run deploy && pnpm run start"]
