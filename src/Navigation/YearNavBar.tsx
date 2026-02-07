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
    <div className="navbar-container mt-3 mb-3">
      <Link to={`/season/${data.season}`} className="btn-custom btn btn-sm mr-2">
        <span className="btn-full">Year Home</span>
        <span className="btn-abbrev">Home</span>
      </Link>
      <Link to={`/season/${data.season}/playoffs`} className="btn-custom btn btn-sm mr-2">
        <span className="btn-full">Playoffs</span>
        <span className="btn-abbrev">Playoffs</span>
      </Link>
      <Link to={`/season/${data.season}/sidebet-stats`} className="btn-custom btn btn-sm mr-2">
        <span className="btn-full">Sidebet Stats</span>
        <span className="btn-abbrev">Sidebets</span>
      </Link>
      <Link to={`/season/${data.season}/schedule-comparison`} className="btn-custom btn btn-sm mr-2">
        <span className="btn-full">Schedule Comparison</span>
        <span className="btn-abbrev">Schedule</span>
      </Link>
      <Link to={`/season/${data.season}/overtime-comparison`} className="btn-custom btn btn-sm mr-2">
        <span className="btn-full">Overtime Comparison</span>
        <span className="btn-abbrev">Overtime</span>
      </Link>
      <Link to={`/season/${data.season}/all-playoff-possibilities`} className="btn-custom btn btn-sm mr-2">
        <span className="btn-full">All Playoff Possibilities</span>
        <span className="btn-abbrev">Playoffs</span>
      </Link>
      <Link to={`/season/${data.season}/draft-heatmap`} className="btn-custom btn btn-sm mr-2">
        <span className="btn-full">Draft Heat Map</span>
        <span className="btn-abbrev">Heat Map</span>
      </Link>
      <Link to={`/season/${data.season}/draft-report-card`} className="btn-custom btn btn-sm mr-2">
        <span className="btn-full">Draft Report Card</span>
        <span className="btn-abbrev">Report</span>
      </Link>
      <Link to={`/season/${data.season}/schedule-viewer`} className="btn-custom btn btn-sm mr-2">
        <span className="btn-full">Schedule Viewer</span>
        <span className="btn-abbrev">Viewer</span>
      </Link>
      <Link to={`/season/${data.season}/money-calculator`} className="btn-custom btn btn-sm">
        <span className="btn-full">Money Calculator</span>
        <span className="btn-abbrev">Money</span>
      </Link>
    </div>
  );
};

export default YearNavBar;