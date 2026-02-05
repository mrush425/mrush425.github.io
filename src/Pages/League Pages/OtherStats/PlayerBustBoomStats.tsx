import React, { useState, useMemo, useEffect } from 'react';
import { OtherComponentProps } from '../../../Interfaces/OtherStatItem';
import LeagueData from '../../../Interfaces/LeagueData';
import playersData from '../../../Data/players.json';

// Type definitions
type PositionType = 'QB' | 'RB' | 'WR' | 'TE';

interface PlayerInstance {
  teamName: string;
  playerName: string;
  position: string;
  points: number;
  week: number;
  year: string;
}

interface TeamCount {
  teamName: string;
  userId: string;
  count: number;
  seasons: number;
  avgPerSeason: number;
}

// Get player info from players.json
const getPlayerInfo = (playerId: string): { name: string; position: string } => {
  const player = (playersData as any)[playerId];
  if (player) {
    return {
      name: player.full_name || `${player.first_name || ''} ${player.last_name || ''}`.trim() || `Player ${playerId}`,
      position: player.fantasy_positions?.[0] || player.position || 'Unknown'
    };
  }
  return { name: `Player ${playerId}`, position: 'Unknown' };
};

// Get team name for a user
const getTeamName = (userId: string, league: LeagueData): string => {
  const user = league.users.find(u => u.user_id === userId);
  return user?.metadata?.team_name || user?.display_name || 'Unknown';
};

// Calculate low scorer stats
export const calculateLowScorerStats = (
  data: LeagueData[],
  position: PositionType,
  includeRegular: boolean,
  includePlayoffs: boolean,
  minYears: number = 0
): { counts: TeamCount[]; instancesByUser: Record<string, PlayerInstance[]> } => {
  const countMap: Record<string, TeamCount> = {};
  const instancesByUser: Record<string, PlayerInstance[]> = {};
  const userSeasons: Record<string, Set<string>> = {};

  data.forEach((league) => {
    if (!league.matchupInfo) return;
    const playoffStartWeek = league.settings.playoff_week_start || Infinity;

    league.matchupInfo.forEach((weekInfo) => {
      const isPlayoff = weekInfo.week >= playoffStartWeek;
      if (!includeRegular && !isPlayoff) return;
      if (!includePlayoffs && isPlayoff) return;

      weekInfo.matchups.forEach((matchup) => {
        const roster = league.rosters.find(r => r.roster_id === matchup.roster_id);
        if (!roster) return;

        const userId = roster.owner_id;
        const teamName = getTeamName(userId, league);
        const starters = matchup.starters || [];
        const playersPoints = matchup.players_points || {};

        // Track seasons for this user
        if (!userSeasons[userId]) {
          userSeasons[userId] = new Set();
        }
        userSeasons[userId].add(league.season);

        starters.forEach((playerId) => {
          if (!playerId || playerId === '0') return;
          const playerInfo = getPlayerInfo(playerId);
          const points = playersPoints[playerId] || 0;

          if (playerInfo.position === position && points < 5 && points >= 0) {
            if (!countMap[userId]) {
              countMap[userId] = { teamName, userId, count: 0, seasons: 0, avgPerSeason: 0 };
            }
            countMap[userId].count++;
            
            if (!instancesByUser[userId]) {
              instancesByUser[userId] = [];
            }
            instancesByUser[userId].push({
              teamName, playerName: playerInfo.name, position: playerInfo.position,
              points, week: weekInfo.week, year: league.season
            });
          }
        });
      });
    });
  });

  // Calculate seasons and average per season, filter teams with < 3 seasons
  Object.keys(countMap).forEach(userId => {
    const seasons = userSeasons[userId]?.size || 0;
    countMap[userId].seasons = seasons;
    countMap[userId].avgPerSeason = seasons > 0 ? countMap[userId].count / seasons : 0;
  });

  // Sort instances by year desc, then week desc
  Object.keys(instancesByUser).forEach(userId => {
    instancesByUser[userId].sort((a, b) => parseInt(b.year) - parseInt(a.year) || b.week - a.week);
  });

  return {
    counts: Object.values(countMap)
      .filter(team => team.seasons >= minYears)
      .sort((a, b) => b.avgPerSeason - a.avgPerSeason),
    instancesByUser
  };
};

