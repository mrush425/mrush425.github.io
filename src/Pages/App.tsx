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
import HallOfFameHome from './HallOfFamePages/HallOfFameHome';
import FootballPlayerChampions from './HallOfFamePages/FootballPlayerChampions';

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

  return (
    <Router>
      <div className="App">
        <WebsiteNavBar data={leagueData} />
        {dataFetched && (
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/hall-of-fame" element={<HallOfFameHome data={leagueData} />} />
            <Route path="/hall-of-fame/football-player-champions" element={<FootballPlayerChampions data={leagueData} />} />
            {leagueData.map((leagueYear) => (
              <>
                {generateYearRoute(leagueYear, '', <YearData data={leagueYear} />)}
                {generateYearRoute(leagueYear, '/schedule-comparison', <ScheduleComparison data={leagueYear} />)}
                {generateYearRoute(leagueYear, '/overtime-comparison', <OvertimeComparison data={leagueYear} />)}
                {generateYearRoute(leagueYear, '/draft-heatmap', <DraftHeatMap data={leagueYear} />)}
                {generateYearRoute(leagueYear, '/draft-report-card', <DraftReportCard data={leagueYear} />)}
                {generateYearRoute(leagueYear, '/all-playoff-possibilities', <AllPlayoffPossibilities data={leagueYear} />)}
                {generateYearRoute(leagueYear, '/playoffs', <Playoffs data={leagueYear} />)}
                {generateYearRoute(leagueYear, '/sidebet-stats', <SidebetStats data={leagueYear} />)}
              </>
            ))}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        )}
      </div>
    </Router>
  );
}

export default App;
