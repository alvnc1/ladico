import React from 'react';
import '../style/navBar.css';
import { Link } from 'react-router-dom';

function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-logo">
        {/* Usamos una imagen en lugar del texto */}
        <Link to="/homepage">
          <img 
            src="/img/ladico.png" 
            alt="LADICO" 
            className="navbar-logo-image"
          />
        </Link>
      </div>
      <ul className="navbar-links">
        <li><Link to="/homepage">Inicio</Link></li>
        <li><a href="#features">Features</a></li>
        <li><a href="#contact">Contacto</a></li>
      </ul>
      <div className="navbar-button">
        <Link to="/loginregister" className="get-started-btn">Iniciar Sesión</Link>
      </div>
    </nav>
  );
}

export default Navbar;