// Calculate negative points stats
export const calculateNegativeStats = (
  data: LeagueData[],
  includeRegular: boolean,
  includePlayoffs: boolean,
  minYears: number = 0
): { counts: TeamCount[]; instancesByUser: Record<string, PlayerInstance[]> } => {
  const countMap: Record<string, TeamCount> = {};
  const instancesByUser: Record<string, PlayerInstance[]> = {};
  const userSeasons: Record<string, Set<string>> = {};

  data.forEach((league) => {
    if (!league.matchupInfo) return;
    const playoffStartWeek = league.settings.playoff_week_start || Infinity;

    league.matchupInfo.forEach((weekInfo) => {
      const isPlayoff = weekInfo.week >= playoffStartWeek;
      if (!includeRegular && !isPlayoff) return;
      if (!includePlayoffs && isPlayoff) return;

      weekInfo.matchups.forEach((matchup) => {
        const roster = league.rosters.find(r => r.roster_id === matchup.roster_id);
        if (!roster) return;

        const userId = roster.owner_id;
        const teamName = getTeamName(userId, league);
        const starters = matchup.starters || [];
        const playersPoints = matchup.players_points || {};

        // Track seasons for this user
        if (!userSeasons[userId]) {
          userSeasons[userId] = new Set();
        }
        userSeasons[userId].add(league.season);

        starters.forEach((playerId) => {
          if (!playerId || playerId === '0') return;
          const playerInfo = getPlayerInfo(playerId);
          const points = playersPoints[playerId] || 0;

          if (points < 0) {
            if (!countMap[userId]) {
              countMap[userId] = { teamName, userId, count: 0, seasons: 0, avgPerSeason: 0 };
            }
            countMap[userId].count++;
            
            if (!instancesByUser[userId]) {
              instancesByUser[userId] = [];
            }
            instancesByUser[userId].push({
              teamName, playerName: playerInfo.name, position: playerInfo.position,
              points, week: weekInfo.week, year: league.season
            });
          }
        });
      });
    });
  });

  // Calculate seasons and average per season, filter teams with < 3 seasons
  Object.keys(countMap).forEach(userId => {
    const seasons = userSeasons[userId]?.size || 0;
    countMap[userId].seasons = seasons;
    countMap[userId].avgPerSeason = seasons > 0 ? countMap[userId].count / seasons : 0;
  });

  Object.keys(instancesByUser).forEach(userId => {
    instancesByUser[userId].sort((a, b) => parseInt(b.year) - parseInt(a.year) || b.week - a.week);
  });

  return {
    counts: Object.values(countMap)
      .filter(team => team.seasons >= minYears)
      .sort((a, b) => b.avgPerSeason - a.avgPerSeason),
    instancesByUser
  };
};

