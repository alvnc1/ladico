import React from 'react';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginRegister from './components/LoginRegister';
import Home from './components/Home';
import HomePage from './components/HomePage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/loginregister" element={<LoginRegister />} />
        <Route path="/home" element={<Home />} />
        <Route path="/homepage" element={<HomePage />} />
      </Routes>
    </Router>
  );
}

export default App;
