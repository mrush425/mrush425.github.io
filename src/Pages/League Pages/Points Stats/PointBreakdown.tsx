import React, { useCallback, useMemo, useState } from 'react';
import LeagueData from '../../../Interfaces/LeagueData';
import {
  findRosterByUserId,
  isCurrentActiveWeek,
  isPlayoffWeek,
} from '../../../Helper Files/HelperMethods';

// =========================================================================
// SHARED CONSTANTS & TYPES (exported for reuse in TrollHome, etc.)
// =========================================================================

/**
 * Column header labels for each scoring bucket.
 * <50 means 0–49.99, <60 means 50–59.99, etc.
 * The first and last buckets are open-ended.
 */
export const BUCKET_LABELS = [
  '<50', '<60', '<70', '<80', '<90', '<100',
  '<110', '<120', '<130', '<140', '<150', '≥150',
];

/** [min, max) for each bucket. Last bucket uses Infinity. */
export const BUCKET_RANGES: [number, number][] = [
  [0, 50],
  [50, 60],
  [60, 70],
  [70, 80],
  [80, 90],
  [90, 100],
  [100, 110],
  [110, 120],
  [120, 130],
  [130, 140],
  [140, 150],
  [150, Infinity],
];

export interface PointBreakdownRow {
  userId: string;
  teamName: string;
  yearsPlayed: number;
  buckets: number[];   // length === BUCKET_LABELS.length
  bucketRecords: { wins: number; losses: number; ties: number }[];
  totalGames: number;
}

// =========================================================================
// HELPERS
// =========================================================================

function getBucketIndex(points: number): number {
  for (let i = 0; i < BUCKET_RANGES.length; i++) {
    const [min, max] = BUCKET_RANGES[i];
    if (points >= min && points < max) return i;
  }
  return BUCKET_RANGES.length - 1; // ≥150
}

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
 * Builds point-breakdown rows for every user (or a single user if filterUserId is set).
 * Exported so TrollHome can reuse the calculation without rendering the full table.
 */
export const buildPointBreakdownRows = (
  data: LeagueData[],
  includeRegularSeason: boolean = true,
  includePlayoffs: boolean = false,
  filterUserId?: string
): PointBreakdownRow[] => {
  const yearsPlayedMap = buildYearsPlayedMap(data);

  const userBuckets = new Map<
    string,
    {
      teamName: string;
      buckets: number[];
      bucketRecords: { wins: number; losses: number; ties: number }[];
      totalGames: number;
    }
  >();

  data.forEach((league) => {
    league.users.forEach((user) => {
      if (filterUserId && user.user_id !== filterUserId) return;

      const roster = findRosterByUserId(user.user_id, league.rosters);
      if (!roster) return;

      if (!userBuckets.has(user.user_id)) {
        userBuckets.set(user.user_id, {
          teamName:
            user.metadata?.team_name ||
            `User ${user.user_id.substring(0, 4)}`,
          buckets: new Array(BUCKET_LABELS.length).fill(0),
          bucketRecords: BUCKET_LABELS.map(() => ({ wins: 0, losses: 0, ties: 0 })),
          totalGames: 0,
        });
      }

      const entry = userBuckets.get(user.user_id)!;

      league.matchupInfo.forEach((weekInfo) => {
        if (isCurrentActiveWeek(league, weekInfo.week)) return;

        const playoff = isPlayoffWeek(league, weekInfo.week);
        if (playoff && !includePlayoffs) return;
        if (!playoff && !includeRegularSeason) return;

        const matchup = weekInfo.matchups.find(
          (m) => m.roster_id === roster.roster_id
        );
        if (!matchup) return;

        // Verify opponent exists (skip byes)
        const opponent = weekInfo.matchups.find(
          (m) =>
            m.matchup_id === matchup.matchup_id &&
            m.roster_id !== roster.roster_id
        );
        if (!opponent) return;

        const points = matchup.points ?? 0;
        if (points === 0) return; // Skip unplayed weeks

        const idx = getBucketIndex(points);
        entry.buckets[idx]++;
        if (points > (opponent.points ?? 0)) {
          entry.bucketRecords[idx].wins++;
        } else if (points < (opponent.points ?? 0)) {
          entry.bucketRecords[idx].losses++;
        } else {
          entry.bucketRecords[idx].ties++;
        }
        entry.totalGames++;
      });

      // Keep team name up-to-date with the most recent season
      entry.teamName =
        user.metadata?.team_name || entry.teamName;
    });
  });

  const rows: PointBreakdownRow[] = [];
  userBuckets.forEach((entry, userId) => {
    rows.push({
      userId,
      teamName: entry.teamName,
      yearsPlayed: yearsPlayedMap.get(userId) ?? 0,
      buckets: entry.buckets,
      bucketRecords: entry.bucketRecords,
      totalGames: entry.totalGames,
    });
  });

  return rows;
};

