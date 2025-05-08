import React from 'react';
import '../style/CompetenceCard.css';



function CompetenceCard({ title = "Developing text documents", category = "CREACIÓN DE CONTENIDOS DIGITALES", level = 0 }) {
  const progressDegrees = level * 360;

  const categoryColors = {
    "INFORMATION AND DATA": "linear-gradient(180deg, #00a8e8 0%, #007ea7 100%)",
    "COMMUNICATION AND COLLABORATION": "linear-gradient(180deg, #a066b0 0%, #844d9e 100%)",
    "CONTENT CREATION": "linear-gradient(180deg, #ff7e29 0%, #e65100 100%)",
    "SECURITY": "linear-gradient(180deg, #88b04b 0%, #618833 100%)",
    "PROBLEM SOLVING": "linear-gradient(180deg, #f25c54 0%, #d64541 100%)",
  };

  const categoryMap = {
    "BÚSQUEDA Y GESTIÓN DE INFORMACIÓN Y DATOS": "INFORMATION AND DATA",
    "COMUNICACIÓN Y COLABORACIÓN": "COMMUNICATION AND COLLABORATION",
    "CREACIÓN DE CONTENIDOS DIGITALES": "CONTENT CREATION",
    "SEGURIDAD": "SECURITY",
    "RESOLUCIÓN DE PROBLEMAS": "PROBLEM SOLVING"
  };

  const resolvedCategory = categoryMap[category.toUpperCase()] || category.toUpperCase();
  const backgroundStyle = categoryColors[resolvedCategory] || '#ccc';

  return (
    <div className="card-container">
      <div
        className="card-header"
        style={{ background: backgroundStyle }}
      >
        <p className="category">{category}</p>
        <h3 className="card-title">{title}</h3>
      </div>

      <div className="card-body">
        <div className="progress-circle">
          <svg width="100" height="100">
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="#d3d6dd"
              strokeWidth="6"
              fill="none"
            />
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="#19a8f8"
              strokeWidth="6"
              fill="none"
              strokeDasharray={`${progressDegrees} ${360}`}
              strokeDashoffset="90"
              transform="rotate(-90 50 50)"
            />
          </svg>
          <p className="level-label">LEVEL</p>
          <p className="level-value">–</p>
        </div>

        <button className="resume-button">
          {level === 0 ? "Comenzar" : "Resumir"}
        </button>
      </div>
    </div>
  );
}


export default CompetenceCard;
