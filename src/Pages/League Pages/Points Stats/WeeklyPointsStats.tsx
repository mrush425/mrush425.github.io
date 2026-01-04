import React, { useMemo, useState, useEffect } from 'react';
import LeagueData from '../../../Interfaces/LeagueData';
import SleeperUser from '../../../Interfaces/SleeperUser';

import MatchupDisplay from '../../../Components/MatchupDisplay';

import { findRosterByUserId, findUserByRosterId } from '../../../Helper Files/HelperMethods';

// =========================================================================
// TYPES
// =========================================================================

export interface WeeklyStatRow {
  userId: string;
  teamName: string;
  yearsPlayed: number;

  year: number;
  week: number;
  secondWeek?: number;

  opponentName: string;
  opponentUserId: string | null;

  statValue: number;
  statDisplay?: string;

  league: LeagueData;
}

type SortKey = 'teamName' | 'year' | 'week' | 'opponentName' | 'statValue';

interface SortConfig {
  key: SortKey;
  direction: 'ascending' | 'descending';
}

export interface WeeklyPointsStatsProps {
  rows: WeeklyStatRow[];
  metricLabel: string;
  emptyMessage?: string;

  defaultSort?: {
    key?: SortKey;
    direction?: 'ascending' | 'descending';
  };

  allowDeselect?: boolean;

  /**
   * Determines what "best" means for per-year highlighting.
   * - 'high': best = max (green), worst = min (red)
   * - 'low' : best = min (green), worst = max (red)
   *
   * Defaults to 'high' (works for points-based stats like GetWreckd, BossWhenItCounts).
   * For stats like Heartbreaker / BetterLuckyThanGood where smaller is better, pass 'low'.
   */
  bestDirection?: 'high' | 'low';
}

// =========================================================================
// COMPONENT
// =========================================================================

