import React from 'react';
import '../style/Sidebar.css';

function Sidebar({ onNavigate, currentPage }) {

  return (
    <aside className="sidebar">
  <img src="/img/ladico.png" alt="LADICO logo" className="logo" />
  <nav>
    <ul>
      <li
        className={currentPage === 'competencias' ? 'active' : ''}
        onClick={() => onNavigate('competencias')}
      >
        Competencias
      </li>
      <li
        className={currentPage === 'progreso' ? 'active' : ''}
        onClick={() => onNavigate('progreso')}
      >
        Mi progreso
      </li>
      <li
        className={currentPage === 'explorar' ? 'active' : ''}
        onClick={() => onNavigate('explorar')}
      >
        Explorar
      </li>
    </ul>
  </nav>
</aside>

  );
}

export default Sidebar;
