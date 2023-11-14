// App.tsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CustomNavbar from './Navbar';
import Home from './home';
import About from './About';
import { getLeagueData } from './SleeperApiMethods';
import { Current_League_Id } from './Constants';
import LeagueData from "./Interfaces/LeagueData";
import YearData from './YearData';

function App() {

  return (
    <Router>
      <div className="App">
        <CustomNavbar />
        <Routes>
          <Route path="/about" element={<About />} />
          <Route path="/" element={<Home />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
