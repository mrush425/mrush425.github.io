// YearData.tsx
import React from 'react';
import { useParams } from 'react-router-dom';
import LeagueData from './Interfaces/LeagueData';

interface YearDataProps {
  data: LeagueData;
}

const YearData: React.FC<YearDataProps> = ({ data }) => {
  return (
    <div>
      <h2>{`Season ${data.season}`}</h2>
      {/* Display other information about the season */}
      <p>League ID: {data.league_id}</p>
      {/* Add more information as needed */}
    </div>
  );
};

export default YearData;
