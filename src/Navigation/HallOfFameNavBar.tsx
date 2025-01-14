// HallOfFameNavBar.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import LeagueData from '../Interfaces/LeagueData';
import '../Stylesheets/NavBar.css'; // Create a CSS file for styling

interface HallOfFameNavBar {
  data: LeagueData[];
}

const HallOfFameNavBar: React.FC<HallOfFameNavBar> = ({ data }) => {
  return (
    <div className="navbar-container mt-3 mb-3"> {/* Use mt-3 for margin-top */}
      <Link to={`/hall-of-fame`} className="btn-custom btn btn-sm mr-2">
        Hall of Fame Home
      </Link>
      <Link to={`/hall-of-fame/football-player-champions`} className="btn-custom btn btn-sm mr-2">
        Football Player Champions
      </Link>
    </div>
  );
};

export default HallOfFameNavBar;