import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../style/Header.css';

function Header({ username = "Usuario" }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();


  return (
    <header className="header">
      <div className="header-right">
        <div className="user-menu" onClick={() => setOpen(!open)}>
          {username.split(' ')[0]} ▼
        </div>
        {open && (
          <div className="dropdown">
            <div className="dropdown-header">{username}</div>
            <ul>
            <li>Mi cuenta</li>
            <li>Mis certificaciones</li>
            <li>Ayuda</li>
            <li className="logout" onClick={() => navigate('/homepage')}>
              🔌 Cerrar sesión
            </li>
            </ul>
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;

