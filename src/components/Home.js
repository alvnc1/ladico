import React from "react";
import { auth } from "./firebase";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

function Home() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/"); // devuelve al login
    } catch (error) {
      alert("Error al cerrar sesión: " + error.message);
    }
  };

  return (
    <div style={styles.container}>
      <h1>Bienvenido a la página principal</h1>
      <button onClick={handleLogout} style={styles.button}>
        Cerrar Sesión
      </button>
    </div>
  );
}

const styles = {
  container: {
    textAlign: "center",
    marginTop: "100px",
  },
  button: {
    marginTop: "20px",
    padding: "10px 20px",
    backgroundColor: "#A8D4F1",
    border: "none",
    borderRadius: "30px",
    color: "#fff",
    fontWeight: "bold",
    fontSize: "1rem",
    cursor: "pointer",
    transition: "0.3s",
  },
};

export default Home;
