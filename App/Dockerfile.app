# IA-TB GEN-1 full application validation image.
# No runtime npm installation and no engine is started by default.
FROM node:22-bookworm AS dependencies
WORKDIR /opt/iatb/App
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

FROM node:22-bookworm
WORKDIR /opt/iatb/App
ENV NODE_ENV=production
COPY --from=dependencies /opt/iatb/App/node_modules ./node_modules
COPY . .
# The safe in-memory SQLite preflight is the only default command.
CMD ["node", "Tools/sqlite_preflight.js"]
