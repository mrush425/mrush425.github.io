// StreakComponent.tsx

import React, { useMemo, useState } from 'react';
import { OtherComponentProps } from '../../../Interfaces/OtherStatItem';
import LeagueData from '../../../Interfaces/LeagueData';
import SleeperUser from '../../../Interfaces/SleeperUser';
import { getUserLongestStreak, getStreakWeekDetails, StreakType, Streak, StreakWeekDetail } from '../../../Helper Files/StreakMethods';

interface TeamStreakRow {
  userId: string;
  teamName: string;
  yearsPlayed: number;
  streakLength: number;
  ranges: string[];
  streaks: Streak[]; // keep the actual streak objects for detail lookup
}

const getCurrentYear = (): string => new Date().getFullYear().toString();

const StreakComponent: React.FC<OtherComponentProps> = ({ data, minYears = 0 }) => {
  const [streakType, setStreakType] = useState<StreakType>('win');
  const [sortColumn, setSortColumn] = useState<string>('streakLength');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

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
          streaks: [],
        });
        return;
      }

      // All returned streaks are tied for longest (by design of helper)
      const streakLength = streaks[0].length;

      const sortedStreaks = [...streaks]
        .sort((a, b) => a.start.year - b.start.year || a.start.week - b.start.week);

      // Make display ranges
      const ranges = sortedStreaks
        .map(s => `${s.start.label} -> ${s.end.label}`);

      resultRows.push({
        userId,
        teamName,
        yearsPlayed,
        streakLength,
        ranges,
        streaks: sortedStreaks,
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
      setSortDirection(column === 'teamName' ? 'asc' : 'desc');
    }
  };

  // Get week-by-week details for the expanded row
  const expandedWeekDetails = useMemo<StreakWeekDetail[]>(() => {
    if (!expandedUserId) return [];
    const row = rows.find((r) => r.userId === expandedUserId);
    if (!row || row.streaks.length === 0) return [];

    // Get details for all tied streaks, concatenated
    const allDetails: StreakWeekDetail[] = [];
    row.streaks.forEach((streak, idx) => {
      const details = getStreakWeekDetails(expandedUserId, streak, streakType, data);
      if (idx > 0 && details.length > 0) {
        // Add a separator marker (empty row will be rendered in UI)
        allDetails.push({ year: -1, week: -1, teamScore: 0, opponentScore: 0, outcome: 'T' });
      }
      allDetails.push(...details);
    });
    return allDetails;
  }, [expandedUserId, rows, streakType, data]);

  // Reset expansion when streak type changes
  const handleStreakTypeChange = (newType: StreakType) => {
    setStreakType(newType);
    setExpandedUserId(null);
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
              onChange={() => handleStreakTypeChange('win')}
            />
            Winning Streak
          </label>

          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="radio"
              name="streakType"
              value="loss"
              checked={streakType === 'loss'}
              onChange={() => handleStreakTypeChange('loss')}
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
          {sortedRows.map((r, idx) => {
            const isExpanded = expandedUserId === r.userId;
            const weekDetails = isExpanded ? expandedWeekDetails : [];

            return (
              <React.Fragment key={r.userId}>
                <tr
                  className={`${idx % 2 === 0 ? 'even-row' : 'odd-row'} expandable-row`}
                  onClick={() => r.streakLength > 0 && setExpandedUserId(isExpanded ? null : r.userId)}
                  style={{ cursor: r.streakLength > 0 ? 'pointer' : 'default' }}
                >
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

                {isExpanded && weekDetails.length > 0 && (
                  <tr className="expanded-detail-row">
                    <td colSpan={3}>
                      <div className="expanded-detail-content">
                        <table className="leagueStatsTable compact-table">
                          <thead>
                            <tr>
                              <th>Year</th>
                              <th>Week</th>
                              <th>Team Score</th>
                              <th>Opponent Score</th>
                            </tr>
                          </thead>
                          <tbody>
                            {weekDetails.map((d, di) => {
                              if (d.year === -1) {
                                return (
                                  <tr key={`sep-${di}`}>
                                    <td colSpan={4} style={{ textAlign: 'center', fontStyle: 'italic', padding: '4px 0', borderTop: '2px solid #555' }}>
                                      — tied streak —
                                    </td>
                                  </tr>
                                );
                              }
                              return (
                                <tr key={`${d.year}-${d.week}`}>
                                  <td>{d.year}</td>
                                  <td>{d.week}</td>
                                  <td style={{ color: d.outcome === 'W' ? '#2ecc71' : d.outcome === 'L' ? '#e74c3c' : undefined }}>
                                    {d.teamScore.toFixed(2)}
                                  </td>
                                  <td style={{ color: d.outcome === 'W' ? '#e74c3c' : d.outcome === 'L' ? '#2ecc71' : undefined }}>
                                    {d.opponentScore.toFixed(2)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default StreakComponent;
