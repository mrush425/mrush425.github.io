import React, { useMemo } from 'react';
import { RecordComponentProps } from '../../../Interfaces/RecordStatItem';
import LeagueData from '../../../Interfaces/LeagueData';
import SleeperUser from '../../../Interfaces/SleeperUser';

import { calculateRecordAsOfWeek } from '../../../Helper Files/RecordCalculations';
import { getUserSeasonPlace } from '../../../Helper Files/HelperMethods';

// ---------------------------
// Types
// ---------------------------
type BucketLabel = number | '10+';

interface CellCounts {
  made: number;
  missed: number;
}

type Grid = Record<string, Record<string, CellCounts>>;

// ---------------------------
// Buckets / helpers
// ---------------------------
const W_BUCKETS: BucketLabel[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, '10+'];
const L_BUCKETS: BucketLabel[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, '10+'];

const bucketValue = (v: number): BucketLabel => (v >= 10 ? '10+' : v);
const labelKey = (b: BucketLabel) => (typeof b === 'number' ? String(b) : b);

const pct = (made: number, total: number) =>
  total === 0 ? '0.00' : ((made / total) * 100).toFixed(2);

/**
 * Infer regular season length:
 * - If playoff_week_start exists => regular season weeks = playoff_week_start - 1
 * - else fallback to 14
 */
const getRegularSeasonWeeks = (league: LeagueData): number => {
  const anyLeague = league as any;
  const pws = anyLeague?.settings?.playoff_week_start;
  if (typeof pws === 'number' && Number.isFinite(pws) && pws > 1) {
    return Math.max(1, pws - 1);
  }
  return 14;
};

// Seasons played per userId across all leagues (for your minYears filter)
const buildYearsPlayedMap = (data: LeagueData[]): Map<string, number> => {
  const m = new Map<string, number>();
  data.forEach((league) => {
    league.users?.forEach((u) => {
      m.set(u.user_id, (m.get(u.user_id) ?? 0) + 1);
    });
  });
  return m;
};

// ---------------------------
// Component
// ---------------------------
const PlayoffOddsByRecord: React.FC<RecordComponentProps & { minYears?: number }> = ({ data, minYears = 0 }) => {
  const yearsPlayedMap = useMemo(() => buildYearsPlayedMap(data), [data]);

  const { grid, totalSnapshots } = useMemo(() => {
    // init empty grid
    const g: Grid = {};
    L_BUCKETS.forEach((l) => {
      const lk = labelKey(l);
      g[lk] = {};
      W_BUCKETS.forEach((w) => {
        const wk = labelKey(w);
        g[lk][wk] = { made: 0, missed: 0 };
      });
    });

    let snapshots = 0;

    // Core logic: every year, every person, every week
    data.forEach((league) => {
      const regWeeks = getRegularSeasonWeeks(league);

      league.users?.forEach((user: SleeperUser) => {
        const userId = user.user_id;

        // Apply your "min years played" filter
        const yearsPlayed = yearsPlayedMap.get(userId) ?? 0;
        if (yearsPlayed < minYears) return;

        // Determine eventual playoff outcome for the season
        const place = getUserSeasonPlace(userId, league) ?? 0;
        const madePlayoffs = place > 0 && place <= 6;

        // Walk week snapshots
        for (let week = 1; week <= regWeeks; week++) {
          const [w, l] = calculateRecordAsOfWeek(user, week, league);

          const wb = labelKey(bucketValue(w));
          const lb = labelKey(bucketValue(l));

          if (!g[lb] || !g[lb][wb]) continue;

          if (madePlayoffs) g[lb][wb].made += 1;
          else g[lb][wb].missed += 1;

          snapshots += 1;
        }
      });
    });

    return { grid: g, totalSnapshots: snapshots };
  }, [data, minYears, yearsPlayedMap]);

  const renderCell = (cell: CellCounts) => {
    const total = cell.made + cell.missed;
    if (total === 0) return <>-</>;
    return (
      <>
        {cell.made}-{cell.missed} ({pct(cell.made, total)}%)
      </>
    );
  };

  if (!data || data.length === 0) {
    return <div className="notImplementedMessage">No league data loaded.</div>;
  }

  return (
    <div className="playoff-odds-by-record">

      <table className="statsTable">
        <thead>
          <tr>
            <th className="table-col-1">Losses</th>
            <th className="table-col-1">Wins 0</th>
            <th className="table-col-1">1</th>
            <th className="table-col-1">2</th>
            <th className="table-col-1">3</th>
            <th className="table-col-1">4</th>
            <th className="table-col-1">5</th>
            <th className="table-col-1">6</th>
            <th className="table-col-1">7</th>
            <th className="table-col-1">8</th>
            <th className="table-col-1">9</th>
            <th className="table-col-1">10+</th>
          </tr>
        </thead>

        <tbody>
          {L_BUCKETS.map((lossBucket, rowIdx) => {
            const lb = labelKey(lossBucket);
            return (
              <tr key={lb} className={rowIdx % 2 === 0 ? 'even-row' : 'odd-row'}>
                <td>{lb}</td>
                {W_BUCKETS.map((winBucket) => {
                  const wb = labelKey(winBucket);
                  const cell = grid[lb]?.[wb] ?? { made: 0, missed: 0 };
                  return <td key={`${lb}-${wb}`}>{renderCell(cell)}</td>;
                })}
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="notImplementedMessage" style={{ marginTop: '8px' }}>
        Cell format: <b>made-missed (pct%)</b>, counted from each week’s snapshot record; “made” means season place ≤ 6.
      </div>
    </div>
  );
};

export default PlayoffOddsByRecord;
