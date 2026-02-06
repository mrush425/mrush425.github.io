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
        <span className="btn-full">{userName} Home</span>
        <span className="btn-abbrev">Home</span>
      </Link>
      <Link to={`/troll/${userId}/career-progression`} className="btn-custom btn btn-sm mr-2">
        <span className="btn-full">Career Progression</span>
        <span className="btn-abbrev">Progression</span>
      </Link>
      <Link to={`/troll/${userId}/matchups`} className="btn-custom btn btn-sm mr-2">
        <span className="btn-full">Matchups</span>
        <span className="btn-abbrev">Matchups</span>
      </Link>
      <Link to={`/troll/${userId}/best-players`} className="btn-custom btn btn-sm mr-2">
        <span className="btn-full">Best Players</span>
        <span className="btn-abbrev">Best</span>
      </Link>
      <Link to={`/troll/${userId}/favorite-players`} className="btn-custom btn btn-sm">
        <span className="btn-full">Favorite Players</span>
        <span className="btn-abbrev">Fav</span>
      </Link>
    </div>
  );
};

export default TrollNavBar;
