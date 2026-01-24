import React, { useEffect, useMemo, useState } from 'react';
import { RecordComponentProps } from '../../../Interfaces/RecordStatItem';
import LeagueData from '../../../Interfaces/LeagueData';
import SleeperUser from '../../../Interfaces/SleeperUser';

import SidebetMethods from '../../../Helper Files/SidebetMethods';
import SidebetStat from '../../../Interfaces/SidebetStat';

// =============================================================
// Types
// =============================================================
interface WaffleAggregateRecord {
  userId: string;
  teamName: string;
  yearsPlayed: number;
  // Waffle (sidebet) totals across all seasons
  waffleWins: number;
  waffleLosses: number;
  waffleTies: number;
  wafflePct: string;
  wafflePctValue: number;
  // Best/Worst season summary (by Waffle %)
  bestSeasonDisplay: string; // "W-L-T (xx.xx%) (YYYY)"
  worstSeasonDisplay: string; // "W-L-T (xx.xx%) (YYYY)"
  bestSeasonValue: number;   // numeric percent for sorting
  worstSeasonValue: number;  // numeric percent for sorting
}

interface YearlyRecordRow {
  year: number;
  waffleRecord: string; // W-L-T
  wafflePct: string;    // 00.00%
}

type SortKey = 'teamName' | 'wafflePctValue' | 'bestSeasonValue' | 'worstSeasonValue';
interface SortConfig {
  key: SortKey | null;
  direction: 'ascending' | 'descending';
}

// =============================================================
// Helpers
// =============================================================
const pct = (w: number, l: number, t: number) => {
  const g = w + l + t;
  if (g === 0) return '0.00%';
  return ((w * 100) / g).toFixed(2) + '%';
};

const pctValue = (pctString: string) => parseFloat(pctString.replace('%', '')) || 0;
const recordStr = (w: number, l: number, t: number) => `${w}-${l}-${t}`;

// =============================================================
// Aggregation (all seasons) + best/worst season per user
// =============================================================
const aggregateWaffleWithExtremes = (data: LeagueData[]): WaffleAggregateRecord[] => {
  const userIds = new Set<string>();
  data.forEach(ld => ld.users.forEach(u => userIds.add(u.user_id)));

  const results: Record<string, WaffleAggregateRecord> = {};

  Array.from(userIds).forEach(userId => {
    let teamName = '';
    let yearsPlayed = 0;

    let waffleWins = 0, waffleLosses = 0, waffleTies = 0;

    // Track best/worst by percentage
    let best = { pctVal: -1, year: 0, w: 0, l: 0, t: 0 };
    let worst = { pctVal: 101, year: 0, w: 0, l: 0, t: 0 };

    data.forEach(league => {
      const userInLeague = league.users.find(u => u.user_id === userId);
      if (!userInLeague) return;

      yearsPlayed++;
      teamName = userInLeague.metadata?.team_name || teamName || `User ${userId.slice(0, 4)}`;

      // Waffle totals for this season
      const waffleStats: SidebetStat[] = SidebetMethods.Waffle(league);
      const myWaffle = waffleStats.find(s => s.user?.user_id === userId);
      const w = myWaffle?.stats_record?.wins ?? 0;
      const l = myWaffle?.stats_record?.losses ?? 0;
      const t = myWaffle?.stats_record?.ties ?? 0;

      waffleWins += w;
      waffleLosses += l;
      waffleTies += t;

      const g = w + l + t;
      const pVal = g === 0 ? 0 : (w * 100) / g;
      const y = Number.parseInt(league.season);

      if (pVal > best.pctVal || (pVal === best.pctVal && y > best.year)) {
        best = { pctVal: pVal, year: y, w, l, t };
      }
      if (pVal < worst.pctVal || (pVal === worst.pctVal && y < worst.year)) {
        worst = { pctVal: pVal, year: y, w, l, t };
      }
    });

    if (yearsPlayed > 0) {
      const wafflePct = pct(waffleWins, waffleLosses, waffleTies);
      results[userId] = {
        userId,
        teamName,
        yearsPlayed,
        waffleWins,
        waffleLosses,
        waffleTies,
        wafflePct,
        wafflePctValue: pctValue(wafflePct),
        bestSeasonDisplay: `${recordStr(best.w, best.l, best.t)} (${best.pctVal.toFixed(2)}%) (${best.year})`,
        worstSeasonDisplay: `${recordStr(worst.w, worst.l, worst.t)} (${worst.pctVal.toFixed(2)}%) (${worst.year})`,
        bestSeasonValue: best.pctVal,
        worstSeasonValue: worst.pctVal,
      };
    }
  });

  return Object.values(results);
};

// =============================================================
// Yearly breakdown for selected user (right pane)
// =============================================================
const yearlyForUser = (data: LeagueData[], userId: string): YearlyRecordRow[] => {
  const out: YearlyRecordRow[] = [];
  data.forEach(league => {
    const userInLeague = league.users.find(u => u.user_id === userId);
    if (!userInLeague) return;

    const waffleStats: SidebetStat[] = SidebetMethods.Waffle(league);
    const myWaffle = waffleStats.find(s => s.user?.user_id === userId);
    const w = myWaffle?.stats_record?.wins ?? 0;
    const l = myWaffle?.stats_record?.losses ?? 0;
    const t = myWaffle?.stats_record?.ties ?? 0;

    out.push({
      year: Number.parseInt(league.season),
      waffleRecord: recordStr(w, l, t),
      wafflePct: pct(w, l, t),
    });
  });
  return out.sort((a, b) => b.year - a.year);
};

