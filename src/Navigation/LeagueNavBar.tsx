// HallOfFameNavBar.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import LeagueData from '../Interfaces/LeagueData';
import '../Stylesheets/NavBar.css'; // Create a CSS file for styling

interface LeagueNavBar {
  data: LeagueData[];
}

const LeagueNavBar: React.FC<LeagueNavBar> = ({ data }) => {
  return (
    <div className="navbar-container mt-3 mb-3"> {/* Use mt-3 for margin-top */}
      <Link to={`/league-stats`} className="btn-custom btn btn-sm mr-2">
        League Stats Home
      </Link>
      <Link to={`/league-stats/league-records`} className="btn-custom btn btn-sm mr-2">
        Records Stats
      </Link>
    </div>
  );
};

export default LeagueNavBar;