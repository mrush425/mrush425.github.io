import React from 'react';
import { Routes, Route, useParams } from 'react-router-dom';
import LeagueData from '../../Interfaces/LeagueData';
import TrollNavBar from '../../Navigation/TrollNavBar';
import TrollHome from './TrollHome';
import CareerProgression from './CareerProgression';
import TrollMatchups from './Matchups';
import BestPlayers from './BestPlayers';
import FavoritePlayers from './FavoritePlayers';
import '../../Stylesheets/Troll Stylesheets/TrollData.css';

interface TrollDataProps {
  data: LeagueData[];
}

const TrollData: React.FC<TrollDataProps> = ({ data }) => {
  const { trollId } = useParams<{ trollId: string }>();

  if (!trollId) {
    return <div>Invalid troll ID</div>;
  }

  // Find troll name from the first league that has this user
  const trollName = data
    .flatMap((league) => league.users)
    .find((user) => user.user_id === trollId)?.metadata?.team_name ||
    data.flatMap((league) => league.users).find((user) => user.user_id === trollId)?.display_name ||
    trollId;

  return (
    <div className="troll-data-container">
      <TrollNavBar userId={trollId} userName={trollName} leagueData={data} />
      <div className="troll-content">
        <Routes>
          <Route path="/" element={<TrollHome userId={trollId} userName={trollName} leagueData={data} />} />
          <Route path="/career-progression" element={<CareerProgression userId={trollId} userName={trollName} leagueData={data} />} />
          <Route path="/matchups" element={<TrollMatchups userId={trollId} userName={trollName} leagueData={data} />} />
          <Route path="/best-players" element={<BestPlayers userId={trollId} leagueData={data} />} />
          <Route path="/favorite-players" element={<FavoritePlayers userId={trollId} userName={trollName} leagueData={data} />} />
        </Routes>
      </div>
    </div>
  );
};

export default TrollData;
