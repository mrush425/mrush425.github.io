import React, { useMemo, useState, useEffect } from 'react';
import { RecordComponentProps } from '../../../Interfaces/RecordStatItem';
import LeagueData from '../../../Interfaces/LeagueData';
import SleeperUser from '../../../Interfaces/SleeperUser';

import {
  calculateYearPoints,
  calculateYearPointsAgainst,
} from '../../../Helper Files/PointCalculations';

import { getUserSeasonPlace, getOverallPlace } from '../../../Helper Files/HelperMethods';

// ✅ shared right pane
import WeeklyMatchupsPane from '../../../Components/WeeklyMatchupsPane';

// =========================================================================
// TYPE DEFINITIONS
// =========================================================================

interface TeamSeasonRow {
  userId: string;
  teamName: string;
  yearsPlayed: number;
  year: number;

  place: number;
  seasonPlace: number;

  points: number;
  games: number;

  avgPointsPerGameValue: number;
  avgPointsPerGameDisplay: string;

  pointsAgainst: number;
  avgPointsAgainstPerGameValue: number;
  avgPointsAgainstPerGameDisplay: string;
}

type SortKey =
  | 'teamName'
  | 'year'
  | 'avgPointsPerGameValue'
  | 'avgPointsAgainstPerGameValue'
  | 'place'
  | 'seasonPlace';

interface SortConfig {
  key: SortKey;
  direction: 'ascending' | 'descending';
}

interface MaxMinSeasonStats {
  avgPointsPerGameValue: { max: number; min: number };
  avgPointsAgainstPerGameValue: { max: number; min: number };
}

// =========================================================================
// HELPER FUNCTIONS
// =========================================================================

const buildYearsPlayedMap = (data: LeagueData[]): Map<string, number> => {
  const map = new Map<string, number>();

  data.forEach((league) => {
    league.users.forEach((user) => {
      map.set(user.user_id, (map.get(user.user_id) ?? 0) + 1);
    });
  });

  return map;
};

const buildTeamSeasonRows = (data: LeagueData[], minYears: number): TeamSeasonRow[] => {
  const yearsPlayedMap = buildYearsPlayedMap(data);
  const rows: TeamSeasonRow[] = [];

  const allUserIds = Array.from(yearsPlayedMap.keys());

  allUserIds.forEach((userId) => {
    const yearsPlayed = yearsPlayedMap.get(userId) ?? 0;
    if (yearsPlayed < minYears) return;

    data.forEach((league) => {
      const userInLeague = league.users.find((u) => u.user_id === userId);
      const roster = league.rosters.find((r) => r.owner_id === userId);

      if (!userInLeague || !roster) return;

      const games = roster.settings.wins + roster.settings.losses + roster.settings.ties;
      if (games <= 0) return;

      const year = Number.parseInt(league.season);

      const teamName =
        userInLeague.metadata.team_name || `User ${userId.substring(0, 4)}`;

      const seasonPlace = getUserSeasonPlace(userInLeague.user_id, league) ?? 0;
      const place = getOverallPlace(userInLeague.user_id, league.season) ?? 0;

      const points = calculateYearPoints(userInLeague as SleeperUser, league);
      const pointsAgainst = calculateYearPointsAgainst(userInLeague as SleeperUser, league);

      const avgPoints = points / games;
      const avgAgainst = pointsAgainst / games;

      const avgPointsRounded = Math.round(avgPoints * 100) / 100;
      const avgAgainstRounded = Math.round(avgAgainst * 100) / 100;

      rows.push({
        userId,
        teamName,
        yearsPlayed,
        year,

        place,
        seasonPlace,

        points: Math.round(points * 100) / 100,
        games,

        avgPointsPerGameValue: avgPointsRounded,
        avgPointsPerGameDisplay: avgPointsRounded.toFixed(2),

        pointsAgainst: Math.round(pointsAgainst * 100) / 100,
        avgPointsAgainstPerGameValue: avgAgainstRounded,
        avgPointsAgainstPerGameDisplay: avgAgainstRounded.toFixed(2),
      });
    });
  });

  return rows;
};

// =========================================================================
// MAIN COMPONENT
// =========================================================================

