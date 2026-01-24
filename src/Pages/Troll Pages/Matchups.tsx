import React, { useMemo, useState } from 'react';
import LeagueData from '../../Interfaces/LeagueData';
import SleeperUser from '../../Interfaces/SleeperUser';
import MatchupDisplay from '../../Components/MatchupDisplay';
import '../../Stylesheets/Troll Stylesheets/Matchups.css';

interface TrollMatchupsProps {
  userId: string;
  userName: string;
  leagueData: LeagueData[];
}

interface MatchupStats {
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  avgDifferential: number;
}

interface WeeklyMatchup {
  season: string;
  week: number;
  userPoints: number;
  opponentPoints: number;
  result: 'W' | 'L' | 'T';
}

const TrollMatchups: React.FC<TrollMatchupsProps> = ({ userId, userName, leagueData }) => {
  const [selectedOpponentId, setSelectedOpponentId] = useState<string | null>(null);
  const [selectedMatchup, setSelectedMatchup] = useState<{ season: string; week: number } | null>(null);

  // Get all unique troll IDs and names
  const trolls = useMemo(() => {
    const trollMap = new Map<string, string>();
    leagueData.forEach((league) => {
      league.users.forEach((user) => {
        if (user.user_id !== userId) {
          trollMap.set(user.user_id, user.metadata?.team_name || user.display_name || user.user_id);
        }
      });
    });
    return Array.from(trollMap.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [userId, leagueData]);

  // Calculate head-to-head stats and weekly matchups against selected opponent
  const { h2hStats, weeklyMatchups, playoffH2hStats, playoffWeeklyMatchups } = useMemo(() => {
    if (!selectedOpponentId) return { h2hStats: null, weeklyMatchups: [], playoffH2hStats: null, playoffWeeklyMatchups: [] };

    const stats: MatchupStats = {
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      avgDifferential: 0,
    };
    const playoffStats: MatchupStats = {
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      avgDifferential: 0,
    };
    const weekly: WeeklyMatchup[] = [];
    const playoffWeekly: WeeklyMatchup[] = [];

    leagueData.forEach((league) => {
      const userRoster = league.rosters.find((r) => r.owner_id === userId);
      const opponentRoster = league.rosters.find((r) => r.owner_id === selectedOpponentId);
      const userUser = league.users.find((u) => u.user_id === userId);
      const playoffStartWeek = league.settings.playoff_week_start || Infinity;

      if (userRoster && opponentRoster && league.matchupInfo && userUser) {
        // Find matchups where both players are in same week
        const matchupsByWeek: { [key: number]: any[] } = {};
        league.matchupInfo.forEach((info) => {
          if (!matchupsByWeek[info.week]) {
            matchupsByWeek[info.week] = [];
          }
          matchupsByWeek[info.week].push(...info.matchups);
        });

        // Check each week's matchups
        Object.entries(matchupsByWeek).forEach(([weekStr, weekMatchups]) => {
          const week = Number(weekStr);
          const userMatchup = weekMatchups.find((m: any) => m.roster_id === userRoster.roster_id);
          const opponentMatchup = weekMatchups.find(
            (m: any) => m.roster_id === opponentRoster.roster_id && m.matchup_id === userMatchup?.matchup_id
          );

          if (userMatchup && opponentMatchup) {
            const userPoints = userMatchup.points || 0;
            const oppPoints = opponentMatchup.points || 0;
            const isPlayoff = week >= playoffStartWeek;
            const currentStats = isPlayoff ? playoffStats : stats;
            const currentWeekly = isPlayoff ? playoffWeekly : weekly;

            currentStats.pointsFor += userPoints;
            currentStats.pointsAgainst += oppPoints;

            let result: 'W' | 'L' | 'T' = 'T';
            if (userPoints > oppPoints) {
              currentStats.wins++;
              result = 'W';
            } else if (userPoints < oppPoints) {
              currentStats.losses++;
              result = 'L';
            }

            currentWeekly.push({
              season: league.season,
              week,
              userPoints,
              opponentPoints: oppPoints,
              result,
            });
          }
        });
      }
    });

    // Calculate average differentials
    if (stats.wins + stats.losses > 0) {
      stats.avgDifferential = (stats.pointsFor - stats.pointsAgainst) / (stats.wins + stats.losses);
    }
    if (playoffStats.wins + playoffStats.losses > 0) {
      playoffStats.avgDifferential = (playoffStats.pointsFor - playoffStats.pointsAgainst) / (playoffStats.wins + playoffStats.losses);
    }

    return { h2hStats: stats, weeklyMatchups: weekly, playoffH2hStats: playoffStats, playoffWeeklyMatchups: playoffWeekly };
  }, [userId, selectedOpponentId, leagueData]);

  const opponentName = selectedOpponentId
    ? trolls.find((t) => t[0] === selectedOpponentId)?.[1] || 'Unknown'
    : 'Select an opponent';

  // Get selected matchup data for MatchupDisplay
  const displayMatchupData = useMemo(() => {
    if (!selectedMatchup || !selectedOpponentId) return null;

    const league = leagueData.find((l) => l.season === selectedMatchup.season);
    const userUser = league?.users.find((u) => u.user_id === userId);
    const opponentUser = league?.users.find((u) => u.user_id === selectedOpponentId);

    if (!league || !userUser || !opponentUser) return null;

    return {
      league,
      user1: userUser as SleeperUser,
      user2: opponentUser as SleeperUser,
    };
  }, [selectedMatchup, selectedOpponentId, userId, leagueData]);

  return (
    <div className="troll-matchups">
      <h2>{userName} vs. Head-to-Head</h2>

      <div className="opponent-selector">
        <label htmlFor="opponent-dropdown">Select Opponent:</label>
        <select
          id="opponent-dropdown"
          className="form-select"
          value={selectedOpponentId || ''}
          onChange={(e) => {
            setSelectedOpponentId(e.target.value || null);
            setSelectedMatchup(null);
          }}
        >
          <option value="">-- Choose an opponent --</option>
          {trolls.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {h2hStats && selectedOpponentId && (
        <div className="h2h-stats">
          <div className="h2h-header">
            <h3>{userName} vs. {opponentName}</h3>
          </div>

          <div className="h2h-card-container">
            <div className="h2h-card">
              <h4>Record</h4>
              <p className="big-stat">
                {h2hStats.wins}-{h2hStats.losses}
              </p>
              <p className="win-pct">
                ({((h2hStats.wins / (h2hStats.wins + h2hStats.losses)) * 100 || 0).toFixed(1)}%)
              </p>
            </div>

            <div className="h2h-card">
              <h4>Points For</h4>
              <p className="big-stat">{h2hStats.pointsFor.toFixed(2)}</p>
              <p className="avg-ppg">
                Avg: {((h2hStats.pointsFor / (h2hStats.wins + h2hStats.losses)) || 0).toFixed(2)}
              </p>
            </div>

            <div className="h2h-card">
              <h4>Points Against</h4>
              <p className="big-stat">{h2hStats.pointsAgainst.toFixed(2)}</p>
              <p className="avg-ppg">
                Avg: {((h2hStats.pointsAgainst / (h2hStats.wins + h2hStats.losses)) || 0).toFixed(2)}
              </p>
            </div>

            <div className="h2h-card">
              <h4>Point Differential</h4>
              <p className="big-stat">
                {(h2hStats.pointsFor - h2hStats.pointsAgainst).toFixed(2)}
              </p>
              <p className="avg-ppg">
                Avg: {h2hStats.avgDifferential.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Regular Season Weekly Matchups Table */}
          {weeklyMatchups.length > 0 && (
            <div className="weekly-matchups">
              <h4>Regular Season Week-by-Week Matchups</h4>
              <table className="matchups-table">
                <thead>
                  <tr>
                    <th>Season</th>
                    <th>Week</th>
                    <th>{userName}</th>
                    <th>vs.</th>
                    <th>{opponentName}</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyMatchups.map((matchup, idx) => (
                    <tr
                      key={idx}
                      className={`matchup-row ${selectedMatchup?.season === matchup.season && selectedMatchup?.week === matchup.week ? 'selected' : ''}`}
                      onClick={() => setSelectedMatchup({ season: matchup.season, week: matchup.week })}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>{matchup.season}</td>
                      <td>{matchup.week}</td>
                      <td>{matchup.userPoints.toFixed(2)}</td>
                      <td>vs</td>
                      <td>{matchup.opponentPoints.toFixed(2)}</td>
                      <td className={`result-${matchup.result.toLowerCase()}`}>{matchup.result}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Matchup Display */}
          {selectedMatchup && displayMatchupData && (
            <div className="matchup-display-section">
              <h4>Matchup Details</h4>
              <MatchupDisplay
                user1={displayMatchupData.user1}
                user2={displayMatchupData.user2}
                data={displayMatchupData.league}
                week={selectedMatchup.week}
                title={`${displayMatchupData.user1.metadata.team_name} vs ${displayMatchupData.user2.metadata.team_name} - Week ${selectedMatchup.week}`}
              />
            </div>
          )}
        </div>
      )}

      {/* Playoff Stats Section */}
      {playoffH2hStats && selectedOpponentId && (
        <div className="h2h-stats playoff-stats">
          <div className="h2h-header">
            <h3 className="playoff-header">{userName} vs. {opponentName} - Playoffs</h3>
          </div>

          {playoffWeeklyMatchups.length > 0 ? (
            <>
              <div className="h2h-card-container">
                <div className="h2h-card">
                  <h4>Record</h4>
                  <p className="big-stat">
                    {playoffH2hStats.wins}-{playoffH2hStats.losses}
                  </p>
                  <p className="win-pct">
                    ({((playoffH2hStats.wins / (playoffH2hStats.wins + playoffH2hStats.losses)) * 100 || 0).toFixed(1)}%)
                  </p>
                </div>

                <div className="h2h-card">
                  <h4>Points For</h4>
                  <p className="big-stat">{playoffH2hStats.pointsFor.toFixed(2)}</p>
                  <p className="avg-ppg">
                    Avg: {((playoffH2hStats.pointsFor / (playoffH2hStats.wins + playoffH2hStats.losses)) || 0).toFixed(2)}
                  </p>
                </div>

                <div className="h2h-card">
                  <h4>Points Against</h4>
                  <p className="big-stat">{playoffH2hStats.pointsAgainst.toFixed(2)}</p>
                  <p className="avg-ppg">
                    Avg: {((playoffH2hStats.pointsAgainst / (playoffH2hStats.wins + playoffH2hStats.losses)) || 0).toFixed(2)}
                  </p>
                </div>

                <div className="h2h-card">
                  <h4>Point Differential</h4>
                  <p className="big-stat">
                    {(playoffH2hStats.pointsFor - playoffH2hStats.pointsAgainst).toFixed(2)}
                  </p>
                  <p className="avg-ppg">
                    Avg: {playoffH2hStats.avgDifferential.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Playoff Weekly Matchups Table */}
              <div className="weekly-matchups">
                <h4>Playoff Week-by-Week Matchups</h4>
                <table className="matchups-table">
                  <thead>
                    <tr>
                      <th>Season</th>
                      <th>Week</th>
                      <th>{userName}</th>
                      <th>vs.</th>
                      <th>{opponentName}</th>
                      <th>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {playoffWeeklyMatchups.map((matchup, idx) => (
                      <tr
                        key={idx}
                        className={`matchup-row ${selectedMatchup?.season === matchup.season && selectedMatchup?.week === matchup.week ? 'selected' : ''}`}
                        onClick={() => setSelectedMatchup({ season: matchup.season, week: matchup.week })}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>{matchup.season}</td>
                        <td>{matchup.week}</td>
                        <td>{matchup.userPoints.toFixed(2)}</td>
                        <td>vs</td>
                        <td>{matchup.opponentPoints.toFixed(2)}</td>
                        <td className={`result-${matchup.result.toLowerCase()}`}>{matchup.result}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="no-playoff-matchups">
              <p>{userName} and {opponentName} have never played each other in the playoffs.</p>
            </div>
          )}
        </div>
      )}

      {!selectedOpponentId && (
        <div className="no-selection">
          <p>Select an opponent to view head-to-head statistics</p>
        </div>
      )}
    </div>
  );
};

export default TrollMatchups;
