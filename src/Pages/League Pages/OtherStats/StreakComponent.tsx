// StreakComponent.tsx

import React, { useMemo, useState, useEffect } from 'react';
import { OtherComponentProps } from '../../../Interfaces/OtherStatItem';
import LeagueData from '../../../Interfaces/LeagueData';
import SleeperUser from '../../../Interfaces/SleeperUser';
import { getUserLongestStreak, getStreakWeekDetails, StreakType, Streak, StreakWeekDetail } from '../../../Helper Files/StreakMethods';

// =========================================================================
// TYPES
// =========================================================================

interface TeamStreakRow {
  userId: string;
  teamName: string;
  yearsPlayed: number;
  streakLength: number;
  avgPtsFor: number;
  avgPtsAgainst: number;
  ranges: string[];
  streaks: Streak[];
}

const getCurrentYear = (): string => new Date().getFullYear().toString();

// =========================================================================
// COMPONENT
// =========================================================================

const StreakComponent: React.FC<OtherComponentProps> = ({ data, minYears = 0 }) => {
  const [streakType, setStreakType] = useState<StreakType>('win');
  const [sortColumn, setSortColumn] = useState<string>('streakLength');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedRow, setSelectedRow] = useState<TeamStreakRow | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  // ── MOBILE DETECTION ──
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ── DATA ──
  const rows = useMemo<TeamStreakRow[]>(() => {
    const currentYear = getCurrentYear();
    const completedSeasons = data.filter(l => l.season !== currentYear);

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

      const yearsPlayed = completedSeasons.reduce((acc, league) => {
        return acc + (league.users.some(u => u.user_id === userId) ? 1 : 0);
      }, 0);

      if (yearsPlayed < minYears) return;

      const streaks: Streak[] = getUserLongestStreak(userId, streakType, data);

      if (!streaks || streaks.length === 0) {
        resultRows.push({
          userId, teamName, yearsPlayed,
          streakLength: 0, avgPtsFor: 0, avgPtsAgainst: 0, ranges: [], streaks: [],
        });
        return;
      }

      const streakLength = streaks[0].length;

      const sortedStreaks = [...streaks]
        .sort((a, b) => a.start.year - b.start.year || a.start.week - b.start.week);

      const ranges = sortedStreaks.map(s => `${s.start.label} → ${s.end.label}`);

      // Compute avg pts for/against across all tied streaks
      let totalFor = 0;
      let totalAgainst = 0;
      let totalGames = 0;
      sortedStreaks.forEach((streak) => {
        const details = getStreakWeekDetails(userId, streak, streakType, data);
        // Only count weeks that are actual streak wins/losses (exclude the "ended" week)
        details.forEach((d) => {
          const isStreakWeek = streakType === 'win' ? d.outcome === 'W' : d.outcome === 'L';
          if (isStreakWeek) {
            totalFor += d.teamScore;
            totalAgainst += d.opponentScore;
            totalGames++;
          }
        });
      });
      const avgPtsFor = totalGames > 0 ? totalFor / totalGames : 0;
      const avgPtsAgainst = totalGames > 0 ? totalAgainst / totalGames : 0;

      resultRows.push({
        userId, teamName, yearsPlayed,
        streakLength, avgPtsFor, avgPtsAgainst, ranges, streaks: sortedStreaks,
      });
    });

    return resultRows;
  }, [data, minYears, streakType]);

  // ── SORTING ──
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
        case 'avgPtsFor':
          aValue = a.avgPtsFor;
          bValue = b.avgPtsFor;
          break;
        case 'avgPtsAgainst':
          aValue = a.avgPtsAgainst;
          bValue = b.avgPtsAgainst;
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

  // ── AUTO-SELECT FIRST ROW ──
  useEffect(() => {
    if (!selectedRow && sortedRows.length > 0) {
      setSelectedRow(sortedRows[0]);
    }
  }, [sortedRows, selectedRow]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection(column === 'teamName' ? 'asc' : 'desc');
    }
  };

  // ── WEEK DETAILS FOR SELECTED ROW ──
  const weekDetails = useMemo<StreakWeekDetail[]>(() => {
    if (!selectedRow || selectedRow.streaks.length === 0) return [];

    const allDetails: StreakWeekDetail[] = [];
    selectedRow.streaks.forEach((streak, idx) => {
      const details = getStreakWeekDetails(selectedRow.userId, streak, streakType, data);
      if (idx > 0 && details.length > 0) {
        allDetails.push({ year: -1, week: -1, teamScore: 0, opponentScore: 0, outcome: 'T' });
      }
      allDetails.push(...details);
    });
    return allDetails;
  }, [selectedRow, streakType, data]);

  // Reset selection when streak type changes
  const handleStreakTypeChange = (newType: StreakType) => {
    setStreakType(newType);
    setSelectedRow(null);
    setShowMobileDetail(false);
  };

  const handleRowClick = (row: TeamStreakRow) => {
    if (row.streakLength === 0) return;
    setSelectedRow((prev) =>
      prev?.userId === row.userId ? null : row
    );
    if (isMobile) setShowMobileDetail(true);
  };

  const handleBackToList = () => {
    setShowMobileDetail(false);
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

      {/* ---- MOBILE BACK BUTTON ---- */}
      {isMobile && showMobileDetail && (
        <button onClick={handleBackToList} className="mobile-back-button">
          ← Back to List
        </button>
      )}

      {/* ---- TWO-PANE LAYOUT ---- */}
      <div className="two-pane-layout">
        {/* ── LEFT: SUMMARY TABLE ── */}
        <div className={`main-table-pane ${isMobile && showMobileDetail ? 'mobile-hidden' : ''}`}>
          <table className="leagueStatsTable selectable-table">
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
                <th
                  className={`table-col-2 sortable ${sortColumn === 'avgPtsFor' ? `sorted-${sortDirection}` : ''}`}
                  onClick={() => handleSort('avgPtsFor')}
                >
                  Avg PF
                </th>
                <th
                  className={`table-col-2 sortable ${sortColumn === 'avgPtsAgainst' ? `sorted-${sortDirection}` : ''}`}
                  onClick={() => handleSort('avgPtsAgainst')}
                >
                  Avg PA
                </th>
                <th className="table-col-2">Range(s)</th>
              </tr>
            </thead>

            <tbody>
              {sortedRows.map((r, idx) => (
                <tr
                  key={r.userId}
                  className={`
                    ${selectedRow?.userId === r.userId ? 'active selected-row' : ''}
                    ${idx % 2 === 0 ? 'even-row' : 'odd-row'}
                  `}
                  onClick={() => handleRowClick(r)}
                  style={{ cursor: r.streakLength > 0 ? 'pointer' : 'default' }}
                >
                  <td className="team-name-cell">{r.teamName} ({r.yearsPlayed})</td>
                  <td>{r.streakLength === 0 ? '-' : r.streakLength}</td>
                  <td>{r.streakLength === 0 ? '-' : r.avgPtsFor.toFixed(2)}</td>
                  <td>{r.streakLength === 0 ? '-' : r.avgPtsAgainst.toFixed(2)}</td>
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

        {/* ── RIGHT: DETAIL PANE ── */}
        <div className={`detail-pane-wrapper ${isMobile && !showMobileDetail ? 'mobile-hidden' : ''}`}>
          {selectedRow && selectedRow.streakLength > 0 ? (
            <div className="streak-detail-pane">
              <h3 className="detail-pane-title">
                {selectedRow.teamName} — {selectedRow.streakLength} Game {streakType === 'win' ? 'Win' : 'Loss'} Streak
              </h3>
              <table className="leagueStatsTable compact-table">
                <thead>
                  <tr>
                    <th>Year</th>
                    <th>Week</th>
                    <th>Team Score</th>
                    <th>Opp Score</th>
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
          ) : (
            <div className="notImplementedMessage">
              Select a team to see streak details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StreakComponent;
