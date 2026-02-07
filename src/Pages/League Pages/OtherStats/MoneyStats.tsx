import React, { useMemo, useState, useEffect } from 'react';
import { OtherComponentProps } from '../../../Interfaces/OtherStatItem';
import LeagueData from '../../../Interfaces/LeagueData';
import SleeperUser from '../../../Interfaces/SleeperUser';
import { calculateMoneyStats, calculateYearlyMoneyBreakdown } from '../../../Helper Files/MoneyMethods';

// =========================================================================
// TYPE DEFINITIONS
// =========================================================================

interface MoneyStatsRow {
  userId: string;
  teamName: string;
  yearsPlayed: number;
  moneyPaidIn: number;
  moneyEarned: number;
  netEarned: number;
  netPerYear: number;
}

const getCurrentYear = (): string => new Date().getFullYear().toString();

// =========================================================================
// YEARLY BREAKDOWN SUB-COMPONENT (RIGHT PANE)
// =========================================================================

interface YearlyMoneyBreakdownPaneProps {
  data: LeagueData[];
  selectedTeam: MoneyStatsRow;
}

const YearlyMoneyBreakdownPane: React.FC<YearlyMoneyBreakdownPaneProps> = ({ data, selectedTeam }) => {
  const yearlyStats = useMemo(() => {
    return calculateYearlyMoneyBreakdown(selectedTeam.userId, data);
  }, [data, selectedTeam.userId]);

  return (
    <div className="detail-pane">
      <h4>Yearly Breakdown for {selectedTeam.teamName}</h4>
      <table className="leagueStatsTable detail-table">
        <thead>
          <tr>
            <th>Year</th>
            <th>Paid In</th>
            <th>Earned</th>
            <th>Net After Year</th>
          </tr>
        </thead>
        <tbody>
          {yearlyStats.map((yr) => (
            <tr key={yr.year}>
              <td>{yr.year}</td>
              <td>${yr.paidIn.toFixed(2)}</td>
              <td>${yr.earned.toFixed(2)}</td>
              <td style={{ color: yr.netAfterYear >= 0 ? '#4ade80' : '#ef4444', fontWeight: 600 }}>
                {yr.netAfterYear >= 0 ? '+' : ''}${Math.abs(yr.netAfterYear).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {yearlyStats.length === 0 && (
        <div className="notImplementedMessage">No yearly money data available for this team.</div>
      )}
    </div>
  );
};

// =========================================================================
// MAIN COMPONENT
// =========================================================================

const MoneyStats: React.FC<OtherComponentProps> = ({ data, minYears = 0 }) => {
  const [sortColumn, setSortColumn] = useState<string>('netPerYear');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedTeam, setSelectedTeam] = useState<MoneyStatsRow | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  const rows = useMemo<MoneyStatsRow[]>(() => {
    const currentYear = getCurrentYear();
    const completedSeasons = data.filter(l => l.season !== currentYear);

    // Collect all users across all seasons
    const allUserIDs = new Set<string>();
    const userDetails: Record<string, SleeperUser> = {};

    data.forEach((league: LeagueData) => {
      league.users.forEach((u: SleeperUser) => {
        allUserIDs.add(u.user_id);
        userDetails[u.user_id] = u;
      });
    });

    const resultRows: MoneyStatsRow[] = [];

    Array.from(allUserIDs).forEach((userId) => {
      const user = userDetails[userId];
      if (!user) return;

      const teamName = user.metadata?.team_name || `User ${userId.substring(0, 4)}`;

      // years played (completed seasons only)
      const yearsPlayed = completedSeasons.reduce((acc, league) => {
        return acc + (league.users.some(u => u.user_id === userId) ? 1 : 0);
      }, 0);

      if (yearsPlayed < minYears) return;

      const moneyData = calculateMoneyStats(userId, data);
      const netPerYear = yearsPlayed > 0 ? moneyData.netMoneyEarned / yearsPlayed : 0;

      resultRows.push({
        userId,
        teamName,
        yearsPlayed,
        moneyPaidIn: moneyData.totalMoneyPaidIn,
        moneyEarned: moneyData.totalMoneyEarned,
        netEarned: moneyData.netMoneyEarned,
        netPerYear,
      });
    });

    // Sort by selected column
    resultRows.sort((a, b) => {
      let aValue: any = '';
      let bValue: any = '';

      switch (sortColumn) {
        case 'teamName':
          aValue = a.teamName.toLowerCase();
          bValue = b.teamName.toLowerCase();
          break;
        case 'moneyPaidIn':
          aValue = a.moneyPaidIn;
          bValue = b.moneyPaidIn;
          break;
        case 'moneyEarned':
          aValue = a.moneyEarned;
          bValue = b.moneyEarned;
          break;
        case 'netEarned':
          aValue = a.netEarned;
          bValue = b.netEarned;
          break;
        case 'netPerYear':
          aValue = a.netPerYear;
          bValue = b.netPerYear;
          break;
        default:
          aValue = a.netPerYear;
          bValue = b.netPerYear;
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return resultRows;
  }, [data, minYears, sortColumn, sortDirection]);

  // Auto-select first row
  useEffect(() => {
    if (!selectedTeam && rows.length > 0) {
      setSelectedTeam(rows[0]);
    }
  }, [rows, selectedTeam]);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection(column === 'teamName' ? 'asc' : 'desc');
    }
  };

  const handleRowClick = (team: MoneyStatsRow) => {
    setSelectedTeam(prev => (prev?.userId === team.userId ? null : team));
    if (isMobile) setShowMobileDetail(true);
  };

  if (rows.length === 0) {
    return (
      <div className="regular-season-records">
        <div className="notImplementedMessage">
          No money data found for the current filter settings (min years: {minYears}).
        </div>
      </div>
    );
  }

  return (
    <div className="regular-season-records">
      {isMobile && showMobileDetail && (
        <button onClick={() => setShowMobileDetail(false)} className="mobile-back-button">
          ← Back to List
        </button>
      )}
      <div className="two-pane-layout">

        {/* -------------------- LEFT PANE: MAIN TABLE -------------------- */}
        <div className={`main-table-pane ${isMobile && showMobileDetail ? 'mobile-hidden' : ''}`}>
          <table className="leagueStatsTable regular-season-table selectable-table">
            <thead>
              <tr>
                <th
                  className={`table-col-team sortable ${sortColumn === 'teamName' ? `sorted-${sortDirection}` : ''}`}
                  onClick={() => handleSort('teamName')}
                >
                  Team (Years)
                </th>
                <th
                  className={`sortable ${sortColumn === 'moneyPaidIn' ? `sorted-${sortDirection}` : ''}`}
                  onClick={() => handleSort('moneyPaidIn')}
                >
                  Paid In
                </th>
                <th
                  className={`sortable ${sortColumn === 'moneyEarned' ? `sorted-${sortDirection}` : ''}`}
                  onClick={() => handleSort('moneyEarned')}
                >
                  Earned
                </th>
                <th
                  className={`sortable ${sortColumn === 'netEarned' ? `sorted-${sortDirection}` : ''}`}
                  onClick={() => handleSort('netEarned')}
                >
                  Net
                </th>
                <th
                  className={`sortable ${sortColumn === 'netPerYear' ? `sorted-${sortDirection}` : ''}`}
                  onClick={() => handleSort('netPerYear')}
                >
                  Net/Year
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r, idx) => (
                <tr
                  key={r.userId}
                  className={`${selectedTeam?.userId === r.userId ? 'active selected-row' : ''} ${idx % 2 === 0 ? 'even-row' : 'odd-row'}`}
                  onClick={() => handleRowClick(r)}
                >
                  <td className="team-name-cell">{r.teamName} ({r.yearsPlayed})</td>
                  <td>${r.moneyPaidIn.toFixed(2)}</td>
                  <td>${r.moneyEarned.toFixed(2)}</td>
                  <td style={{ color: r.netEarned >= 0 ? '#4ade80' : '#ef4444', fontWeight: 700 }}>
                    {r.netEarned >= 0 ? '+' : ''}${Math.abs(r.netEarned).toFixed(2)}
                  </td>
                  <td style={{ color: r.netPerYear >= 0 ? '#4ade80' : '#ef4444', fontWeight: 700 }}>
                    {r.netPerYear >= 0 ? '+' : ''}${Math.abs(r.netPerYear).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* -------------------- RIGHT PANE: YEARLY BREAKDOWN -------------------- */}
        <div className={`detail-pane-wrapper ${isMobile && !showMobileDetail ? 'mobile-hidden' : ''}`}>
          {selectedTeam ? (
            <YearlyMoneyBreakdownPane data={data} selectedTeam={selectedTeam} />
          ) : (
            <div className="notImplementedMessage">
              Select a team from the table to see a yearly money breakdown.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MoneyStats;
