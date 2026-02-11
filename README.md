
# 🧠 QuizQuest - AI Powered Learning

QuizQuest es una aplicación de trivias gamificada que utiliza Inteligencia Artificial (Google Gemini API) para generar desafíos dinámicos, permitiendo a los usuarios aprender sobre múltiples materias mientras ganan XP y medallas.

---

## 🚀 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:
- [Node.js](https://nodejs.org/) (v16 o superior)
- [MySQL Server](https://www.mysql.com/)
- Una API Key de [Google AI Studio](https://aistudio.google.com/) (para la generación de preguntas con IA)

---

## 🛠️ Instalación y Configuración

### 1. Base de Datos (MySQL)

1. Abre tu cliente de MySQL (Workbench, phpMyAdmin o terminal).
2. Ejecuta el contenido del archivo `database.sql` incluido en la raíz del proyecto.
   - Esto creará la base de datos `quizquest_db` y las tablas `users`, `subjects`, `questions` y `quiz_results`.
   - También insertará los temas iniciales y un usuario de prueba ("Alex").

### 2. Configuración del Servidor (Backend)

El backend está construido con Node.js y Express.

1. Abre una terminal en la carpeta raíz (o donde ubiques `server.js`).
2. Instala las dependencias necesarias:
   ```bash
   npm install express mysql2 cors dotenv
   ```
3. Crea un archivo `.env` en la raíz del backend con tus credenciales:
   ```env
   DB_HOST=localhost
   DB_USER=tu_usuario_mysql
   DB_PASSWORD=tu_password_mysql
   DB_NAME=quizquest_db
   PORT=3001
   ```
4. Inicia el servidor:
   ```bash
   npm run server
   ```
   *Deberías ver el mensaje: "Conectado exitosamente a la base de datos MySQL"*.

### 3. Configuración del Frontend

La aplicación utiliza React y Tailwind CSS.

1. Asegúrate de que el frontend apunte a la URL correcta del backend en `services/api.ts` (por defecto `http://localhost:3001/api`).
2. **Configuración de IA**: La aplicación requiere la clave `process.env.API_KEY` para funcionar. Si estás usando un entorno de desarrollo local (como Vite o Webpack), asegúrate de definirla en tu entorno.
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
