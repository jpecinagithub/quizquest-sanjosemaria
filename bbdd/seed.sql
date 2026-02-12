USE quizquest_db;

START TRANSACTION;

DELETE FROM questions
WHERE subject_id IN (
  1,
  2,
  3,
  4
);

INSERT INTO questions (
  subject_id,
  question_text,
  option_a,
  option_b,
  option_c,
  option_d,
  correct_option_index,
  explanation
) VALUES
(1, '¿En que ano nacio San Josemaria Escriva de Balaguer?', '1900', '1902', '1905', '1910', 1, 'Nacio el 9 de enero de 1902.'),
(1, '¿En que ciudad nacio San Josemaria?', 'Zaragoza', 'Huesca', 'Barbastro', 'Madrid', 2, 'Nacio en Barbastro (Huesca).'),
(1, 'Entre 1902 y 1915, ¿en que etapa de su vida se encontraba principalmente?', 'Infancia y primeros anos de adolescencia', 'Formacion universitaria', 'Ministerio sacerdotal en Madrid', 'Exilio en Roma', 0, NULL),
(1, '¿Que entorno marco especialmente su vida en Barbastro durante esos anos?', 'Vida familiar y cristiana', 'Carrera politica', 'Servicio militar', 'Vida monastica', 0, NULL),
(1, '¿En torno a que ano termina el periodo solicitado para este test (1902-1915)?', '1912', '1913', '1915', '1918', 2, NULL),
(1, '¿Que provincia espanola pertenece a la ciudad de Barbastro?', 'Teruel', 'Huesca', 'Lleida', 'Navarra', 1, NULL),

(2, '¿En que ciudad se centra esta etapa de la vida de San Josemaria entre 1915 y 1925?', 'Barbastro', 'Logrono', 'Madrid', 'Zaragoza', 1, 'Esta etapa se ubica en Logrono.'),
(2, '¿Que miembro de su familia ejercio una influencia decisiva por su ejemplo de trabajo y fe?', 'Su tio', 'Su padre', 'Su abuelo', 'Su hermano', 1, 'Su padre, Jose Escriva, fue una referencia importante.'),
(2, '¿Como se llamaba su madre, figura clave en su formacion cristiana?', 'Dolores Albás', 'Teresa de Jesus', 'Pilar Bayona', 'Maria del Carmen', 0, 'Su madre fue Dolores Albas Blanc.'),
(2, '¿Que institucion educativa de Logrono aparece asociada a esta etapa?', 'Instituto Cervantes', 'Instituto Sagasta', 'Instituto Goya', 'Instituto Mola', 1, 'Se trata del Instituto Sagasta de Logrono.'),
(2, '¿En que centro inicio su preparacion eclesiastica durante estos anos?', 'Seminario Conciliar de Logrono', 'Seminario de Toledo', 'Seminario de Burgos', 'Seminario de Pamplona', 0, 'Ingreso en el Seminario Conciliar de Logrono.'),
(2, 'En la cronologia 1915-1925, ¿que describe mejor su proceso vital?', 'Infancia temprana en Barbastro', 'Formacion academica y discernimiento vocacional en Logrono', 'Actividad politica universitaria', 'Residencia permanente en Roma', 1, NULL),
(2, '¿Que dimension familiar se resalta especialmente en esta etapa?', 'La vida empresarial internacional', 'La unidad familiar en tiempos de dificultad', 'La carrera militar', 'El exilio en Francia', 1, NULL),
(2, '¿Que opcion combina correctamente familia y formacion en esta etapa?', 'Padre y madre como apoyo, junto con estudios y seminario en Logrono', 'Vida monastica aislada sin estudios civiles', 'Solo estudios tecnicos sin contexto familiar', 'Traslado definitivo a Roma desde 1916', 0, NULL),

