import React from 'react';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginRegister from './components/LoginRegister';
import Home from './components/Home';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginRegister />} />
        <Route path="/home" element={<Home />} />
      </Routes>
    </Router>
  );
}

export default App;
