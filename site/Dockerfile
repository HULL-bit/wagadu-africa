FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm install

FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Les variables NEXT_PUBLIC_* sont inlinées dans le bundle au moment du build
# (pas lues au runtime) — il faut donc les recevoir ici en ARG, pas seulement
# comme `environment:` du conteneur au démarrage (sinon elles restent figées
# à `undefined` indéfiniment, même si .env les définit correctement).
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_HUB_URL
ARG NEXT_PUBLIC_DIRECTUS_ADMIN_URL
ARG NEXT_PUBLIC_DONORBOX_CAMPAIGN
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_HUB_URL=$NEXT_PUBLIC_HUB_URL
ENV NEXT_PUBLIC_DIRECTUS_ADMIN_URL=$NEXT_PUBLIC_DIRECTUS_ADMIN_URL
ENV NEXT_PUBLIC_DONORBOX_CAMPAIGN=$NEXT_PUBLIC_DONORBOX_CAMPAIGN
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
