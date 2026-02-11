# Endpoints de QuizQuest

Base URL del backend: `http://localhost:3001/api`

## 1. Login
- Metodo: `POST`
- Ruta: `/auth/login`
- Descripcion: Inicia sesion con email y password.
- Headers requeridos:
  - `Content-Type: application/json`
- Body (JSON):
```json
{
  "email": "alex@quizquest.com",
  "password": "1234"
}
```
- Respuesta exitosa (200):
```json
{
  "token": "uuid-token",
  "user": {
    "id": 1,
    "name": "Alex",
    "email": "alex@quizquest.com",
    "profile_pic": null,
    "total_xp": 1250
  }
}
```

## 2. Register
- Metodo: `POST`
- Ruta: `/auth/register`
- Descripcion: Crea una cuenta y devuelve sesion activa.
- Headers requeridos:
  - `Content-Type: application/json`
- Body (JSON):
```json
{
  "name": "New Player",
  "email": "newplayer@quizquest.com",
  "password": "123456"
}
```
- Respuesta exitosa (201): igual formato que login.
- Errores:
  - `400`: body invalido.
  - `409`: email ya registrado.

## 3. Forgot Password (simulado)
- Metodo: `POST`
- Ruta: `/auth/forgot-password`
- Descripcion: Simula el envio de instrucciones de recuperacion.
- Headers requeridos:
  - `Content-Type: application/json`
- Body (JSON):
```json
{
  "email": "alex@quizquest.com"
}
```
- Respuesta exitosa (200):
```json
{
  "success": true,
  "message": "Si el correo existe, recibiras instrucciones para recuperar tu cuenta."
}
```

## 4. Usuario autenticado actual
- Metodo: `GET`
- Ruta: `/auth/me`
- Headers requeridos:
  - `Authorization: Bearer <token>`
- Respuesta exitosa (200):
```json
{
  "user": {
    "id": 1,
    "name": "Alex",
    "email": "alex@quizquest.com",
    "profile_pic": null,
    "total_xp": 1250
  }
}
```

## 5. Logout
- Metodo: `POST`
- Ruta: `/auth/logout`
- Headers requeridos:
  - `Authorization: Bearer <token>`
- Respuesta exitosa (200):
```json
{ "success": true }
```

## 6. Obtener perfil de usuario (protegido)
- Metodo: `GET`
- Ruta: `/user/:id`
- Headers requeridos:
  - `Authorization: Bearer <token>`
- Reglas:
  - Solo permite consultar tu propio `id`.

## 7. Obtener asignaturas y progreso (protegido)
- Metodo: `GET`
- Ruta: `/subjects`
- Headers requeridos:
  - `Authorization: Bearer <token>`
- Nota:
  - `best_score` y `attempts` se calculan por usuario autenticado.

## 8. Guardar resultado de quiz (protegido)
- Metodo: `POST`
- Ruta: `/quiz/finish`
- Headers requeridos:
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`
- Body (JSON):
```json
{
  "userId": 1,
  "subjectId": "josemaria_zaragoza_1920_1927",
  "score": 90,
  "xpEarned": 45
}
```
- Reglas:
  - `userId` debe coincidir con el usuario autenticado.

## Notas
- Las sesiones son en memoria y expiran por TTL (`SESSION_TTL_MS`, por defecto 8 horas).
- La generacion de preguntas con IA (`services/geminiService.ts`) no pasa por el backend actual.
