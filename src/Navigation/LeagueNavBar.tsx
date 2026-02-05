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
    <div className="navbar-container mt-3 mb-3">
      <Link to={`/league-stats`} className="btn-custom btn btn-sm mr-2">
        <span className="btn-full">League Stats Home</span>
        <span className="btn-abbrev">Home</span>
      </Link>
      <Link to={`/league-stats/bowl-history`} className="btn-custom btn btn-sm mr-2">
        <span className="btn-full">Bowl History</span>
        <span className="btn-abbrev">Bowls</span>
      </Link>
      <Link to={`/league-stats/league-records`} className="btn-custom btn btn-sm mr-2">
        <span className="btn-full">Records Stats</span>
        <span className="btn-abbrev">Records</span>
      </Link>
      <Link to={`/league-stats/league-points`} className="btn-custom btn btn-sm mr-2">
        <span className="btn-full">Points Stats</span>
        <span className="btn-abbrev">Points</span>
      </Link>
      <Link to={`/league-stats/league-other-stats`} className="btn-custom btn btn-sm mr-2">
        <span className="btn-full">Other Stats</span>
        <span className="btn-abbrev">Other</span>
      </Link>
      <Link to={`/league-stats/football-player-stats`} className="btn-custom btn btn-sm mr-2">
        <span className="btn-full">Football Player Stats</span>
        <span className="btn-abbrev">Players</span>
      </Link>
    </div>
  );
};

export default LeagueNavBar;