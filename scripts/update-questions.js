const fs = require('fs');


const data = fs.readFileSync('./public/banco 1.json', 'utf8');
let questions = JSON.parse(data);


questions.forEach((question, index) => {
  if (!question.questionSlot) {
    question.questionSlot = (index % 3) + 1; 
  }
});


const newMultipleResponseQuestions = [
  {
    "type": "multiple-response",
    "competence": "4.4",
    "level": "Básico 2",
    "title": "Reconocer el impacto ambiental del uso de servicios de streaming",
    "scenario": "Carla mira series en su tablet todos los días. Nota que al reproducir en alta definición, la batería se descarga más rápido y su conexión consume más datos. Se pregunta qué hábitos aumentan el impacto ambiental.",
    "options": [
      "Ver videos en resolución más baja cuando no es necesario",
      "Dejar la tablet cargando toda la noche mientras mira series",
      "Descargar capítulos y verlos sin conexión a internet",
      "Reproducir videos continuamente aunque no los esté mirando",
      "Apagar la pantalla cuando solo escucha música"
    ],
    "correctAnswerIndex": [0, 2, 4],
    "feedback": {
      "correct": "Has identificado prácticas que reducen el consumo energético y de datos.",
      "incorrect": "Algunas opciones elegidas aumentan el consumo de energía y emisiones, revisa de nuevo."
    },
    "questionSlot": 1
  },
  {
    "type": "multiple-response",
    "competence": "2.1",
    "level": "Básico 2",
    "title": "Estrategias efectivas para comunicarse en entornos digitales",
    "scenario": "Ana necesita enviar un mensaje importante a su profesor sobre un proyecto escolar. Quiere asegurarse de que su comunicación sea clara y profesional.",
    "options": [
      "Usar un lenguaje formal y respetuoso",
      "Incluir toda la información necesaria en el primer mensaje",
      "Revisar el mensaje antes de enviarlo para corregir errores",
      "Enviar el mensaje en mayúsculas para que sea más visible",
      "Usar emojis para hacer el mensaje más amigable"
    ],
    "correctAnswerIndex": [0, 1, 2],
    "feedback": {
      "correct": "¡Excelente! Has identificado las mejores prácticas para una comunicación efectiva.",
      "incorrect": "Revisa las opciones que elegiste. Algunas prácticas pueden no ser apropiadas en contextos formales."
    },
    "questionSlot": 2
  },
  {
    "type": "multiple-response",
    "competence": "4.1",
    "level": "Básico 2",
    "title": "Medidas de seguridad para proteger dispositivos electrónicos",
    "scenario": "Pedro ha notado que su teléfono está funcionando más lento últimamente y recibe anuncios extraños. Quiere proteger mejor sus dispositivos.",
    "options": [
      "Instalar un antivirus actualizado",
      "Usar contraseñas fuertes y diferentes para cada cuenta",
      "Mantener el software del dispositivo actualizado",
      "Compartir la contraseña con familiares para emergencias",
      "Hacer clic en todos los enlaces de correos electrónicos sospechosos"
    ],
    "correctAnswerIndex": [0, 1, 2],
    "feedback": {
      "correct": "¡Muy bien! Estas medidas ayudan a mantener tus dispositivos seguros.",
      "incorrect": "Algunas opciones pueden poner en riesgo tu seguridad digital. Revisa nuevamente."
    },
    "questionSlot": 3
  }
];


questions = questions.concat(newMultipleResponseQuestions);


fs.writeFileSync('E:\\GitHub - Repositorios\\Diggitali\\app\\admin\\banco 1.json', JSON.stringify(questions, null, 2));
console.log('Archivo modificado exitosamente');
