USE quizquest_db;

INSERT INTO subjects (id, name, description, image_url, activo)
VALUES (1, 'San Josemaria (1902-1915)', 'Infancia en Barbastro', NULL, 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  image_url = VALUES(image_url),
  activo = VALUES(activo);

INSERT INTO subjects (id, name, description, image_url, activo)
VALUES (2, 'San Josemaria (Logrono 1915-1925)', 'Adolescencia y formacion en Logrono', NULL, 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  image_url = VALUES(image_url),
  activo = VALUES(activo);

INSERT INTO subjects (id, name, description, image_url, activo)
VALUES (3, 'San Josemaria (Zaragoza 1920-1927)', 'Seminario y preparacion sacerdotal en Zaragoza', NULL, 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  image_url = VALUES(image_url),
  activo = VALUES(activo);

INSERT INTO subjects (id, name, description, image_url, activo)
VALUES (4, 'San Josemaria (Madrid 1927-1946)', 'Fundacion del Opus Dei y expansion inicial desde Madrid', NULL, 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  image_url = VALUES(image_url),
  activo = VALUES(activo);

ALTER TABLE subjects AUTO_INCREMENT = 5;

INSERT INTO users (id, name, email, password, total_xp)
VALUES (1, 'Jon', 'jpecina@gmail.com', '123456', 0)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  email = VALUES(email),
  password = VALUES(password);

INSERT INTO users (name, email, password, total_xp)
VALUES ('Alex', 'alex@quizquest.com', '1234', 1250)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  password = VALUES(password),
  total_xp = VALUES(total_xp);

INSERT IGNORE INTO schema_migrations (version, description)
VALUES ('002', 'baseline_reference_data');
