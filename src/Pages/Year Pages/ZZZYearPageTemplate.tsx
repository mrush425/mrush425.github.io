import React, { useState, useEffect } from 'react';
import LeagueData from '../../Interfaces/LeagueData';
import YearNavBar from '../../Navigation/YearNavBar';
import { getMatchupData } from '../../SleeperApiMethods';
import MatchupInfo from '../../Interfaces/MatchupInfo';

import '../../Stylesheets/Year Stylesheets/REPLACEME.css'; 

//Instructions for new page
//Use Ctrl+H to replace REPLACEME with the name of the file
//Don't forget to also create the css file with the corresponding name
//Go into YearNavBar and add this code:
// <Link to={`/season/${data.season}/replace-name`} className="btn-custom btn btn-sm">
// Replace with name
// </Link>
//Go into App.tsx and add this code:
// {leagueData.map((league) => (
//     <Route
//       key={league.season}
//       path={`/season/${league.season}/replace-name`}
//       element={<REPLACEME data={league}/>}
//     />
//   ))}

interface REPLACEMEProps {
  data: LeagueData;
}


const REPLACEME: React.FC<REPLACEMEProps> = ({ data }) => {


  return (
    <div>
      <YearNavBar data={data} />

    </div>
  );
};

export default REPLACEME;