import { useNavigate } from "react-router-dom";
import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { Link } from 'react-router-dom';
import { AccountCircle } from '@mui/icons-material'; // Importamos el icono para el botón "Log in"
import "../style/homePage.css";

const HomePage = () => {
    const navigate = useNavigate(); // Usamos useNavigate para redirigir
    
    // Función para manejar el clic en el botón "Log In" o "Sign Up"
    const handleLogInSignIn = () => {
      navigate("/loginregister"); // Redirige a la página de inicio de sesión o registro
    };
  
    return (
      <div>
        {/* Barra de navegación */}
        <AppBar position="static" sx={{ backgroundColor: '#fff', boxShadow: 0 }}>
          <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '60px' }}>
            {/* Logo a la izquierda */}
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" component="div" sx={{ color: '#2575fc', fontWeight: 'bold', fontFamily: 'Roboto' }}>
                <Link to="/" style={{ textDecoration: 'none', color: '#2575fc' }}>
                  {/* Ajustamos la imagen para que no haga crecer la barra */}
                  <img 
                    src="/img/ladico.png" 
                    alt="LADICO" 
                    style={{ 
                      maxHeight: '100px',  // Tamaño máximo de la altura
                      objectFit: 'contain', // Mantener la proporción sin deformar
                    }} 
                  />
                </Link>
              </Typography>
            </Box>
  
            {/* Botones a la derecha */}
            <Box sx={{ display: 'flex', gap: '8px' }}>
              {/* Botón "Iniciar sesión" con icono */}
              <Button 
                variant="outlined" 
                sx={{ 
                  borderColor: 'black',  // Bordes negros
                  color: 'black',  // Texto negro
                  padding: '6px 15px', 
                  fontSize: '14px',  // Aumentamos el tamaño del texto
                  fontWeight: 'bold',
                  borderRadius: '5px',  // Botones cuadrados
                  boxShadow: '0px 2px 5px rgba(0, 0, 0, 0.1)', // Sombra por defecto
                  '&:hover': {
                    boxShadow: '0px 4px 15px rgba(0, 0, 0, 0.3)', // Aumentar la sombra cuando el mouse pasa por encima
                  }
                }}
                startIcon={<AccountCircle />}  // Añadimos el icono de usuario al principio
                onClick={handleLogInSignIn} // Llamamos a la función handleLogIn al hacer clic
              >
                Iniciar sesión
              </Button>
  
              {/* Botón "Registrarse" */}
              <Button 
                variant="contained" 
                sx={{ 
                  backgroundColor: '#2575fc', // Fondo azul
                  color: '#fff', // Texto blanco
                  padding: '6px 15px', 
                  fontSize: '14px', // Aumentamos el tamaño del texto
                  fontWeight: 'bold',
                  borderRadius: '5px',  // Botones cuadrados
                  boxShadow: '0px 2px 5px rgba(0, 0, 0, 0.1)', // Sombra por defecto
                  '&:hover': {
                    backgroundColor: '#1d5bb8', // Oscurecer el fondo en hover
                    boxShadow: '0px 4px 15px rgba(0, 0, 0, 0.3)', // Aumentar la sombra cuando el mouse pasa por encima
                  }
                }}
                onClick={handleLogInSignIn} // Llamamos a la función handleSignUp al hacer clic
              >
                Registrarse
              </Button>
            </Box>
          </Toolbar>
        </AppBar>
  
        {/* Sección del encabezado (Landing Page) */}
        <div className="header">
          <Box sx={{ textAlign: 'center', marginTop: '100px' }}>
            <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
              Desarrolla tus habilidades digitales
            </Typography>
            <Typography variant="h6" sx={{ marginTop: '20px', fontWeight: '400' }}>
              LADICO es una plataforma en línea abierta para que todos puedan evaluar, desarrollar y certificar sus habilidades digitales.
            </Typography>
          </Box>
        </div>
  
        {/* Footer Section */}
        <footer className="footer">
          <Box sx={{ textAlign: 'center', padding: '20px' }}>
            <Typography variant="body2" color="textSecondary">
              © 2025 LADICO - Todos los derechos reservados.
            </Typography>
          </Box>
        </footer>
      </div>
    );
  };
  
  export default HomePage;