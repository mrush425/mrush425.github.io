import React from 'react';
import { Link } from 'react-router-dom';
import '../Stylesheets/NavBar.css';

interface TrollNavBarProps {
  userId: string;
  userName: string;
  leagueData: any[];
}

const TrollNavBar: React.FC<TrollNavBarProps> = ({ userId, userName, leagueData }) => {
  return (
    <div className="navbar-container mt-3 mb-3">
      <Link to={`/troll/${userId}`} className="btn-custom btn btn-sm mr-2">
        {userName} Home
      </Link>
      <Link to={`/troll/${userId}/matchups`} className="btn-custom btn btn-sm mr-2">
        Matchups
      </Link>
      <Link to={`/troll/${userId}/best-players`} className="btn-custom btn btn-sm">
        Best Players
      </Link>
    </div>
  );
};

export default TrollNavBar;
