
import { Subject } from './types';

export const SUBJECTS: Subject[] = [
  {
    id: 1,
    name: 'San Josemaria (1902-1915)',
    description: 'Infancia en Barbastro',
    quizCount: 10,
    progress: 0,
  },
  {
    id: 2,
    name: 'San Josemaria (Logrono 1915-1925)',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Josemaria_Escriva.jpg',
    description: 'Adolescencia y formacion en Logrono',
    quizCount: 12,
    progress: 0,
  },
  {
    id: 3,
    name: 'San Josemaria (Zaragoza 1920-1927)',
    description: 'Seminario y preparacion sacerdotal en Zaragoza',
    quizCount: 14,
    progress: 0,
  },
  {
    id: 4,
    name: 'San Josemaria (Madrid 1927-1946)',
    description: 'Fundacion del Opus Dei y expansion inicial desde Madrid',
    quizCount: 16,
    progress: 0,
  },
];

export const MOCK_CLASSIFICATION_BASE: Array<{ name: string; xp: number; profile_pic: string }> = [
  { name: 'Maria', xp: 4820, profile_pic: 'https://picsum.photos/seed/maria/96' },
  { name: 'Carlos', xp: 4510, profile_pic: 'https://picsum.photos/seed/carlos/96' },
  { name: 'Lucia', xp: 4300, profile_pic: 'https://picsum.photos/seed/lucia/96' },
  { name: 'Andres', xp: 4110, profile_pic: 'https://picsum.photos/seed/andres/96' },
  { name: 'Elena', xp: 3980, profile_pic: 'https://picsum.photos/seed/elena/96' },
  { name: 'Pablo', xp: 3720, profile_pic: 'https://picsum.photos/seed/pablo/96' },
  { name: 'Sofia', xp: 3590, profile_pic: 'https://picsum.photos/seed/sofia/96' },
  { name: 'Miguel', xp: 3400, profile_pic: 'https://picsum.photos/seed/miguel/96' },
  { name: 'Laura', xp: 3260, profile_pic: 'https://picsum.photos/seed/laura/96' },
  { name: 'Hugo', xp: 3120, profile_pic: 'https://picsum.photos/seed/hugo/96' },
];

