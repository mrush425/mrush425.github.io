import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import LeagueData from '../../Interfaces/LeagueData';
import SleeperUser from '../../Interfaces/SleeperUser';
import TrollNavBar from '../../Navigation/TrollNavBar';
import yearTrollData from '../../Data/yearTrollData.json';
import yearData from '../../Data/yearData.json';
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
    
    // Build points over time chart data (average points for/against, continuous across all seasons)
    const pointsOverTime: { week: number; avgPointsFor: number; avgPointsAgainst: number; season: string }[] = [];
    
    // Build money over time chart data (cumulative profit/loss)
    const moneyOverTime: { season: string; netMoney: number }[] = [];
    
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
    let totalPointsFor = 0;
    let totalPointsAgainst = 0;
    let cumulativeMoney = 0;
    
    sortedLeagues.forEach((league) => {
      const roster = league.rosters.find((r) => r.owner_id === userId);
      const user = league.users.find((u) => u.user_id === userId);
      
      if (roster && user) {
        // Get season place (regular season)
        const seasonPlace = getUserSeasonPlace(userId, league) || 0;
        
        // Get final place (after playoffs) from yearTrollData
        const yearDataEntry = yearTrollData.find((yd: any) => yd.year === Number(league.season));
        const playerData = yearDataEntry?.data.find((pd: any) => pd.sleeper_id === userId);
        const finalPlace = playerData?.place || 0;
        const moneyEarned = Number(playerData?.money_earned || 0);
        
        // Get buy-in info from yearData (same for all players in the year)
        const seasonData = yearData.find((yd: any) => yd.year === Number(league.season));
        const firstEntry = seasonData?.data?.[0];
        const buyIn = Number(firstEntry?.buy_in || 0);
        const sideBetBuyIn = Number(firstEntry?.side_bet_buy_in || 0);
        const totalBuyIn = buyIn + sideBetBuyIn;
        
        // Calculate net money for this season
        cumulativeMoney += moneyEarned - totalBuyIn;
        
        // Add to money over time chart (once per season)
        moneyOverTime.push({
          season: league.season,
          netMoney: cumulativeMoney
        });
        
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
                totalPointsFor += userPts;
                totalPointsAgainst += oppPts;
                
                if (userPts > oppPts) {
                  overallWins++;
                }
                
                overallWeekCounter++;
                const winPct = overallGames > 0 ? Math.round((overallWins / overallGames) * 100) : 0;
                const losses = overallGames - overallWins;
                const avgPointsFor = overallGames > 0 ? Number((totalPointsFor / overallGames).toFixed(2)) : 0;
                const avgPointsAgainst = overallGames > 0 ? Number((totalPointsAgainst / overallGames).toFixed(2)) : 0;
                
                winPercentageOverTime.push({
                  week: overallWeekCounter,
                  winPct: winPct,
                  season: league.season,
                  record: `${overallWins}-${losses}`
                });
                
                pointsOverTime.push({
                  week: overallWeekCounter,
                  avgPointsFor: avgPointsFor,
                  avgPointsAgainst: avgPointsAgainst,
                  season: league.season
                });
              }
            }
          }
        });
      }
    });

    return {
      winPercentageOverTime,
      pointsOverTime,
      moneyOverTime,
      averagePlaceOverTime
    };
  }, [userId, leagueData]);

  return (
    <div className="troll-home">
      <div className="troll-stats-overview">
        <h2>{userName}'s Career Progression</h2>
      </div>

      {/* Average Placement Over Career Chart */}
      <div className="content-section full-width" style={{ marginBottom: '0px' }}>
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
                    padding={{ left: 30, right: 30 }}
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

      {/* Money Over Time Chart */}
      <div className="content-section full-width" style={{ marginBottom: '0px' }}>
        <h3 className="section-title">Net Profit/Loss Over Time</h3>
        <div className="stats-section">
          {stats.moneyOverTime && stats.moneyOverTime.length > 0 ? (
            <div className="chart-container">
              {(() => {
                const allMoney = stats.moneyOverTime.map(d => d.netMoney);
                const minMoney = Math.min(...allMoney);
                const maxMoney = Math.max(...allMoney);
                const range = Math.abs(maxMoney - minMoney);
                const padding = Math.max(range * 0.15, 50);
                
                const minY = minMoney - padding;
                const maxY = maxMoney + padding;
                
                // Generate nice round ticks that include 0
                const generateNiceTicks = () => {
                  const totalRange = maxY - minY;
                  // Determine step size (25, 50, 100, 200, 500, etc.)
                  const rawStep = totalRange / 8;
                  let step = 25;
                  if (rawStep > 500) step = 500;
                  else if (rawStep > 200) step = 200;
                  else if (rawStep > 100) step = 100;
                  else if (rawStep > 50) step = 50;
                  else if (rawStep > 25) step = 25;
                  else if (rawStep > 10) step = 10;
                  else step = 5;
                  
                  const ticks: number[] = [];
                  
                  // Start from 0 and go up
                  for (let i = 0; i <= maxY; i += step) {
                    ticks.push(i);
                  }
                  
                  // Go down from 0
                  for (let i = -step; i >= minY; i -= step) {
                    ticks.unshift(i);
                  }
                  
                  return ticks;
                };
                
                // Create data with separate keys for positive/negative segments
                // Include value in appropriate key based on next point to color line by destination
                const chartData = stats.moneyOverTime.map((d, i) => {
                  const nextData = i < stats.moneyOverTime.length - 1 ? stats.moneyOverTime[i + 1] : null;
                  
                  return {
                    season: d.season,
                    netMoney: d.netMoney,
                    // Include in positive if current OR next is positive (green line to positive destination)
                    netMoneyPositive: (d.netMoney >= 0 || (nextData && nextData.netMoney >= 0)) ? d.netMoney : null,
                    netMoneyNegative: (d.netMoney < 0 || (nextData && nextData.netMoney < 0)) ? d.netMoney : null
                  };
                });
                
                return (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                      <XAxis 
                        dataKey="season" 
                        stroke="rgba(255, 255, 255, 0.6)"
                        label={{ value: 'Season', position: 'insideBottomRight', offset: -5 }}
                        padding={{ left: 30, right: 30 }}
                      />
                      <YAxis 
                        stroke="rgba(255, 255, 255, 0.6)"
                        domain={[minMoney - padding, maxMoney + padding]}
                        label={{ value: 'Net Money ($)', angle: -90, position: 'insideLeft' }}
                        ticks={generateNiceTicks()}
                        tickFormatter={(value) => Math.round(value).toString()}
                      />
                      <ReferenceLine y={0} stroke="rgba(255, 255, 255, 0.5)" strokeDasharray="3 3" />
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
                            const isProfit = data.netMoney >= 0;
                            return (
                              <div style={{ color: '#fff', fontSize: '12px' }}>
                                <p style={{ margin: '0 0 4px 0', fontWeight: 'bold' }}>
                                  {data.season}
                                </p>
                                <p style={{ margin: '0', color: isProfit ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>
                                  {isProfit ? '+' : ''}${data.netMoney.toFixed(2)}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      {/* Green line for positive values */}
                      <Line 
                        type="monotone" 
                        dataKey="netMoneyPositive" 
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={(props: any) => {
                          const { cx, cy, payload } = props;
                          if (payload.netMoneyPositive === null) return <></>;
                          return <circle cx={cx} cy={cy} r={5} fill="#10b981" />;
                        }}
                        activeDot={{ r: 6 }}
                        connectNulls={false}
                        isAnimationActive={false}
                      />
                      {/* Red line for negative values */}
                      <Line 
                        type="monotone" 
                        dataKey="netMoneyNegative" 
                        stroke="#ef4444"
                        strokeWidth={2}
                        dot={(props: any) => {
                          const { cx, cy, payload } = props;
                          if (payload.netMoneyNegative === null) return <></>;
                          return <circle cx={cx} cy={cy} r={5} fill="#ef4444" />;
                        }}
                        activeDot={{ r: 6 }}
                        connectNulls={false}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                );
              })()}
            </div>
          ) : (
            <div className="no-data-message">No money data available</div>
          )}
        </div>
      </div>

      {/* Win Percentage Over Time Chart */}
      <div className="content-section full-width" style={{ marginBottom: '0px' }}>
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
                        padding={{ left: 30, right: 30 }}
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

      {/* Average Points Over Time Chart */}
      <div className="content-section full-width" style={{ marginBottom: '0px' }}>
        <h3 className="section-title">Average Points Over Time</h3>
        <div className="stats-section">
          {stats.pointsOverTime && stats.pointsOverTime.length > 0 ? (
            <div className="chart-container">
              {(() => {
                const totalWeeks = stats.pointsOverTime.length;
                const interval = Math.ceil(totalWeeks / 10) - 1;
                const allPoints = stats.pointsOverTime.flatMap(d => [d.avgPointsFor, d.avgPointsAgainst]);
                const minPoints = Math.min(...allPoints);
                const maxPoints = Math.max(...allPoints);
                return (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={stats.pointsOverTime}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                      <XAxis 
                        dataKey="week" 
                        stroke="rgba(255, 255, 255, 0.6)"
                        label={{ value: 'Week', position: 'insideBottomRight', offset: -5 }}
                        interval={interval}
                        padding={{ left: 30, right: 30 }}
                      />
                      <YAxis 
                        stroke="rgba(255, 255, 255, 0.6)"
                        domain={[minPoints - 10, maxPoints + 10]}
                        label={{ value: 'Points', angle: -90, position: 'insideLeft' }}
                        tickFormatter={(value) => Math.round(value).toString()}
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
                                  Week {data.week}
                                </p>
                                <p style={{ margin: '0 0 4px 0', color: '#10b981' }}>
                                  Avg Points For: {data.avgPointsFor.toFixed(2)}
                                </p>
                                <p style={{ margin: '0', color: '#ef4444' }}>
                                  Avg Points Against: {data.avgPointsAgainst.toFixed(2)}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="avgPointsFor" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 6 }}
                        name="Avg Points For"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="avgPointsAgainst" 
                        stroke="#ef4444" 
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 6 }}
                        name="Avg Points Against"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                );
              })()}
            </div>
          ) : (
            <div className="no-data-message">No points data available</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CareerProgression;
