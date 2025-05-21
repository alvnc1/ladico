import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginRegister from './components/LoginRegister';
import HomePage from './components/HomePage';
import Competencias from './pages/Competencias';


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/homepage" />} />
        <Route path="/loginregister" element={<LoginRegister />} />
        <Route path="/homepage" element={<HomePage />} />
        <Route path="/competencias" element={<Competencias />} />
      </Routes>
    </Router>
  );
}

export default App;
