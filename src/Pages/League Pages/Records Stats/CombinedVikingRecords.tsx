import React, { useEffect, useMemo, useState } from 'react';
import { OtherComponentProps } from '../../../Interfaces/OtherStatItem';
import LeagueData from '../../../Interfaces/LeagueData';
import SidebetMethods from '../../../Helper Files/SidebetMethods';

// =============================================================
// Types
// =============================================================
interface VikingAggregateRecord {
  userId: string;
  teamName: string;
  yearsPlayed: number;
  totalScore: number;
  averageScore: number;
  bestSeasonDisplay: string;
  worstSeasonDisplay: string;
  bestSeasonValue: number;
  worstSeasonValue: number;
}

interface YearlyVikingRow {
  year: number;
  vikingScore: number;
}

type SortKey = 'teamName' | 'totalScore' | 'averageScore' | 'bestSeasonValue' | 'worstSeasonValue';
interface SortConfig {
  key: SortKey | null;
  direction: 'ascending' | 'descending';
}

// =============================================================
// Aggregation function
// =============================================================
const aggregateVikingWithExtremes = (data: LeagueData[]): VikingAggregateRecord[] => {
  const userIds = new Set<string>();
  data.forEach(ld => ld.users.forEach(u => userIds.add(u.user_id)));

  const results: Record<string, VikingAggregateRecord> = {};

  Array.from(userIds).forEach(userId => {
    let teamName = '';
    let yearsPlayed = 0;
    let totalScore = 0;

    let best = { score: -1, year: 0 };
    let worst = { score: 999999, year: 0 };

    data.forEach(league => {
      const userInLeague = league.users.find(u => u.user_id === userId);
      if (!userInLeague) return;

      yearsPlayed++;
      teamName = userInLeague.metadata?.team_name || teamName || `User ${userId.slice(0, 4)}`;

      const stats = SidebetMethods.Viking(league, true, false);
      const myStat = stats.find(s => s.user?.user_id === userId);
      const score = myStat?.stat_number ?? 0;

      totalScore += score;
      const y = Number.parseInt(league.season);

      if (score > best.score || (score === best.score && y > best.year)) {
        best = { score, year: y };
      }
      if (score < worst.score || (score === worst.score && y < worst.year)) {
        worst = { score, year: y };
      }
    });

    if (yearsPlayed > 0) {
      results[userId] = {
        userId,
        teamName,
        yearsPlayed,
        totalScore,
        averageScore: totalScore / yearsPlayed,
        bestSeasonDisplay: `${best.score.toFixed(0)} (${best.year})`,
        worstSeasonDisplay: `${worst.score.toFixed(0)} (${worst.year})`,
        bestSeasonValue: best.score,
        worstSeasonValue: worst.score,
      };
    }
  });

  return Object.values(results);
};

// =============================================================
// Yearly breakdown for selected user (right pane)
// =============================================================
const yearlyForUser = (data: LeagueData[], userId: string): YearlyVikingRow[] => {
  const out: YearlyVikingRow[] = [];
  data.forEach(league => {
    const userInLeague = league.users.find(u => u.user_id === userId);
    if (!userInLeague) return;

    const stats = SidebetMethods.Viking(league, true, false);
    const myStat = stats.find(s => s.user?.user_id === userId);
    const score = myStat?.stat_number ?? 0;

    out.push({
      year: Number.parseInt(league.season),
      vikingScore: score,
    });
  });
  return out.sort((a, b) => b.year - a.year);
};

// =============================================================
// Detail (right) pane
// =============================================================
interface YearlyProps {
  data: LeagueData[];
  selected: VikingAggregateRecord;
}

