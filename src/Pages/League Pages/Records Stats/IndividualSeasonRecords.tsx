import React, { useMemo, useState, useEffect } from 'react';
import { RecordComponentProps } from '../../../Interfaces/RecordStatItem';
import LeagueData from '../../../Interfaces/LeagueData';
import SleeperUser from '../../../Interfaces/SleeperUser';

import { getRecordWinPercentage } from '../../../Helper Files/RecordCalculations';
import { getOverallPlace } from '../../../Helper Files/HelperMethods';

// ✅ NEW: shared right pane
import WeeklyMatchupsPane from '../../Reusable Components/WeeklyMatchupsPane';

// =========================================================================
// TYPES
// =========================================================================

interface SeasonRow {
  userId: string;
  teamName: string;
  yearsPlayed: number;

  season: number;

  wins: number;
  losses: number;
  ties: number;

  winPct: string;
  winPctValue: number;

  overallPlace: number;
}

type SortKey = 'teamName' | 'season' | 'winPctValue' | 'overallPlace';

interface SortConfig {
  key: SortKey;
  direction: 'ascending' | 'descending';
}

interface MaxMinStats {
  winPctValue: { max: number; min: number };
  overallPlace: { max: number; min: number };
}

// =========================================================================
// HELPERS
// =========================================================================

const getPctValue = (pctString: string) => parseFloat(pctString.replace('%', ''));

const safeTeamName = (u: SleeperUser) =>
  u?.metadata?.team_name || `User ${u.user_id.substring(0, 4)}`;

const buildYearsPlayedMap = (data: LeagueData[]) => {
  const map = new Map<string, number>();
  data.forEach((league) => {
    league.users?.forEach((u) => {
      map.set(u.user_id, (map.get(u.user_id) ?? 0) + 1);
    });
  });
  return map;
};

// =========================================================================
// CORE: BUILD ALL SEASON ROWS
// =========================================================================

const buildSeasonRows = (data: LeagueData[]): SeasonRow[] => {
  const yearsPlayedMap = buildYearsPlayedMap(data);
  const rows: SeasonRow[] = [];

  data.forEach((league) => {
    const season = Number.parseInt(league.season);

    league.users?.forEach((user) => {
      const roster = league.rosters?.find((r) => r.owner_id === user.user_id);
      if (!roster) return;

      const wins = roster.settings.wins ?? 0;
      const losses = roster.settings.losses ?? 0;
      const ties = roster.settings.ties ?? 0;

      const winPct = getRecordWinPercentage(wins, losses, ties);
      const winPctValue = getPctValue(winPct);

      const overallPlace = getOverallPlace(user.user_id, season.toString()) ?? 0;

      rows.push({
        userId: user.user_id,
        teamName: safeTeamName(user),
        yearsPlayed: yearsPlayedMap.get(user.user_id) ?? 0,

        season,
        wins,
        losses,
        ties,

        winPct,
        winPctValue,
        overallPlace,
      });
    });
  });

  return rows;
};

// =========================================================================
// MAIN COMPONENT
// =========================================================================

