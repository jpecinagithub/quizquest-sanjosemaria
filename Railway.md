# Variables Railway

Este proyecto usa 3 servicios en Railway: `front` (Vite), `api` (Node/Express) y `mysql`.

## 1) Servicio `front`
Variables que debes configurar en el servicio del frontend:

- `VITE_API_BASE_URL` (obligatoria)
  - Ejemplo: `https://api-production-3be9.up.railway.app/api`
- `GEMINI_API_KEY` (opcional, solo si usas generación de preguntas con Gemini en el frontend)
  - Ejemplo: `AIza...`

## 2) Servicio `api`
Variables que debes configurar en el servicio backend:

- `DB_URL` (obligatoria)
  - Usa la URL pública o privada de MySQL que te da Railway.
  - Ejemplo: `mysql://root:*****@host:puerto/railway`
- `DB_NAME` (obligatoria)
  - Ejemplo: `quizquest_db`
- `RESEND_API_KEY` (obligatoria para recuperación de contraseña por email)
  - Ejemplo: `re_...`
- `MAIL_FROM` (obligatoria para Resend)
  - Ejemplo inicial: `onboarding@resend.dev`
- `APP_BASE_URL` (recomendada)
  - URL pública del frontend.
  - Ejemplo: `https://front-production-f2cc.up.railway.app`

Variables opcionales en `api`:

- `SESSION_TTL_MS`
  - Default: `28800000` (8h)
- `PASSWORD_RESET_TOKEN_TTL_MINUTES`
  - Default: `30`
- `AUTH_RATE_LIMIT_WINDOW_MS`
  - Default: `900000` (15 minutos)
- `AUTH_RATE_LIMIT_MAX_REQUESTS`
  - Default: `10`
- `CORS_ORIGIN`
  - Recomendado en producción.
  - Un origen o varios separados por coma.
  - Ejemplo: `https://front-production-f2cc.up.railway.app`
- `PORT`
  - Railway la inyecta automáticamente; no suele hacer falta definirla manualmente.

## 3) Servicio `mysql`
En el servicio MySQL normalmente no tienes que crear variables manualmente.
Railway las genera automáticamente (usuario, password, host, puerto y database).

Lo importante:

- Mantener el servicio MySQL encendido.
- Copiar su `Connection URL` y ponerla en `DB_URL` del servicio `api`.
- Confirmar que `DB_NAME` en `api` coincide con la base real (`quizquest_db` en tu caso).

## Checklist rápido

1. `front` -> `VITE_API_BASE_URL` apuntando a `/api` del backend.
2. `api` -> `DB_URL`, `DB_NAME`, `RESEND_API_KEY`, `MAIL_FROM`, `APP_BASE_URL`.
3. Redeploy de `api` y `front` tras cambiar variables.