export const MOCK_QUESTIONS: Record<number, any[]> = {
  1: [
    {
      id: 'sj1',
      text: '¿En que ano nacio San Josemaria Escriva de Balaguer?',
      options: ['1900', '1902', '1905', '1910'],
      correctAnswerIndex: 1,
      explanation: 'Nacio el 9 de enero de 1902.',
    },
    {
      id: 'sj2',
      text: '¿En que ciudad nacio San Josemaria?',
      options: ['Zaragoza', 'Huesca', 'Barbastro', 'Madrid'],
      correctAnswerIndex: 2,
      explanation: 'Nacio en Barbastro (Huesca).',
    },
    {
      id: 'sj3',
      text: 'Entre 1902 y 1915, ¿en que etapa de su vida se encontraba principalmente?',
      options: ['Infancia y primeros anos de adolescencia', 'Formacion universitaria', 'Ministerio sacerdotal en Madrid', 'Exilio en Roma'],
      correctAnswerIndex: 0,
    },
    {
      id: 'sj4',
      text: '¿Que entorno marco especialmente su vida en Barbastro durante esos anos?',
      options: ['Vida familiar y cristiana', 'Carrera politica', 'Servicio militar', 'Vida monastica'],
      correctAnswerIndex: 0,
    },
    {
      id: 'sj5',
      text: '¿En torno a que ano termina el periodo solicitado para este test (1902-1915)?',
      options: ['1912', '1913', '1915', '1918'],
      correctAnswerIndex: 2,
    },
    {
      id: 'sj6',
      text: '¿Que provincia espanola pertenece a la ciudad de Barbastro?',
      options: ['Teruel', 'Huesca', 'Lleida', 'Navarra'],
      correctAnswerIndex: 1,
    }
  ],
  2: [
    {
      id: 'sjl1',
      text: '¿En que ciudad se centra esta etapa de la vida de San Josemaria entre 1915 y 1925?',
      options: ['Barbastro', 'Logrono', 'Madrid', 'Zaragoza'],
      correctAnswerIndex: 1,
      explanation: 'Esta etapa se ubica en Logrono.',
    },
    {
      id: 'sjl2',
      text: '¿Que miembro de su familia ejercio una influencia decisiva por su ejemplo de trabajo y fe?',
      options: ['Su tio', 'Su padre', 'Su abuelo', 'Su hermano'],
      correctAnswerIndex: 1,
      explanation: 'Su padre, Jose Escriva, fue una referencia importante.',
    },
    {
      id: 'sjl3',
      text: '¿Como se llamaba su madre, figura clave en su formacion cristiana?',
      options: ['Dolores Albás', 'Teresa de Jesus', 'Pilar Bayona', 'Maria del Carmen'],
      correctAnswerIndex: 0,
      explanation: 'Su madre fue Dolores Albas Blanc.',
    },
    {
      id: 'sjl4',
      text: '¿Que institucion educativa de Logrono aparece asociada a esta etapa?',
      options: ['Instituto Cervantes', 'Instituto Sagasta', 'Instituto Goya', 'Instituto Mola'],
      correctAnswerIndex: 1,
      explanation: 'Se trata del Instituto Sagasta de Logrono.',
    },
    {
      id: 'sjl5',
      text: '¿En que centro inicio su preparacion eclesiastica durante estos anos?',
      options: ['Seminario Conciliar de Logrono', 'Seminario de Toledo', 'Seminario de Burgos', 'Seminario de Pamplona'],
      correctAnswerIndex: 0,
      explanation: 'Ingreso en el Seminario Conciliar de Logrono.',
    },
    {
      id: 'sjl6',
      text: 'En la cronologia 1915-1925, ¿que describe mejor su proceso vital?',
      options: ['Infancia temprana en Barbastro', 'Formacion academica y discernimiento vocacional en Logrono', 'Actividad politica universitaria', 'Residencia permanente en Roma'],
      correctAnswerIndex: 1,
    },
    {
      id: 'sjl7',
      text: '¿Que dimension familiar se resalta especialmente en esta etapa?',
      options: ['La vida empresarial internacional', 'La unidad familiar en tiempos de dificultad', 'La carrera militar', 'El exilio en Francia'],
      correctAnswerIndex: 1,
    },
    {
      id: 'sjl8',
      text: '¿Que opcion combina correctamente familia y formacion en esta etapa?',
      options: [
        'Padre y madre como apoyo, junto con estudios y seminario en Logrono',
        'Vida monastica aislada sin estudios civiles',
        'Solo estudios tecnicos sin contexto familiar',
        'Traslado definitivo a Roma desde 1916'
      ],
      correctAnswerIndex: 0,
    }
  ],
  3: [
    {
      id: 'sjz1',
      text: '¿En que ciudad se desarrolla esta etapa entre 1920 y 1927?',
      options: ['Logrono', 'Barbastro', 'Zaragoza', 'Madrid'],
      correctAnswerIndex: 2,
      explanation: 'La etapa indicada se sitúa en Zaragoza.',
    },
    {
      id: 'sjz2',
      text: '¿Que tipo de formacion ocupa un lugar central en esta etapa?',
      options: ['Formacion militar', 'Formacion sacerdotal', 'Formacion juridica exclusiva', 'Formacion empresarial'],
      correctAnswerIndex: 1,
    },
    {
      id: 'sjz3',
      text: '¿Que institucion fue clave en su camino vocacional en Zaragoza?',
      options: ['Seminario de San Carlos', 'Seminario de Valencia', 'Instituto Sagasta', 'Universidad de Salamanca'],
      correctAnswerIndex: 0,
      explanation: 'En Zaragoza, su formacion se vinculó al Seminario de San Carlos.',
    },
    {
      id: 'sjz4',
      text: 'Durante estos anos, ¿que rasgo caracteriza su proceso personal?',
      options: ['Abandono de estudios', 'Discernimiento y maduracion vocacional', 'Actividad politica intensa', 'Retiro monastico definitivo'],
      correctAnswerIndex: 1,
    },
    {
      id: 'sjz5',
      text: '¿Que periodo temporal corresponde a esta asignatura?',
      options: ['1902-1915', '1915-1925', '1920-1927', '1930-1940'],
      correctAnswerIndex: 2,
    },
    {
      id: 'sjz6',
      text: '¿Que ciudad aragonesa es referencia de esta etapa final de formacion previa a su ordenacion?',
      options: ['Huesca', 'Calatayud', 'Teruel', 'Zaragoza'],
      correctAnswerIndex: 3,
    },
    {
      id: 'sjz7',
      text: '¿Que opcion resume mejor la etapa 1920-1927 en Zaragoza?',
      options: [
        'Consolidacion de su vocacion y estudios orientados al sacerdocio',
        'Infancia en el hogar familiar de Barbastro',
        'Inicio de actividad profesional en Madrid',
        'Residencia permanente en Roma'
      ],
      correctAnswerIndex: 0,
    },
    {
      id: 'sjz8',
      text: 'En esta etapa, ¿que dimensión sigue siendo importante junto a la formacion?',
      options: ['El apoyo familiar y la vida de piedad', 'La carrera militar', 'La diplomacia internacional', 'La vida monastica de clausura'],
      correctAnswerIndex: 0,
    }
  ],
  4: [
    {
      id: 'sjm1',
      text: '¿En que ciudad se centra la etapa de San Josemaria entre 1927 y 1946?',
      options: ['Zaragoza', 'Madrid', 'Valencia', 'Roma'],
      correctAnswerIndex: 1,
      explanation: 'La etapa solicitada se desarrolla principalmente en Madrid.',
    },
    {
      id: 'sjm2',
      text: '¿En que fecha recibio San Josemaria la luz fundacional del Opus Dei?',
      options: ['2 de octubre de 1928', '14 de febrero de 1930', '26 de junio de 1945', '19 de marzo de 1927'],
      correctAnswerIndex: 0,
      explanation: 'La fundacion del Opus Dei se remonta al 2 de octubre de 1928.',
    },
    {
      id: 'sjm3',
      text: '¿Que paso importante tuvo lugar el 14 de febrero de 1930 en la historia del Opus Dei?',
      options: ['Se traslado a Roma', 'Se aprobo una universidad', 'Comenzo la labor apostolica con mujeres', 'Se publico Camino'],
      correctAnswerIndex: 2,
      explanation: 'Ese dia se vio tambien la llamada a la labor apostolica con mujeres.',
    },
    {
      id: 'sjm4',
      text: 'En Madrid, ¿que iniciativa formativa impulso con estudiantes universitarios en los anos 30?',
      options: ['Una academia y residencia', 'Un partido politico', 'Una orden monastica de clausura', 'Un cuerpo militar'],
      correctAnswerIndex: 0,
    },
    {
      id: 'sjm5',
      text: '¿Que significaban las siglas DYA, vinculadas a sus inicios apostolicos en Madrid?',
      options: ['Doctrina y Apostolado', 'Derecho y Arquitectura', 'Devocion y Ayuno', 'Direccion y Ayuda'],
      correctAnswerIndex: 1,
      explanation: 'DYA corresponde a "Derecho y Arquitectura".',
    },
    {
      id: 'sjm6',
      text: 'Durante la Guerra Civil espanola, ¿que caracterizo esa etapa de su vida?',
      options: ['Vida estable sin riesgos', 'Interrupciones y dificultades para el ministerio', 'Residencia permanente en Roma', 'Actividad diplomatica oficial'],
      correctAnswerIndex: 1,
    },
    {
      id: 'sjm7',
      text: '¿En que ano se publico por primera vez el libro Camino?',
      options: ['1928', '1933', '1939', '1946'],
      correctAnswerIndex: 2,
      explanation: 'La primera edicion de Camino se publico en 1939.',
    },
    {
      id: 'sjm8',
      text: '¿Cual de estas ideas resume mejor su mensaje en esta etapa madrilena?',
      options: [
        'Santificarse en la vida ordinaria y el trabajo',
        'Abandonar toda actividad profesional',
        'Buscar solo la vida contemplativa aislada',
        'Reducir la fe al ambito privado sin apostolado'
      ],
      correctAnswerIndex: 0,
    },
    {
      id: 'sjm9',
      text: '¿Que tipo de personas formaban parte de su atencion pastoral en Madrid?',
      options: ['Solo autoridades politicas', 'Estudiantes, trabajadores y enfermos', 'Unicamente militares', 'Solo profesores universitarios'],
      correctAnswerIndex: 1,
    },
    {
      id: 'sjm10',
      text: '¿Que cambio geografico marca el final de esta etapa en 1946?',
      options: ['Regreso definitivo a Barbastro', 'Traslado a Roma', 'Mudanza a Paris', 'Estancia fija en Zaragoza'],
      correctAnswerIndex: 1,
      explanation: 'En 1946 se traslado a Roma, cerrando esta etapa de Madrid.',
    }
  ],
};
