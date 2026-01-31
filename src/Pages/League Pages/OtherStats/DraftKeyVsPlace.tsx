// DraftKeyVsPlace.tsx

import React, { useMemo, useState } from 'react';
import { OtherComponentProps } from '../../../Interfaces/OtherStatItem';
import LeagueData from '../../../Interfaces/LeagueData';
import yearTrollData from '../../../Data/yearTrollData.json';

/* =========================================================================
   TYPES
   ========================================================================= */

export type DraftKeyMode = 'draft_position' | 'draft_choice';

interface DraftKeyVsPlaceProps extends OtherComponentProps {
  mode: DraftKeyMode;
}

type DraftCol = number;

interface YearRow {
  year: number | 'Σ';
  byCol: Record<DraftCol, number | undefined>;
}

/* =========================================================================
   HELPERS
   ========================================================================= */

const getCurrentYear = (): string => new Date().getFullYear().toString();

const safeNumber = (v: any): number | undefined => {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

const formatAvg = (v: number): string => {
  if (!Number.isFinite(v)) return '-';
  return Math.abs(v - Math.round(v)) < 1e-9 ? v.toFixed(0) : v.toFixed(1);
};

/* =========================================================================
   BOWL DEFINITIONS
   ========================================================================= */

type BowlKey =
  | 'troll'
  | 'bengal'
  | 'koozie'
  | 'toilet'
  | 'diarrhea'
  | 'butler';

const BOWLS: {
  key: BowlKey;
  label: string;
  places: number[];
  className: string;
}[] = [
  { key: 'troll', label: 'Troll Bowl', places: [1, 2], className: 'bowl-green' },
  { key: 'bengal', label: 'Bengal Bowl', places: [3, 4], className: 'bowl-green' },
  { key: 'koozie', label: 'Koozie Bowl', places: [5, 6], className: 'bowl-green' },

  { key: 'toilet', label: 'Toilet Bowl', places: [7, 8], className: 'bowl-blue' },
  { key: 'diarrhea', label: 'Diarrhea Bowl', places: [9, 10], className: 'bowl-orange' },
  { key: 'butler', label: 'Butler Bowl', places: [11, 12], className: 'bowl-red' },
];


/* =========================================================================
   CORE TABLE BUILD
   ========================================================================= */

const buildTable = (leagueData: LeagueData[], mode: DraftKeyMode) => {
  const currentYear = getCurrentYear();
  const leagueSeasons = new Set(leagueData.map(l => l.season));

  // Completed seasons only
  const years = yearTrollData
    .map((yd: any) => safeNumber(yd.year))
    .filter((y): y is number => y !== undefined)
    .filter(y => y.toString() !== currentYear)
    .filter(y => leagueSeasons.size === 0 || leagueSeasons.has(y.toString()));

  // Determine columns dynamically (safe for future league-size changes)
  const colSet = new Set<number>();
  for (const y of years) {
    const yd = yearTrollData.find((row: any) => safeNumber(row.year) === y);
    for (const pd of yd?.data ?? []) {
      const c = safeNumber((pd as any)[mode]);
      if (c !== undefined) colSet.add(c);
    }
  }
  const columns = Array.from(colSet).sort((a, b) => a - b);

  // Build per-year rows
  const yearRows: YearRow[] = years.map((y) => {
    const yd = yearTrollData.find((row: any) => safeNumber(row.year) === y);

    const byCol: Record<number, number | undefined> = {};
    columns.forEach(c => (byCol[c] = undefined));

    for (const pd of yd?.data ?? []) {
      const col = safeNumber((pd as any)[mode]);
      const place = safeNumber((pd as any).place);

      // Keep first occurrence if collisions ever exist
      if (col !== undefined && place !== undefined && byCol[col] === undefined) {
        byCol[col] = place;
      }
    }

    return { year: y, byCol };
  });

  // Σ row (average place per column)
  const sigma: Record<number, number | undefined> = {};
  for (const c of columns) {
    let sum = 0;
    let count = 0;
    for (const row of yearRows) {
      const v = row.byCol[c];
      if (v !== undefined) {
        sum += v;
        count++;
      }
    }
    sigma[c] = count > 0 ? sum / count : undefined;
  }

  const sortedRows = yearRows.sort((a, b) => (b.year as number) - (a.year as number));

  return {
    columns,
    rows: [{ year: 'Σ' as const, byCol: sigma }, ...sortedRows],
  };
};

/* =========================================================================
   MAIN COMPONENT
   ========================================================================= */

const DraftKeyVsPlace: React.FC<DraftKeyVsPlaceProps> = ({ data, mode }) => {
  const [selectedBowls, setSelectedBowls] = useState<Set<BowlKey>>(new Set());

  const toggleBowl = (key: BowlKey) => {
    setSelectedBowls(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const clearBowls = () => setSelectedBowls(new Set());

  const placeToClass = useMemo(() => {
    const map = new Map<number, string>();
    for (const bowl of BOWLS) {
      if (!selectedBowls.has(bowl.key)) continue;
      for (const p of bowl.places) {
        map.set(p, bowl.className);
      }
    }
    return map;
  }, [selectedBowls]);

  const { columns, rows } = useMemo(
    () => buildTable(data as LeagueData[], mode),
    [data, mode]
  );

  if (columns.length === 0 || rows.length === 0) {
    return (
      <div className="regular-season-records">
        <div className="notImplementedMessage">
          No data available.
        </div>
      </div>
    );
  }

  return (
    <div className="regular-season-records">
      {/* -------------------- BOWL FILTER -------------------- */}
<div className="recordsFilter filter-style">
  <div
    style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '16px',
      alignItems: 'center',
      justifyContent: 'center',   // <-- center horizontally
      textAlign: 'center',
    }}
  >

    {BOWLS.map(bowl => (
      <label
        key={bowl.key}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          whiteSpace: 'nowrap',
        }}
      >
        <input
          type="checkbox"
          checked={selectedBowls.has(bowl.key)}
          onChange={() => toggleBowl(bowl.key)}
        />
        {bowl.label}
      </label>
    ))}

    <button
      type="button"
      className="arrowButton"
      onClick={clearBowls}
      disabled={selectedBowls.size === 0}
      style={{ padding: '4px 12px' }}
    >
      Clear
    </button>
  </div>
</div>


      {/* -------------------- TABLE -------------------- */}
      <table className="leagueStatsTable regular-season-table">
        <thead>
          <tr>
            <th className="table-col-1">Year</th>
            {columns.map(col => (
              <th key={col} className="table-col-2">{col}</th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={row.year}
              className={idx % 2 === 0 ? 'even-row' : 'odd-row'}
            >
              <td>{row.year}</td>

              {columns.map(col => {
                const v = row.byCol[col];

                if (row.year === 'Σ') {
                  return (
                    <td key={col}>
                      {v === undefined ? '-' : formatAvg(v)}
                    </td>
                  );
                }

                const highlightClass =
                  v !== undefined ? (placeToClass.get(v) ?? '') : '';

                return (
                  <td key={col} className={highlightClass}>
                    {v === undefined ? '-' : v}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
  );
};

export default DraftKeyVsPlace;
