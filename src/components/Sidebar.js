import React from 'react';
import '../style/Sidebar.css';
import { FaHome, FaStar, FaCertificate, FaBookOpen, FaQuestionCircle } from 'react-icons/fa';

function Sidebar({ onNavigate, currentPage }) {
  return (
    <aside className="sidebar">
      <div className="logo-section">
        <img src="/img/ladico.png" alt="LADICO logo" className="logo" />
      </div>

      <nav className="nav-links">
        <ul>
          <li
            className={currentPage === 'home' ? 'active' : ''}
            onClick={() => onNavigate('home')}
          >
            <FaHome /> Inicio
          </li>
          <li
            className={currentPage === 'competencias' ? 'active' : ''}
            onClick={() => onNavigate('competencias')}
          >
            <FaStar /> Competencias
          </li>
          <li
            className={currentPage === 'progreso' ? 'active' : ''}
            onClick={() => onNavigate('progreso')}
          >
            <FaCertificate /> Progreso
          </li>
          <li
            className={currentPage === 'explorar' ? 'active' : ''}
            onClick={() => onNavigate('explorar')}
          >
            <FaBookOpen /> Explorar
          </li>
        </ul>
      </nav>

    </aside>
  );
}

export default Sidebar;