// Calculate kicker boom stats
export const calculateKickerBoomStats = (
  data: LeagueData[],
  includeRegular: boolean,
  includePlayoffs: boolean,
  minYears: number = 0
): { counts: TeamCount[]; instancesByUser: Record<string, PlayerInstance[]> } => {
  const countMap: Record<string, TeamCount> = {};
  const instancesByUser: Record<string, PlayerInstance[]> = {};
  const userSeasons: Record<string, Set<string>> = {};

  data.forEach((league) => {
    if (!league.matchupInfo) return;
    const playoffStartWeek = league.settings.playoff_week_start || Infinity;

    league.matchupInfo.forEach((weekInfo) => {
      const isPlayoff = weekInfo.week >= playoffStartWeek;
      if (!includeRegular && !isPlayoff) return;
      if (!includePlayoffs && isPlayoff) return;

      weekInfo.matchups.forEach((matchup) => {
        const roster = league.rosters.find(r => r.roster_id === matchup.roster_id);
        if (!roster) return;

        const userId = roster.owner_id;
        const teamName = getTeamName(userId, league);
        const starters = matchup.starters || [];
        const playersPoints = matchup.players_points || {};

        // Track seasons for this user
        if (!userSeasons[userId]) {
          userSeasons[userId] = new Set();
        }
        userSeasons[userId].add(league.season);

        starters.forEach((playerId) => {
          if (!playerId || playerId === '0') return;
          const playerInfo = getPlayerInfo(playerId);
          const points = playersPoints[playerId] || 0;

          if (playerInfo.position === 'K' && points > 20) {
            if (!countMap[userId]) {
              countMap[userId] = { teamName, userId, count: 0, seasons: 0, avgPerSeason: 0 };
            }
            countMap[userId].count++;
            
            if (!instancesByUser[userId]) {
              instancesByUser[userId] = [];
            }
            instancesByUser[userId].push({
              teamName, playerName: playerInfo.name, position: playerInfo.position,
              points, week: weekInfo.week, year: league.season
            });
          }
        });
      });
    });
  });

  // Calculate seasons and average per season, filter teams with < 3 seasons
  Object.keys(countMap).forEach(userId => {
    const seasons = userSeasons[userId]?.size || 0;
    countMap[userId].seasons = seasons;
    countMap[userId].avgPerSeason = seasons > 0 ? countMap[userId].count / seasons : 0;
  });

  Object.keys(instancesByUser).forEach(userId => {
    instancesByUser[userId].sort((a, b) => parseInt(b.year) - parseInt(a.year) || b.week - a.week);
  });

  return {
    counts: Object.values(countMap)
      .filter(team => team.seasons >= minYears)
      .sort((a, b) => b.avgPerSeason - a.avgPerSeason),
    instancesByUser
  };
};

// Calculate defense boom stats
export const calculateDefenseBoomStats = (
  data: LeagueData[],
  includeRegular: boolean,
  includePlayoffs: boolean,
  minYears: number = 0
): { counts: TeamCount[]; instancesByUser: Record<string, PlayerInstance[]> } => {
  const countMap: Record<string, TeamCount> = {};
  const instancesByUser: Record<string, PlayerInstance[]> = {};
  const userSeasons: Record<string, Set<string>> = {};

  data.forEach((league) => {
    if (!league.matchupInfo) return;
    const playoffStartWeek = league.settings.playoff_week_start || Infinity;

    league.matchupInfo.forEach((weekInfo) => {
      const isPlayoff = weekInfo.week >= playoffStartWeek;
      if (!includeRegular && !isPlayoff) return;
      if (!includePlayoffs && isPlayoff) return;

      weekInfo.matchups.forEach((matchup) => {
        const roster = league.rosters.find(r => r.roster_id === matchup.roster_id);
        if (!roster) return;

        const userId = roster.owner_id;
        const teamName = getTeamName(userId, league);
        const starters = matchup.starters || [];
        const playersPoints = matchup.players_points || {};

        // Track seasons for this user
        if (!userSeasons[userId]) {
          userSeasons[userId] = new Set();
        }
        userSeasons[userId].add(league.season);

        starters.forEach((playerId) => {
          if (!playerId || playerId === '0') return;
          const playerInfo = getPlayerInfo(playerId);
          const points = playersPoints[playerId] || 0;

          if (playerInfo.position === 'DEF' && points > 25) {
            if (!countMap[userId]) {
              countMap[userId] = { teamName, userId, count: 0, seasons: 0, avgPerSeason: 0 };
            }
            countMap[userId].count++;
            
            if (!instancesByUser[userId]) {
              instancesByUser[userId] = [];
            }
            instancesByUser[userId].push({
              teamName, playerName: playerInfo.name, position: playerInfo.position,
              points, week: weekInfo.week, year: league.season
            });
          }
        });
      });
    });
  });

  // Calculate seasons and average per season, filter teams with < 3 seasons
  Object.keys(countMap).forEach(userId => {
    const seasons = userSeasons[userId]?.size || 0;
    countMap[userId].seasons = seasons;
    countMap[userId].avgPerSeason = seasons > 0 ? countMap[userId].count / seasons : 0;
  });

  Object.keys(instancesByUser).forEach(userId => {
    instancesByUser[userId].sort((a, b) => parseInt(b.year) - parseInt(a.year) || b.week - a.week);
  });

  return {
    counts: Object.values(countMap)
      .filter(team => team.seasons >= minYears)
      .sort((a, b) => b.avgPerSeason - a.avgPerSeason),
    instancesByUser
  };
};

