
-- Creación de la base de datos
CREATE DATABASE IF NOT EXISTS quizquest_db;
USE quizquest_db;

-- Tabla de Usuarios
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    profile_pic VARCHAR(255),
    total_xp INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Asignaturas/Temas
CREATE TABLE IF NOT EXISTS subjects (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    image_url VARCHAR(255),
    activo TINYINT(1) NOT NULL DEFAULT 1
);

-- Tabla de Preguntas (para tener un banco base)
CREATE TABLE IF NOT EXISTS questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subject_id VARCHAR(50),
    question_text TEXT NOT NULL,
    option_a VARCHAR(255),
    option_b VARCHAR(255),
    option_c VARCHAR(255),
    option_d VARCHAR(255),
    correct_option_index INT,
    explanation TEXT,
    FOREIGN KEY (subject_id) REFERENCES subjects(id)
);

-- Tabla de Resultados y Progreso
CREATE TABLE IF NOT EXISTS quiz_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    subject_id VARCHAR(50),
    score INT,
    xp_earned INT,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (subject_id) REFERENCES subjects(id)
);

-- Datos iniciales de prueba

-- Asignatura adicional: San Josemaria (Barbastro 1902-1915)
INSERT INTO subjects (id, name, description, image_url, activo)
VALUES ('josemaria_1902_1915', 'San Josemaria (1902-1915)', 'Infancia en Barbastro', NULL, 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  image_url = VALUES(image_url),
  activo = VALUES(activo);

-- Asignatura adicional: San Josemaria (Logrono 1915-1925)
INSERT INTO subjects (id, name, description, image_url, activo)
VALUES ('josemaria_logrono_1915_1925', 'San Josemaria (Logrono 1915-1925)', 'Adolescencia y formacion en Logrono', NULL, 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  image_url = VALUES(image_url),
  activo = VALUES(activo);

-- Asignatura adicional: San Josemaria (Zaragoza 1920-1927)
INSERT INTO subjects (id, name, description, image_url, activo)
VALUES ('josemaria_zaragoza_1920_1927', 'San Josemaria (Zaragoza 1920-1927)', 'Seminario y preparacion sacerdotal en Zaragoza', NULL, 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  image_url = VALUES(image_url),
  activo = VALUES(activo);

-- Asignatura adicional: San Josemaria (Madrid 1927-1946)
INSERT INTO subjects (id, name, description, image_url, activo)
VALUES ('josemaria_madrid_1927_1946', 'San Josemaria (Madrid 1927-1946)', 'Fundacion del Opus Dei y expansion inicial desde Madrid', NULL, 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  image_url = VALUES(image_url),
  activo = VALUES(activo);

-- Usuario administrador fijo (sin tabla de roles)
INSERT INTO users (id, name, email, password, total_xp)
VALUES (1, 'Jon', 'jpecina@gmail.com', 'sha256:8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 0)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  email = VALUES(email),
  password = VALUES(password);

-- Usuario de prueba
INSERT INTO users (name, email, password, total_xp)
VALUES ('Alex', 'alex@quizquest.com', 'hashed_password_here', 1250)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  password = VALUES(password),
  total_xp = VALUES(total_xp);
