# ── Stage 1: build Angular ────────────────────────────────────────────────────
FROM node:20-alpine AS web-build
WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci --prefer-offline
COPY web/ .
RUN npm run build -- --configuration production

# ── Stage 2: Python API ───────────────────────────────────────────────────────
FROM python:3.11-slim
WORKDIR /app/api

COPY api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY api/ .

# Angular production build lands at dist/web/browser
COPY --from=web-build /app/web/dist/web/browser ./static

EXPOSE 8000
EXPOSE 1884
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