const YearlyBreakdown: React.FC<YearlyProps> = ({ data, selected }) => {
  const rows = useMemo(() => yearlyForUser(data, selected.userId), [data, selected.userId]);
  return (
    <div className="detail-pane">
      <table className="leagueStatsTable detail-table">
        <thead>
          <tr>
            <th className="table-col-1">Year</th>
            <th className="table-col-3">Score</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.year}>
              <td>{r.year}</td>
              <td>{r.vikingScore.toFixed(0)}</td>
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
const CombinedVikingRecords: React.FC<OtherComponentProps & { minYears?: number }> = ({ data, minYears = 0 }) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'averageScore', direction: 'descending' });
  const [selected, setSelected] = useState<VikingAggregateRecord | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  const handleSort = (key: SortKey) => {
    let direction: SortConfig['direction'] = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
    else if (sortConfig.key === key && sortConfig.direction === 'descending') {
      key = 'averageScore';
      direction = 'ascending';
    }
    setSortConfig({ key, direction });
  };

  const { rows } = useMemo(() => {
    const all = aggregateVikingWithExtremes(data);
    let items = all.filter(r => r.yearsPlayed >= minYears);

    if (sortConfig.key) {
      const key = sortConfig.key as SortKey;
      items.sort((a, b) => {
        if (key === 'teamName') {
          if (a.teamName < b.teamName) return sortConfig.direction === 'ascending' ? -1 : 1;
          if (a.teamName > b.teamName) return sortConfig.direction === 'ascending' ? 1 : -1;
          return sortConfig.direction === 'ascending' ? a.yearsPlayed - b.yearsPlayed : b.yearsPlayed - a.yearsPlayed;
        }
        // Numeric fields: totalScore, averageScore, bestSeasonValue, worstSeasonValue
        const av = (a as any)[key] as number ?? 0;
        const bv = (b as any)[key] as number ?? 0;
        return sortConfig.direction === 'ascending' ? av - bv : bv - av;
      });
    }

    if (selected && !items.find(r => r.userId === selected.userId)) setSelected(null);

    return { rows: items };
  }, [data, minYears, sortConfig, selected]);

  useEffect(() => {
    if (!selected && rows.length > 0) setSelected(rows[0]);
  }, [rows, selected]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const sortIndicator = (key: SortKey) => (sortConfig.key === key ? (sortConfig.direction === 'ascending' ? ' \u25B2' : ' \u25BC') : null);

  if (rows.length === 0) {
    return (
      <div className="regular-season-records">
        <div className="notImplementedMessage">No Viking data found for the current filter (min years: {minYears}).</div>
      </div>
    );
  }

  const handleBackToList = () => {
    setShowMobileDetail(false);
  };

  return (
    <div className="regular-season-records">
      {isMobile && showMobileDetail && (
        <button onClick={handleBackToList} className="mobile-back-button">
          ← Back to List
        </button>
      )}
      <div className="two-pane-layout">
        {/* Left: main table */}
        <div className={`main-table-pane ${isMobile && showMobileDetail ? 'mobile-hidden' : ''}`}>
          <table className="leagueStatsTable regular-season-table selectable-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('teamName')} className="table-col-team sortable">
                  Team (Years) {sortIndicator('teamName')}
                </th>
                <th onClick={() => handleSort('totalScore')} className="table-col-2 sortable">
                  Total {sortIndicator('totalScore')}
                </th>
                <th onClick={() => handleSort('averageScore')} className="table-col-2 sortable">
                  Average {sortIndicator('averageScore')}
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
                  onClick={() => {
                    setSelected(prev => (prev?.userId === r.userId ? null : r));
                    if (isMobile) setShowMobileDetail(true);
                  }}
                >
                  <td className="team-name-cell">{r.teamName} ({r.yearsPlayed})</td>
                  <td>{r.totalScore.toFixed(0)}</td>
                  <td>{r.averageScore.toFixed(2)}</td>
                  <td>{r.worstSeasonDisplay}</td>
                  <td>{r.bestSeasonDisplay}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Right: yearly breakdown */}
        <div className={`detail-pane-wrapper ${isMobile && !showMobileDetail ? 'mobile-hidden' : ''}`}>
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

export default CombinedVikingRecords;
