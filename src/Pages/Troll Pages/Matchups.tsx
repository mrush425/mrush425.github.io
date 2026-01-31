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

  // Auto-select first opponent on mount
  React.useEffect(() => {
    if (trolls.length > 0 && !selectedOpponentId) {
      setSelectedOpponentId(trolls[0][0]);
    }
  }, [trolls, selectedOpponentId]);

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

  // Calculate overall averages for user and opponent
  const { userOverallAvg, opponentOverallAvg } = useMemo(() => {
    if (!selectedOpponentId) return { userOverallAvg: 0, opponentOverallAvg: 0 };

    let userTotalPoints = 0;
    let userTotalGames = 0;
    let opponentTotalPoints = 0;
    let opponentTotalGames = 0;

    leagueData.forEach((league) => {
      const userRoster = league.rosters.find((r) => r.owner_id === userId);
      const opponentRoster = league.rosters.find((r) => r.owner_id === selectedOpponentId);

      if (league.matchupInfo) {
        league.matchupInfo.forEach((info) => {
          const userMatchup = info.matchups.find((m: any) => m.roster_id === userRoster?.roster_id);
          const opponentMatchup = info.matchups.find((m: any) => m.roster_id === opponentRoster?.roster_id);

          if (userMatchup) {
            userTotalPoints += userMatchup.points || 0;
            userTotalGames++;
          }
          if (opponentMatchup) {
            opponentTotalPoints += opponentMatchup.points || 0;
            opponentTotalGames++;
          }
        });
      }
    });

    return {
      userOverallAvg: userTotalGames > 0 ? userTotalPoints / userTotalGames : 0,
      opponentOverallAvg: opponentTotalGames > 0 ? opponentTotalPoints / opponentTotalGames : 0,
    };
  }, [userId, selectedOpponentId, leagueData]);

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
      <div className="opponent-selector-top">
        <h2 className="matchup-heading">
          {userName} vs.
          <select
            className="inline-opponent-selector"
            value={selectedOpponentId || ''}
            onChange={(e) => {
              setSelectedOpponentId(e.target.value || null);
              setSelectedMatchup(null);
            }}
          >
            <option value="" hidden>Choose Opponent</option>
            {trolls.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </h2>
      </div>

      {h2hStats && selectedOpponentId && (
        <div className="h2h-stats">
          <div className="h2h-header">
          </div>

              {(() => {
                const winRate = ((h2hStats.wins / (h2hStats.wins + h2hStats.losses)) * 100 || 0);
                const pointDiff = h2hStats.pointsFor - h2hStats.pointsAgainst;
                const maxPoints = Math.max(h2hStats.pointsFor, h2hStats.pointsAgainst, 1);
                const forPct = (h2hStats.pointsFor / maxPoints) * 100;
                const againstPct = (h2hStats.pointsAgainst / maxPoints) * 100;
                const userH2HAvg = (h2hStats.pointsFor / (h2hStats.wins + h2hStats.losses)) || 0;
                const opponentH2HAvg = (h2hStats.pointsAgainst / (h2hStats.wins + h2hStats.losses)) || 0;
                const circumference = 2 * Math.PI * 60;
                const winDashArray = `${(winRate / 100) * circumference} ${circumference}`;

                return (
                  <>
                    <div className="h2h-stats-strip">
                      <div className="win-rate-bar">
                        <div className="win-rate-record">{h2hStats.wins}-{h2hStats.losses}</div>
                        <div className="win-rate-label">Win Percentage</div>
                        <div className="win-rate-track">
                          <div className="win-rate-midline" />
                          <div className="win-rate-fill" style={{ width: `${winRate}%` }}>
                            <span className="win-rate-value">{winRate.toFixed(1)}%</span>
                          </div>
                        </div>
                        <div className="win-rate-markers">
                          <span>0%</span>
                          <span>50%</span>
                          <span>100%</span>
                        </div>
                      </div>
                    </div>

                    <div className="h2h-points-compare">
                      <div className="points-compare-header">
                        <span>Points For vs Against</span>
                        <span className={`point-diff-badge ${pointDiff >= 0 ? 'positive' : 'negative'}`}>
                          {pointDiff >= 0 ? '+' : ''}{pointDiff.toFixed(2)} Diff
                        </span>
                      </div>
                      <div className="points-compare-bars">
                        <div className="points-compare-row">
                          <span className="points-compare-label">{userName}</span>
                          <div className="points-compare-track">
                            <div className="points-compare-fill for" style={{ width: `${forPct}%` }}>
                              <span className="points-compare-value">{h2hStats.pointsFor.toFixed(2)}</span>
                            </div>
                          </div>
                          <span className="points-compare-sub">
                            H2H Avg: <span style={{ color: userH2HAvg > userOverallAvg ? '#4ade80' : userH2HAvg < userOverallAvg ? '#ef4444' : 'inherit' }}>{userH2HAvg.toFixed(2)}</span> | Overall: {userOverallAvg.toFixed(2)}
                          </span>
                        </div>
                        <div className="points-compare-row">
                          <span className="points-compare-label">{opponentName}</span>
                          <div className="points-compare-track">
                            <div className="points-compare-fill against" style={{ width: `${againstPct}%` }}>
                              <span className="points-compare-value">{h2hStats.pointsAgainst.toFixed(2)}</span>
                            </div>
                          </div>
                          <span className="points-compare-sub">
                            H2H Avg: <span style={{ color: opponentH2HAvg < opponentOverallAvg ? '#4ade80' : opponentH2HAvg > opponentOverallAvg ? '#ef4444' : 'inherit' }}>{opponentH2HAvg.toFixed(2)}</span> | Overall: {opponentOverallAvg.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}

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
                        <React.Fragment key={idx}>
                          <tr
                            className={`matchup-row ${selectedMatchup?.season === matchup.season && selectedMatchup?.week === matchup.week ? 'selected' : ''}`}
                            onClick={() =>
                              setSelectedMatchup((prev) =>
                                prev?.season === matchup.season && prev?.week === matchup.week
                                  ? null
                                  : { season: matchup.season, week: matchup.week }
                              )
                            }
                            style={{ cursor: 'pointer' }}
                          >
                            <td>{matchup.season}</td>
                            <td>{matchup.week}</td>
                            <td>{matchup.userPoints.toFixed(2)}</td>
                            <td>vs</td>
                            <td>{matchup.opponentPoints.toFixed(2)}</td>
                            <td className={`result-${matchup.result.toLowerCase()}`}>{matchup.result}</td>
                          </tr>
                          {selectedMatchup?.season === matchup.season &&
                            selectedMatchup?.week === matchup.week &&
                            displayMatchupData && (
                              <tr className="matchup-detail-row">
                                <td colSpan={6}>
                                  <div className="matchup-detail-content">
                                    <MatchupDisplay
                                      user1={displayMatchupData.user1}
                                      user2={displayMatchupData.user2}
                                      data={displayMatchupData.league}
                                      week={selectedMatchup.week}
                                      title={`${displayMatchupData.user1.metadata.team_name} vs ${displayMatchupData.user2.metadata.team_name} - Week ${selectedMatchup.week}`}
                                    />
                                  </div>
                                </td>
                              </tr>
                            )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
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
              {(() => {
                const winRate = ((playoffH2hStats.wins / (playoffH2hStats.wins + playoffH2hStats.losses)) * 100 || 0);
                const pointDiff = playoffH2hStats.pointsFor - playoffH2hStats.pointsAgainst;
                const maxPoints = Math.max(playoffH2hStats.pointsFor, playoffH2hStats.pointsAgainst, 1);
                const forPct = (playoffH2hStats.pointsFor / maxPoints) * 100;
                const againstPct = (playoffH2hStats.pointsAgainst / maxPoints) * 100;
                const userH2HAvg = (playoffH2hStats.pointsFor / (playoffH2hStats.wins + playoffH2hStats.losses)) || 0;
                const opponentH2HAvg = (playoffH2hStats.pointsAgainst / (playoffH2hStats.wins + playoffH2hStats.losses)) || 0;
                const circumference = 2 * Math.PI * 60;
                const winDashArray = `${(winRate / 100) * circumference} ${circumference}`;

                return (
                  <>
                    <div className="h2h-stats-strip playoff">
                      <div className="win-rate-bar">
                        <div className="win-rate-record">{playoffH2hStats.wins}-{playoffH2hStats.losses}</div>
                        <div className="win-rate-label">Win Percentage</div>
                        <div className="win-rate-track">
                          <div className="win-rate-midline" />
                          <div className="win-rate-fill playoff" style={{ width: `${winRate}%` }}>
                            <span className="win-rate-value">{winRate.toFixed(1)}%</span>
                          </div>
                        </div>
                        <div className="win-rate-markers">
                          <span>0%</span>
                          <span>50%</span>
                          <span>100%</span>
                        </div>
                      </div>
                    </div>

                    <div className="h2h-points-compare playoff">
                      <div className="points-compare-header">
                        <span>Points For vs Against</span>
                        <span className={`point-diff-badge ${pointDiff >= 0 ? 'positive' : 'negative'}`}>
                          {pointDiff >= 0 ? '+' : ''}{pointDiff.toFixed(2)} Diff
                        </span>
                      </div>
                      <div className="points-compare-bars">
                        <div className="points-compare-row">
                          <span className="points-compare-label">{userName}</span>
                          <div className="points-compare-track">
                            <div className="points-compare-fill for" style={{ width: `${forPct}%` }}>
                              <span className="points-compare-value">{playoffH2hStats.pointsFor.toFixed(2)}</span>
                            </div>
                          </div>
                          <span className="points-compare-sub">
                            H2H Avg: <span style={{ color: userH2HAvg > userOverallAvg ? '#4ade80' : userH2HAvg < userOverallAvg ? '#ef4444' : 'inherit' }}>{userH2HAvg.toFixed(2)}</span> | Overall: {userOverallAvg.toFixed(2)}
                          </span>
                        </div>
                        <div className="points-compare-row">
                          <span className="points-compare-label">{opponentName}</span>
                          <div className="points-compare-track">
                            <div className="points-compare-fill against" style={{ width: `${againstPct}%` }}>
                              <span className="points-compare-value">{playoffH2hStats.pointsAgainst.toFixed(2)}</span>
                            </div>
                          </div>
                          <span className="points-compare-sub">
                            H2H Avg: <span style={{ color: opponentH2HAvg < opponentOverallAvg ? '#4ade80' : opponentH2HAvg > opponentOverallAvg ? '#ef4444' : 'inherit' }}>{opponentH2HAvg.toFixed(2)}</span> | Overall: {opponentOverallAvg.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}

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
                      <React.Fragment key={idx}>
                        <tr
                          className={`matchup-row ${selectedMatchup?.season === matchup.season && selectedMatchup?.week === matchup.week ? 'selected' : ''}`}
                          onClick={() =>
                            setSelectedMatchup((prev) =>
                              prev?.season === matchup.season && prev?.week === matchup.week
                                ? null
                                : { season: matchup.season, week: matchup.week }
                            )
                          }
                          style={{ cursor: 'pointer' }}
                        >
                          <td>{matchup.season}</td>
                          <td>{matchup.week}</td>
                          <td>{matchup.userPoints.toFixed(2)}</td>
                          <td>vs</td>
                          <td>{matchup.opponentPoints.toFixed(2)}</td>
                          <td className={`result-${matchup.result.toLowerCase()}`}>{matchup.result}</td>
                        </tr>
                        {selectedMatchup?.season === matchup.season &&
                          selectedMatchup?.week === matchup.week &&
                          displayMatchupData && (
                            <tr className="matchup-detail-row playoff">
                              <td colSpan={6}>
                                <div className="matchup-detail-content">
                                  <MatchupDisplay
                                    user1={displayMatchupData.user1}
                                    user2={displayMatchupData.user2}
                                    data={displayMatchupData.league}
                                    week={selectedMatchup.week}
                                    title={`${displayMatchupData.user1.metadata.team_name} vs ${displayMatchupData.user2.metadata.team_name} - Week ${selectedMatchup.week}`}
                                  />
                                </div>
                              </td>
                            </tr>
                          )}
                      </React.Fragment>
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
