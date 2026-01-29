import React, { useMemo, useState } from 'react';
import LeagueData from '../../Interfaces/LeagueData';
import SleeperUser from '../../Interfaces/SleeperUser';
import yearTrollData from '../../Data/yearTrollData.json';
import { calculateYearPoints, calculateYearPointsAgainst } from '../../Helper Files/PointCalculations';
import { getUserSeasonPlace } from '../League Pages/OtherStats/PlaceStats';
import { calculatePlayoffRecord, displayRecord } from '../../Helper Files/RecordCalculations';
import { getUserLongestStreak, getCurrentStreak } from '../../Helper Files/StreakMethods';
import { calculateMoneyStats } from '../../Helper Files/MoneyMethods';
import '../../Stylesheets/Troll Stylesheets/TrollHome.css';

interface TrollHomeProps {
  userId: string;
  userName: string;
  leagueData: LeagueData[];
}

interface TrollSeasonRecord {
  season: string;
  wins: number;
  losses: number;
  ties: number;
  fpts: number;
  fptsAgainst: number;
  seasonPlace: number | undefined;
  finalPlace: number | undefined;
}

interface BowlRecord {
  name: string;
  wins: number;
  losses: number;
}

interface OpponentRecord {
  opponentId: string;
  opponentName: string;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
}

