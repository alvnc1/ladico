export const skillsInfo: Record<string, { title: string; description: string }> = {
    "1.1": {
    title: "Navegar, Buscar y Filtrar Datos, Información y Contenidos Digitales",
    description:
      "Articular las necesidades de información, buscar datos, información y contenidos en entornos digitales, para acceder a ellos y navegar entre ellos. Crear y actualizar estrategias de búsqueda personales.",
    },
    "1.2": {
    title: "Evaluar Datos, Información y Contenidos Digitales",
    description:
      "Analizar, comparar y evaluar de forma crítica la fiabilidad y seriedad de recursos de datos, información y contenido digital. Analizar, interpretar y evaluar de forma crítica datos, informaciones y contenidos digitales. de búsqueda personales.",
    },
    "1.3": {
    title: "Gestión de datos, Información y Contenidos Digitales",
    description:
      "Organizar, almacenar y recuperar datos, información y contenidos en entornos digitales. Organizar y procesarlos en entornos estructurados.",
    },
    "2.1": {
    title: "Interactuar a través de tecnologías digitales",
    description:
      "Interactuar a través de diferentes tecnologías digitales y entender los medios de comunicación digitales apropiados para un contexto determinado."
    },
    "2.2": {
    title: "Compartir a través de tecnologías digitales",
    description:
      "Compartir datos, información y contenidos digitales con otros a través de las tecnologías adecuadas. Actuar como intermediario, conocer las prácticas de referencia y atribución."
    },
    "2.3": {
    title: "Participación ciudadana a través de las tecnologías digitales",
    description:
      "Participar en la sociedad a través del uso de servicios digitales públicos y privados. Buscar oportunidades de auto empoderamiento y para una ciudadanía participativa a través de tecnologías digitales apropiadas."
    },
    "2.4": {
    title: "Colaboración a través de las tecnologías digitales",
    description:
      "Uso de herramientas y tecnologías digitales en procesos colaborativos y para la coconstrucción y la cocreación de datos, recursos y conocimiento."
    },
    "2.5": {
      title: "Comportamiento en la Red",
      description:
        "Estar al tanto de las normas de comportamiento y del “know-how” (saber cómo) en el uso de las tecnologías y en la interacción en entornos digitales. Adaptar las estrategias de comunicación a una audiencia específica, teniendo en cuenta la diversidad cultural y generacional de los entornos digitales."
    },
    "2.6": {
      title: "Gestión de la Identidad Digital",
      description:
        "Crear y gestionar una o varias identidades digitales para poder proteger la propia reputación, para tratar los datos que uno produce a través de diversas herramientas, entornos y servicios digitales."
    },
    "3.1": {
      title: "Desarrollo de Contenidos",
      description:
        "Crear y editar contenidos digitales en formatos diferentes, expresarse a través de medios digitales."
    },
    "3.2": {
      title: "Integración y Reelaboración de contenido digital",
      description:
        "Modificar, perfeccionar, mejorar e integrar información y contenido en un cuerpo de conocimiento existente para crear contenidos nuevos, originales y relevantes."
    },
    "3.3": {
      title: "Derechos de autor (Copyright) y Licencias de propiedad Intelectual",
      description:
        "Entender cómo solicitar datos, informaciones y contenidos digitales con derechos de autor y licencias de propiedad intelectual."
    },
    "3.4": {
      title: "Programación",
      description:
        "Desarrollar secuencias de instrucciones aplicables a sistemas computacionales para solucionar un problema dado o ejecutar una tarea determinada."
    },
    "4.1": {
      title: "Protección de Dispositivos",
      description:
        "Proteger los dispositivos y los contenidos digitales, y comprender los riesgos y las amenazas en los entornos digitales. Conocer las medidas de seguridad y tener en cuenta la fiabilidad y la privacidad."
    },
    "4.2": {
      title: "Protección de datos personales y privacidad",
      description:
        "Proteger los datos personales y la privacidad en los entornos digitales. Entender cómo utilizar y compartir la información personal identificable, siendo capaz de protegerse a sí mismo y a los demás de los daños. Entender que los servicios digitales utilizan una “política de privacidad” para informar sobre el uso de los datos personales."
    },
    "4.3": {
      title: "Protección de la Salud y el Bienestar",
      description:
        "Capacidades a la hora de evitar riesgos para la salud tanto física como mental en el uso de las tecnologías digitales. Capacidad a la hora de protegerse uno mismo y a otros ante los riesgos de los entornos digitales (por ejemplo: cyber-bullying)."
    },
    "4.4": {
      title: "Protección Medioambiental",
      description:
        "Ser consciente del impacto de las tecnologías digitales y su uso."
    },
    "5.1": {
      title: "Resolución de problemas técnicos",
      description:
        "Identificación de problemas técnicos en el uso de dispositivos y entornos digitales, y resolución de éstos (desde los más básicos a los más complejos)."
    },
    "5.2": {
      title: "Identificación de necesidades y respuestas tecnológicas",
      description:
        "Evaluar las necesidades e identificar, valorar, seleccionar y utilizar las herramientas digitales y las posibles respuestas tecnológicas y resolverlas. Ajustar y personalizar los entornos digitales a las necesidades personales (por ejemplo, la accesibilidad)."
    },
    "5.3": {
      title: "Uso creativo de la tecnología digital",
      description:
        "Utilizar herramientas y tecnologías digitales para crear contenidos, procesos y productos innovadores. Participación individual y colectiva en procesos cognitivos para entender y resolver problemas conceptuales y situaciones confusas en entornos digitales."
    },
    "5.4": {
      title: "Identificar lagunas en las competencias digitales",
      description:
        "Identificar dónde debo mejorar o actualizar mis propias competencias digitales. Ser capaz de ayudar a otros en el desarrollo de sus competencias digitales. Buscar oportunidades para el auto aprendizaje y mantenerse al día de la evolución del mundo digital."
    }
  }

  export const getCompetenceTitle = (code?: string) =>
  (code && skillsInfo[code]?.title) || undefined