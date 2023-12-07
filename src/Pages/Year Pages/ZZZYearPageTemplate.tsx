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
  let [matchupInfo, setMatchupInfo] = useState<MatchupInfo[]>([]);
  const [dataFetched, setDataFetched] = useState(false);

  useEffect(() => {
    const fetchMatchupData = async () => {
      try {
        const info = await getMatchupData(data);
        setMatchupInfo(info);
        data.matchupInfo = info;
        setDataFetched(true);
      } catch (error) {
        console.error('Error fetching league data:', error);
        setDataFetched(true); // Set dataFetched to true even in case of an error to avoid infinite loading
      }
    };

    if (data.matchupInfo === undefined) {
      fetchMatchupData();
    } else {
      setDataFetched(true);
    }
  }, [data, matchupInfo]);

  if (!dataFetched) {
    // Render a loading indicator or placeholder while data is being fetched
    return <div>Loading...</div>;
  }



  return (
    <div>
      <YearNavBar data={data} />

    </div>
  );
};

export default REPLACEME;