const WeeklyPointsStats: React.FC<WeeklyPointsStatsProps> = ({
  rows,
  metricLabel,
  emptyMessage = 'No data available.',
  defaultSort,
  allowDeselect = true,
  bestDirection = 'high',
}) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: defaultSort?.key ?? 'statValue',
    direction: defaultSort?.direction ?? 'descending',
  });

  const [selectedRow, setSelectedRow] = useState<WeeklyStatRow | null>(null);

  // Build per-year min/max for highlighting
  const yearExtremes = useMemo(() => {
    const map = new Map<number, { min: number; max: number }>();

    rows.forEach((r) => {
      const y = r.year;
      const v = r.statValue;

      const existing = map.get(y);
      if (!existing) {
        map.set(y, { min: v, max: v });
      } else {
        if (v < existing.min) existing.min = v;
        if (v > existing.max) existing.max = v;
      }
    });

    return map;
  }, [rows]);

  const sortedRows = useMemo(() => {
    const sorted = [...rows].sort((a, b) => {
      const { key, direction } = sortConfig;
      const dir = direction === 'ascending' ? 1 : -1;

      if (key === 'teamName') return a.teamName.localeCompare(b.teamName) * dir;
      if (key === 'opponentName') return a.opponentName.localeCompare(b.opponentName) * dir;
      if (key === 'year') return (a.year - b.year) * dir;
      if (key === 'week') return (a.week - b.week) * dir;

      return (a.statValue - b.statValue) * dir;
    });

    return sorted;
  }, [rows, sortConfig]);

  useEffect(() => {
    if (!selectedRow && sortedRows.length > 0) {
      setSelectedRow(sortedRows[0]);
    }
  }, [sortedRows, selectedRow]);

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'descending' ? 'ascending' : 'descending',
    }));
  };

  const getSortIndicator = (key: SortKey) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
  };

  const getYearCellClassName = (row: WeeklyStatRow): string => {
    const ex = yearExtremes.get(row.year);
    if (!ex) return '';

    const best = bestDirection === 'high' ? ex.max : ex.min;
    const worst = bestDirection === 'high' ? ex.min : ex.max;

    // If all values are equal for that year, don't highlight.
    if (ex.min === ex.max) return '';

    if (row.statValue === best) return 'highlight-best';
    if (row.statValue === worst) return 'highlight-worst';
    return '';
  };

  // Right pane: resolve selected users
  const selectedLeague = selectedRow?.league ?? null;

  const selectedUser1 =
    selectedLeague?.users.find((u) => u.user_id === selectedRow?.userId) ?? null;

  let selectedUser2: SleeperUser | null =
    selectedLeague?.users.find((u) => u.user_id === selectedRow?.opponentUserId) ?? null;

  if (selectedLeague && selectedRow && !selectedUser2 && selectedRow.week > 0) {
    const rosterId =
      findRosterByUserId(selectedRow.userId, selectedLeague.rosters)?.roster_id ?? 0;

    const matchupInfo = selectedLeague.matchupInfo.find((m) => m.week === selectedRow.week);
    const teamMatchup = matchupInfo?.matchups.find((m) => m.roster_id === rosterId);
    const oppMatchup = matchupInfo?.matchups.find(
      (m) => m.matchup_id === teamMatchup?.matchup_id && m.roster_id !== teamMatchup?.roster_id
    );

    if (oppMatchup) {
      const oppUser = findUserByRosterId(oppMatchup.roster_id, selectedLeague);
      selectedUser2 = (oppUser as SleeperUser) ?? null;
    }
  }

  const matchupTitle = selectedRow
    ? `${selectedRow.teamName} vs ${selectedRow.opponentName} — Week ${selectedRow.week}${
        selectedRow.secondWeek ? ` & ${selectedRow.secondWeek}` : ''
      }, ${selectedRow.year}`
    : null;

  if (sortedRows.length === 0) {
    return (
      <div className="regular-season-points">
        <div className="notImplementedMessage">{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div className="regular-season-points">
      <div className="two-pane-layout">
        {/* LEFT PANE */}
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

                <th onClick={() => handleSort('statValue')} className="sortable">
                  {metricLabel} {getSortIndicator('statValue')}
                </th>
              </tr>
            </thead>

            <tbody>
              {sortedRows.map((row, index) => {
                const isSelected =
                  selectedRow?.userId === row.userId &&
                  selectedRow?.year === row.year &&
                  selectedRow?.week === row.week &&
                  (selectedRow?.secondWeek ?? null) === (row.secondWeek ?? null);

                return (
                  <tr
                    key={`${row.userId}-${row.year}-${row.week}-${row.secondWeek ?? 'x'}`}
                    className={`${isSelected ? 'active selected-row' : ''} ${
                      index % 2 === 0 ? 'even-row' : 'odd-row'
                    }`}
                    onClick={() => {
                      if (allowDeselect && isSelected) {
                        setSelectedRow(null);
                      } else {
                        setSelectedRow(row);
                      }
                    }}
                  >
                    <td className="team-name-cell">
                      {row.teamName} ({row.yearsPlayed})
                    </td>

                    {/* ✅ per-year best/worst highlight is applied to the YEAR cell */}
                    <td className={getYearCellClassName(row)}>{row.year}</td>

                    <td>{row.week || '-'}</td>
                    <td>{row.opponentName || '-'}</td>

                    <td>{row.statValue.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* RIGHT PANE */}
        <div className="detail-pane-wrapper">
          {selectedRow && selectedLeague && selectedUser1 && selectedUser2 && selectedRow.week > 0 ? (
            <MatchupDisplay
              user1={selectedUser1}
              user2={selectedUser2}
              data={selectedLeague}
              week={selectedRow.week}
              secondWeek={selectedRow.secondWeek}
              title={matchupTitle}
            />
          ) : (
            <div className="notImplementedMessage">
              Select a row to see the matchup display.
              {selectedRow && selectedRow.week === 0 ? ' (Week missing/invalid.)' : ''}
              {selectedRow && selectedRow.week > 0 && (!selectedUser1 || !selectedUser2)
                ? ' (Could not resolve both teams for the matchup.)'
                : ''}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WeeklyPointsStats;
