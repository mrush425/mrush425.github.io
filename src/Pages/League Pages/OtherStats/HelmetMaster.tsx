import React, { useMemo, useState } from 'react';
import { RecordComponentProps } from '../../../Interfaces/RecordStatItem';
import LeagueData from '../../../Interfaces/LeagueData';
import SleeperUser from '../../../Interfaces/SleeperUser';

import SidebetMethods from '../../../Helper Files/SidebetMethods';
import SidebetStat from '../../../Interfaces/SidebetStat';

// =========================================================================
// TYPES
// =========================================================================

interface HelmetMasterPerfectRow {
  userId: string;
  teamName: string;
  yearsPlayed: number;

  year: number;
  nflTeam: string;
  record: string;
}

// =========================================================================
// HELPERS
// =========================================================================

const buildYearsPlayedMap = (allLeagues: LeagueData[]): Map<string, number> => {
  const map = new Map<string, number>();
  allLeagues.forEach((league) => {
    league.users.forEach((u) => {
      map.set(u.user_id, (map.get(u.user_id) ?? 0) + 1);
    });
  });
  return map;
};

const getTeamName = (league: LeagueData, user: SleeperUser): string =>
  user.metadata?.team_name || `User ${user.user_id.substring(0, 4)}`;

/**
 * stats_display format:
 * "<NFL Team> (Guessed: X-Y(-Z) (...%), Actual: A-B(-C) (...%))"
 */
const parseHelmetMasterDisplay = (display?: string): {
  nflTeam: string;
  record: string;
} => {
  if (!display) return { nflTeam: '', record: '' };

  const nflTeam = display.split(' (')[0]?.trim() ?? '';
  const actualMatch = display.match(/Actual:\s*([0-9]+-[0-9]+(?:-[0-9]+)?)/i);

  return {
    nflTeam,
    record: actualMatch?.[1] ?? '',
  };
};

/**
 * Determine "perfect" by comparing guessed record and actual record from stats_display.
 * This avoids floating/rounding issues with winPercent differences.
 */
const isPerfectHelmetMaster = (display?: string): boolean => {
  if (!display) return false;

  const guessedMatch = display.match(/Guessed:\s*([0-9]+-[0-9]+(?:-[0-9]+)?)/i);
  const actualMatch = display.match(/Actual:\s*([0-9]+-[0-9]+(?:-[0-9]+)?)/i);

  const guessed = guessedMatch?.[1]?.trim() ?? '';
  const actual = actualMatch?.[1]?.trim() ?? '';

  return guessed !== '' && guessed === actual;
};

const buildPerfectHelmetMasterRows = (allLeagues: LeagueData[]): HelmetMasterPerfectRow[] => {
  const yearsPlayedMap = buildYearsPlayedMap(allLeagues);
  const rows: HelmetMasterPerfectRow[] = [];

  allLeagues.forEach((league) => {
    const year = Number.parseInt(league.season);
    if (!Number.isFinite(year)) return;

    const stats: SidebetStat[] = SidebetMethods.HelmetMaster(league);

    stats.forEach((s) => {
      const user = s.user;
      if (!user) return;

      // ✅ Perfect match only (record equality)
      if (!isPerfectHelmetMaster(s.stats_display)) return;

      const { nflTeam, record } = parseHelmetMasterDisplay(s.stats_display);

      rows.push({
        userId: user.user_id,
        teamName: getTeamName(league, user as SleeperUser),
        yearsPlayed: yearsPlayedMap.get(user.user_id) ?? 0,

        year,
        nflTeam,
        record,
      });
    });
  });

  // Newest first, then team name
  rows.sort((a, b) => b.year - a.year || a.teamName.localeCompare(b.teamName));

  return rows;
};

// =========================================================================
// COMPONENT
// =========================================================================

const HelmetMasterPerfect: React.FC<RecordComponentProps & { minYears?: number }> = ({
  data,
  minYears = 0,
}) => {
  const [sortColumn, setSortColumn] = useState<string>('year');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const rows = useMemo(() => {
    return buildPerfectHelmetMasterRows(data).filter((r) => r.yearsPlayed >= minYears);
  }, [data, minYears]);

  const sortedRows = useMemo(() => {
    const sorted = [...rows];
    sorted.sort((a, b) => {
      let aValue: any = '';
      let bValue: any = '';

      switch (sortColumn) {
        case 'teamName':
          aValue = a.teamName.toLowerCase();
          bValue = b.teamName.toLowerCase();
          break;
        case 'year':
          aValue = a.year;
          bValue = b.year;
          break;
        case 'yearsPlayed':
          aValue = a.yearsPlayed;
          bValue = b.yearsPlayed;
          break;
        case 'nflTeam':
          aValue = a.nflTeam.toLowerCase();
          bValue = b.nflTeam.toLowerCase();
          break;
        case 'record':
          aValue = a.record;
          bValue = b.record;
          break;
        default:
          aValue = a.year;
          bValue = b.year;
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    return sorted;
  }, [rows, sortColumn, sortDirection]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection(column === 'year' ? 'desc' : 'asc');
    }
  };

  if (sortedRows.length === 0) {
    return (
      <div className="notImplementedMessage">
        No perfect Helmet Master picks found (min years: {minYears}).
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 700,
        width: '100%',
        margin: '0 auto', // ✅ center horizontally
      }}
    >
      <table className="leagueStatsTable regular-season-table">
        <thead>
          <tr>
            <th 
              className={`sortable ${sortColumn === 'teamName' ? `sorted-${sortDirection}` : ''}`}
              onClick={() => handleSort('teamName')}
            >
              Team (Years)
            </th>
            <th 
              className={`sortable ${sortColumn === 'year' ? `sorted-${sortDirection}` : ''}`}
              onClick={() => handleSort('year')}
            >
              Year
            </th>
            <th 
              className={`sortable ${sortColumn === 'nflTeam' ? `sorted-${sortDirection}` : ''}`}
              onClick={() => handleSort('nflTeam')}
            >
              NFL Team
            </th>
            <th 
              className={`sortable ${sortColumn === 'record' ? `sorted-${sortDirection}` : ''}`}
              onClick={() => handleSort('record')}
            >
              Record
            </th>
          </tr>
        </thead>

        <tbody>
          {sortedRows.map((r, idx) => (
            <tr
              key={`${r.userId}-${r.year}-${r.nflTeam}-${idx}`}
              className={idx % 2 === 0 ? 'even-row' : 'odd-row'}
            >
              <td className="team-name-cell">
                {r.teamName} ({r.yearsPlayed})
              </td>
              <td>{r.year}</td>
              <td>{r.nflTeam || '-'}</td>
              <td>{r.record || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default HelmetMasterPerfect;
