# Requerimiento Técnico del Proyecto QuizQuest

## 1. Propósito del documento
Este documento define el estado actual del proyecto, su arquitectura, tecnologías, despliegue y lineamientos para continuar el desarrollo con otro equipo sin pérdida de contexto.

## 2. Resumen del sistema
QuizQuest es una aplicación web de quizzes con:

- Frontend React (SPA) para autenticación, dashboard, quiz, resultados, ajustes y panel admin.
- Backend Node.js/Express para autenticación, sesiones, CRUD de asignaturas, almacenamiento de resultados y recuperación de contraseña.
- Base de datos MySQL para usuarios, asignaturas, preguntas, resultados y tokens de recuperación.
- Integraciones externas:
  - Google Gemini (generación de preguntas desde frontend).
  - Resend (envío de email de recuperación de contraseña desde backend).

## 3. Arquitectura actual

### 3.1 Frontend
- Tipo: SPA React + TypeScript.
- Entrada: `index.tsx`.
- Componente raíz: `App.tsx`.
- Estado de sesión/autenticación: `context/AuthContext.tsx`.
- Cliente API:
  - `services/api.ts` (dominio funcional de app).
  - `services/authApi.ts` (autenticación y recuperación).
- IA (Gemini): `services/geminiService.ts`.

### 3.2 Backend
- Archivo principal: `server.js`.
- Framework: Express.
- Persistencia: `mysql2` con conexión por `DB_URL` o variables sueltas.
- Sesiones: en memoria (`Map`) con TTL configurable.
- Archivos estáticos de imágenes: `public/images` servido en `/images`.

### 3.3 Base de datos
- Scripts:
  - Estructura: `bbdd/database.sql`.
  - Datos de prueba/preguntas: `bbdd/seed.sql`.

## 4. Tecnologías y librerías usadas

## 4.1 Frontend
- `react`, `react-dom`: UI y render.
- `typescript`: tipado estático.
- `vite`: bundler/dev server/build.
- `@vitejs/plugin-react`: integración React en Vite.
- `@google/genai`: cliente de Gemini para generar preguntas.
- Tailwind vía CDN en `index.html` (no tailwind compilado por PostCSS).

Observación: actualmente el frontend usa clases Tailwind y configuración inline en `index.html`.

## 4.2 Backend
- `express`: API REST y middleware.
- `mysql2`: conexión y queries MySQL.
- `cors`: habilita CORS entre front y API.
- `dotenv`: carga de variables de entorno.
- `crypto` (nativo Node): UUID para sesiones/tokens.
- `fs` / `path` (nativos Node): subida y gestión de imágenes.

### 4.3 Sin uso actual (eliminado)
- SMTP/Nodemailer. El flujo vigente de recuperación usa Resend HTTP API.

## 5. Modelo de datos MySQL

Tablas principales definidas en `bbdd/database.sql`:

- `users`
  - `id` INT AUTO_INCREMENT PK
  - `name`, `email`, `password`, `profile_pic`, `total_xp`, `created_at`
- `subjects`
  - `id` INT AUTO_INCREMENT PK
  - `name`, `description`, `image_url`, `activo`
- `questions`
  - Banco de preguntas por asignatura
  - FK `subject_id -> subjects.id`
- `quiz_results`
  - Resultados por usuario/asignatura
  - FK `user_id -> users.id`, FK `subject_id -> subjects.id`
- `password_resets`
  - Tokens de recuperación
  - `token`, `expires_at`, `used_at`

Notas relevantes:
- El `id` de `subjects` ya es numérico autoincremental.
- Existe borrado lógico de asignaturas (`activo=0`) en vez de borrado físico.

## 6. Flujo de autenticación y sesiones

- Login: `POST /api/auth/login`.
- Registro: `POST /api/auth/register`.
- Logout: `POST /api/auth/logout`.
- Sesión actual: `GET /api/auth/me`.
- Sesiones guardadas en memoria en `server.js` (`Map`), con expiración por `SESSION_TTL_MS`.

Limitación actual:
- Al reiniciar backend se invalidan todas las sesiones activas.

## 7. Recuperación de contraseña (implementación actual)

## 7.1 Backend
- `POST /api/auth/forgot-password`
  - Verifica email.
  - Crea token temporal en `password_resets`.
  - Envía correo por Resend (`https://api.resend.com/emails`).
- `POST /api/auth/reset-password`
  - Valida email + token no usado + no expirado.
  - Actualiza contraseña y marca token como usado.

Variables necesarias en API:
- `RESEND_API_KEY`
- `MAIL_FROM`
- `APP_BASE_URL` (recomendada para texto de instrucciones)
- `PASSWORD_RESET_TOKEN_TTL_MINUTES`

## 7.2 Frontend
- Pantalla en `components/LoginScreen.tsx` con modos:
  - `forgot`: solicitar código.
  - `reset`: establecer nueva contraseña con token.
- Lógica en `services/authApi.ts` y coordinación en `App.tsx`.

