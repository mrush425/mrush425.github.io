import React, { useState, useEffect } from 'react';
import '../../Stylesheets/League Stylesheets/REPLACEME.css';
import LeagueProps from './LeagueProps';
import LeagueNavBar from '../../Navigation/LeagueNavBar';

  //Instructions for new page
//Use Ctrl+H to replace REPLACEME with the name of the file
//Don't forget to also create the css file with the corresponding name
//Go into App.tsx and add this code:
// <Route path="/league-stats/name-of-link" element={<LeagueHome data={leagueData} />} />
//Go into LeagueNavBar and add this code:
//<Link to={`/league-stats-home/name-of-link`} className="btn-custom btn btn-sm mr-2">
  //League Stats Home
//</Link>



const REPLACEME: React.FC<LeagueProps> = ({ data }) => {


  const [isMobile, setIsMobile] = useState(false); // Track if the user is on a mobile device
  const [viewMode, setViewMode] = useState<'table' | 'matchup'>('table'); // Mobile view state

  // Detect screen width to determine if it's mobile
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);



  return (
    <div>
      <LeagueNavBar data={data} />
     
    </div>
  );
};

export default REPLACEME;
