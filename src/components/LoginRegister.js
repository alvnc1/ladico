import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, setDoc } from "firebase/firestore";
import { auth, provider, db } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup
} from "firebase/auth";
import "../style/loginRegister.css";

function LoginRegister() {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [country, setCountry] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/competencias");
    } catch (error) {
      alert(error.message);
    }
  };

  const handleRegister = async (e) => {
  e.preventDefault();
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Guardar datos adicionales en Firestore
    await setDoc(doc(db, "users", user.uid), {
      username,
      email,
      age,
      gender,
      country,
      createdAt: new Date()
    });

    navigate("/competencias");

  } catch (error) {
    alert(error.message);
  }
};

  const handleClick = async () => {
    try {
      await signInWithPopup(auth, provider);
      navigate("/competencias");
    } catch (error) {
      if (error.code === "auth/popup-closed-by-user") {
        console.log("El usuario cerró el popup sin iniciar sesión.");
      } else {
        alert(error.message);
      }
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      alert("Por favor, ingresa tu email en el campo primero.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      alert("Te hemos enviado un enlace para restablecer tu contraseña.");
    } catch (error) {
      alert(error.message);
    }
  };

  const handleLogoClick = () => {
    navigate("/homepage");
  };

  return (
    <div className={`container ${isSignUp ? "sign-up-mode" : ""}`}>
      <div className="forms-container">
        <div className="signin-signup">
          <form onSubmit={handleLogin} className="sign-in-form">
            <img src="/img/ladico.png" alt="Logo LADICO" className="form-logo clickable-logo" onClick={handleLogoClick} style={{ cursor: "pointer" }} />
            <h2 className="title">Bienvenido de nuevo</h2>

            <div className="input-group">
              <label htmlFor="login-email">Dirección de correo electrónico</label>
              <div className="input-wrapper">
                <i className="fas fa-user"></i>
                <input
                  type="text"
                  id="login-email"
                  placeholder="ej.: john.mcfly@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="login-password">Contraseña</label>
              <div className="input-wrapper">
                <i className="fas fa-lock"></i>
                <input
                  type={showPassword ? "text" : "password"}
                  id="login-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>
            <div className="forgot-password">
              <button type="button" onClick={handleForgotPassword}>
                ¿Olvidaste tu contraseña?
              </button>
            </div>
            <input type="submit" value="Iniciar Sesión" className="btn solid" />
            <div className="google-login-container">
              <div className="separator">
                <span>Inicia Sesión</span>
                <span style={{ fontWeight: 400, color: "#777" }}>con</span>
              </div>
              <button type="button" className="google-login-btn" onClick={handleClick}>
                <img src="/img/google.png" alt="Google Logo" className="google-icon" />
                <strong>Google</strong>
              </button>
            </div>
          </form>

          <form onSubmit={handleRegister} className="sign-up-form">
            <img src="/img/ladico.png" alt="Logo LADICO" className="form-logo clickable-logo" onClick={handleLogoClick} style={{ cursor: "pointer" }} />
            <h2 className="title">Inscribirse</h2>

            <div className="input-group">
              <label htmlFor="register-username">Nombre</label>
              <div className="input-wrapper">
                <i className="fas fa-user"></i>
                <input
                  type="text"
                  id="register-username"
                  placeholder="ej.: John"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="register-email">Dirección de correo electrónico</label>
              <div className="input-wrapper">
                <i className="fas fa-envelope"></i>
                <input
                  type="email"
                  id="register-email"
                  placeholder="ej.: john.mcfly@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="inline-group">
              <div className="input-group">
                <label htmlFor="register-age">Edad</label>
                <div className="input-wrapper">
                  <i className="fas fa-calendar"></i>
                  <input
                    type="number"
                    id="register-age"
                    placeholder="ej.: 25"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="register-gender">Género</label>
                <div className="input-wrapper">
                  <i className="fas fa-venus-mars"></i>
                  <select
                    id="register-gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    required
                  >
                    <option value="">Selecciona...</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Femenino">Femenino</option>
                    <option value="Otro">Otro</option>
                    <option value="Prefiero no decirlo">Prefiero no decirlo</option>
                  </select>
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="register-country">País</label>
                <div className="input-wrapper">
                  <i className="fas fa-globe"></i>
                  <input
                    type="text"
                    id="register-country"
                    placeholder="ej.: Chile"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="register-password">Contraseña</label>
              <div className="input-wrapper">
                <i className="fas fa-lock"></i>
                <input
                  type={showPassword ? "text" : "password"}
                  id="register-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <input type="submit" className="btn" value="Crear Cuenta" />
          </form>
        </div>
      </div>

      <div className="panels-container">
        <div className="panel left-panel">
          <div className="content">
            <h3>¿ Nuevo en la página ?</h3>
            <p>¡Crea tu cuenta en pocos segundos!</p>
            <button className="btn transparent" onClick={() => setIsSignUp(true)}>
              Registrarse
            </button>
          </div>
          <img src="/img/imagen.png" className="image" alt="Log" />
        </div>
        <div className="panel right-panel">
          <div className="content">
            <h3>Ya eres parte de nosotros ?</h3>
            <p>Si ya tienes una cuenta, inicia sesión aquí.</p>
            <button className="btn transparent" onClick={() => setIsSignUp(false)}>
              Acceso
            </button>
          </div>
          <img src="/img/imagen.png" className="image" alt="Register" />
        </div>
      </div>
    </div>
  );
}

export default LoginRegister;