## 7.3 Servicio externo
- Proveedor: Resend.
- Estado: integrado por API HTTP; SMTP eliminado.

## 8. Integración de IA (Gemini)

- Archivo: `services/geminiService.ts`.
- Usa modelo `gemini-3-flash-preview` para generar preguntas tipo test.
- Si falla la IA, la app usa preguntas fallback locales (`constants.tsx`).

## 9. Deploy con Railway

Despliegue recomendado con 3 servicios:

- `front` (Vite preview/build servido por Railway)
- `api` (Node/Express)
- `mysql` (plugin MySQL de Railway)

Variables por servicio documentadas en `Railway.md`.

Flujo de release:
1. Commit local.
2. Push a rama desplegada.
3. Railway build/deploy automático.
4. Validación smoke test:
   - Login
   - Carga de asignaturas
   - Quiz finish
   - Forgot password + reset password

## 10. Inventario de archivos clave del proyecto

## 10.1 Código
- `App.tsx`: orquestación de pantallas y flujos.
- `server.js`: API backend completa.
- `services/api.ts`: cliente de endpoints de negocio.
- `services/authApi.ts`: login/register/forgot/reset/logout.
- `services/geminiService.ts`: integración IA.
- `components/*.tsx`: UI por pantalla.
- `context/AuthContext.tsx`: estado de sesión cliente.

## 10.2 Documentación y operación
- `endpoints.md`: catálogo de endpoints.
- `peticiones.rest`: colección de pruebas manuales.
- `Railway.md`: variables por servicio para deploy.
- `README.md`: instalación y ejecución.

## 10.3 Base de datos
- `bbdd/database.sql`: esquema + datos base.
- `bbdd/seed.sql`: carga de preguntas.

## 11. Requisito crítico de responsive (obligatorio)

La app debe adaptarse correctamente a móvil, tablet y desktop.

Criterios mínimos obligatorios:
- Mobile-first real (320px+).
- Tablet (768px+) con reflujo de layout.
- Desktop (1024px+) sin limitar toda la UX a viewport móvil.
- No desbordes horizontales.
- Botones con área táctil mínima 44x44 px.
- Inputs y modales utilizables con teclado móvil/desktop.
- Imágenes adaptativas y con tamaño máximo definido.
- Tipografías fluidas y jerarquía legible en todos los breakpoints.

Estado actual:
- El contenedor principal usa `max-w-[430px]`, lo que prioriza UX móvil y reduce uso de espacio en desktop.

Recomendación técnica inmediata:
- Definir layout responsive por breakpoints en `App.tsx` y `components/*` para desktop/tablet.
- Introducir una guía de diseño responsive común (tokens de spacing, tipografía y grid).
- Validar con pruebas manuales en 320/375/768/1024/1440.

## 12. Riesgos técnicos actuales

- Contraseñas actualmente almacenadas en texto plano (alto riesgo).
- Sesiones en memoria (no escalable horizontalmente y no persistente).
- Falta de suite de tests automatizados (unit/integration/e2e).
- Falta rate limit en endpoints sensibles (`/auth/*`).
- Falta observabilidad formal (logs estructurados/alertas).

## 13. Plan recomendado para siguiente iteración

Prioridad P0 (seguridad y continuidad):
1. Migrar contraseñas a hash seguro (`bcrypt`).
2. Rotar secretos y revisar historial Git por fugas.
3. Añadir rate limiting y protección básica anti abuso en auth.
4. Definir política de CORS por entorno (no wildcard en producción).

Prioridad P1 (calidad y mantenimiento):
1. Extraer lógica de `server.js` en capas (routes/services/repositories).
Estado: parcial completado para autenticación en `src/auth/*`.
2. Añadir validación robusta de payloads (por ejemplo `zod` o `joi`).
Estado: parcial completado con validadores propios para autenticación (`src/auth/authValidators.js`).
3. Añadir tests de API críticos (auth, forgot/reset, quiz finish).
Estado: parcial completado con smoke test de autenticación `tests/auth.smoke.mjs`.
4. Añadir migrations versionadas para MySQL.
Estado: base creada en `bbdd/migrations/README.md` (pendiente añadir migraciones SQL numeradas reales).

Prioridad P2 (producto y UX):
1. Mejorar responsive desktop/tablet.
2. Mejorar accesibilidad (focus states, aria labels, contraste).
3. Optimizar bundle frontend (code splitting en pantallas pesadas).

## 14. Checklist de handoff a otro equipo

- Entregar acceso a Railway (front/api/mysql).
- Entregar acceso al proveedor de correo (Resend).
- Entregar `.env.example` actualizado (sin secretos reales).
- Confirmar scripts SQL ejecutados (`bbdd/database.sql` y `bbdd/seed.sql`).
- Validar endpoints con `peticiones.rest`.
- Revisar y actualizar este documento al cerrar cada sprint.

---

Documento creado para continuidad técnica del proyecto y reducción de tiempo de onboarding del próximo equipo.