// Calculate no clothes stats (>45 points)
export const calculateNoClothesStats = (
  data: LeagueData[],
  includeRegular: boolean,
  includePlayoffs: boolean,
  minYears: number = 0
): { counts: TeamCount[]; instancesByUser: Record<string, PlayerInstance[]> } => {
  const countMap: Record<string, TeamCount> = {};
  const instancesByUser: Record<string, PlayerInstance[]> = {};
  const userSeasons: Record<string, Set<string>> = {};

  data.forEach((league) => {
    if (!league.matchupInfo) return;
    const playoffStartWeek = league.settings.playoff_week_start || Infinity;

    league.matchupInfo.forEach((weekInfo) => {
      const isPlayoff = weekInfo.week >= playoffStartWeek;
      if (!includeRegular && !isPlayoff) return;
      if (!includePlayoffs && isPlayoff) return;

      weekInfo.matchups.forEach((matchup) => {
        const roster = league.rosters.find(r => r.roster_id === matchup.roster_id);
        if (!roster) return;

        const userId = roster.owner_id;
        const teamName = getTeamName(userId, league);
        const starters = matchup.starters || [];
        const playersPoints = matchup.players_points || {};

        // Track seasons for this user
        if (!userSeasons[userId]) {
          userSeasons[userId] = new Set();
        }
        userSeasons[userId].add(league.season);

        starters.forEach((playerId) => {
          if (!playerId || playerId === '0') return;
          const playerInfo = getPlayerInfo(playerId);
          const points = playersPoints[playerId] || 0;

          if (points > 45) {
            if (!countMap[userId]) {
              countMap[userId] = { teamName, userId, count: 0, seasons: 0, avgPerSeason: 0 };
            }
            countMap[userId].count++;
            
            if (!instancesByUser[userId]) {
              instancesByUser[userId] = [];
            }
            instancesByUser[userId].push({
              teamName, playerName: playerInfo.name, position: playerInfo.position,
              points, week: weekInfo.week, year: league.season
            });
          }
        });
      });
    });
  });

  // Calculate seasons and average per season
  Object.keys(countMap).forEach(userId => {
    const seasons = userSeasons[userId]?.size || 0;
    countMap[userId].seasons = seasons;
    countMap[userId].avgPerSeason = seasons > 0 ? countMap[userId].count / seasons : 0;
  });

  Object.keys(instancesByUser).forEach(userId => {
    instancesByUser[userId].sort((a, b) => parseInt(b.year) - parseInt(a.year) || b.week - a.week);
  });

  return {
    counts: Object.values(countMap)
      .sort((a, b) => b.avgPerSeason - a.avgPerSeason),
    instancesByUser
  };
};

