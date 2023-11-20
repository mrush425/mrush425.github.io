// YearData.tsx
import React from 'react';
import { useParams } from 'react-router-dom';
import LeagueData from '../../Interfaces/LeagueData';
import YearNavBar from '../../Navigation/YearNavBar'; // Import the YearNavBar component

interface YearDataProps {
  data: LeagueData;
}

const YearData: React.FC<YearDataProps> = ({ data }) => {
  return (
    <div>
      <YearNavBar data={data} /> {/* Render the YearNavBar component */}
      
      <h2>{`Season ${data.season}`}</h2>
      {/* Display other information about the season */}
      <p>League ID: {data.league_id}</p>
      {/* Add more information as needed */}
    </div>
  );
};

export default YearData;