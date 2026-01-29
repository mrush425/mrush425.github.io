import React, { useMemo, useState } from 'react';
import { OtherComponentProps } from '../../../Interfaces/OtherStatItem';
import LeagueData from '../../../Interfaces/LeagueData';
import SleeperUser from '../../../Interfaces/SleeperUser';
import { calculateMoneyStats } from '../../../Helper Files/MoneyMethods';

interface MoneyStatsRow {
  userId: string;
  teamName: string;
  yearsPlayed: number;
  moneyPaidIn: number;
  moneyEarned: number;
  netEarned: number;
}

const getCurrentYear = (): string => new Date().getFullYear().toString();

const MoneyStats: React.FC<OtherComponentProps> = ({ data, minYears = 0 }) => {
  const [sortColumn, setSortColumn] = useState<string>('teamName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

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

      resultRows.push({
        userId,
        teamName,
        yearsPlayed,
        moneyPaidIn: moneyData.totalMoneyPaidIn,
        moneyEarned: moneyData.totalMoneyEarned,
        netEarned: moneyData.netMoneyEarned,
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
        case 'yearsPlayed':
          aValue = a.yearsPlayed;
          bValue = b.yearsPlayed;
          break;
        default:
          aValue = a.teamName.toLowerCase();
          bValue = b.teamName.toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return resultRows;
  }, [data, minYears, sortColumn, sortDirection]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
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
      {/* ---- TABLE ---- */}
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
            <th>Net/Year</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((r, idx) => (
            <tr key={r.userId} className={idx % 2 === 0 ? 'even-row' : 'odd-row'}>
              <td className="team-name-cell">{r.teamName} ({r.yearsPlayed})</td>
              <td>${r.moneyPaidIn.toFixed(2)}</td>
              <td>${r.moneyEarned.toFixed(2)}</td>
              <td style={{ color: r.netEarned >= 0 ? '#4ade80' : '#ef4444', fontWeight: 700 }}>
                ${r.netEarned >= 0 ? '+' : ''}{r.netEarned.toFixed(2)}
              </td>
              <td>${(r.netEarned / r.yearsPlayed).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MoneyStats;
