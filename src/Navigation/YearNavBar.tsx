// YearNavBar.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import LeagueData from '../Interfaces/LeagueData';
import '../Stylesheets/YearNavBar.css'; // Create a CSS file for styling

interface YearNavBarProps {
  data: LeagueData;
}

const YearNavBar: React.FC<YearNavBarProps> = ({ data }) => {
  return (
    <div className="year-navbar-container mt-3 mb-3"> {/* Use mt-3 for margin-top */}
      <Link to={`/season/${data.season}`} className="btn-custom btn btn-sm mr-2">
        Year Home
      </Link>
      <Link to={`/season/${data.season}/draft-heatmap`} className="btn-custom btn btn-sm">
        Draft Heat Map
      </Link>
    </div>
  );
};

export default YearNavBar;