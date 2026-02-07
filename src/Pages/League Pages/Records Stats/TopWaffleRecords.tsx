import React, { useMemo, useState } from 'react';
import { RecordComponentProps } from '../../../Interfaces/RecordStatItem';
import LeagueData from '../../../Interfaces/LeagueData';
import SleeperUser from '../../../Interfaces/SleeperUser';

import SidebetMethods from '../../../Helper Files/SidebetMethods';
import SidebetStat from '../../../Interfaces/SidebetStat';

const yearsPlayedMap = (data: LeagueData[]): Map<string, number> => {
  const map = new Map<string, number>();
  data.forEach(league => {
    league.users.forEach(u => {
      map.set(u.user_id, (map.get(u.user_id) ?? 0) + 1);
    });
  });
  return map;
};

const pct = (w: number, l: number, t: number) => {
  const g = w + l + t;
  if (g === 0) return '0.00%';
  return ((w * 100) / g).toFixed(2) + '%';
};

const pctVal = (w: number, l: number, t: number) => {
  const g = w + l + t;
  return g === 0 ? 0 : (w * 100) / g;
};

const recordStr = (w: number, l: number, t: number) => `${w}-${l}-${t}`;

interface Row {
  userId: string;
  teamName: string;
  yearsPlayed: number;
  season: number;
  wins: number;
  losses: number;
  ties: number;
  pctStr: string;
  pctVal: number;
}

type SortKey = 'teamName' | 'pctVal' | 'season';
interface SortConfig {
  key: SortKey;
  direction: 'ascending' | 'descending';
}

const TopWaffleSeasons: React.FC<RecordComponentProps> = ({ data, minYears = 0 }) => {
  // Start sorted ascending so hardest seasons (lowest %) appear first
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'pctVal', direction: 'ascending' });

  const allRows = useMemo<Row[]>(() => {
    const yp = yearsPlayedMap(data);
    const out: Row[] = [];

    data.forEach(league => {
      const waffleStats: SidebetStat[] = SidebetMethods.Waffle(league);
      waffleStats.forEach(s => {
        const u = s.user as SleeperUser | undefined;
        const wins = s.stats_record?.wins ?? 0;
        const losses = s.stats_record?.losses ?? 0;
        const ties = s.stats_record?.ties ?? 0;
        if (!u) return;

        const teamName = u.metadata?.team_name || `User ${u.user_id.slice(0, 4)}`;
        const seasonNum = Number.parseInt(league.season);
        out.push({
          userId: u.user_id,
          teamName,
          yearsPlayed: yp.get(u.user_id) ?? 1,
          season: seasonNum,
          wins,
          losses,
          ties,
          pctStr: pct(wins, losses, ties),
          pctVal: pctVal(wins, losses, ties),
        });
      });
    });

    return out;
  }, [data]);

  const rows = useMemo<Row[]>(() => {
    const items = allRows.filter(r => r.yearsPlayed >= minYears);
    const { key, direction } = sortConfig;

    items.sort((a, b) => {
      if (key === 'teamName') {
        if (a.teamName < b.teamName) return direction === 'ascending' ? -1 : 1;
        if (a.teamName > b.teamName) return direction === 'ascending' ? 1 : -1;
        return direction === 'ascending' ? a.season - b.season : b.season - a.season;
      }
      if (key === 'season') {
        return direction === 'ascending' ? a.season - b.season : b.season - a.season;
      }
      if (a.pctVal !== b.pctVal) return direction === 'ascending' ? a.pctVal - b.pctVal : b.pctVal - a.pctVal;
      if (a.wins !== b.wins) return direction === 'ascending' ? a.wins - b.wins : b.wins - a.wins;
      return direction === 'ascending' ? a.season - b.season : b.season - a.season;
    });

    return items;
  }, [allRows, sortConfig, minYears]);

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'ascending' ? 'descending' : 'ascending' };
      }
      const defaultDir = key === 'pctVal' ? 'ascending' : 'ascending';
      return { key, direction: defaultDir };
    });
  };

  const sortIndicator = (key: SortKey) => (sortConfig.key === key ? (sortConfig.direction === 'ascending' ? ' \u25B2' : ' \u25BC') : null);

  if (rows.length === 0) {
    return (
      <div className="regular-season-records">
        <div className="notImplementedMessage">No Waffle seasons available.</div>
      </div>
    );
  }

  return (
    <div className="regular-season-records" style={{ display: 'flex', justifyContent: 'center' }}>
      <div style={{ maxWidth: 900, width: '100%' }}>
        <table className="leagueStatsTable regular-season-table selectable-table" style={{ margin: '0 auto' }}>
          <thead>
            <tr>
              <th onClick={() => handleSort('teamName')} className="table-col-team sortable">Team (Years) {sortIndicator('teamName')}</th>
              <th onClick={() => handleSort('pctVal')} className="table-col-2 sortable">Waffle % {sortIndicator('pctVal')}</th>
              <th onClick={() => handleSort('season')} className="table-col-1 sortable">Year {sortIndicator('season')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={`${r.userId}-${r.season}`} className={`${idx % 2 === 0 ? 'even-row' : 'odd-row'}`}>
                <td className="team-name-cell">{r.teamName} ({r.yearsPlayed})</td>
                <td>{`${recordStr(r.wins, r.losses, r.ties)} (${r.pctStr})`}</td>
                <td>{r.season}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TopWaffleSeasons;