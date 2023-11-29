// App.tsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CustomNavbar from '../Navigation/Navbar';
import Home from './home';
import About from './About';
import { getLeagueData } from '../SleeperApiMethods';
import { Current_League_Id } from '../Constants';
import LeagueData from "../Interfaces/LeagueData";
import YearData from './Year Pages/YearData';
import DraftHeatMap from './Year Pages/DraftHeatMap'; // Import the DraftHeatMap component
import DraftReportCard from './Year Pages/DraftReportCard';
import ScheduleComparison from './Year Pages/ScheduleComparison';
import OvertimeComparison from './Year Pages/OvertimeComparison';

function App() {
  const [leagueData, setLeagueData] = useState<LeagueData[]>([]);
  const [dataFetched, setDataFetched] = useState(false);


  useEffect(() => {
    // Fetch league data when the component mounts
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
  }, []); // Run this effect only once on mount

  if (!dataFetched) {
    // Render a loading indicator or placeholder while data is being fetched
    return <div>Loading...</div>;
  }

  return (
    <Router>
      <div className="App">
        <CustomNavbar data={leagueData} />
        {dataFetched && (
          <Routes>
            <Route path="/about" element={<About />} />
            <Route path="/" element={<Home />} />
            {/* Add a dynamic route for each season */}
            {leagueData.map((league) => (
              <Route
                key={league.season}
                path={`/season/${league.season}`}
                element={<YearData data={league} />}
              />
            ))}
            {leagueData.map((league) => (
              <Route
                key={league.season}
                path={`/season/${league.season}/schedule-comparison`}
                element={<ScheduleComparison data={league} />}
              />
            ))}
            {leagueData.map((league) => (
              <Route
                key={league.season}
                path={`/season/${league.season}/overtime-comparison`}
                element={<OvertimeComparison data={league} />}
              />
            ))}

            {leagueData.map((league) => (
              <Route
                key={league.season}
                path={`/season/${league.season}/draft-heatmap`}
                element={<DraftHeatMap data={league} />}
              />
            ))}
            {leagueData.map((league) => (
              <Route
                key={league.season}
                path={`/season/${league.season}/draft-report-card`}
                element={<DraftReportCard data={league} />}
              />
            ))}
            {/* Add a catch-all route for unknown routes */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        )}
      </div>
    </Router>
  );
}

export default App;