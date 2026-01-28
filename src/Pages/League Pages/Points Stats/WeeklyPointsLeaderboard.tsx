import React, { useMemo, useState, useEffect } from 'react';
import { RecordComponentProps } from '../../../Interfaces/RecordStatItem';
import LeagueData from '../../../Interfaces/LeagueData';
import SleeperUser from '../../../Interfaces/SleeperUser';

import { getMatchupForWeek, getScoreForWeek } from '../../../Helper Files/HelperMethods';

// ✅ Adjust this import path if MatchupDisplay is not located here.
// Example alternatives you might need:
// import MatchupDisplay from '../../../MatchupDisplay';
// import MatchupDisplay from '../../../Components/MatchupDisplay';
import MatchupDisplay from '../../../Components/MatchupDisplay';

// =========================================================================
// TYPES
// =========================================================================

interface GameRow {
  // Team
  userId: string;
  teamName: string;
  yearsPlayed: number;

  // Opponent
  opponentUserId: string;
  opponentName: string;

  // Context
  year: number;
  week: number;

  // Scores
  points: number;
  opponentPoints: number;

  // Needed for right pane
  league: LeagueData;
}

type SortKey = 'teamName' | 'year' | 'week' | 'opponentName' | 'points' | 'opponentPoints';

interface SortConfig {
  key: SortKey;
  direction: 'ascending' | 'descending';
}

// =========================================================================
// HELPERS
// =========================================================================

const round2 = (n: number) => Math.round(n * 100) / 100;
const fmt2 = (n: number) => round2(n).toFixed(2);

/**
 * Counts how many seasons each user appears in (for "Team (Years)").
 */
const buildYearsPlayedMap = (data: LeagueData[]): Map<string, number> => {
  const map = new Map<string, number>();
  data.forEach((league) => {
    league.users.forEach((u) => {
      map.set(u.user_id, (map.get(u.user_id) ?? 0) + 1);
    });
  });
  return map;
};

/**
 * Determine the first playoff week. Prefer league.settings.playoff_week_start if present.
 * Fallback: assume playoffs start at week 15.
 */
const getPlayoffStartWeek = (league: LeagueData): number => {
  const anySettings = league.settings as any;

  const w =
    anySettings?.playoff_week_start ??
    anySettings?.playoff_start_week ??
    anySettings?.playoff_start ??
    null;

  const parsed = typeof w === 'number' ? w : Number.parseInt(String(w));
  if (Number.isFinite(parsed) && parsed > 0) return parsed;

  // Common default: regular season weeks 1-14
  return 15;
};

/**
 * Builds a list of all game rows (regular season + playoffs).
 * Uses matchup_id matching via getMatchupForWeek to find opponent.
 */
const buildAllGameRows = (data: LeagueData[]): GameRow[] => {
  const yearsPlayedMap = buildYearsPlayedMap(data);
  const rows: GameRow[] = [];

  data.forEach((league) => {
    const year = Number.parseInt(league.season);
    if (!Number.isFinite(year)) return;

    // Pre-map users for lookup
    const users = league.users as SleeperUser[];

    // Fetch all weeks (regular season + playoffs)
    // Assuming weeks go up to 18 (or check league settings)
    const anySettings = league.settings as any;
    const playoffEndWeek = anySettings?.playoff_end_week ?? 18;

    // For each week (both regular season and playoff), build matchup rows
    for (let week = 1; week <= playoffEndWeek; week++) {
      users.forEach((user) => {
        const matchup = getMatchupForWeek(user, week, league);
        if (!matchup) return;

        // If no matchup_id, we can't reliably find opponent
        const matchupId = (matchup as any).matchup_id;
        if (matchupId === undefined || matchupId === null) return;

        // Find opponent: another user with same matchup_id in that week
        const opponent = users.find((u) => {
          if (u.user_id === user.user_id) return false;
          const m2 = getMatchupForWeek(u, week, league);
          return m2 && (m2 as any).matchup_id === matchupId;
        });

        if (!opponent) return;

        const teamName =
          user.metadata?.team_name || `User ${user.user_id.substring(0, 4)}`;
        const opponentName =
          opponent.metadata?.team_name || `User ${opponent.user_id.substring(0, 4)}`;

        const points = getScoreForWeek(user, week, league);
        const opponentPoints = getScoreForWeek(opponent, week, league);

        // Optional: if your helper returns 0 for missing data, this can filter out bogus rows.
        // Keep it if you want only played weeks:
        // if (points === 0 && opponentPoints === 0) return;

        rows.push({
          userId: user.user_id,
          teamName,
          yearsPlayed: yearsPlayedMap.get(user.user_id) ?? 0,

          opponentUserId: opponent.user_id,
          opponentName,

          year,
          week,

          points: round2(points),
          opponentPoints: round2(opponentPoints),

          league,
        });
      });
    }
  });

  return rows;
};

// =========================================================================
// MAIN COMPONENT
// =========================================================================

