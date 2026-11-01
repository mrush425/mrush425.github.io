import React, { useMemo, useState, useEffect } from 'react';
import LeagueData from '../../../Interfaces/LeagueData';
import SleeperUser from '../../../Interfaces/SleeperUser';
import MatchupDisplay from '../../../Components/MatchupDisplay';
import {
  findRosterByUserId,
  getScoreForWeek,
  getMatchupForWeek,
  getUserSeasonPlace,
  getOverallPlace,
  isCurrentActiveWeek,
} from '../../../Helper Files/HelperMethods';

// =========================================================================
// TYPES
// =========================================================================

interface Last2WeekRow {
  userId: string;
  teamName: string;
  yearsPlayed: number;
  year: number;
  week1: number | null;
  week2: number | null;
  avgPts: number;
  totalPts: number;
  seasonPlace: number;
  overallPlace: number | undefined;
  league: LeagueData;
  opponentUserId1: string | null;
  opponentUserId2: string | null;
}

type SortKey = 'teamName' | 'year' | 'avgPts' | 'seasonPlace' | 'overallPlace';

interface SortConfig {
  key: SortKey;
  direction: 'ascending' | 'descending';
}

// =========================================================================
// HELPERS
// =========================================================================

const round2 = (n: number) => Math.round(n * 100) / 100;

const buildYearsPlayedMap = (data: LeagueData[]): Map<string, number> => {
  const map = new Map<string, number>();
  data.forEach((league) => {
    league.users.forEach((u) => {
      map.set(u.user_id, (map.get(u.user_id) ?? 0) + 1);
    });
  });
  return map;
};

/**
 * Finds the opponent user_id for a given user in a specific week.
 */
const findOpponentUserId = (
  userId: string,
  week: number,
  league: LeagueData
): string | null => {
  const user = league.users.find((u) => u.user_id === userId);
  if (!user) return null;

  const roster = findRosterByUserId(userId, league.rosters);
  if (!roster) return null;

  const matchup = getMatchupForWeek(user as SleeperUser, week, league);
  if (!matchup) return null;

  const weekInfo = league.matchupInfo.find((m) => m.week === week);
  const oppMatchup = weekInfo?.matchups.find(
    (m) => m.matchup_id === matchup.matchup_id && m.roster_id !== roster.roster_id
  );
  if (!oppMatchup) return null;

  const oppRoster = league.rosters.find((r) => r.roster_id === oppMatchup.roster_id);
  return oppRoster?.owner_id ?? null;
};

/**
 * Builds rows for the last 2 playoff weeks for every user in every year.
 * If playoff_week_start is 14, weeks 15 and 16 are used.
 */
const buildLast2WeekRows = (data: LeagueData[]): Last2WeekRow[] => {
  const yearsPlayedMap = buildYearsPlayedMap(data);
  const rows: Last2WeekRow[] = [];

  data.forEach((league) => {
    const year = Number.parseInt(league.season);
    if (!Number.isFinite(year)) return;

    const playoffStart = league.settings.playoff_week_start;
    if (!playoffStart) return;

    const candidateWeek1 = playoffStart + 1;
    const candidateWeek2 = playoffStart + 2;
    const week1 = isCurrentActiveWeek(league, candidateWeek1) ? null : candidateWeek1;
    const week2 = isCurrentActiveWeek(league, candidateWeek2) ? null : candidateWeek2;
    const eligibleWeekCount = Number(week1 !== null) + Number(week2 !== null);
    if (eligibleWeekCount === 0) return;

    league.users.forEach((user) => {
      const roster = findRosterByUserId(user.user_id, league.rosters);
      if (!roster) return;

      const score1 = week1 === null ? 0 : getScoreForWeek(user as SleeperUser, week1, league);
      const score2 = week2 === null ? 0 : getScoreForWeek(user as SleeperUser, week2, league);

      // Skip if no data for the eligible weeks
      if (score1 === 0 && score2 === 0) return;

      const totalPts = round2(score1 + score2);
      const avgPts = round2(totalPts / eligibleWeekCount);

      rows.push({
        userId: user.user_id,
        teamName: user.metadata?.team_name || `User ${user.user_id.substring(0, 4)}`,
        yearsPlayed: yearsPlayedMap.get(user.user_id) ?? 0,
        year,
        week1,
        week2,
        avgPts,
        totalPts,
        seasonPlace: getUserSeasonPlace(user.user_id, league),
        overallPlace: getOverallPlace(user.user_id, league.season),
        league,
        opponentUserId1: week1 === null ? null : findOpponentUserId(user.user_id, week1, league),
        opponentUserId2: week2 === null ? null : findOpponentUserId(user.user_id, week2, league),
      });
    });
  });

  return rows;
};

// =========================================================================
// COMPONENT
// =========================================================================

interface Last2WeekPerformanceProps {
  data: LeagueData[];
  minYears?: number;
  includeRegularSeason?: boolean;
  includePlayoffs?: boolean;
}

