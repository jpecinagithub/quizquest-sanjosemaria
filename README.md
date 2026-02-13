
# 🧠 QuizQuest - AI Powered Learning

QuizQuest es una aplicación de trivias gamificada que utiliza Inteligencia Artificial (Google Gemini API) para generar desafíos dinámicos, permitiendo a los usuarios aprender sobre múltiples materias mientras ganan XP y medallas.

---

## 🚀 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:
- [Node.js](https://nodejs.org/) (v18 o superior recomendado)
- [MySQL Server](https://www.mysql.com/)
- Una API Key de [Google AI Studio](https://aistudio.google.com/) (si usarás generación de preguntas con IA)
- Una API Key de [Resend](https://resend.com/) (para recuperación de contraseña por email)

---

## 🛠️ Instalación y Configuración

### 1. Base de Datos (MySQL)

1. Abre tu cliente de MySQL (Workbench, phpMyAdmin o terminal).
2. Ejecuta el contenido del archivo `bbdd/database.sql`.
   - Esto creará la base de datos `quizquest_db` y las tablas `users`, `subjects`, `questions` y `quiz_results`.
   - También insertará los temas iniciales y un usuario de prueba ("Alex").

### 2. Configuración del Servidor (Backend)

El backend está construido con Node.js y Express.

1. Abre una terminal en la carpeta raíz (o donde ubiques `server.js`).
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Crea un archivo `.env` en la raíz usando `.env.example` como base:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=1234
   DB_NAME=quizquest_db
   DB_PORT=3306
   PORT=3001
   RESEND_API_KEY=re_xxx
   MAIL_FROM=onboarding@resend.dev
   APP_BASE_URL=http://localhost:3000
   PASSWORD_RESET_TOKEN_TTL_MINUTES=30
   SESSION_TTL_MS=28800000
   ```
4. Inicia el servidor:
   ```bash
   npm run server
   ```
   *Deberías ver el mensaje: "Conectado exitosamente a la base de datos MySQL"*.

### 3. Configuración del Frontend

La aplicación utiliza React y Tailwind CSS.

1. Asegúrate de que el frontend apunte a la URL correcta del backend con:
   ```env
   VITE_API_BASE_URL=http://localhost:3001/api
   ```
2. **Configuración de IA** (opcional): define `GEMINI_API_KEY` en tu `.env` para generación de preguntas.
3. Instala las dependencias del frontend:
   ```bash
   npm install
   ```
4. Inicia la aplicación:
   ```bash
   npm run dev
   ```

---

## 🎮 Cómo usar la App

1. **Login**: Ingresa con cualquier correo (la pantalla actual es una maqueta funcional).
2. **Dashboard**: Selecciona una asignatura. El sistema intentará generar preguntas mediante la API de Gemini.
3. **Quiz**: Responde las preguntas antes de que se acabe el tiempo.
4. **Resultados**: Al finalizar, el sistema enviará tu puntuación al backend, actualizará tu XP total y guardará el progreso en la base de datos MySQL.

---

## 📁 Estructura Principal

- `server.js`: Servidor Express y lógica de API.
- `database.sql`: Esquema y datos iniciales de MySQL.
- `services/geminiService.ts`: Integración con la IA de Google.
- `services/api.ts`: Cliente para la comunicación Frontend-Backend.
- `components/`: Pantallas de la interfaz (Login, Dashboard, Quiz, Results).

---

## 🛡️ Solución de Problemas

- **Error de CORS**: El servidor tiene habilitado `cors()`, pero asegúrate de que el puerto del frontend coincida con los permisos.
- **Gemini API Error**: Verifica que tu API Key sea válida y que tengas cuota disponible en Google AI Studio.
- **Conexión MySQL**: Si usas XAMPP, el usuario suele ser `root` y el password vacío.
- **No llega email de recuperación**: revisa `RESEND_API_KEY`, `MAIL_FROM` y los logs del backend.