// ============ LOW SCORER COMPONENT ============
export const LowScorerStats: React.FC<OtherComponentProps> = ({ data, minYears = 0 }) => {
  const [position, setPosition] = useState<PositionType>('QB');
  const [includeRegular, setIncludeRegular] = useState(true);
  const [includePlayoffs, setIncludePlayoffs] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<TeamCount | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const { counts, instancesByUser } = useMemo(() => {
    return calculateLowScorerStats(data, position, includeRegular, includePlayoffs, minYears);
  }, [data, position, includeRegular, includePlayoffs, minYears]);

  const handleRowClick = (team: TeamCount) => {
    setSelectedTeam(prev => (prev?.userId === team.userId ? null : team));
    if (isMobile) setShowMobileDetail(true);
  };

  const handleBackToList = () => {
    setShowMobileDetail(false);
  };

  const selectedInstances = selectedTeam ? (instancesByUser[selectedTeam.userId] || []) : [];

  return (
    <div className="regular-season-records">
      {/* Position Selection */}
      <div style={{ textAlign: 'center', marginBottom: '12px' }}>
        <div className="toggle-group" style={{ display: 'inline-flex', gap: 16, alignItems: 'center' }}>
          {(['QB', 'RB', 'WR', 'TE'] as PositionType[]).map((pos) => (
            <label key={pos} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input
                type="radio"
                name="position"
                value={pos}
                checked={position === pos}
                onChange={() => setPosition(pos)}
              />
              <span>{pos}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Season Type Checkboxes */}
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <div className="toggle-group" style={{ display: 'inline-flex', gap: 16, alignItems: 'center' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={includeRegular}
              onChange={(e) => setIncludeRegular(e.target.checked)}
            />
            <span>Regular Season</span>
          </label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={includePlayoffs}
              onChange={(e) => setIncludePlayoffs(e.target.checked)}
            />
            <span>Playoffs</span>
          </label>
        </div>
      </div>

      {isMobile && showMobileDetail && (
        <button onClick={handleBackToList} className="mobile-back-button">
          ← Back to List
        </button>
      )}

      <div className="two-pane-layout">
        {/* Main Table */}
        <div className={`main-table-pane ${isMobile && showMobileDetail ? 'mobile-hidden' : ''}`}>
          <table className="leagueStatsTable selectable-table">
            <thead>
              <tr>
                <th className="table-col-team">Team</th>
                <th className="table-col-2">Count</th>
                <th className="table-col-2">Avg/Season</th>
              </tr>
            </thead>
            <tbody>
              {counts.length === 0 ? (
                <tr><td colSpan={3} className="notImplementedMessage">No instances found</td></tr>
              ) : (
                counts.map((item, index) => (
                  <tr 
                    key={item.userId}
                    className={`${selectedTeam?.userId === item.userId ? 'active selected-row' : ''} ${index % 2 === 0 ? 'even-row' : 'odd-row'}`}
                    onClick={() => handleRowClick(item)}
                  >
                    <td className="team-name-cell">{item.teamName} ({item.seasons})</td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.count}</td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.avgPerSeason.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Detail Pane */}
        <div className={`detail-pane-wrapper ${isMobile && !showMobileDetail ? 'mobile-hidden' : ''}`}>
          {selectedTeam ? (
            <div className="detail-pane">
              <table className="leagueStatsTable detail-table">
                <thead>
                  <tr>
                    <th className="table-col-2">Player</th>
                    <th className="table-col-1">Pts</th>
                    <th className="table-col-1">Wk</th>
                    <th className="table-col-1">Year</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInstances.map((instance: PlayerInstance, idx: number) => (
                    <tr key={`${instance.year}-${instance.week}-${instance.playerName}-${idx}`}>
                      <td>{instance.playerName}</td>
                      <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{instance.points.toFixed(2)}</td>
                      <td style={{ textAlign: 'center' }}>{instance.week}</td>
                      <td style={{ textAlign: 'center' }}>{instance.year}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="notImplementedMessage">
              Select a team from the table to see their instances.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============ NEGATIVE POINTS COMPONENT ============
export const NegativePointsStats: React.FC<OtherComponentProps> = ({ data, minYears = 0 }) => {
  const [includeRegular, setIncludeRegular] = useState(true);
  const [includePlayoffs, setIncludePlayoffs] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<TeamCount | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const { counts, instancesByUser } = useMemo(() => {
    return calculateNegativeStats(data, includeRegular, includePlayoffs, minYears);
  }, [data, includeRegular, includePlayoffs, minYears]);

  const handleRowClick = (team: TeamCount) => {
    setSelectedTeam(prev => (prev?.userId === team.userId ? null : team));
    if (isMobile) setShowMobileDetail(true);
  };

  const handleBackToList = () => {
    setShowMobileDetail(false);
  };

  const selectedInstances = selectedTeam ? (instancesByUser[selectedTeam.userId] || []) : [];

  return (
    <div className="regular-season-records">
      {/* Season Type Checkboxes */}
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <div className="toggle-group" style={{ display: 'inline-flex', gap: 16, alignItems: 'center' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={includeRegular}
              onChange={(e) => setIncludeRegular(e.target.checked)}
            />
            <span>Regular Season</span>
          </label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={includePlayoffs}
              onChange={(e) => setIncludePlayoffs(e.target.checked)}
            />
            <span>Playoffs</span>
          </label>
        </div>
      </div>

      {isMobile && showMobileDetail && (
        <button onClick={handleBackToList} className="mobile-back-button">
          ← Back to List
        </button>
      )}

      <div className="two-pane-layout">
        {/* Main Table */}
        <div className={`main-table-pane ${isMobile && showMobileDetail ? 'mobile-hidden' : ''}`}>
          <table className="leagueStatsTable selectable-table">
            <thead>
              <tr>
                <th className="table-col-team">Team</th>
                <th className="table-col-2">Count</th>
                <th className="table-col-2">Avg/Season</th>
              </tr>
            </thead>
            <tbody>
              {counts.length === 0 ? (
                <tr><td colSpan={3} className="notImplementedMessage">No instances found</td></tr>
              ) : (
                counts.map((item, index) => (
                  <tr 
                    key={item.userId}
                    className={`${selectedTeam?.userId === item.userId ? 'active selected-row' : ''} ${index % 2 === 0 ? 'even-row' : 'odd-row'}`}
                    onClick={() => handleRowClick(item)}
                  >
                    <td className="team-name-cell">{item.teamName} ({item.seasons})</td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.count}</td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.avgPerSeason.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Detail Pane */}
        <div className={`detail-pane-wrapper ${isMobile && !showMobileDetail ? 'mobile-hidden' : ''}`}>
          {selectedTeam ? (
            <div className="detail-pane">
              <table className="leagueStatsTable detail-table">
                <thead>
                  <tr>
                    <th className="table-col-2">Player</th>
                    <th className="table-col-1">Pos</th>
                    <th className="table-col-1">Pts</th>
                    <th className="table-col-1">Wk</th>
                    <th className="table-col-1">Year</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInstances.map((instance: PlayerInstance, idx: number) => (
                    <tr key={`${instance.year}-${instance.week}-${instance.playerName}-${idx}`}>
                      <td>{instance.playerName}</td>
                      <td style={{ textAlign: 'center' }}>{instance.position}</td>
                      <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--accent-red, #ef4444)' }}>
                        {instance.points.toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'center' }}>{instance.week}</td>
                      <td style={{ textAlign: 'center' }}>{instance.year}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="notImplementedMessage">
              Select a team from the table to see their instances.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============ KICKER BOOM COMPONENT ============
export const KickerBoomStats: React.FC<OtherComponentProps> = ({ data, minYears = 0 }) => {
  const [includeRegular, setIncludeRegular] = useState(true);
  const [includePlayoffs, setIncludePlayoffs] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<TeamCount | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const { counts, instancesByUser } = useMemo(() => {
    return calculateKickerBoomStats(data, includeRegular, includePlayoffs, minYears);
  }, [data, includeRegular, includePlayoffs, minYears]);

  const handleRowClick = (team: TeamCount) => {
    setSelectedTeam(prev => (prev?.userId === team.userId ? null : team));
    if (isMobile) setShowMobileDetail(true);
  };

  const handleBackToList = () => {
    setShowMobileDetail(false);
  };

  const selectedInstances = selectedTeam ? (instancesByUser[selectedTeam.userId] || []) : [];

  return (
    <div className="regular-season-records">
      {/* Season Type Checkboxes */}
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <div className="toggle-group" style={{ display: 'inline-flex', gap: 16, alignItems: 'center' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={includeRegular}
              onChange={(e) => setIncludeRegular(e.target.checked)}
            />
            <span>Regular Season</span>
          </label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={includePlayoffs}
              onChange={(e) => setIncludePlayoffs(e.target.checked)}
            />
            <span>Playoffs</span>
          </label>
        </div>
      </div>

      {isMobile && showMobileDetail && (
        <button onClick={handleBackToList} className="mobile-back-button">
          ← Back to List
        </button>
      )}

      <div className="two-pane-layout">
        {/* Main Table */}
        <div className={`main-table-pane ${isMobile && showMobileDetail ? 'mobile-hidden' : ''}`}>
          <table className="leagueStatsTable selectable-table">
            <thead>
              <tr>
                <th className="table-col-team">Team</th>
                <th className="table-col-2">Count</th>
                <th className="table-col-2">Avg/Season</th>
              </tr>
            </thead>
            <tbody>
              {counts.length === 0 ? (
                <tr><td colSpan={3} className="notImplementedMessage">No instances found</td></tr>
              ) : (
                counts.map((item, index) => (
                  <tr 
                    key={item.userId}
                    className={`${selectedTeam?.userId === item.userId ? 'active selected-row' : ''} ${index % 2 === 0 ? 'even-row' : 'odd-row'}`}
                    onClick={() => handleRowClick(item)}
                  >
                    <td className="team-name-cell">{item.teamName} ({item.seasons})</td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.count}</td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.avgPerSeason.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Detail Pane */}
        <div className={`detail-pane-wrapper ${isMobile && !showMobileDetail ? 'mobile-hidden' : ''}`}>
          {selectedTeam ? (
            <div className="detail-pane">
              <table className="leagueStatsTable detail-table">
                <thead>
                  <tr>
                    <th className="table-col-2">Player</th>
                    <th className="table-col-1">Pts</th>
                    <th className="table-col-1">Wk</th>
                    <th className="table-col-1">Year</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInstances.map((instance: PlayerInstance, idx: number) => (
                    <tr key={`${instance.year}-${instance.week}-${instance.playerName}-${idx}`}>
                      <td>{instance.playerName}</td>
                      <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--accent-green, #22c55e)' }}>
                        {instance.points.toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'center' }}>{instance.week}</td>
                      <td style={{ textAlign: 'center' }}>{instance.year}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="notImplementedMessage">
              Select a team from the table to see their instances.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============ DEFENSE BOOM COMPONENT ============
export const DefenseBoomStats: React.FC<OtherComponentProps> = ({ data, minYears = 0 }) => {
  const [includeRegular, setIncludeRegular] = useState(true);
  const [includePlayoffs, setIncludePlayoffs] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<TeamCount | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const { counts, instancesByUser } = useMemo(() => {
    return calculateDefenseBoomStats(data, includeRegular, includePlayoffs, minYears);
  }, [data, includeRegular, includePlayoffs, minYears]);

  const handleRowClick = (team: TeamCount) => {
    setSelectedTeam(prev => (prev?.userId === team.userId ? null : team));
    if (isMobile) setShowMobileDetail(true);
  };

  const handleBackToList = () => {
    setShowMobileDetail(false);
  };

  const selectedInstances = selectedTeam ? (instancesByUser[selectedTeam.userId] || []) : [];

  return (
    <div className="regular-season-records">
      {/* Season Type Checkboxes */}
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <div className="toggle-group" style={{ display: 'inline-flex', gap: 16, alignItems: 'center' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={includeRegular}
              onChange={(e) => setIncludeRegular(e.target.checked)}
            />
            <span>Regular Season</span>
          </label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={includePlayoffs}
              onChange={(e) => setIncludePlayoffs(e.target.checked)}
            />
            <span>Playoffs</span>
          </label>
        </div>
      </div>

      {isMobile && showMobileDetail && (
        <button onClick={handleBackToList} className="mobile-back-button">
          ← Back to List
        </button>
      )}

      <div className="two-pane-layout">
        {/* Main Table */}
        <div className={`main-table-pane ${isMobile && showMobileDetail ? 'mobile-hidden' : ''}`}>
          <table className="leagueStatsTable selectable-table">
            <thead>
              <tr>
                <th className="table-col-team">Team</th>
                <th className="table-col-2">Count</th>
                <th className="table-col-2">Avg/Season</th>
              </tr>
            </thead>
            <tbody>
              {counts.length === 0 ? (
                <tr><td colSpan={3} className="notImplementedMessage">No instances found</td></tr>
              ) : (
                counts.map((item, index) => (
                  <tr 
                    key={item.userId}
                    className={`${selectedTeam?.userId === item.userId ? 'active selected-row' : ''} ${index % 2 === 0 ? 'even-row' : 'odd-row'}`}
                    onClick={() => handleRowClick(item)}
                  >
                    <td className="team-name-cell">{item.teamName} ({item.seasons})</td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.count}</td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.avgPerSeason.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Detail Pane */}
        <div className={`detail-pane-wrapper ${isMobile && !showMobileDetail ? 'mobile-hidden' : ''}`}>
          {selectedTeam ? (
            <div className="detail-pane">
              <table className="leagueStatsTable detail-table">
                <thead>
                  <tr>
                    <th className="table-col-2">Player</th>
                    <th className="table-col-1">Pts</th>
                    <th className="table-col-1">Wk</th>
                    <th className="table-col-1">Year</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInstances.map((instance: PlayerInstance, idx: number) => (
                    <tr key={`${instance.year}-${instance.week}-${instance.playerName}-${idx}`}>
                      <td>{instance.playerName}</td>
                      <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--accent-green, #22c55e)' }}>
                        {instance.points.toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'center' }}>{instance.week}</td>
                      <td style={{ textAlign: 'center' }}>{instance.year}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="notImplementedMessage">
              Select a team from the table to see their instances.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============ NO CLOTHES COMPONENT ============
export const NoClothesStats: React.FC<OtherComponentProps> = ({ data, minYears = 0 }) => {
  const [includeRegular, setIncludeRegular] = useState(true);
  const [includePlayoffs, setIncludePlayoffs] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<TeamCount | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const { counts, instancesByUser } = useMemo(() => {
    return calculateNoClothesStats(data, includeRegular, includePlayoffs, minYears);
  }, [data, includeRegular, includePlayoffs, minYears]);

  const handleRowClick = (team: TeamCount) => {
    setSelectedTeam(prev => (prev?.userId === team.userId ? null : team));
    if (isMobile) setShowMobileDetail(true);
  };

  const handleBackToList = () => {
    setShowMobileDetail(false);
  };

  const selectedInstances = selectedTeam ? (instancesByUser[selectedTeam.userId] || []) : [];

  return (
    <div className="regular-season-records">
      {/* Season Type Checkboxes */}
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <div className="toggle-group" style={{ display: 'inline-flex', gap: 16, alignItems: 'center' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={includeRegular}
              onChange={(e) => setIncludeRegular(e.target.checked)}
            />
            <span>Regular Season</span>
          </label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={includePlayoffs}
              onChange={(e) => setIncludePlayoffs(e.target.checked)}
            />
            <span>Playoffs</span>
          </label>
        </div>
      </div>

      {isMobile && showMobileDetail && (
        <button onClick={handleBackToList} className="mobile-back-button">
          ← Back to List
        </button>
      )}

      <div className="two-pane-layout">
        {/* Main Table */}
        <div className={`main-table-pane ${isMobile && showMobileDetail ? 'mobile-hidden' : ''}`}>
          <table className="leagueStatsTable selectable-table">
            <thead>
              <tr>
                <th className="table-col-team">Team</th>
                <th className="table-col-2">Count</th>
                <th className="table-col-2">Avg/Season</th>
              </tr>
            </thead>
            <tbody>
              {counts.length === 0 ? (
                <tr><td colSpan={3} className="notImplementedMessage">No instances found</td></tr>
              ) : (
                counts.map((item, index) => (
                  <tr 
                    key={item.userId}
                    className={`${selectedTeam?.userId === item.userId ? 'active selected-row' : ''} ${index % 2 === 0 ? 'even-row' : 'odd-row'}`}
                    onClick={() => handleRowClick(item)}
                  >
                    <td className="team-name-cell">{item.teamName} ({item.seasons})</td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.count}</td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.avgPerSeason.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Detail Pane */}
        <div className={`detail-pane-wrapper ${isMobile && !showMobileDetail ? 'mobile-hidden' : ''}`}>
          {selectedTeam ? (
            <div className="detail-pane">
              <table className="leagueStatsTable detail-table">
                <thead>
                  <tr>
                    <th className="table-col-2">Player</th>
                    <th className="table-col-1">Pos</th>
                    <th className="table-col-1">Pts</th>
                    <th className="table-col-1">Wk</th>
                    <th className="table-col-1">Year</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInstances.map((instance: PlayerInstance, idx: number) => (
                    <tr key={`${instance.year}-${instance.week}-${instance.playerName}-${idx}`}>
                      <td>{instance.playerName}</td>
                      <td style={{ textAlign: 'center' }}>{instance.position}</td>
                      <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--accent-green, #22c55e)' }}>
                        {instance.points.toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'center' }}>{instance.week}</td>
                      <td style={{ textAlign: 'center' }}>{instance.year}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="notImplementedMessage">
              Select a team from the table to see their instances.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LowScorerStats;







