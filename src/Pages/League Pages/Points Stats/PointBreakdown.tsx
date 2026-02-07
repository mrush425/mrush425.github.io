import React, { useMemo, useState } from 'react';
import LeagueData from '../../../Interfaces/LeagueData';
import { findRosterByUserId, isPlayoffWeek } from '../../../Helper Files/HelperMethods';

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
    { teamName: string; buckets: number[]; totalGames: number }
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
          totalGames: 0,
        });
      }

      const entry = userBuckets.get(user.user_id)!;

      league.matchupInfo.forEach((weekInfo) => {
        const playoff = isPlayoffWeek(league, weekInfo.week);
        if (playoff && !includePlayoffs) return;
        if (!playoff && !includeRegularSeason) return;

        const matchup = weekInfo.matchups.find(
          (m) => m.roster_id === roster.roster_id
        );
        if (!matchup) return;

        // Verify opponent exists (skip byes)
        const hasOpponent = weekInfo.matchups.some(
          (m) =>
            m.matchup_id === matchup.matchup_id &&
            m.roster_id !== roster.roster_id
        );
        if (!hasOpponent) return;

        const points = matchup.points ?? 0;
        if (points === 0) return; // Skip unplayed weeks

        const idx = getBucketIndex(points);
        entry.buckets[idx]++;
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
}

type SortKey = 'teamName' | 'totalGames' | number;

const PointBreakdown: React.FC<PointBreakdownProps> = ({
  data,
  minYears = 0,
  includeRegularSeason = true,
  includePlayoffs = false,
}) => {
  const [sortKey, setSortKey] = useState<SortKey>('totalGames');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const rows = useMemo(() => {
    return buildPointBreakdownRows(
      data,
      includeRegularSeason,
      includePlayoffs
    ).filter((r) => r.yearsPlayed >= minYears);
  }, [data, minYears, includeRegularSeason, includePlayoffs]);

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const dir = sortDirection === 'asc' ? 1 : -1;
      if (sortKey === 'teamName')
        return a.teamName.localeCompare(b.teamName) * dir;
      if (sortKey === 'totalGames')
        return (a.totalGames - b.totalGames) * dir;
      if (typeof sortKey === 'number')
        return (a.buckets[sortKey] - b.buckets[sortKey]) * dir;
      return 0;
    });
  }, [rows, sortKey, sortDirection]);

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

  // Highlight the max value in each bucket column
  const maxPerBucket = useMemo(() => {
    const maxes = new Array(BUCKET_LABELS.length).fill(0);
    sortedRows.forEach((r) => {
      r.buckets.forEach((val, i) => {
        if (val > maxes[i]) maxes[i] = val;
      });
    });
    return maxes;
  }, [sortedRows]);

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
    <div className="regular-season-points">
      <div style={{ overflowX: 'auto' }}>
        <table className="leagueStatsTable regular-season-table" style={{ width: '100%', tableLayout: 'fixed' }}>
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
                {row.buckets.map((count, i) => (
                  <td
                    key={i}
                    style={{
                      textAlign: 'center',
                      fontWeight:
                        count === maxPerBucket[i] && count > 0 ? 700 : 400,
                      color:
                        count === maxPerBucket[i] && count > 0
                          ? '#22c55e'
                          : 'inherit',
                    }}
                  >
                    {count}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PointBreakdown;
