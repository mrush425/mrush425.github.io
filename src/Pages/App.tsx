// App.tsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import WebsiteNavBar from '../Navigation/WebsiteNavbar';
import Home from './home';

import { getLeagueData } from '../SleeperApiMethods';
import { Current_League_Id } from '../Helper Files/Constants';
import LeagueData from "../Interfaces/LeagueData";
import YearData from './Year Pages/YearData';
import DraftHeatMap from './Year Pages/DraftHeatMap';
import DraftReportCard from './Year Pages/DraftReportCard';
import ScheduleComparison from './Year Pages/ScheduleComparison';
import OvertimeComparison from './Year Pages/OvertimeComparison';
import AllPlayoffPossibilities from './Year Pages/AllPlayoffPossibilities';
import Playoffs from './Year Pages/Playoffs';
import SidebetStats from './Year Pages/SidebetStats';
import HallOfFameHome from './Hall of Fame Pages/HallOfFameHome';
import FootballPlayerChampions from './Hall of Fame Pages/FootballPlayerChampions';
import ScheduleViewer from './Year Pages/ScheduleViewer';
import LeagueHome from './League Pages/LeagueHome';
import RecordsStats from './League Pages/RecordsStats';
import PointsStats from './League Pages/PointsStats';

function generateYearRoute(league: LeagueData, pathSuffix: string, component: React.ReactNode) {
  const path = `/season/${league.season}${pathSuffix}`;
  return <Route key={league.season} path={path} element={component} />;
}



function App() {
  const [leagueData, setLeagueData] = useState<LeagueData[]>([]);
  const [dataFetched, setDataFetched] = useState(false);
  

  useEffect(() => {
    const fetchLeagueData = async () => {
      try {
        const data = await getLeagueData(Current_League_Id);
        setLeagueData(data);
        setDataFetched(true);
      } catch (error) {
        console.error('Error fetching league data:', error);
      }
    };

    fetchLeagueData();
  }, []);

  if (!dataFetched) {
    return <div>Loading...</div>;
  }

// App.tsx

return (
  <Router>
    <div className="App">
      <WebsiteNavBar data={leagueData} /> {/* Fixed at the top */}
      <div className="App-content"> {/* Scrollable content */}
        {dataFetched && (
          <Routes>
            <Route path="/" element={<Home />} />
            {/*Overall League Data*/}
            <Route path="/league-stats" element={<LeagueHome data={leagueData} />} />
            <Route path="/league-stats/league-records" element={<RecordsStats data={leagueData} />} />
            <Route path="/league-stats/league-points" element={<PointsStats data={leagueData} />} />
            {/*Hall of Fame Pages*/}
            <Route path="/hall-of-fame" element={<HallOfFameHome data={leagueData} />} />
            <Route path="/hall-of-fame/football-player-champions" element={<FootballPlayerChampions data={leagueData} />} />
            {/*Year Pages*/}
            {leagueData.map((leagueYear) => (
              <React.Fragment key={leagueYear.season}>
                {generateYearRoute(leagueYear, '', <YearData data={leagueYear} />)}
                {generateYearRoute(leagueYear, '/schedule-comparison', <ScheduleComparison data={leagueYear} />)}
                {generateYearRoute(leagueYear, '/overtime-comparison', <OvertimeComparison data={leagueYear} />)}
                {generateYearRoute(leagueYear, '/draft-heatmap', <DraftHeatMap data={leagueYear} />)}
                {generateYearRoute(leagueYear, '/draft-report-card', <DraftReportCard data={leagueYear} />)}
                {generateYearRoute(leagueYear, '/all-playoff-possibilities', <AllPlayoffPossibilities data={leagueYear} />)}
                {generateYearRoute(leagueYear, '/playoffs', <Playoffs data={leagueYear} />)}
                {generateYearRoute(leagueYear, '/sidebet-stats', <SidebetStats data={leagueYear} />)}
                {generateYearRoute(leagueYear, '/schedule-viewer', <ScheduleViewer data={leagueYear} />)}
              </React.Fragment>
            ))}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        )}
      </div>
    </div>
  </Router>
);

}

export default App;
