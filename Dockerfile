FROM node:18-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN npm install -g pnpm && pnpm install

COPY . .
RUN pnpm build

ENV NODE_ENV=production
ENV PORT=3000

# Điểm vào
CMD ["pnpm", "start"]