const Last2WeekPerformance: React.FC<Last2WeekPerformanceProps> = ({
  data,
  minYears = 0,
}) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'avgPts',
    direction: 'descending',
  });
  const [selectedRow, setSelectedRow] = useState<Last2WeekRow | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  const sortedRows = useMemo(() => {
    const allRows = buildLast2WeekRows(data);
    const filtered = allRows.filter((r) => r.yearsPlayed >= minYears);

    return [...filtered].sort((a, b) => {
      const { key, direction } = sortConfig;
      const dir = direction === 'ascending' ? 1 : -1;

      if (key === 'teamName') return a.teamName.localeCompare(b.teamName) * dir;
      if (key === 'year') return (a.year - b.year) * dir;
      if (key === 'avgPts') return (a.avgPts - b.avgPts) * dir;
      if (key === 'seasonPlace') return (a.seasonPlace - b.seasonPlace) * dir;
      if (key === 'overallPlace') return ((a.overallPlace ?? 999) - (b.overallPlace ?? 999)) * dir;
      return 0;
    });
  }, [data, minYears, sortConfig]);

  useEffect(() => {
    if (!selectedRow && sortedRows.length > 0) {
      setSelectedRow(sortedRows[0]);
    }
  }, [sortedRows, selectedRow]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction:
        prev.key === key && prev.direction === 'descending'
          ? 'ascending'
          : 'descending',
    }));
  };

  const getSortIndicator = (key: SortKey) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
  };

  // Resolve selected row users for MatchupDisplay
  const selectedLeague = selectedRow?.league ?? null;
  const selectedUser =
    selectedLeague?.users.find((u) => u.user_id === selectedRow?.userId) ?? null;
  const selectedOpp1 =
    selectedLeague?.users.find(
      (u) => u.user_id === selectedRow?.opponentUserId1
    ) ?? null;
  const selectedOpp2 =
    selectedLeague?.users.find(
      (u) => u.user_id === selectedRow?.opponentUserId2
    ) ?? null;

  if (sortedRows.length === 0) {
    return (
      <div className="regular-season-points">
        <div className="notImplementedMessage">
          No Last 2 Week Performance data found (min years: {minYears}).
        </div>
      </div>
    );
  }

  return (
    <div className="regular-season-points">
      {isMobile && showMobileDetail && (
        <button
          onClick={() => setShowMobileDetail(false)}
          className="mobile-back-button"
        >
          ← Back to List
        </button>
      )}
      <div className="two-pane-layout">
        {/* LEFT PANE */}
        <div
          className={`main-table-pane ${
            isMobile && showMobileDetail ? 'mobile-hidden' : ''
          }`}
        >
          <table className="leagueStatsTable regular-season-table selectable-table">
            <thead>
              <tr>
                <th
                  onClick={() => handleSort('teamName')}
                  className="sortable"
                >
                  Team (Years) {getSortIndicator('teamName')}
                </th>
                <th onClick={() => handleSort('year')} className="sortable">
                  Year {getSortIndicator('year')}
                </th>
                <th onClick={() => handleSort('avgPts')} className="sortable">
                  Avg. Pts (Total Pts) {getSortIndicator('avgPts')}
                </th>
                <th onClick={() => handleSort('seasonPlace')} className="sortable">
                  Season Place {getSortIndicator('seasonPlace')}
                </th>
                <th onClick={() => handleSort('overallPlace')} className="sortable">
                  Overall Place {getSortIndicator('overallPlace')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row, index) => {
                const isSelected =
                  selectedRow?.userId === row.userId &&
                  selectedRow?.year === row.year;
                return (
                  <tr
                    key={`${row.userId}-${row.year}`}
                    className={`${
                      isSelected ? 'active selected-row' : ''
                    } ${index % 2 === 0 ? 'even-row' : 'odd-row'}`}
                    onClick={() => {
                      setSelectedRow(row);
                      if (isMobile) setShowMobileDetail(true);
                    }}
                  >
                    <td className="team-name-cell">
                      {row.teamName} ({row.yearsPlayed})
                    </td>
                    <td>{row.year}</td>
                    <td>
                      {row.avgPts.toFixed(2)} ({row.totalPts.toFixed(2)})
                    </td>
                    <td>{row.seasonPlace}</td>
                    <td>{row.overallPlace ?? 'N/A'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* RIGHT PANE — 2 stacked MatchupDisplays */}
        <div
          className={`detail-pane-wrapper ${
            isMobile && !showMobileDetail ? 'mobile-hidden' : ''
          }`}
        >
          {selectedRow && selectedLeague && selectedUser ? (
            <div>
              {selectedRow.week1 !== null && selectedOpp1 ? (
                <MatchupDisplay
                  user1={selectedUser}
                  user2={selectedOpp1}
                  data={selectedLeague}
                  week={selectedRow.week1}
                  title={`Week ${selectedRow.week1}, ${selectedRow.year}`}
                />
              ) : selectedRow.week1 !== null ? (
                <div className="notImplementedMessage">
                  Could not resolve Week {selectedRow.week1} opponent.
                </div>
              ) : null}
              <div style={{ marginTop: '20px' }}>
                {selectedRow.week2 !== null && selectedOpp2 ? (
                  <MatchupDisplay
                    user1={selectedUser}
                    user2={selectedOpp2}
                    data={selectedLeague}
                    week={selectedRow.week2}
                    title={`Week ${selectedRow.week2}, ${selectedRow.year}`}
                  />
                ) : selectedRow.week2 !== null ? (
                  <div className="notImplementedMessage">
                    Could not resolve Week {selectedRow.week2} opponent.
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="notImplementedMessage">
              Select a row to see the matchup displays.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Last2WeekPerformance;
