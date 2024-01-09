import React from 'react';
import '../../Stylesheets/Hall of Fame Stylesheets/HallOfFameHome.css'
import LeagueData from '../../Interfaces/LeagueData';
import HallOfFameNavBar from '../../Navigation/HallOfFameNavBar';
import HallOfFameProps from './HallOfFameProps';


const HallOfFameHome: React.FC<HallOfFameProps> = ({ data }) => {
  return (
    <div>
      <HallOfFameNavBar data={data} /> 
      <h2>Welcome to the Hall of Fame</h2>
      <div>Put league winners and losers pictures here</div>
    </div>
  );
}

export default HallOfFameHome;