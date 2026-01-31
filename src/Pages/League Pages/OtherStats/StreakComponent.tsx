// StreakComponent.tsx

import React, { useMemo, useState } from 'react';
import { OtherComponentProps } from '../../../Interfaces/OtherStatItem';
import LeagueData from '../../../Interfaces/LeagueData';
import SleeperUser from '../../../Interfaces/SleeperUser';
import { getUserLongestStreak, StreakType, Streak } from '../../../Helper Files/StreakMethods'; // <-- adjust path if needed

interface TeamStreakRow {
  userId: string;
  teamName: string;
  yearsPlayed: number;
  streakLength: number;
  ranges: string[]; // each: "week X, YEAR -> week Y, YEAR"
}

const getCurrentYear = (): string => new Date().getFullYear().toString();

const StreakComponent: React.FC<OtherComponentProps> = ({ data, minYears = 0 }) => {
  const [streakType, setStreakType] = useState<StreakType>('win');
  const [sortColumn, setSortColumn] = useState<string>('streakLength');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const rows = useMemo<TeamStreakRow[]>(() => {
    const currentYear = getCurrentYear();
    const completedSeasons = data.filter(l => l.season !== currentYear);

    // Collect all users across all seasons (like PlaceStats)
    const allUserIDs = new Set<string>();
    const userDetails: Record<string, SleeperUser> = {};

    data.forEach((league: LeagueData) => {
      league.users.forEach((u: SleeperUser) => {
        allUserIDs.add(u.user_id);
        userDetails[u.user_id] = u;
      });
    });

    const resultRows: TeamStreakRow[] = [];

    Array.from(allUserIDs).forEach((userId) => {
      const user = userDetails[userId];
      if (!user) return;

      const teamName = user.metadata?.team_name || `User ${userId.substring(0, 4)}`;

      // years played (completed seasons only)
      const yearsPlayed = completedSeasons.reduce((acc, league) => {
        return acc + (league.users.some(u => u.user_id === userId) ? 1 : 0);
      }, 0);

      if (yearsPlayed < minYears) return;

      const streaks: Streak[] = getUserLongestStreak(userId, streakType, data);

      if (!streaks || streaks.length === 0) {
        resultRows.push({
          userId,
          teamName,
          yearsPlayed,
          streakLength: 0,
          ranges: [],
        });
        return;
      }

      // All returned streaks are tied for longest (by design of helper)
      const streakLength = streaks[0].length;

      // Make display ranges, and keep them in chronological order (optional)
      const ranges = [...streaks]
        .sort((a, b) => a.start.year - b.start.year || a.start.week - b.start.week)
        .map(s => `${s.start.label} -> ${s.end.label}`);

      resultRows.push({
        userId,
        teamName,
        yearsPlayed,
        streakLength,
        ranges,
      });
    });

    return resultRows;
  }, [data, minYears, streakType]);

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
        case 'yearsPlayed':
          aValue = a.yearsPlayed;
          bValue = b.yearsPlayed;
          break;
        case 'streakLength':
          aValue = a.streakLength;
          bValue = b.streakLength;
          break;
        default:
          aValue = a.streakLength;
          bValue = b.streakLength;
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
      setSortDirection('desc');
    }
  };

  if (sortedRows.length === 0) {
    return (
      <div className="regular-season-records">
        <div className="notImplementedMessage">
          No streak data found for the current filter settings (min years: {minYears}).
        </div>
      </div>
    );
  }

  return (
    <div className="regular-season-records">
      {/* ---- RADIO FILTER ---- */}
      <div className="recordsFilter filter-style">
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '18px',
            alignItems: 'center',
            flexWrap: 'wrap',
            textAlign: 'center',
          }}
        >
          <span style={{ fontWeight: 600 }}>Streak Type:</span>

          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="radio"
              name="streakType"
              value="win"
              checked={streakType === 'win'}
              onChange={() => setStreakType('win')}
            />
            Winning Streak
          </label>

          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="radio"
              name="streakType"
              value="loss"
              checked={streakType === 'loss'}
              onChange={() => setStreakType('loss')}
            />
            Losing Streak
          </label>
        </div>
      </div>

      {/* ---- TABLE ---- */}
      <table className="leagueStatsTable compact-table">
        <thead>
          <tr>
            <th 
              className={`table-col-team sortable ${sortColumn === 'teamName' ? `sorted-${sortDirection}` : ''}`}
              onClick={() => handleSort('teamName')}
            >
              Team (Years)
            </th>
            <th 
              className={`table-col-2 sortable ${sortColumn === 'streakLength' ? `sorted-${sortDirection}` : ''}`}
              onClick={() => handleSort('streakLength')}
            >
              Streak
            </th>
            <th className="table-col-2">Range(s)</th>
          </tr>
        </thead>

        <tbody>
          {sortedRows.map((r, idx) => (
            <tr key={r.userId} className={idx % 2 === 0 ? 'even-row' : 'odd-row'}>
              <td className="team-name-cell">{r.teamName} ({r.yearsPlayed})</td>
              <td>{r.streakLength === 0 ? '-' : r.streakLength}</td>
              <td>
                {r.ranges.length === 0 ? (
                  '-'
                ) : (
                  r.ranges.map((range, i) => (
                    <React.Fragment key={i}>
                      {range}
                      {i < r.ranges.length - 1 && <br />}
                    </React.Fragment>
                  ))
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default StreakComponent;
