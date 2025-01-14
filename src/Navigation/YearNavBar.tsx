// YearNavBar.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import LeagueData from '../Interfaces/LeagueData';
import '../Stylesheets/NavBar.css'; // Create a CSS file for styling

interface YearNavBarProps {
  data: LeagueData;
}

const YearNavBar: React.FC<YearNavBarProps> = ({ data }) => {
  return (
    <div className="navbar-container mt-3 mb-3"> {/* Use mt-3 for margin-top */}
      <Link to={`/season/${data.season}`} className="btn-custom btn btn-sm mr-2">
        Year Home
      </Link>
      <Link to={`/season/${data.season}/playoffs`} className="btn-custom btn btn-sm">
        Playoffs
      </Link>
      <Link to={`/season/${data.season}/sidebet-stats`} className="btn-custom btn btn-sm">
        Sidebet Stats
      </Link>
      <Link to={`/season/${data.season}/schedule-comparison`} className="btn-custom btn btn-sm">
        Schedule Comparison
      </Link>
      <Link to={`/season/${data.season}/overtime-comparison`} className="btn-custom btn btn-sm">
        Overtime Comparison
      </Link>
      <Link to={`/season/${data.season}/all-playoff-possibilities`} className="btn-custom btn btn-sm">
        All Playoff Possibilities
      </Link>
      <Link to={`/season/${data.season}/draft-heatmap`} className="btn-custom btn btn-sm">
        Draft Heat Map
      </Link>
      <Link to={`/season/${data.season}/draft-report-card`} className="btn-custom btn btn-sm">
        Draft Report Card
      </Link>
      <Link to={`/season/${data.season}/schedule-viewer`} className="btn-custom btn btn-sm">
        Schedule Viewer
      </Link>
    </div>
  );
};

export default YearNavBar;