const RegularSeasonSingleGameLeaderboard: React.FC<RecordComponentProps & { minYears?: number; includeRegularSeason?: boolean; includePlayoffs?: boolean }> = ({
  data,
  minYears = 0,
  includeRegularSeason = true,
  includePlayoffs = true,
}) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'points',
    direction: 'descending',
  });

  const [selectedRow, setSelectedRow] = useState<GameRow | null>(null);

  const { sortedRows } = useMemo(() => {
    const allRows = buildAllGameRows(data);

    let filtered = allRows.filter((r) => r.yearsPlayed >= minYears);

    // Filter out regular season weeks if includeRegularSeason is false
    if (!includeRegularSeason) {
      filtered = filtered.filter((row) => {
        const league = row.league;
        const playoffStartWeek = getPlayoffStartWeek(league);
        return row.week >= playoffStartWeek;
      });
    }

    // Filter out playoff weeks if includePlayoffs is false
    if (!includePlayoffs) {
      filtered = filtered.filter((row) => {
        const league = row.league;
        const playoffStartWeek = getPlayoffStartWeek(league);
        return row.week < playoffStartWeek;
      });
    }

    const sorted = [...filtered].sort((a, b) => {
      const { key, direction } = sortConfig;
      const dir = direction === 'ascending' ? 1 : -1;

      if (key === 'teamName') return a.teamName.localeCompare(b.teamName) * dir;
      if (key === 'opponentName') return a.opponentName.localeCompare(b.opponentName) * dir;
      if (key === 'year') return (a.year - b.year) * dir;
      if (key === 'week') return (a.week - b.week) * dir;

      // numeric
      const aVal = a[key] as number;
      const bVal = b[key] as number;
      return (aVal - bVal) * dir;
    });

    return { sortedRows: sorted };
  }, [data, minYears, includeRegularSeason, includePlayoffs, sortConfig]);

  useEffect(() => {
    if (!selectedRow && sortedRows.length > 0) {
      setSelectedRow(sortedRows[0]);
    }
  }, [sortedRows, selectedRow]);

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction:
        prev.key === key && prev.direction === 'descending' ? 'ascending' : 'descending',
    }));
  };

  const getSortIndicator = (key: SortKey) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
  };

  if (sortedRows.length === 0) {
    return (
      <div className="regular-season-points">
        <div className="notImplementedMessage">
          No game scores found (min years: {minYears}).
        </div>
      </div>
    );
  }

  // Right pane: find actual user objects for MatchupDisplay
  const selectedLeague = selectedRow?.league ?? null;
  const selectedUser1 =
    selectedLeague?.users.find((u) => u.user_id === selectedRow?.userId) ?? null;
  const selectedUser2 =
    selectedLeague?.users.find((u) => u.user_id === selectedRow?.opponentUserId) ?? null;

  const matchupTitle = selectedRow
    ? `${selectedRow.teamName} vs ${selectedRow.opponentName} — Week ${selectedRow.week}, ${selectedRow.year}`
    : null;

  return (
    <div className="regular-season-points">
      <div className="two-pane-layout">
        {/* -------------------- LEFT PANE -------------------- */}
        <div className="main-table-pane">
          <table className="leagueStatsTable regular-season-table selectable-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('teamName')} className="sortable">
                  Team (Years) {getSortIndicator('teamName')}
                </th>

                <th onClick={() => handleSort('year')} className="sortable">
                  Year {getSortIndicator('year')}
                </th>

                <th onClick={() => handleSort('week')} className="sortable">
                  Week {getSortIndicator('week')}
                </th>

                <th onClick={() => handleSort('opponentName')} className="sortable">
                  Opponent {getSortIndicator('opponentName')}
                </th>

                <th onClick={() => handleSort('points')} className="sortable">
                  Points {getSortIndicator('points')}
                </th>

                <th onClick={() => handleSort('opponentPoints')} className="sortable">
                  Opponent Points {getSortIndicator('opponentPoints')}
                </th>
              </tr>
            </thead>

            <tbody>
              {sortedRows.map((row, index) => (
                <tr
                  key={`${row.userId}-${row.year}-${row.week}-${row.opponentUserId}`}
                  className={`${selectedRow?.userId === row.userId &&
                    selectedRow?.year === row.year &&
                    selectedRow?.week === row.week &&
                    selectedRow?.opponentUserId === row.opponentUserId
                    ? 'active selected-row'
                    : ''
                    } ${index % 2 === 0 ? 'even-row' : 'odd-row'}`}
                  onClick={() =>
                    setSelectedRow((prev) =>
                      prev &&
                        prev.userId === row.userId &&
                        prev.year === row.year &&
                        prev.week === row.week &&
                        prev.opponentUserId === row.opponentUserId
                        ? null
                        : row
                    )
                  }
                >
                  <td className="team-name-cell">
                    {row.teamName} ({row.yearsPlayed})
                  </td>

                  <td>{row.year}</td>
                  <td>{row.week}</td>
                  <td>{row.opponentName}</td>

                  <td>{fmt2(row.points)}</td>
                  <td>{fmt2(row.opponentPoints)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* -------------------- RIGHT PANE -------------------- */}
        <div className="detail-pane-wrapper">
          {selectedRow && selectedLeague ? (
            <MatchupDisplay
              user1={selectedUser1 as any}
              user2={selectedUser2 as any}
              data={selectedLeague}
              week={selectedRow.week}
              title={matchupTitle}
            />
          ) : (
            <div className="notImplementedMessage">
              Select a regular season game row to see the matchup display.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegularSeasonSingleGameLeaderboard;
