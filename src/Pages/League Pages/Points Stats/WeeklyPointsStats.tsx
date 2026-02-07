import React, { useMemo, useState, useEffect } from 'react';
import LeagueData from '../../../Interfaces/LeagueData';
import SleeperUser from '../../../Interfaces/SleeperUser';

import MatchupDisplay from '../../../Components/MatchupDisplay';

import { findRosterByUserId, findUserByRosterId, isPlayoffWeek } from '../../../Helper Files/HelperMethods';

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

  /**
   * Optional UI: show season filters.
   * When enabled, rows are filtered by whether their week is regular season or playoffs.
   */
  showSeasonFilters?: boolean;

  /**
   * Initial values for the season filters.
   * Defaults match your desired “normal” behavior: regular season ON, playoffs OFF.
   */
  defaultIncludeRegularSeason?: boolean;
  defaultIncludePlayoffs?: boolean;
  /**
   * Season filters passed from parent component.
   * If provided, these override the local state.
   */
  includeRegularSeason?: boolean;
  includePlayoffs?: boolean;}

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

  showSeasonFilters = false,
  defaultIncludeRegularSeason = true,
  defaultIncludePlayoffs = false,
  includeRegularSeason: includeRegularSeasonProp,
  includePlayoffs: includePlayoffsProp,
}) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: defaultSort?.key ?? 'statValue',
    direction: defaultSort?.direction ?? 'descending',
  });

  const [selectedRow, setSelectedRow] = useState<WeeklyStatRow | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  const [includeRegularSeasonState, setIncludeRegularSeasonState] = useState<boolean>(
    defaultIncludeRegularSeason
  );
  const [includePlayoffsState, setIncludePlayoffsState] = useState<boolean>(defaultIncludePlayoffs);

  // Use props if provided, otherwise use local state
  const includeRegularSeason = includeRegularSeasonProp !== undefined ? includeRegularSeasonProp : includeRegularSeasonState;
  const includePlayoffs = includePlayoffsProp !== undefined ? includePlayoffsProp : includePlayoffsState;

  // IMPORTANT: determine playoffs using BOTH week and secondWeek (if present)
  const isPlayoffRow = (r: WeeklyStatRow): boolean => {
    const weekIsPlayoff = r.league ? isPlayoffWeek(r.league, r.week) : false;
    const secondWeekIsPlayoff = r.league && r.secondWeek ? isPlayoffWeek(r.league, r.secondWeek) : false;

    return weekIsPlayoff || secondWeekIsPlayoff;
  };

  const visibleRows = useMemo(() => {
    // If parent is controlling filters (props provided), always filter
    const shouldFilter = showSeasonFilters || (includeRegularSeasonProp !== undefined && includePlayoffsProp !== undefined);
    
    if (!shouldFilter) return rows;

    // If neither is selected, show nothing.
    if (!includeRegularSeason && !includePlayoffs) return [];

    return rows.filter((r) => {
      const playoff = isPlayoffRow(r);
      if (playoff) return includePlayoffs;
      return includeRegularSeason;
    });
  }, [rows, showSeasonFilters, includeRegularSeason, includePlayoffs, includeRegularSeasonProp, includePlayoffsProp]);

  // Build per-year min/max for highlighting (use *visibleRows* so highlights match filtered view)
  const yearExtremes = useMemo(() => {
    const map = new Map<number, { min: number; max: number }>();

    visibleRows.forEach((r) => {
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
  }, [visibleRows]);

  const sortedRows = useMemo(() => {
    const sorted = [...visibleRows].sort((a, b) => {
      const { key, direction } = sortConfig;
      const dir = direction === 'ascending' ? 1 : -1;

      if (key === 'teamName') return a.teamName.localeCompare(b.teamName) * dir;
      if (key === 'opponentName') return a.opponentName.localeCompare(b.opponentName) * dir;
      if (key === 'year') return (a.year - b.year) * dir;
      if (key === 'week') return (a.week - b.week) * dir;

      return (a.statValue - b.statValue) * dir;
    });

    return sorted;
  }, [visibleRows, sortConfig]);

  // If the current selection disappears due to filtering, clear it.
  useEffect(() => {
    if (!selectedRow) return;

    const stillVisible = sortedRows.some(
      (r) =>
        r.userId === selectedRow.userId &&
        r.year === selectedRow.year &&
        r.week === selectedRow.week &&
        (r.secondWeek ?? null) === (selectedRow.secondWeek ?? null)
    );

    if (!stillVisible) setSelectedRow(null);
  }, [sortedRows, selectedRow]);

  // Pick a default selection when none exists
  useEffect(() => {
    if (!selectedRow && sortedRows.length > 0) {
      setSelectedRow(sortedRows[0]);
    }
  }, [sortedRows, selectedRow]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
        {showSeasonFilters && (
          <div className="season-filter-row" style={{ marginBottom: 10 }}>
            <label style={{ marginRight: 14 }}>
              <input
                type="checkbox"
                checked={includeRegularSeason}
                onChange={(e) => setIncludeRegularSeasonState(e.target.checked)}
              />{' '}
              Include Regular Season
            </label>

            <label>
              <input
                type="checkbox"
                checked={includePlayoffs}
                onChange={(e) => setIncludePlayoffsState(e.target.checked)}
              />{' '}
              Include Playoffs
            </label>
          </div>
        )}

        <div className="notImplementedMessage">{emptyMessage}</div>
      </div>
    );
  }

  const handleBackToList = () => {
    setShowMobileDetail(false);
  };

  return (
    <div className="regular-season-points">
      {isMobile && showMobileDetail && (
        <button onClick={handleBackToList} className="mobile-back-button">
          ← Back to List
        </button>
      )}
      {showSeasonFilters && (
        <div className="season-filter-row" style={{ marginBottom: 10 }}>
          <label style={{ marginRight: 14 }}>
            <input
              type="checkbox"
              checked={includeRegularSeason}
              onChange={(e) => setIncludeRegularSeasonState(e.target.checked)}
            />{' '}
            Include Regular Season
          </label>

          <label>
            <input
              type="checkbox"
              checked={includePlayoffs}
              onChange={(e) => setIncludePlayoffsState(e.target.checked)}
            />{' '}
            Include Playoffs
          </label>
        </div>
      )}

      <div className="two-pane-layout">
        {/* LEFT PANE */}
        <div className={`main-table-pane ${isMobile && showMobileDetail ? 'mobile-hidden' : ''}`}>
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
                        if (isMobile) setShowMobileDetail(true);
                      }
                    }}
                  >
                    <td className="team-name-cell">
                      {row.teamName} ({row.yearsPlayed})
                    </td>

                    <td>{row.year}</td>

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
        <div className={`detail-pane-wrapper ${isMobile && !showMobileDetail ? 'mobile-hidden' : ''}`}>
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
