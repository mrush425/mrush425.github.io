import React, { useMemo } from 'react';
import { RecordComponentProps } from '../../../Interfaces/RecordStatItem';
import LeagueData from '../../../Interfaces/LeagueData';
import SleeperUser from '../../../Interfaces/SleeperUser';

import { calculateYearPoints } from '../../../Helper Files/PointCalculations';


import {
  getUserSeasonPlace,
  getOverallPlace
} from '../../../Helper Files/HelperMethods';

// =========================================================================
// TYPES
// =========================================================================

type Place = 1 | 2 | 3 | 4 | 5 | 6;

interface Agg {
  totalPoints: number;
  totalGames: number;
}

interface Row {
  label: string; // "Overall" or "2019"
  averageDisplay: string;
  placeDisplay: Record<Place, string>;
}

// =========================================================================
// HELPERS
// =========================================================================

const PLACES: Place[] = [1, 2, 3, 4, 5, 6];

const round2 = (n: number) => Math.round(n * 100) / 100;
const fmt2 = (n: number) => round2(n).toFixed(2);

const emptyAggs = (): Record<Place, Agg> => ({
  1: { totalPoints: 0, totalGames: 0 },
  2: { totalPoints: 0, totalGames: 0 },
  3: { totalPoints: 0, totalGames: 0 },
  4: { totalPoints: 0, totalGames: 0 },
  5: { totalPoints: 0, totalGames: 0 },
  6: { totalPoints: 0, totalGames: 0 },
});

const buildTable = (data: LeagueData[]): Row[] => {
  // year -> place -> totals
  const perYear: Record<number, Record<Place, Agg>> = {};
  const overall: Record<Place, Agg> = emptyAggs();

  data.forEach((league) => {
    const year = Number.parseInt(league.season);
    if (!Number.isFinite(year)) return;

    if (!perYear[year]) perYear[year] = emptyAggs();

    league.rosters.forEach((roster) => {
      const userId = roster.owner_id;
      if (!userId) return;

      const user = league.users.find((u) => u.user_id === userId);
      if (!user) return;

      const games =
        (roster.settings?.wins ?? 0) +
        (roster.settings?.losses ?? 0) +
        (roster.settings?.ties ?? 0);

      if (games <= 0) return;

      // ✅ Use your proven placement function (undefined -> 0)
      const placeRaw = getUserSeasonPlace(userId, league) ?? 0;

      // Only include playoff teams = places 1..6
      if (placeRaw < 1 || placeRaw > 6) return;
      const place = placeRaw as Place;

      const points = calculateYearPoints(user as SleeperUser, league);

      perYear[year][place].totalPoints += points;
      perYear[year][place].totalGames += games;

      overall[place].totalPoints += points;
      overall[place].totalGames += games;
    });
  });

  const makeRow = (label: string, aggs: Record<Place, Agg>): Row => {
    let totalPts = 0;
    let totalGames = 0;

    const placeDisplay: Record<Place, string> = {
      1: '0.00',
      2: '0.00',
      3: '0.00',
      4: '0.00',
      5: '0.00',
      6: '0.00',
    };

    PLACES.forEach((p) => {
      const g = aggs[p].totalGames;
      const pts = aggs[p].totalPoints;
      const avg = g > 0 ? pts / g : 0;

      placeDisplay[p] = fmt2(avg);

      totalPts += pts;
      totalGames += g;
    });

    const avgAll = totalGames > 0 ? totalPts / totalGames : 0;

    return {
      label,
      averageDisplay: fmt2(avgAll),
      placeDisplay,
    };
  };

  const years = Object.keys(perYear)
    .map((y) => Number.parseInt(y))
    .filter((y) => Number.isFinite(y))
    .sort((a, b) => a - b); // screenshot shows ascending years

  const rows: Row[] = [];
  rows.push(makeRow('Overall', overall));
  years.forEach((y) => rows.push(makeRow(String(y), perYear[y])));

  return rows;
};

// =========================================================================
// COMPONENT
// =========================================================================

const PlayoffTeamsAveragePoints: React.FC<RecordComponentProps> = ({ data }) => {
  const rows = useMemo(() => buildTable(data), [data]);

  if (rows.length === 0) {
    return (
      <div className="regular-season-points">
        <div className="notImplementedMessage">
          No playoff average points data available.
        </div>
      </div>
    );
  }

  return (
    <div className="regular-season-points">
      <table className="leagueStatsTable regular-season-table">
        <thead>
          <tr>
            <th className="table-col-1"></th>
            <th className="table-col-2">Average</th>
            <th className="table-col-2">1st</th>
            <th className="table-col-2">2nd</th>
            <th className="table-col-2">3rd</th>
            <th className="table-col-2">4th</th>
            <th className="table-col-2">5th</th>
            <th className="table-col-2">6th</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((r, idx) => (
            <tr key={r.label} className={idx % 2 === 0 ? 'even-row' : 'odd-row'}>
              <td className="team-name-cell">{r.label}</td>
              <td>{r.averageDisplay}</td>
              <td>{r.placeDisplay[1]}</td>
              <td>{r.placeDisplay[2]}</td>
              <td>{r.placeDisplay[3]}</td>
              <td>{r.placeDisplay[4]}</td>
              <td>{r.placeDisplay[5]}</td>
              <td>{r.placeDisplay[6]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PlayoffTeamsAveragePoints;
