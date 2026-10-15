FROM node:24-bookworm-slim AS frontend
WORKDIR /app
COPY client/package*.json ./client/
RUN cd client && npm ci
COPY shared ./shared
COPY client ./client
ENV VITE_API_URL=/api
RUN cd client && npm run build

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production HOST=0.0.0.0 DB_PATH=/data/alira.db BACKUP_DIR=/backups BACKUP_INTERVAL_HOURS=24
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY server/src ./src
COPY server/scripts ./scripts
COPY shared /app/shared
COPY --from=frontend /app/client/dist /app/client/dist
RUN mkdir -p /data /backups && chown -R node:node /app /data /backups
USER node
VOLUME ["/data", "/backups"]
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node","src/index.js"]
