import React from 'react';
import CompetenceCard from './CompetenceCard';

const data = [
  {
    area: 'BÚSQUEDA Y GESTIÓN DE INFORMACIÓN Y DATOS',
    color: 'linear-gradient(180deg, #f26a2e 0%, #f7873d 100%)',
    competences: [
      { title: 'Buscar y filtrar información', level: 0 },
      { title: 'Evaluar información digital', level: 0 },
      { title: 'Gestionar datos e información', level: 0 }
    ]
  },
  {
    area: 'COMUNICACIÓN Y COLABORACIÓN',
    color: 'linear-gradient(180deg, #1cb57a 0%, #27b889 100%)',
    competences: [
      { title: 'Interacción digital', level: 0 },
      { title: 'Compartir digitalmente', level: 0 },
      { title: 'Participación ciudadana', level: 0 },
      { title: 'Colaboración digital', level: 0 },
      { title: 'Comportamiento en línea', level: 0 },
      { title: 'Identidad digital', level: 0 }
    ]
  },
  {
    area: 'CREACIÓN DE CONTENIDOS DIGITALES',
    color: 'linear-gradient(180deg, #1da1f2 0%, #2996f5 100%)',
    competences: [
      { title: 'Crear contenidos', level: 0 },
      { title: 'Reusar contenido digital', level: 0 },
      { title: 'Derechos de autor', level: 0 },
      { title: 'Programación', level: 0 }
    ]
  },
  {
    area: 'SEGURIDAD',
    color: 'linear-gradient(180deg, #8e44ad 0%, #9b59b6 100%)',
    competences: [
      { title: 'Seguridad de dispositivos', level: 0 },
      { title: 'Privacidad y datos personales', level: 0 },
      { title: 'Salud y bienestar digital', level: 0 },
      { title: 'Medioambiente digital', level: 0 }
    ]
  },
  {
    area: 'RESOLUCIÓN DE PROBLEMAS',
    color: 'linear-gradient(180deg, #34495e 0%, #2c3e50 100%)',
    competences: [
      { title: 'Solución de problemas técnicos', level: 0 },
      { title: 'Necesidades tecnológicas', level: 0 },
      { title: 'Uso creativo de la tecnología', level: 0 },
      { title: 'Diagnóstico de habilidades digitales', level: 0 }
    ]
  }
];

function CompetenceList() {
  return (
    <div className="competence-area-list">
      {data.map((group, i) => (
        <section key={i} className="competence-area">
          <div className="competence-list">
            {group.competences.map((item, j) => (
              <CompetenceCard
                key={j}
                category={group.area}
                title={item.title}
                level={item.level}
                color={group.color}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default CompetenceList;
