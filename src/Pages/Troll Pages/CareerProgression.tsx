import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import LeagueData from '../../Interfaces/LeagueData';
import SleeperUser from '../../Interfaces/SleeperUser';
import TrollNavBar from '../../Navigation/TrollNavBar';
import yearTrollData from '../../Data/yearTrollData.json';
import { getUserSeasonPlace } from '../League Pages/OtherStats/PlaceStats';
import '../../Stylesheets/Troll Stylesheets/TrollHome.css';

interface CareerProgressionProps {
  userId: string;
  userName: string;
  leagueData: LeagueData[];
}

const CareerProgression: React.FC<CareerProgressionProps> = ({ userId, userName, leagueData }) => {
  const stats = useMemo(() => {
    // Build win percentage over time chart data (regular season only, continuous across all seasons)
    const winPercentageOverTime: { week: number; winPct: number; season: string; record: string }[] = [];
    
    // Build average place over time chart data (one data point per season)
    const averagePlaceOverTime: { season: string; avgSeasonPlace: number; avgFinalPlace: number; seasonPlace: number; finalPlace: number }[] = [];
    
    // Sort leagues by season to ensure chronological order
    const sortedLeagues = [...leagueData].sort((a, b) => parseInt(a.season) - parseInt(b.season));
    
    let overallWins = 0;
    let overallGames = 0;
    let overallWeekCounter = 0;
    let cumulativeSeasonPlace = 0;
    let cumulativeFinalPlace = 0;
    let yearCount = 0;
    
    sortedLeagues.forEach((league) => {
      const roster = league.rosters.find((r) => r.owner_id === userId);
      const user = league.users.find((u) => u.user_id === userId);
      
      if (roster && user) {
        // Get season place (regular season)
        const seasonPlace = getUserSeasonPlace(userId, league) || 0;
        
        // Get final place (after playoffs) from yearTrollData
        const yearData = yearTrollData.find((yd: any) => yd.year === Number(league.season));
        const playerData = yearData?.data.find((pd: any) => pd.sleeper_id === userId);
        const finalPlace = playerData?.place || 0;
        
        cumulativeSeasonPlace += seasonPlace;
        cumulativeFinalPlace += finalPlace;
        yearCount++;
        
        // Add to average place chart
        averagePlaceOverTime.push({
          season: league.season,
          avgSeasonPlace: Number((cumulativeSeasonPlace / yearCount).toFixed(2)),
          avgFinalPlace: Number((cumulativeFinalPlace / yearCount).toFixed(2)),
          seasonPlace: seasonPlace,
          finalPlace: finalPlace
        });
      }
      
      if (roster && user && league.matchupInfo) {
        const playoffStartWeek = league.settings.playoff_week_start || Infinity;
        
        // Sort matchup info by week
        const sortedMatchupInfo = [...league.matchupInfo].sort((a, b) => a.week - b.week);
        
        // Iterate through each week in regular season order
        sortedMatchupInfo.forEach((info) => {
          if (info.week < playoffStartWeek) {
            // Find this user's matchup for this week
            const userMatchup = info.matchups.find((m: any) => m.roster_id === roster.roster_id);
            
            if (userMatchup) {
              // Find the opponent's matchup in the same matchup_id
              const oppMatchup = info.matchups.find(
                (m: any) => m.matchup_id === userMatchup.matchup_id && m.roster_id !== roster.roster_id
              );
              
              if (oppMatchup) {
                const userPts = userMatchup.points || 0;
                const oppPts = oppMatchup.points || 0;
                
                overallGames++;
                if (userPts > oppPts) {
                  overallWins++;
                }
                
                overallWeekCounter++;
                const winPct = overallGames > 0 ? Math.round((overallWins / overallGames) * 100) : 0;
                const losses = overallGames - overallWins;
                winPercentageOverTime.push({
                  week: overallWeekCounter,
                  winPct: winPct,
                  season: league.season,
                  record: `${overallWins}-${losses}`
                });
              }
            }
          }
        });
      }
    });

    return {
      winPercentageOverTime,
      averagePlaceOverTime
    };
  }, [userId, leagueData]);

  return (
    <div className="troll-home">
      <div className="troll-stats-overview">
        <h2>{userName}'s Career Progression</h2>
      </div>

      {/* Average Placement Over Career Chart */}
      <div className="content-section full-width">
        <h3 className="section-title">Average Placement Over Career</h3>
        <div className="stats-section">
          {stats.averagePlaceOverTime && stats.averagePlaceOverTime.length > 0 ? (
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats.averagePlaceOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                  <XAxis 
                    dataKey="season" 
                    stroke="rgba(255, 255, 255, 0.6)"
                    label={{ value: 'Season', position: 'insideBottomRight', offset: -5 }}
                  />
                  <YAxis 
                    stroke="rgba(255, 255, 255, 0.6)"
                    type="number"
                    domain={[0, 13]}
                    ticks={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]}
                    label={{ value: 'Place', angle: -90, position: 'insideLeft' }}
                    tickFormatter={(value) => {
                      if (value === 0 || value === 13) return '';
                      return String(value);
                    }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'rgba(30, 34, 54, 0.9)',
                      border: '1px solid rgba(96, 165, 250, 0.3)',
                      borderRadius: '8px',
                      padding: '8px 12px'
                    }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div style={{ color: '#fff', fontSize: '12px' }}>
                            <p style={{ margin: '0 0 4px 0', fontWeight: 'bold' }}>
                              {data.season}
                            </p>
                            <p style={{ margin: '0 0 4px 0', color: '#06b6d4' }}>
                              Season Place: {data.seasonPlace}
                            </p>
                            <p style={{ margin: '0 0 4px 0', color: '#fbbf24', fontSize: '11px' }}>
                              Avg Season: {data.avgSeasonPlace.toFixed(2)}
                            </p>
                            <p style={{ margin: '0 0 4px 0', color: '#ec4899' }}>
                              Final Place: {data.finalPlace}
                            </p>
                            <p style={{ margin: '0', color: '#a78bfa', fontSize: '11px' }}>
                              Avg Final: {data.avgFinalPlace.toFixed(2)}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  {/* Cumulative average lines */}
                  <Line 
                    type="monotone" 
                    dataKey="avgSeasonPlace" 
                    stroke="#fbbf24" 
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6 }}
                    name="Avg Season Place (line)"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="avgFinalPlace" 
                    stroke="#a78bfa" 
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6 }}
                    name="Avg Final Place (line)"
                  />
                  {/* Individual year placements as dots */}
                  <Line 
                    type="monotone" 
                    dataKey="seasonPlace" 
                    stroke="#06b6d4"
                    strokeOpacity={0}
                    dot={{ fill: '#06b6d4', r: 5, fillOpacity: 0.7 }}
                    name="Season Place (dots)"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="finalPlace" 
                    stroke="#ec4899"
                    strokeOpacity={0}
                    dot={{ fill: '#ec4899', r: 5, fillOpacity: 0.7 }}
                    name="Final Place (dots)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="no-data-message">No placement data available</div>
          )}
        </div>
      </div>

      {/* Win Percentage Over Time Chart */}
      <div className="content-section full-width">
        <h3 className="section-title">Regular Season Win % Over Time</h3>
        <div className="stats-section">
          {stats.winPercentageOverTime && stats.winPercentageOverTime.length > 0 ? (
            <div className="chart-container">
              {(() => {
                const maxWinPct = Math.max(...stats.winPercentageOverTime.map(d => d.winPct), 100);
                const totalWeeks = stats.winPercentageOverTime.length;
                const interval = Math.ceil(totalWeeks / 10) - 1;
                return (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={stats.winPercentageOverTime}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                      <XAxis 
                        dataKey="week" 
                        stroke="rgba(255, 255, 255, 0.6)"
                        label={{ value: 'Week', position: 'insideBottomRight', offset: -5 }}
                        interval={interval}
                      />
                      <YAxis 
                        stroke="rgba(255, 255, 255, 0.6)"
                        domain={[0, maxWinPct]}
                        label={{ value: 'Win %', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'rgba(30, 34, 54, 0.9)',
                          border: '1px solid rgba(96, 165, 250, 0.3)',
                          borderRadius: '8px',
                          padding: '8px 12px'
                        }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div style={{ color: '#60a5fa' }}>
                                <p style={{ margin: '0 0 4px 0', fontSize: '12px' }}>
                                  Week {data.week}
                                </p>
                                <p style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 'bold' }}>
                                  {data.winPct}%
                                </p>
                                <p style={{ margin: '0', fontSize: '12px', color: '#a0a0a0' }}>
                                  Record: {data.record}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="winPct" 
                        stroke="#60a5fa" 
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                );
              })()}
            </div>
          ) : (
            <div className="no-data-message">No regular season data available</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CareerProgression;
