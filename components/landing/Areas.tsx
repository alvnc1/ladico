"use client"

import { useState } from "react"
import { skillsInfo } from "@/components/data/digcompSkills"

export default function Areas() {
  const [hoveredSkill, setHoveredSkill] = useState<string | null>(null)
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const areas = [
    {
      number: 1,
      icon: "🔍",
      title: "Búsqueda y Gestión de Información y Datos",
      description:
        "Búsqueda, evaluación y gestión de información digital. Identificación de fuentes confiables y tratamiento de datos.",
      skills: [
        "1.1",
        "1.2",
        "1.3",
      ],
      bg: "bg-[#e6fdec]",
    },
    {
      number: 2,
      icon: "💬",
      title: "Comunicación y Colaboración",
      description:
        "Interacción a través de tecnologías digitales, compartir información y contenidos, participación ciudadana.",
      skills: [
        "2.1",
        "2.2",
        "2.3",
        "2.4",
        "2.5",
        "2.6"
      ],
      bg: "bg-[#f3fbfb]",
    },
    {
      number: 3,
      icon: "🎨",
      title: "Creación de Contenidos Digitales",
      description:
        "Desarrollo y edición de contenidos digitales, integración de información y conocimiento de derechos de autor.",
      skills: [
        "3.1",
        "3.2",
        "3.3",
        "3.4"
      ],
      bg: "bg-[#f9fffb]",
    },
    {
      number: 4,
      icon: "🛡️",
      title: "Seguridad",
      description:
        "Protección de dispositivos, datos personales y privacidad. Protección de la salud y el bienestar.",
      skills: [
        "4.1",
        "4.2",
        "4.3",
        "4.4"
      ],
      bg: "bg-[#e6fdec]",
    },
    {
      number: 5,
      icon: "⚙️",
      title: "Resolución de Problemas",
      description:
        "Identificación de necesidades tecnológicas, resolución de problemas técnicos e identificación de brechas.",
      skills: [
        "5.1",
        "5.2",
        "5.3",
        "5.4"
      ],
      bg: "bg-[#f3fbfb]",
    },
  ];

  return (
    <section className="py-20 bg-gray" id="areas">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Las 5 Áreas de Competencia Digital
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Basadas en el Marco Europeo DigComp 2.2 para una evaluación completa y estandarizada
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {areas.map((area) => (
  <div
    key={area.number}
    className={`area-card bg-white rounded-3xl border border-white p-8 shadow-sm flex flex-col hover:scale-105 transition-all duration-300`}
  >
    <div className="flex items-center mb-4 gap-3">
      <div className="area-icon text-2xl">{area.icon}</div>
      <h3 className="text-xl font-bold text-gray-900 mb-0">{area.title}</h3>
    </div>
    <p className="text-gray-600 mb-4">{area.description}</p>
    <div className="flex flex-wrap gap-2 mt-auto relative">
              {area.skills.map((skill) => (
                <span
                  key={skill}
                  className="skill-tag bg-gray-200 text-gray-900 px-3 py-1 rounded-full text-xs font-medium cursor-pointer relative"
                  onMouseEnter={e => {
                    setHoveredSkill(skill)
                    const rect = (e.target as HTMLElement).getBoundingClientRect()
                    setPopupPosition({ x: rect.left + rect.width / 2, y: rect.top })
                  }}
                  onMouseLeave={() => setHoveredSkill(null)}
                >
                  {skill}
                  {hoveredSkill === skill && skillsInfo[skill] && (
                    <div
                      className="absolute z-50 left-1/2 -translate-x-1/2 -top-28 w-72 bg-white border border-gray-200 rounded-2xl shadow-xl p-4 text-left"
                      style={{
                        pointerEvents: "none",
                      }}
                    >
                      <div className="font-bold text-sm text-[#286675] mb-1">{skillsInfo[skill].title}</div>
                      <div className="text-xs text-gray-600">{skillsInfo[skill].description}</div>
                    </div>
                  )}
                </span>
              ))}
            </div>
          </div>
        ))}
        </div>
      </div>
    </section>
  )
}