// App.tsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import WebsiteNavBar from '../Navigation/WebsiteNavbar';
import Home from './home';
import LoadingScreen from '../Components/LoadingScreen';

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
import BowlHistory from './League Pages/BowlHistory';
import RecordsStats from './League Pages/RecordsStats';
import PointsStats from './League Pages/PointsStats';
import OtherStats from './League Pages/OtherStats';
import FootballPlayerStats from './League Pages/FootballPlayerStats';
import TrollData from './Troll Pages/TrollData';

function generateYearRoute(league: LeagueData, pathSuffix: string, component: React.ReactNode) {
  const path = `/season/${league.season}${pathSuffix}`;
  return <Route key={league.season} path={path} element={component} />;
}



function App() {
  const [leagueData, setLeagueData] = useState<LeagueData[]>([]);
  const [dataFetched, setDataFetched] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  

  useEffect(() => {
    const fetchLeagueData = async () => {
      try {
        // Simulate progress updates
        setLoadingProgress(10);
        
        const data = await getLeagueData(Current_League_Id);
        
        // Update progress as data loads
        setLoadingProgress(50);
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 300));
        setLoadingProgress(80);
        
        setLeagueData(data);
        
        setLoadingProgress(100);
        
        // Small delay before showing content
        await new Promise(resolve => setTimeout(resolve, 300));
        setDataFetched(true);
      } catch (error) {
        console.error('Error fetching league data:', error);
        setDataFetched(true); // Show app even on error
      }
    };

    fetchLeagueData();
  }, []);

  if (!dataFetched) {
    return <LoadingScreen progress={loadingProgress} />;
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
            <Route path="/league-stats/bowl-history" element={<BowlHistory data={leagueData} />} />
            <Route path="/league-stats/league-records" element={<RecordsStats data={leagueData} />} />
            <Route path="/league-stats/league-points" element={<PointsStats data={leagueData} />} />
            <Route path="/league-stats/league-other-stats" element={<OtherStats data={leagueData} />} />
            <Route path="/league-stats/football-player-stats" element={<FootballPlayerStats data={leagueData} />} />
            {/*Hall of Fame Pages*/}
            <Route path="/hall-of-fame" element={<HallOfFameHome data={leagueData} />} />
            <Route path="/hall-of-fame/football-player-champions" element={<FootballPlayerChampions data={leagueData} />} />
            {/*Troll Pages*/}
            <Route path="/troll/:trollId/*" element={<TrollData data={leagueData} />} />
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