const SeasonRecords: React.FC<RecordComponentProps & { minYears?: number }> = ({
  data,
  minYears = 0,
}) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'winPctValue',
    direction: 'descending',
  });

  const [selectedRow, setSelectedRow] = useState<SeasonRow | null>(null);

  const { filteredSortedRows, maxMin } = useMemo(() => {
    const all = buildSeasonRows(data);
    const filtered = all.filter((r) => r.yearsPlayed >= minYears);

    if (filtered.length === 0) {
      return {
        filteredSortedRows: [] as SeasonRow[],
        maxMin: {
          winPctValue: { max: 0, min: 0 },
          overallPlace: { max: 0, min: 0 },
        } as MaxMinStats,
      };
    }

    const winPcts = filtered.map((r) => r.winPctValue);
    const places = filtered.map((r) => r.overallPlace).filter((p) => p > 0);

    const mm: MaxMinStats = {
      winPctValue: { max: Math.max(...winPcts), min: Math.min(...winPcts) },
      overallPlace: places.length
        ? { max: Math.max(...places), min: Math.min(...places) }
        : { max: 0, min: 0 },
    };

    const sorted = [...filtered].sort((a, b) => {
      const dir = sortConfig.direction === 'ascending' ? 1 : -1;

      if (sortConfig.key === 'teamName') {
        if (a.teamName < b.teamName) return -1 * dir;
        if (a.teamName > b.teamName) return 1 * dir;
        return (b.season - a.season) * dir;
      }

      if (sortConfig.key === 'season') return (a.season - b.season) * dir;
      if (sortConfig.key === 'winPctValue') return (a.winPctValue - b.winPctValue) * dir;
      if (sortConfig.key === 'overallPlace') return (a.overallPlace - b.overallPlace) * dir;

      return 0;
    });

    return { filteredSortedRows: sorted, maxMin: mm };
  }, [data, minYears, sortConfig]);

  useEffect(() => {
    if (!selectedRow && filteredSortedRows.length > 0) {
      setSelectedRow(filteredSortedRows[0]);
    }
  }, [filteredSortedRows, selectedRow]);

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => {
      const defaultDir: SortConfig['direction'] =
        key === 'overallPlace' ? 'ascending' : 'descending';

      if (prev.key !== key) return { key, direction: defaultDir };
      return { key, direction: prev.direction === 'descending' ? 'ascending' : 'descending' };
    });
  };

  const getSortIndicator = (key: SortKey) =>
    sortConfig.key === key
      ? sortConfig.direction === 'ascending'
        ? ' ▲'
        : ' ▼'
      : null;

  const getCellClassName = (key: keyof MaxMinStats, value: number) => {
    const { max, min } = maxMin[key];
    if (max === min) return '';
    if (value === max) return 'highlight-best';
    if (value === min) return 'highlight-worst';
    return '';
  };

  if (filteredSortedRows.length === 0) {
    return (
      <div className="notImplementedMessage">
        No season record data found for the current filter settings (min years: {minYears}).
      </div>
    );
  }

  return (
    <div className="season-records">
      <div className="two-pane-layout">
        {/* LEFT TABLE */}
        <div className="main-table-pane">
          <table className="statsTable selectable-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('teamName')} className="table-col-team sortable">
                  Team (Years) {getSortIndicator('teamName')}
                </th>
                <th onClick={() => handleSort('season')} className="table-col-2 sortable">
                  Season {getSortIndicator('season')}
                </th>
                <th onClick={() => handleSort('winPctValue')} className="table-col-2 sortable">
                  Win % {getSortIndicator('winPctValue')}
                </th>
                <th onClick={() => handleSort('overallPlace')} className="table-col-2 sortable">
                  Overall Place {getSortIndicator('overallPlace')}
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredSortedRows.map((r, idx) => (
                <tr
                  key={`${r.userId}-${r.season}`}
                  className={`${selectedRow?.userId === r.userId && selectedRow?.season === r.season
                    ? 'active selected-row'
                    : ''
                    } ${idx % 2 === 0 ? 'even-row' : 'odd-row'}`}
                  onClick={() =>
                    setSelectedRow((prev) =>
                      prev?.userId === r.userId && prev?.season === r.season ? null : r
                    )
                  }
                >
                  <td className="team-name-cell">
                    {r.teamName} ({r.yearsPlayed})
                  </td>
                  <td>{r.season}</td>
                  <td className={getCellClassName('winPctValue', r.winPctValue)}>
                    {r.wins}-{r.losses}
                    {r.ties > 0 ? `-${r.ties}` : ''} ({r.winPct})
                  </td>

                  {/* If you want NO color on Overall Place, remove className here */}
                  <td>{r.overallPlace || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* RIGHT PANE */}
        <div className="detail-pane-wrapper">
          {selectedRow ? (
            <WeeklyMatchupsPane
              allLeagues={data}
              userId={selectedRow.userId}
              season={selectedRow.season}
            />
          ) : (
            <div className="notImplementedMessage">
              Select a season row to see weekly matchups.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SeasonRecords;