const TrollHome: React.FC<TrollHomeProps> = ({ userId, userName, leagueData }) => {
  const [sortColumn, setSortColumn] = useState<string>('season');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [isSeasonBySeasonExpanded, setIsSeasonBySeasonExpanded] = useState(false);
  const [isHeadToHeadExpanded, setIsHeadToHeadExpanded] = useState(false);
  const [sortOpponentColumn, setSortOpponentColumn] = useState<string>('opponent');
  const [sortOpponentDirection, setSortOpponentDirection] = useState<'asc' | 'desc'>('asc');

  const bowlMap: { [key: string]: BowlRecord } = {
    'Troll Bowl': { name: 'Troll Bowl', wins: 0, losses: 0 },
    'Bengal Bowl': { name: 'Bengal Bowl', wins: 0, losses: 0 },
    'Koozie Bowl': { name: 'Koozie Bowl', wins: 0, losses: 0 },
    'Toilet Bowl': { name: 'Toilet Bowl', wins: 0, losses: 0 },
    'Diarrhea Bowl': { name: 'Diarrhea Bowl', wins: 0, losses: 0 },
    'Butler Bowl': { name: 'Butler Bowl', wins: 0, losses: 0 },
  };

  const stats = useMemo(() => {
    const seasonRecords: TrollSeasonRecord[] = [];
    let totalWins = 0;
    let totalLosses = 0;
    let totalTies = 0;
    let totalFpts = 0;
    let totalFptsAgainst = 0;
    let playoffWins = 0;
    let playoffLosses = 0;
    let playoffTies = 0;
    let playoffTotalPoints = 0;
    let playoffTotalPointsAgainst = 0;
    const bowlRecords: { [key: string]: BowlRecord } = JSON.parse(JSON.stringify(bowlMap));
    const opponentRecords: { [key: string]: OpponentRecord } = {};

    leagueData.forEach((league) => {
      const roster = league.rosters.find((r) => r.owner_id === userId);
      const user = league.users.find((u) => u.user_id === userId);
      
      if (roster && user) {
        // Get season place (regular season) from league standings
        const seasonPlace = getUserSeasonPlace(userId, league);
        
        // Get final place (after playoffs) from yearTrollData
        const yearData = yearTrollData.find((yd: any) => yd.year === Number(league.season));
        const playerData = yearData?.data.find((pd: any) => pd.sleeper_id === userId);
        const finalPlace = playerData?.place;

        // Use PointCalculations to get regular season points only
        const yearPoints = calculateYearPoints(user as SleeperUser, league);
        const yearPointsAgainst = calculateYearPointsAgainst(user as SleeperUser, league);

        seasonRecords.push({
          season: league.season,
          wins: roster.settings.wins,
          losses: roster.settings.losses,
          ties: roster.settings.ties || 0,
          fpts: yearPoints,
          fptsAgainst: yearPointsAgainst,
          seasonPlace: seasonPlace,
          finalPlace: finalPlace,
        });
        totalWins += roster.settings.wins;
        totalLosses += roster.settings.losses;
        totalTies += roster.settings.ties || 0;
        totalFpts += yearPoints;
        totalFptsAgainst += yearPointsAgainst;

        // Calculate playoff record for this season
        const [pWins, pLosses, pTies] = calculatePlayoffRecord(user as SleeperUser, league);
        playoffWins += pWins;
        playoffLosses += pLosses;
        playoffTies += pTies;

        // Calculate playoff points and points against
        if (league.matchupInfo) {
          const playoffStartWeek = league.settings.playoff_week_start || Infinity;
          
          league.matchupInfo.forEach((weekInfo) => {
            if (weekInfo.week >= playoffStartWeek) {
              const userMatchup = weekInfo.matchups.find((m: any) => m.roster_id === roster.roster_id);
              if (userMatchup) {
                playoffTotalPoints += userMatchup.points || 0;
                
                // Find opponent's points
                const oppMatchup = weekInfo.matchups.find((m: any) => 
                  m.matchup_id === userMatchup.matchup_id && m.roster_id !== roster.roster_id
                );
                if (oppMatchup) {
                  playoffTotalPointsAgainst += oppMatchup.points || 0;
                }
              }
            }
          });
        }

        // Calculate opponent records (regular season only)
        if (league.matchupInfo) {
          const playoffStartWeek = league.settings.playoff_week_start || Infinity;
          const matchupsByWeek: { [key: number]: any[] } = {};
          league.matchupInfo.forEach((info) => {
            // Only include regular season weeks
            if (info.week < playoffStartWeek) {
              if (!matchupsByWeek[info.week]) {
                matchupsByWeek[info.week] = [];
              }
              matchupsByWeek[info.week].push(...info.matchups);
            }
          });

          Object.values(matchupsByWeek).forEach((weekMatchups) => {
            const userMatchup = weekMatchups.find((m: any) => m.roster_id === roster.roster_id);
            if (userMatchup) {
              // Find the single opponent in this matchup
              const oppMatchup = weekMatchups.find((m: any) => m.matchup_id === userMatchup.matchup_id && m.roster_id !== roster.roster_id);
              
              if (oppMatchup) {
                const oppRoster = league.rosters.find((r) => r.roster_id === oppMatchup.roster_id);
                const oppUser = league.users.find((u) => u.user_id === oppRoster?.owner_id);
                
                if (oppRoster && oppUser) {
                  const oppId = oppRoster.owner_id;
                  if (!opponentRecords[oppId]) {
                    opponentRecords[oppId] = {
                      opponentId: oppId,
                      opponentName: oppUser.metadata?.team_name || oppUser.display_name || oppId,
                      wins: 0,
                      losses: 0,
                      pointsFor: 0,
                      pointsAgainst: 0,
                    };
                  }

                  const userPts = userMatchup.points || 0;
                  const oppPts = oppMatchup.points || 0;
                  opponentRecords[oppId].pointsFor += userPts;
                  opponentRecords[oppId].pointsAgainst += oppPts;

                  if (userPts > oppPts) {
                    opponentRecords[oppId].wins++;
                  } else if (userPts < oppPts) {
                    opponentRecords[oppId].losses++;
                  }
                }
              }
            }
          });
        }

        // Calculate bowl records based on final place (after playoffs)
        if (finalPlace !== undefined) {
          let bowlName = '';
          let isWin = false;

          if (finalPlace === 1 || finalPlace === 2) {
            bowlName = 'Troll Bowl';
            isWin = finalPlace === 1;
          } else if (finalPlace === 3 || finalPlace === 4) {
            bowlName = 'Bengal Bowl';
            isWin = finalPlace === 3;
          } else if (finalPlace === 5 || finalPlace === 6) {
            bowlName = 'Koozie Bowl';
            isWin = finalPlace === 5;
          } else if (finalPlace === 7 || finalPlace === 8) {
            bowlName = 'Toilet Bowl';
            isWin = finalPlace === 7;
          } else if (finalPlace === 9 || finalPlace === 10) {
            bowlName = 'Diarrhea Bowl';
            isWin = finalPlace === 9;
          } else if (finalPlace === 11 || finalPlace === 12) {
            bowlName = 'Butler Bowl';
            isWin = finalPlace === 11;
          }

          if (bowlName && bowlRecords[bowlName]) {
            if (isWin) {
              bowlRecords[bowlName].wins++;
            } else {
              bowlRecords[bowlName].losses++;
            }
          }
        }
      }
    });

    const totalGames = totalWins + totalLosses + totalTies;
    const winPercentage = totalGames > 0 ? ((totalWins / totalGames) * 100).toFixed(1) : '0.0';
    const avgPointsPerGame = totalGames > 0 ? (totalFpts / totalGames).toFixed(2) : '0.00';
    const avgPointsAgainstPerGame = totalGames > 0 ? (totalFptsAgainst / totalGames).toFixed(2) : '0.00';
    
    // Calculate average places
    const seasonPlacesWithValue = seasonRecords.filter(s => s.seasonPlace !== undefined).map(s => s.seasonPlace!);
    const avgSeasonPlace = seasonPlacesWithValue.length > 0 ? (seasonPlacesWithValue.reduce((a, b) => a + b, 0) / seasonPlacesWithValue.length).toFixed(1) : 'N/A';
    
    const finalPlacesWithValue = seasonRecords.filter(s => s.finalPlace !== undefined).map(s => s.finalPlace!);
    const avgFinalPlace = finalPlacesWithValue.length > 0 ? (finalPlacesWithValue.reduce((a, b) => a + b, 0) / finalPlacesWithValue.length).toFixed(1) : 'N/A';
    
    const playoffGames = playoffWins + playoffLosses + playoffTies;
    const playoffWinPercentage = playoffGames > 0 ? ((playoffWins / playoffGames) * 100).toFixed(1) : '0.0';
    const avgPlayoffPoints = playoffGames > 0 ? (playoffTotalPoints / playoffGames).toFixed(2) : '0.00';
    const avgPlayoffPointsAgainst = playoffGames > 0 ? (playoffTotalPointsAgainst / playoffGames).toFixed(2) : '0.00';
    
    const bestSeason =
      seasonRecords.length > 0 ? seasonRecords.reduce((a, b) => (a.fpts > b.fpts ? a : b)) : null;
    const worstSeason =
      seasonRecords.length > 0 ? seasonRecords.reduce((a, b) => (a.fpts < b.fpts ? a : b)) : null;
    const championships = seasonRecords.filter((s) => s.finalPlace === 1).length;
    const butlerCount = seasonRecords.filter((s) => s.finalPlace === 12).length;

    // Calculate streak data
    const longestWinStreaks = getUserLongestStreak(userId, 'win', leagueData);
    const longestLossStreaks = getUserLongestStreak(userId, 'loss', leagueData);
    const currentStreak = getCurrentStreak(userId, leagueData);

    // Calculate money stats
    const moneyStats = calculateMoneyStats(userId, leagueData);

    // Find best opponent matchup (highest win percentage, tiebreaker: most points scored)
    // Only include opponents played 4+ times
    const oppArray = Object.values(opponentRecords).filter((opp) => opp.wins + opp.losses >= 4);
    let bestOpponent: OpponentRecord | null = null;
    if (oppArray.length > 0) {
      bestOpponent = oppArray.reduce((a, b) => {
        const aWinPct = a.wins / (a.wins + a.losses);
        const bWinPct = b.wins / (b.wins + b.losses);
        if (aWinPct !== bWinPct) {
          return aWinPct > bWinPct ? a : b;
        }
        return a.pointsFor > b.pointsFor ? a : b;
      });
    }

    // Find worst opponent matchup (lowest win percentage, tiebreaker: most points scored against the user)
    let worstOpponent: OpponentRecord | null = null;
    if (oppArray.length > 0) {
      worstOpponent = oppArray.reduce((a, b) => {
        const aWinPct = a.wins / (a.wins + a.losses);
        const bWinPct = b.wins / (b.wins + b.losses);
        if (aWinPct !== bWinPct) {
          return aWinPct < bWinPct ? a : b;
        }
        return a.pointsAgainst > b.pointsAgainst ? a : b;
      });
    }

    return {
      totalWins,
      totalLosses,
      totalTies,
      winPercentage,
      totalFpts: totalFpts.toFixed(2),
      totalFptsAgainst: totalFptsAgainst.toFixed(2),
      avgPointsPerGame,
      avgPointsAgainstPerGame,
      avgSeasonPlace,
      avgFinalPlace,
      playoffWins,
      playoffLosses,
      playoffTies,
      playoffRecord: displayRecord(playoffWins, playoffLosses, playoffTies),
      playoffWinPercentage,
      playoffTotalPoints: playoffTotalPoints.toFixed(2),
      playoffTotalPointsAgainst: playoffTotalPointsAgainst.toFixed(2),
      avgPlayoffPoints,
      avgPlayoffPointsAgainst,
      bestSeason,
      worstSeason,
      championships,
      butlerCount,
      yearsPlayed: seasonRecords.length,
      seasonRecords,
      bowlRecords,
      bestOpponent,
      worstOpponent,
      opponentRecords,
      longestWinStreaks,
      longestLossStreaks,
      currentStreak,
      moneyStats,
    };
  }, [userId, leagueData]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const handleOpponentSort = (column: string) => {
    if (sortOpponentColumn === column) {
      setSortOpponentDirection(sortOpponentDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortOpponentColumn(column);
      setSortOpponentDirection('desc');
    }
  };

  const sortedSeasons = useMemo(() => {
    const seasons = [...stats.seasonRecords];
    seasons.sort((a, b) => {
      let aValue: any = '';
      let bValue: any = '';

      switch (sortColumn) {
        case 'season':
          aValue = Number(a.season);
          bValue = Number(b.season);
          break;
        case 'record':
          aValue = a.wins - a.losses;
          bValue = b.wins - b.losses;
          break;
        case 'points':
          aValue = a.fpts / (a.wins + a.losses + a.ties);
          bValue = b.fpts / (b.wins + b.losses + b.ties);
          break;
        case 'seasonPlace':
          aValue = a.seasonPlace !== undefined ? a.seasonPlace : 999;
          bValue = b.seasonPlace !== undefined ? b.seasonPlace : 999;
          break;
        case 'finalPlace':
          aValue = a.finalPlace !== undefined ? a.finalPlace : 999;
          bValue = b.finalPlace !== undefined ? b.finalPlace : 999;
          break;
        default:
          aValue = a.season;
          bValue = b.season;
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    return seasons;
  }, [stats.seasonRecords, sortColumn, sortDirection]);

  const sortedOpponents = useMemo(() => {
    const opponents = Object.values(stats.opponentRecords);
    opponents.sort((a, b) => {
      let aValue: any = '';
      let bValue: any = '';

      switch (sortOpponentColumn) {
        case 'opponent':
          aValue = a.opponentName.toLowerCase();
          bValue = b.opponentName.toLowerCase();
          break;
        case 'record':
          aValue = a.wins / (a.wins + a.losses);
          bValue = b.wins / (b.wins + b.losses);
          break;
        case 'points':
          aValue = a.pointsFor / (a.wins + a.losses);
          bValue = b.pointsFor / (b.wins + b.losses);
          break;
        case 'pointsAgainst':
          aValue = a.pointsAgainst / (a.wins + a.losses);
          bValue = b.pointsAgainst / (b.wins + b.losses);
          break;
        default:
          aValue = a.opponentName.toLowerCase();
          bValue = b.opponentName.toLowerCase();
      }

      if (sortOpponentDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    return opponents;
  }, [stats.opponentRecords, sortOpponentColumn, sortOpponentDirection]);

  return (
    <div className="troll-home">
      <div className="troll-stats-overview">
        <h2>{userName}'s Career Overview</h2>
        
        {/* Career Stats Section */}
        <div className="stats-section">
          <div className="stat-group">
            <div className="stat-item">
              <span className="stat-label">Record</span>
              <span className="stat-value">{stats.totalWins}-{stats.totalLosses}-{stats.totalTies}</span>
              <span className="stat-secondary">({stats.winPercentage}%)</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Total Points</span>
              <span className="stat-value">{stats.avgPointsPerGame}</span>
              <span className="stat-secondary">({stats.totalFpts} total)</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Points Against</span>
              <span className="stat-value">{stats.avgPointsAgainstPerGame}</span>
              <span className="stat-secondary">({stats.totalFptsAgainst} total)</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Avg Reg Place</span>
              <span className="stat-value">{stats.avgSeasonPlace}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Avg Final Place</span>
              <span className="stat-value">{stats.avgFinalPlace}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Championships</span>
              <span className="stat-value">{stats.championships}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Seasons</span>
              <span className="stat-value">{stats.yearsPlayed}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Money Paid In</span>
              <span className="stat-value">${stats.moneyStats.totalMoneyPaidIn}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Money Earned</span>
              <span className="stat-value">${stats.moneyStats.totalMoneyEarned}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Net</span>
              <span className="stat-value" style={{ color: stats.moneyStats.netMoneyEarned >= 0 ? '#4ade80' : '#ef4444' }}>
                {stats.moneyStats.netMoneyEarned >= 0 ? '+' : ''}{stats.moneyStats.netMoneyEarned.toFixed(2)}
              </span>
              <span className="stat-secondary">({(stats.moneyStats.netMoneyEarned / stats.yearsPlayed).toFixed(2)}/year)</span>
            </div>
          </div>
        </div>

        {/* Best & Worst Season Section */}
        {stats.bestSeason && (
          <div className="season-section">
            <div className="season-grid">
              <div className="season-card best">
                <div className="season-badge">Best Season</div>
                <div className="season-year">{stats.bestSeason.season}</div>
                <div className="season-stat-line">
                  <span className="season-stat-label">Record</span>
                  <span className="season-stat-value">{stats.bestSeason.wins}-{stats.bestSeason.losses}-{stats.bestSeason.ties}</span>
                </div>
                <div className="season-stat-line">
                  <span className="season-stat-label">Points</span>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span className="season-stat-value">{(stats.bestSeason.fpts / (stats.bestSeason.wins + stats.bestSeason.losses + stats.bestSeason.ties)).toFixed(2)}</span>
                    <span style={{ fontSize: '12px', color: '#a0a0a0', fontWeight: 500 }}>({stats.bestSeason.fpts.toFixed(2)})</span>
                  </div>
                </div>
                <div className="season-stat-line">
                  <span className="season-stat-label">Place</span>
                  <span className="season-stat-value">{stats.bestSeason.finalPlace !== undefined ? stats.bestSeason.finalPlace : 'N/A'}</span>
                </div>
              </div>
              {stats.worstSeason && (
                <div className="season-card worst">
                  <div className="season-badge">Worst Season</div>
                  <div className="season-year">{stats.worstSeason.season}</div>
                  <div className="season-stat-line">
                    <span className="season-stat-label">Record</span>
                    <span className="season-stat-value">{stats.worstSeason.wins}-{stats.worstSeason.losses}-{stats.worstSeason.ties}</span>
                  </div>
                  <div className="season-stat-line">
                    <span className="season-stat-label">Points</span>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span className="season-stat-value">{(stats.worstSeason.fpts / (stats.worstSeason.wins + stats.worstSeason.losses + stats.worstSeason.ties)).toFixed(2)}</span>
                      <span style={{ fontSize: '12px', color: '#a0a0a0', fontWeight: 500 }}>({stats.worstSeason.fpts.toFixed(2)})</span>
                    </div>
                  </div>
                  <div className="season-stat-line">
                    <span className="season-stat-label">Place</span>
                    <span className="season-stat-value">{stats.worstSeason.finalPlace !== undefined ? stats.worstSeason.finalPlace : 'N/A'}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Streak Section */}
        {(stats.longestWinStreaks.length > 0 || stats.longestLossStreaks.length > 0 || stats.currentStreak) && (
          <div className="streak-section">
            <div className="streak-grid">
              {/* Record Streaks Card */}
              {(stats.longestWinStreaks.length > 0 || stats.longestLossStreaks.length > 0) && (
                <div className="streak-card records">
                  <div className="streak-badge">Record Streaks</div>
                  {stats.longestWinStreaks.length > 0 && (
                    <div className="streak-record-item win">
                      <div className="streak-record-type">Longest Win Streak</div>
                      <div className="streak-record-length">{stats.longestWinStreaks[0].length}</div>
                      {stats.longestWinStreaks.map((streak, idx) => (
                        <div key={idx} className="streak-record-range">
                          {streak.start.label} → {streak.end.label}
                        </div>
                      ))}
                    </div>
                  )}
                  {stats.longestLossStreaks.length > 0 && (
                    <div className="streak-record-item loss">
                      <div className="streak-record-type">Longest Losing Streak</div>
                      <div className="streak-record-length">{stats.longestLossStreaks[0].length}</div>
                      {stats.longestLossStreaks.map((streak, idx) => (
                        <div key={idx} className="streak-record-range">
                          {streak.start.label} → {streak.end.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {/* Current Streak Card */}
              {stats.currentStreak && (
                <div className={`streak-card current ${stats.currentStreak.type}`}>
                  <div className="streak-badge">Current Streak</div>
                  <div className="current-streak-type">
                    {stats.currentStreak.type === 'win' ? 'Winning Streak' : 'Losing Streak'}
                  </div>
                  <div className="current-streak-length">{stats.currentStreak.length}</div>
                  
                  {/* Progress Bar */}
                  <div className="streak-progress-container">
                    <div className="streak-progress-labels">
                      <span className="streak-progress-label">Current</span>
                      <span className="streak-progress-label">Record: {stats.currentStreak.type === 'win' ? (stats.longestWinStreaks[0]?.length || 0) : (stats.longestLossStreaks[0]?.length || 0)}</span>
                    </div>
                    <div className="streak-progress-bar">
                      <div 
                        className="streak-progress-fill" 
                        style={{ 
                          width: `${Math.min(100, (stats.currentStreak.length / (stats.currentStreak.type === 'win' ? (stats.longestWinStreaks[0]?.length || 1) : (stats.longestLossStreaks[0]?.length || 1))) * 100)}%` 
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="current-streak-date">
                    Started: {stats.currentStreak.start.label}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Season-by-Season Collapsible Section */}
        <div className="collapsible-section" style={{ marginTop: '40px' }}>
          <div 
            className="collapsible-header" 
            onClick={() => setIsSeasonBySeasonExpanded(!isSeasonBySeasonExpanded)}
          >
            <h3>Season-by-Season Record</h3>
            <span className="collapse-icon">{isSeasonBySeasonExpanded ? '▼' : '▶'}</span>
          </div>
          {isSeasonBySeasonExpanded && (
            <div className="collapsible-content">
              {stats.seasonRecords.length > 0 && (() => {
                const winPcts = stats.seasonRecords.map(s => s.wins / (s.wins + s.losses + s.ties));
                const ppgs = stats.seasonRecords.map(s => s.fpts / (s.wins + s.losses + s.ties));
                const ppasgs = stats.seasonRecords.map(s => s.fptsAgainst / (s.wins + s.losses + s.ties));
                const seasonPlaces = stats.seasonRecords.filter(s => s.seasonPlace !== undefined).map(s => s.seasonPlace!);
                const finalPlaces = stats.seasonRecords.filter(s => s.finalPlace !== undefined).map(s => s.finalPlace!);
                
                const maxWinPct = Math.max(...winPcts);
                const minWinPct = Math.min(...winPcts);
                const maxPpg = Math.max(...ppgs);
                const minPpg = Math.min(...ppgs);
                const maxPpasg = Math.max(...ppasgs);
                const minPpasg = Math.min(...ppasgs);
                const minSeasonPlace = seasonPlaces.length > 0 ? Math.min(...seasonPlaces) : undefined;
                const maxSeasonPlace = seasonPlaces.length > 0 ? Math.max(...seasonPlaces) : undefined;
                const minFinalPlace = finalPlaces.length > 0 ? Math.min(...finalPlaces) : undefined;
                const maxFinalPlace = finalPlaces.length > 0 ? Math.max(...finalPlaces) : undefined;
                
                return (
                  <table>
                    <thead>
                      <tr>
                        <th onClick={() => handleSort('season')} className={`sortable ${sortColumn === 'season' ? `sorted-${sortDirection}` : ''}`}>Year</th>
                        <th onClick={() => handleSort('record')} className={`sortable ${sortColumn === 'record' ? `sorted-${sortDirection}` : ''}`}>W-L-T</th>
                        <th onClick={() => handleSort('points')} className={`sortable ${sortColumn === 'points' ? `sorted-${sortDirection}` : ''}`}>Points</th>
                        <th onClick={() => handleSort('pointsAgainst')} className={`sortable ${sortColumn === 'pointsAgainst' ? `sorted-${sortDirection}` : ''}`}>Points Against</th>
                        <th onClick={() => handleSort('seasonPlace')} className={`sortable ${sortColumn === 'seasonPlace' ? `sorted-${sortDirection}` : ''}`}>Reg Season</th>
                        <th onClick={() => handleSort('finalPlace')} className={`sortable ${sortColumn === 'finalPlace' ? `sorted-${sortDirection}` : ''}`}>Overall</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.seasonRecords.map((season) => {
                        const winPct = season.wins / (season.wins + season.losses + season.ties);
                        const ppg = season.fpts / (season.wins + season.losses + season.ties);
                        const ppasg = season.fptsAgainst / (season.wins + season.losses + season.ties);
                        
                        return (
                          <tr key={season.season}>
                            <td>{season.season}</td>
                            <td style={{ color: winPct === maxWinPct ? '#22c55e' : winPct === minWinPct ? '#ef4444' : 'inherit' }}>
                              {season.wins}-{season.losses}-{season.ties} ({(winPct * 100).toFixed(1)}%)
                            </td>
                            <td style={{ color: ppg === maxPpg ? '#22c55e' : ppg === minPpg ? '#ef4444' : 'inherit' }}>
                              {ppg.toFixed(2)} ({season.fpts.toFixed(2)})
                            </td>
                            <td style={{ color: ppasg === maxPpasg ? '#ef4444' : ppasg === minPpasg ? '#22c55e' : 'inherit' }}>
                              {ppasg.toFixed(2)} ({season.fptsAgainst.toFixed(2)})
                            </td>
                            <td style={{ color: season.seasonPlace !== undefined && season.seasonPlace === minSeasonPlace ? '#22c55e' : season.seasonPlace !== undefined && season.seasonPlace === maxSeasonPlace ? '#ef4444' : 'inherit' }}>
                              {season.seasonPlace !== undefined ? season.seasonPlace : 'N/A'}
                            </td>
                            <td style={{ color: season.finalPlace !== undefined && season.finalPlace === minFinalPlace ? '#22c55e' : season.finalPlace !== undefined && season.finalPlace === maxFinalPlace ? '#ef4444' : 'inherit' }}>
                              {season.finalPlace !== undefined ? season.finalPlace : 'N/A'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                );
              })()}
            </div>
          )}
        </div>

        {/* Best & Worst Opponent Section */}
        {(stats.bestOpponent || stats.worstOpponent) && (
          <div className="matchup-section" style={{ marginTop: '40px' }}>
            <div className="matchup-grid">
              {stats.bestOpponent && (
                <div className="matchup-card best">
                  <div className="matchup-badge">Favorite Victim</div>
                  <div className="matchup-opponent">{stats.bestOpponent.opponentName}</div>
                  <div className="matchup-record-line">
                    <span className="matchup-record">{stats.bestOpponent.wins}-{stats.bestOpponent.losses}</span>
                    <span className="matchup-winpct">({((stats.bestOpponent.wins / (stats.bestOpponent.wins + stats.bestOpponent.losses)) * 100).toFixed(1)}%)</span>
                  </div>
                  <div className="matchup-points-line">
                    <div className="matchup-points-for">
                      <div className="matchup-points-label">PPG</div>
                      <div className="matchup-points-value">{(stats.bestOpponent.pointsFor / (stats.bestOpponent.wins + stats.bestOpponent.losses)).toFixed(1)}</div>
                    </div>
                    <div className="matchup-points-separator">-</div>
                    <div className="matchup-points-against">
                      <div className="matchup-points-label">PPG Against</div>
                      <div className="matchup-points-value">{(stats.bestOpponent.pointsAgainst / (stats.bestOpponent.wins + stats.bestOpponent.losses)).toFixed(1)}</div>
                    </div>
                  </div>
                </div>
              )}
              {stats.worstOpponent && (
                <div className="matchup-card worst">
                  <div className="matchup-badge">White Whale</div>
                  <div className="matchup-opponent">{stats.worstOpponent.opponentName}</div>
                  <div className="matchup-record-line">
                    <span className="matchup-record">{stats.worstOpponent.wins}-{stats.worstOpponent.losses}</span>
                    <span className="matchup-winpct">({((stats.worstOpponent.wins / (stats.worstOpponent.wins + stats.worstOpponent.losses)) * 100).toFixed(1)}%)</span>
                  </div>
                  <div className="matchup-points-line">
                    <div className="matchup-points-for">
                      <div className="matchup-points-label">PPG</div>
                      <div className="matchup-points-value">{(stats.worstOpponent.pointsFor / (stats.worstOpponent.wins + stats.worstOpponent.losses)).toFixed(1)}</div>
                    </div>
                    <div className="matchup-points-separator">-</div>
                    <div className="matchup-points-against">
                      <div className="matchup-points-label">PPG Against</div>
                      <div className="matchup-points-value">{(stats.worstOpponent.pointsAgainst / (stats.worstOpponent.wins + stats.worstOpponent.losses)).toFixed(1)}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Head-to-Head Records Collapsible Section */}
        <div className="collapsible-section" style={{ marginTop: '40px' }}>
          <div 
            className="collapsible-header" 
            onClick={() => setIsHeadToHeadExpanded(!isHeadToHeadExpanded)}
          >
            <h3>Head-to-Head Records</h3>
            <span className="collapse-icon">{isHeadToHeadExpanded ? '▼' : '▶'}</span>
          </div>
          {isHeadToHeadExpanded && (
            <div className="collapsible-content">
              {sortedOpponents.length > 0 && (() => {
                const winPcts = sortedOpponents.map(o => o.wins / (o.wins + o.losses));
                const pointsPerGame = sortedOpponents.map(o => o.pointsFor / (o.wins + o.losses));
                const pointsAgainstPerGame = sortedOpponents.map(o => o.pointsAgainst / (o.wins + o.losses));
                
                const maxWinPct = Math.max(...winPcts);
                const minWinPct = Math.min(...winPcts);
                const maxPointsPerGame = Math.max(...pointsPerGame);
                const minPointsPerGame = Math.min(...pointsPerGame);
                const maxPointsAgainstPerGame = Math.max(...pointsAgainstPerGame);
                const minPointsAgainstPerGame = Math.min(...pointsAgainstPerGame);
                
                return (
                  <table>
                    <thead>
                      <tr>
                        <th onClick={() => handleOpponentSort('opponent')} className={`sortable ${sortOpponentColumn === 'opponent' ? `sorted-${sortOpponentDirection}` : ''}`}>Opponent</th>
                        <th onClick={() => handleOpponentSort('record')} className={`sortable ${sortOpponentColumn === 'record' ? `sorted-${sortOpponentDirection}` : ''}`}>W-L-T</th>
                        <th onClick={() => handleOpponentSort('points')} className={`sortable ${sortOpponentColumn === 'points' ? `sorted-${sortOpponentDirection}` : ''}`}>Points</th>
                        <th onClick={() => handleOpponentSort('pointsAgainst')} className={`sortable ${sortOpponentColumn === 'pointsAgainst' ? `sorted-${sortOpponentDirection}` : ''}`}>Points Against</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedOpponents.map((opponent) => {
                        const winPct = opponent.wins / (opponent.wins + opponent.losses);
                        const ppg = opponent.pointsFor / (opponent.wins + opponent.losses);
                        const papg = opponent.pointsAgainst / (opponent.wins + opponent.losses);
                        
                        return (
                          <tr key={opponent.opponentId}>
                            <td>{opponent.opponentName}</td>
                            <td style={{ color: winPct === maxWinPct ? '#22c55e' : winPct === minWinPct ? '#ef4444' : 'inherit' }}>
                              {opponent.wins}-{opponent.losses} ({(winPct * 100).toFixed(1)}%)
                            </td>
                            <td style={{ color: ppg === maxPointsPerGame ? '#22c55e' : ppg === minPointsPerGame ? '#ef4444' : 'inherit' }}>
                              {ppg.toFixed(2)}
                            </td>
                            <td style={{ color: papg === maxPointsAgainstPerGame ? '#ef4444' : papg === minPointsAgainstPerGame ? '#22c55e' : 'inherit' }}>
                              {papg.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                );
              })()}
            </div>
          )}
        </div>

        {/* Playoff Stats Section */}
        <h3 style={{ marginTop: '2rem' }}>Playoff Stats</h3>
        <div className="stats-section" style={{ marginBottom: '2rem' }}>
          <div className="stat-group">
            <div className="stat-item">
              <span className="stat-label">Playoff Record</span>
              <span className="stat-value">{stats.playoffRecord}</span>
              <span className="stat-secondary">({stats.playoffWinPercentage}%)</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Total Points</span>
              <span className="stat-value">{stats.avgPlayoffPoints}</span>
              <span className="stat-secondary">({stats.playoffTotalPoints} total)</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Points Against</span>
              <span className="stat-value">{stats.avgPlayoffPointsAgainst}</span>
              <span className="stat-secondary">({stats.playoffTotalPointsAgainst} total)</span>
            </div>
          </div>
        </div>

        {/* Bowl Records Section - Header removed as requested */}
        <div className="bowl-section">
          <div className="bowl-grid">
            {[
              { name: 'Troll Bowl', color: 'gold' },
              { name: 'Bengal Bowl', color: 'silver' },
              { name: 'Koozie Bowl', color: 'bronze' },
              { name: 'Toilet Bowl', color: 'purple' },
              { name: 'Diarrhea Bowl', color: 'brown' },
              { name: 'Butler Bowl', color: 'gray' }
            ].map((bowl) => (
              <div key={bowl.name} className={`bowl-item bowl-${bowl.color}`}>
                <div className="bowl-name">{bowl.name}</div>
                <div className="bowl-record-display">{stats.bowlRecords[bowl.name].wins}-{stats.bowlRecords[bowl.name].losses}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrollHome;