// =============================================================
// Detail (right) pane
// =============================================================
interface YearlyProps {
  data: LeagueData[];
  selected: WaffleAggregateRecord;
}

const YearlyBreakdown: React.FC<YearlyProps> = ({ data, selected }) => {
  const rows = useMemo(() => yearlyForUser(data, selected.userId), [data, selected.userId]);
  return (
    <div className="detail-pane">
      <table className="leagueStatsTable detail-table">
        <thead>
          <tr>
            <th className="table-col-1">Year</th>
            <th className="table-col-3">Waffle (%)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.year}>
              <td>{r.year}</td>
              <td>{`${r.waffleRecord} (${r.wafflePct})`}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <div className="notImplementedMessage">No yearly data available.</div>}
    </div>
  );
};

// =============================================================
// Main component
// =============================================================
const WaffleRecords: React.FC<RecordComponentProps & { minYears?: number }> = ({ data, minYears = 0 }) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'wafflePctValue', direction: 'descending' });
  const [selected, setSelected] = useState<WaffleAggregateRecord | null>(null);

  const handleSort = (key: SortKey) => {
    let direction: SortConfig['direction'] = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
    else if (sortConfig.key === key && sortConfig.direction === 'descending') {
      key = 'wafflePctValue';
      direction = 'ascending';
    }
    setSortConfig({ key, direction });
  };

  const { rows } = useMemo(() => {
    const all = aggregateWaffleWithExtremes(data);
    let items = all.filter(r => r.yearsPlayed >= minYears);

    if (sortConfig.key) {
      const key = sortConfig.key as SortKey;
      items.sort((a, b) => {
        if (key === 'teamName') {
          if (a.teamName < b.teamName) return sortConfig.direction === 'ascending' ? -1 : 1;
          if (a.teamName > b.teamName) return sortConfig.direction === 'ascending' ? 1 : -1;
          return sortConfig.direction === 'ascending' ? a.yearsPlayed - b.yearsPlayed : b.yearsPlayed - a.yearsPlayed;
        }
        // Numeric percent-based fields: wafflePctValue, bestSeasonValue, worstSeasonValue
        const av = (a as any)[key] as number ?? 0;
        const bv = (b as any)[key] as number ?? 0;
        // Conventional comparator: ascending -> low to high, descending -> high to low
        return sortConfig.direction === 'ascending' ? av - bv : bv - av;
      });
    }

    if (selected && !items.find(r => r.userId === selected.userId)) setSelected(null);

    return { rows: items };
  }, [data, minYears, sortConfig, selected]);

  useEffect(() => {
    if (!selected && rows.length > 0) setSelected(rows[0]);
  }, [rows, selected]);

  const sortIndicator = (key: SortKey) => (sortConfig.key === key ? (sortConfig.direction === 'ascending' ? ' \u25B2' : ' \u25BC') : null);

  if (rows.length === 0) {
    return (
      <div className="regular-season-records">
        <div className="notImplementedMessage">No Waffle data found for the current filter (min years: {minYears}).</div>
      </div>
    );
  }

  return (
    <div className="regular-season-records">
      <div className="two-pane-layout">
        {/* Left: main table */}
        <div className="main-table-pane">
          <table className="leagueStatsTable regular-season-table selectable-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('teamName')} className="table-col-team sortable">
                  Team (Years) {sortIndicator('teamName')}
                </th>
                <th onClick={() => handleSort('wafflePctValue')} className="table-col-2 sortable">
                  Waffle % {sortIndicator('wafflePctValue')}
                </th>
                <th onClick={() => handleSort('worstSeasonValue')} className="table-col-3 sortable">
                  Worst Season {sortIndicator('worstSeasonValue')}
                </th>
                <th onClick={() => handleSort('bestSeasonValue')} className="table-col-3 sortable">
                  Best Season {sortIndicator('bestSeasonValue')}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr
                  key={r.userId}
                  className={`${selected?.userId === r.userId ? 'active selected-row' : ''} ${idx % 2 === 0 ? 'even-row' : 'odd-row'}`}
                  onClick={() => setSelected(prev => (prev?.userId === r.userId ? null : r))}
                >
                  <td className="team-name-cell">{r.teamName} ({r.yearsPlayed})</td>
                  <td>{`${recordStr(r.waffleWins, r.waffleLosses, r.waffleTies)} (${r.wafflePct})`}</td>
                  <td>{r.worstSeasonDisplay}</td>
                  <td>{r.bestSeasonDisplay}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Right: yearly breakdown */}
        <div className="detail-pane-wrapper">
          {selected ? (
            <YearlyBreakdown data={data} selected={selected} />
          ) : (
            <div className="notImplementedMessage">Select a team to see yearly breakdown.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WaffleRecords;