// =========================================================================
// COMPONENT (full table view for Points Stats page)
// =========================================================================

interface PointBreakdownProps {
  data: LeagueData[];
  minYears?: number;
  includeRegularSeason?: boolean;
  includePlayoffs?: boolean;
  resultFilter?: ResultFilter;
  percentageMode?: boolean;
}

type ResultFilter = 'all' | 'wins' | 'losses';
type SortKey = 'teamName' | number;

interface SelectedBucket {
  userId: string;
  bucketIndex: number;
}

interface PointBreakdownGame {
  season: string;
  week: number;
  opponent: string;
  score: number;
  opponentScore: number;
}

const PointBreakdown: React.FC<PointBreakdownProps> = ({
  data,
  minYears = 0,
  includeRegularSeason = true,
  includePlayoffs = false,
  resultFilter = 'all',
  percentageMode = false,
}) => {
  const [sortKey, setSortKey] = useState<SortKey>(0);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedBucket, setSelectedBucket] = useState<SelectedBucket | null>(null);

  const rows = useMemo(() => {
    return buildPointBreakdownRows(
      data,
      includeRegularSeason,
      includePlayoffs
    ).filter((r) => r.yearsPlayed >= minYears);
  }, [data, minYears, includeRegularSeason, includePlayoffs]);

  const getResultCount = useCallback(
    (row: PointBreakdownRow, bucketIndex: number): number => {
      if (resultFilter === 'all') return row.buckets[bucketIndex];
      return row.bucketRecords[bucketIndex][resultFilter];
    },
    [resultFilter]
  );

  const getResultValue = useCallback(
    (row: PointBreakdownRow, bucketIndex: number): number => {
      const count = getResultCount(row, bucketIndex);
      if (!percentageMode) return count;

      const denominator =
        resultFilter === 'all' ? row.totalGames : row.buckets[bucketIndex];
      return denominator > 0 ? (count / denominator) * 100 : 0;
    },
    [getResultCount, percentageMode, resultFilter]
  );

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const dir = sortDirection === 'asc' ? 1 : -1;
      if (sortKey === 'teamName')
        return a.teamName.localeCompare(b.teamName) * dir;
      if (typeof sortKey === 'number')
        return (getResultValue(a, sortKey) - getResultValue(b, sortKey)) * dir;
      return 0;
    });
  }, [rows, getResultValue, sortKey, sortDirection]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  const getSortIndicator = (key: SortKey) => {
    if (sortKey !== key) return '';
    return sortDirection === 'asc' ? ' ▲' : ' ▼';
  };

  const selectedRow = selectedBucket
    ? rows.find((row) => row.userId === selectedBucket.userId)
    : undefined;

  const selectedGames = useMemo(() => {
    if (!selectedBucket || !selectedRow) return [];

    const games: PointBreakdownGame[] = [];
    data.forEach((league) => {
      const user = league.users.find(
        (leagueUser) => leagueUser.user_id === selectedBucket.userId
      );
      if (!user) return;

      const roster = findRosterByUserId(user.user_id, league.rosters);
      if (!roster) return;

      league.matchupInfo.forEach((weekInfo) => {
        if (isCurrentActiveWeek(league, weekInfo.week)) return;

        const playoff = isPlayoffWeek(league, weekInfo.week);
        if (playoff && !includePlayoffs) return;
        if (!playoff && !includeRegularSeason) return;

        const matchup = weekInfo.matchups.find(
          (weekMatchup) => weekMatchup.roster_id === roster.roster_id
        );
        if (!matchup) return;

        const opponent = weekInfo.matchups.find(
          (weekMatchup) =>
            weekMatchup.matchup_id === matchup.matchup_id &&
            weekMatchup.roster_id !== roster.roster_id
        );
        if (!opponent) return;

        const score = matchup.points ?? 0;
        if (
          score === 0 ||
          getBucketIndex(score) !== selectedBucket.bucketIndex
        ) {
          return;
        }

        const opponentScore = opponent.points ?? 0;
        if (resultFilter === 'wins' && score <= opponentScore) return;
        if (resultFilter === 'losses' && score >= opponentScore) return;

        const opponentRoster = league.rosters.find(
          (leagueRoster) => leagueRoster.roster_id === opponent.roster_id
        );
        const opponentUser = league.users.find(
          (leagueUser) => leagueUser.user_id === opponentRoster?.owner_id
        );

        games.push({
          season: league.season,
          week: weekInfo.week,
          opponent:
            opponentUser?.metadata?.team_name ||
            opponentUser?.display_name ||
            opponentRoster?.owner_id ||
            'Unknown',
          score,
          opponentScore,
        });
      });
    });

    return games.sort(
      (a, b) =>
        Number(b.season) - Number(a.season) || a.week - b.week
    );
  }, [
    data,
    includePlayoffs,
    includeRegularSeason,
    resultFilter,
    selectedBucket,
    selectedRow,
  ]);

  const maxPerBucket = useMemo(() => {
    const maxes = new Array(BUCKET_LABELS.length).fill(0);
    sortedRows.forEach((r) => {
      BUCKET_LABELS.forEach((_, i) => {
        const val = getResultValue(r, i);
        if (val > maxes[i]) maxes[i] = val;
      });
    });
    return maxes;
  }, [sortedRows, getResultValue]);

  if (sortedRows.length === 0) {
    return (
      <div className="regular-season-points">
        <div className="notImplementedMessage">
          No point breakdown data available.
        </div>
      </div>
    );
  }

  return (
    <div className="regular-season-points point-breakdown-layout">
      <div className="point-breakdown-main">
        <div className="point-breakdown-table-scroll">
          <table className="leagueStatsTable regular-season-table point-breakdown-table">
            <thead>
              <tr>
                <th
                  onClick={() => handleSort('teamName')}
                  className="sortable"
                  style={{
                    position: 'sticky',
                    left: 0,
                    zIndex: 2,
                    background: 'inherit',
                    width: '130px',
                    minWidth: '130px',
                  }}
                >
                  Team (Years){getSortIndicator('teamName')}
                </th>
                {BUCKET_LABELS.map((label, i) => (
                <th
                  key={label}
                  onClick={() => handleSort(i)}
                  className="sortable"
                  style={{ textAlign: 'center', minWidth: '50px' }}
                >
                  {label}
                  {getSortIndicator(i)}
                </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row, rowIdx) => (
                <tr
                  key={row.userId}
                  className={rowIdx % 2 === 0 ? 'even-row' : 'odd-row'}
                >
                  <td
                    className="team-name-cell"
                    style={{
                      position: 'sticky',
                      left: 0,
                      zIndex: 1,
                      background: 'inherit',
                      width: '130px',
                      minWidth: '130px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {row.teamName} ({row.yearsPlayed})
                  </td>
                  {BUCKET_LABELS.map((_, i) => {
                    const count = getResultCount(row, i);
                    const value = getResultValue(row, i);
                    const isSelected =
                      selectedBucket?.userId === row.userId &&
                      selectedBucket.bucketIndex === i;
                    return (
                      <td
                        key={i}
                        className={
                          isSelected ? 'point-breakdown-selected-cell' : undefined
                        }
                        style={{
                          textAlign: 'center',
                          fontWeight:
                            value === maxPerBucket[i] && value > 0 ? 700 : 400,
                          color:
                            value === maxPerBucket[i] && value > 0
                              ? resultFilter === 'losses' ||
                                (resultFilter === 'all' &&
                                  BUCKET_RANGES[i][1] <= 100)
                                ? '#ef4444'
                                : '#22c55e'
                              : 'inherit',
                        }}
                      >
                        <button
                          type="button"
                          className="point-breakdown-cell-button"
                          aria-label={`${row.teamName}, ${BUCKET_LABELS[i]} points, ${percentageMode ? `${value.toFixed(1)} percent` : `${count} ${resultFilter === 'all' ? 'games' : resultFilter}`}`}
                          aria-pressed={isSelected}
                          onClick={() =>
                            setSelectedBucket({
                              userId: row.userId,
                              bucketIndex: i,
                            })
                          }
                        >
                          {percentageMode ? `${value.toFixed(1)}%` : count}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <aside className="point-breakdown-details">
        <h3>
          {selectedBucket && selectedRow
            ? `${selectedRow.teamName} — ${BUCKET_LABELS[selectedBucket.bucketIndex]}`
            : 'Game Details'}
        </h3>
        <p>
          {selectedBucket
            ? `${resultFilter === 'all' ? 'All results' : `${resultFilter.charAt(0).toUpperCase()}${resultFilter.slice(1)} only`} · ${selectedGames.length} game${selectedGames.length === 1 ? '' : 's'}${resultFilter === 'all' ? ` out of ${selectedRow?.totalGames ?? 0} games` : ''}`
            : 'Select a value in the table to see the weeks.'}
        </p>
        {selectedBucket && selectedRow && (
          <div className="point-breakdown-details-scroll">
            <table className="leagueStatsTable point-breakdown-detail-table">
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Week</th>
                  <th>Opponent</th>
                  <th>Score</th>
                  <th>Opp Score</th>
                </tr>
              </thead>
              <tbody>
                {selectedGames.length > 0 ? (
                  selectedGames.map((game, index) => (
                    <tr key={`${game.season}-${game.week}-${index}`}>
                      <td>{game.season}</td>
                      <td>{game.week}</td>
                      <td>{game.opponent}</td>
                      <td>{game.score.toFixed(2)}</td>
                      <td>{game.opponentScore.toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5}>No games match this selection.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </aside>
    </div>
  );
};

export default PointBreakdown;
