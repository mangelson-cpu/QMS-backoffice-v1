# ─── Stage 1 : Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Désactiver les erreurs de certificat SSL pour npm
RUN npm config set strict-ssl false

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# ─── Stage 2 : Serve via Nginx ────────────────────────────────────────────────
FROM nginx:alpine

# Supprimer la config par défaut et copier la nôtre
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copier le build
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