const YearlyPointsLeaderboard: React.FC<RecordComponentProps & { minYears?: number }> = ({
  data,
  minYears = 0,
}) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'avgPointsPerGameValue',
    direction: 'descending',
  });

  const [selectedRow, setSelectedRow] = useState<TeamSeasonRow | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  const { sortedRows, maxMinValues } = useMemo(() => {
    const rows = buildTeamSeasonRows(data, minYears);

    if (rows.length === 0) {
      return {
        sortedRows: [] as TeamSeasonRow[],
        maxMinValues: {
          avgPointsPerGameValue: { max: 0, min: 0 },
          avgPointsAgainstPerGameValue: { max: 0, min: 0 },
        } as MaxMinSeasonStats,
      };
    }

    const avgPts = rows.map((r) => r.avgPointsPerGameValue);
    const avgAgainst = rows.map((r) => r.avgPointsAgainstPerGameValue);

    const mm: MaxMinSeasonStats = {
      avgPointsPerGameValue: {
        max: Math.max(...avgPts),
        min: Math.min(...avgPts),
      },
      avgPointsAgainstPerGameValue: {
        max: Math.max(...avgAgainst),
        min: Math.min(...avgAgainst),
      },
    };

    const sorted = [...rows].sort((a, b) => {
      const { key, direction } = sortConfig;
      const dir = direction === 'ascending' ? 1 : -1;

      if (key === 'teamName') return a.teamName.localeCompare(b.teamName) * dir;
      if (key === 'year') return (a.year - b.year) * dir;

      const aVal = a[key] as number;
      const bVal = b[key] as number;
      return (aVal - bVal) * dir;
    });

    return { sortedRows: sorted, maxMinValues: mm };
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

  const getCellClassName = (key: keyof MaxMinSeasonStats, value: number): string => {
    const { max, min } = maxMinValues[key];
    if (max === min) return '';

    if (key === 'avgPointsPerGameValue') {
      if (value === max) return 'highlight-best';
      if (value === min) return 'highlight-worst';
    }

    if (key === 'avgPointsAgainstPerGameValue') {
      if (value === min) return 'highlight-best';
      if (value === max) return 'highlight-worst';
    }

    return '';
  };

  if (sortedRows.length === 0) {
    return (
      <div className="regular-season-points">
        <div className="notImplementedMessage">
          No yearly data found (min years: {minYears})
        </div>
      </div>
    );
  }

  const handleBackToList = () => {
    setShowMobileDetail(false);
  };

  return (
    <div className="regular-season-points">
      {isMobile && showMobileDetail && (
        <button onClick={handleBackToList} className="mobile-back-button">
          ← Back to List
        </button>
      )}
      <div className="two-pane-layout">
        {/* LEFT TABLE */}
        <div className={`main-table-pane ${isMobile && showMobileDetail ? 'mobile-hidden' : ''}`}>
          <table className="leagueStatsTable regular-season-table selectable-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('teamName')} className="sortable">
                  Team (Years) {getSortIndicator('teamName')}
                </th>

                <th onClick={() => handleSort('year')} className="sortable">
                  Year {getSortIndicator('year')}
                </th>

                <th onClick={() => handleSort('place')} className="sortable">
                  Place {getSortIndicator('place')}
                </th>

                <th onClick={() => handleSort('seasonPlace')} className="sortable">
                  Season Place {getSortIndicator('seasonPlace')}
                </th>

                <th onClick={() => handleSort('avgPointsPerGameValue')} className="sortable">
                  Avg. Pts {getSortIndicator('avgPointsPerGameValue')}
                </th>

                <th
                  onClick={() => handleSort('avgPointsAgainstPerGameValue')}
                  className="sortable"
                >
                  Avg. Pts Against {getSortIndicator('avgPointsAgainstPerGameValue')}
                </th>
              </tr>
            </thead>

            <tbody>
              {sortedRows.map((row, index) => (
                <tr
                  key={`${row.userId}-${row.year}`}
                  className={`${selectedRow?.userId === row.userId && selectedRow?.year === row.year
                    ? 'active selected-row'
                    : ''
                    } ${index % 2 === 0 ? 'even-row' : 'odd-row'}`}
                  onClick={() => {
                    const newSelection = (prev: TeamSeasonRow | null) =>
                      prev?.userId === row.userId && prev?.year === row.year ? null : row;
                    setSelectedRow(newSelection);
                    if (isMobile) setShowMobileDetail(true);
                  }}
                >
                  <td className="team-name-cell">
                    {row.teamName} ({row.yearsPlayed})
                  </td>

                  <td>{row.year}</td>

                  <td>{row.place || '-'}</td>

                  <td>{row.seasonPlace || '-'}</td>

                  <td
                    className={getCellClassName('avgPointsPerGameValue', row.avgPointsPerGameValue)}
                  >
                    {row.avgPointsPerGameDisplay} ({row.points.toFixed(2)})
                  </td>

                  <td
                    className={getCellClassName(
                      'avgPointsAgainstPerGameValue',
                      row.avgPointsAgainstPerGameValue
                    )}
                  >
                    {row.avgPointsAgainstPerGameDisplay} ({row.pointsAgainst.toFixed(2)})
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* RIGHT PANE */}
        <div className={`detail-pane-wrapper ${isMobile && !showMobileDetail ? 'mobile-hidden' : ''}`}>
          {selectedRow ? (
            <WeeklyMatchupsPane
              allLeagues={data}
              userId={selectedRow.userId}
              season={selectedRow.year}
              excludePlayoffs={true}
            />
          ) : (
            <div className="notImplementedMessage">
              Select a season row to see weekly matchups.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default YearlyPointsLeaderboard;
