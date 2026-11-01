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
import MoneyCalculator from './Year Pages/MoneyCalculator';
import LeagueHome from './League Pages/LeagueHome';
import BowlHistory from './League Pages/BowlHistory';
import RecordsStats from './League Pages/RecordsStats';
import PointsStats from './League Pages/PointsStats';
import OtherStats from './League Pages/OtherStats';
import FootballPlayerStats from './League Pages/FootballPlayerStats';
import TrollData from './Troll Pages/TrollData';
import SideBetSelection from './Begin Year Tools/SideBetSelection';
import SuperSmashBros from './Begin Year Tools/SuperSmashBros';
import PostDraftRankings from './Begin Year Tools/PostDraftRankings';

function generateYearRoute(league: LeagueData, pathSuffix: string, component: React.ReactNode) {
  const path = `/season/${league.season}${pathSuffix}`;
  return <Route key={league.season} path={path} element={component} />;
}



function App() {
  return (
    <Router>
      <LeagueApp />
    </Router>
  );
}

function LeagueApp() {
  const [leagueData, setLeagueData] = useState<LeagueData[]>([]);
  const [dataFetched, setDataFetched] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let isActive = true;

    const fetchLeagueData = async () => {
      try {
        setLoadingProgress(10);
        const data = await getLeagueData(Current_League_Id);

        if (!isActive) return;

        setLeagueData(data);
        setLoadingProgress(100);
        setDataFetched(true);
      } catch (error) {
        if (!isActive) return;

        console.error('Error fetching league data:', error);
        setLoadError(error instanceof Error ? error : new Error('Unknown error while loading league data.'));
      }
    };

    fetchLeagueData();
    return () => {
      isActive = false;
    };
  }, [retryCount]);

  if (!dataFetched) {
    if (loadError) {
      return (
        <div className="container py-5" role="alert">
          <h1>Unable to load league data</h1>
          <p>{loadError.message}</p>
          <button
            className="btn btn-primary"
            onClick={() => {
              setLoadError(null);
              setLoadingProgress(0);
              setRetryCount((count) => count + 1);
            }}
          >
            Try again
          </button>
        </div>
      );
    }

    return <LoadingScreen progress={loadingProgress} />;
  }

  return (
    <div className="App">
      <WebsiteNavBar data={leagueData} />
      <div className="App-content">
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
          {/*Begin Year Tools*/}
          <Route path="/begin-year-tools/side-bet-selection" element={<SideBetSelection />} />
          <Route path="/begin-year-tools/super-smash-bros" element={<SuperSmashBros />} />
          <Route path="/begin-year-tools/post-draft-rankings" element={<PostDraftRankings />} />
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
              {generateYearRoute(leagueYear, '/money-calculator', <MoneyCalculator data={leagueYear} />)}
            </React.Fragment>
          ))}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
