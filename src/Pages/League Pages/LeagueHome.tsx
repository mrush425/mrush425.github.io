import React from 'react';
import '../../Stylesheets/League Stylesheets/LeagueHome.css';
import LeagueProps from './LeagueProps';
import LeagueNavBar from '../../Navigation/LeagueNavBar';

const LeagueHome: React.FC<LeagueProps> = ({ data }) => {

  return (
    <div>
      <LeagueNavBar data={data} />
      <h2>Overall League Stats (Under Construction)</h2>
    </div>
  );
};

export default LeagueHome;
