import React, { useState, useEffect } from 'react';
import LeagueData from '../../Interfaces/LeagueData';
import YearNavBar from '../../Navigation/YearNavBar';
import DraftPick from '../../Interfaces/DraftPick';
import SleeperUser from '../../Interfaces/SleeperUser';
import SleeperRoster from '../../Interfaces/SleeperRoster';
import PlayerYearStats from '../../Interfaces/PlayerYearStats';
import '../../Stylesheets/Year Stylesheets/DraftHeatMap.css'; // Create a CSS file for styling
import DraftInfo from '../../Interfaces/DraftInfo';
import { text } from 'stream/consumers';

interface DraftHeatMapProps {
  data: LeagueData;
}


const DraftHeatMap: React.FC<DraftHeatMapProps> = ({ data }) => {
  const [isLoading, setIsLoading] = useState(true);


  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <YearNavBar data={data} />
    </div>
  );
};

export default DraftHeatMap;