(3, '¿En que ciudad se desarrolla esta etapa entre 1920 y 1927?', 'Logrono', 'Barbastro', 'Zaragoza', 'Madrid', 2, 'La etapa indicada se sitúa en Zaragoza.'),
(3, '¿Que tipo de formacion ocupa un lugar central en esta etapa?', 'Formacion militar', 'Formacion sacerdotal', 'Formacion juridica exclusiva', 'Formacion empresarial', 1, NULL),
(3, '¿Que institucion fue clave en su camino vocacional en Zaragoza?', 'Seminario de San Carlos', 'Seminario de Valencia', 'Instituto Sagasta', 'Universidad de Salamanca', 0, 'En Zaragoza, su formacion se vinculó al Seminario de San Carlos.'),
(3, 'Durante estos anos, ¿que rasgo caracteriza su proceso personal?', 'Abandono de estudios', 'Discernimiento y maduracion vocacional', 'Actividad politica intensa', 'Retiro monastico definitivo', 1, NULL),
(3, '¿Que periodo temporal corresponde a esta asignatura?', '1902-1915', '1915-1925', '1920-1927', '1930-1940', 2, NULL),
(3, '¿Que ciudad aragonesa es referencia de esta etapa final de formacion previa a su ordenacion?', 'Huesca', 'Calatayud', 'Teruel', 'Zaragoza', 3, NULL),
(3, '¿Que opcion resume mejor la etapa 1920-1927 en Zaragoza?', 'Consolidacion de su vocacion y estudios orientados al sacerdocio', 'Infancia en el hogar familiar de Barbastro', 'Inicio de actividad profesional en Madrid', 'Residencia permanente en Roma', 0, NULL),
(3, 'En esta etapa, ¿que dimension sigue siendo importante junto a la formacion?', 'El apoyo familiar y la vida de piedad', 'La carrera militar', 'La diplomacia internacional', 'La vida monastica de clausura', 0, NULL),

(4, '¿En que ciudad se centra la etapa de San Josemaria entre 1927 y 1946?', 'Zaragoza', 'Madrid', 'Valencia', 'Roma', 1, 'La etapa solicitada se desarrolla principalmente en Madrid.'),
(4, '¿En que fecha recibio San Josemaria la luz fundacional del Opus Dei?', '2 de octubre de 1928', '14 de febrero de 1930', '26 de junio de 1945', '19 de marzo de 1927', 0, 'La fundacion del Opus Dei se remonta al 2 de octubre de 1928.'),
(4, '¿Que paso importante tuvo lugar el 14 de febrero de 1930 en la historia del Opus Dei?', 'Se traslado a Roma', 'Se aprobo una universidad', 'Comenzo la labor apostolica con mujeres', 'Se publico Camino', 2, 'Ese dia se vio tambien la llamada a la labor apostolica con mujeres.'),
(4, 'En Madrid, ¿que iniciativa formativa impulso con estudiantes universitarios en los anos 30?', 'Una academia y residencia', 'Un partido politico', 'Una orden monastica de clausura', 'Un cuerpo militar', 0, NULL),
(4, '¿Que significaban las siglas DYA, vinculadas a sus inicios apostolicos en Madrid?', 'Doctrina y Apostolado', 'Derecho y Arquitectura', 'Devocion y Ayuno', 'Direccion y Ayuda', 1, 'DYA corresponde a "Derecho y Arquitectura".'),
(4, 'Durante la Guerra Civil espanola, ¿que caracterizo esa etapa de su vida?', 'Vida estable sin riesgos', 'Interrupciones y dificultades para el ministerio', 'Residencia permanente en Roma', 'Actividad diplomatica oficial', 1, NULL),
(4, '¿En que ano se publico por primera vez el libro Camino?', '1928', '1933', '1939', '1946', 2, 'La primera edicion de Camino se publico en 1939.'),
(4, '¿Cual de estas ideas resume mejor su mensaje en esta etapa madrilena?', 'Santificarse en la vida ordinaria y el trabajo', 'Abandonar toda actividad profesional', 'Buscar solo la vida contemplativa aislada', 'Reducir la fe al ambito privado sin apostolado', 0, NULL),
(4, '¿Que tipo de personas formaban parte de su atencion pastoral en Madrid?', 'Solo autoridades politicas', 'Estudiantes, trabajadores y enfermos', 'Unicamente militares', 'Solo profesores universitarios', 1, NULL),
(4, '¿Que cambio geografico marca el final de esta etapa en 1946?', 'Regreso definitivo a Barbastro', 'Traslado a Roma', 'Mudanza a Paris', 'Estancia fija en Zaragoza', 1, 'En 1946 se traslado a Roma, cerrando esta etapa de Madrid.');

COMMIT;

