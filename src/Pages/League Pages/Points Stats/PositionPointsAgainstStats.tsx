import React, { useMemo, useState, useEffect } from 'react';
import { RecordComponentProps } from '../../../Interfaces/RecordStatItem';
import LeagueData from '../../../Interfaces/LeagueData';
import SleeperUser from '../../../Interfaces/SleeperUser';

import SidebetMethods, {
  PositionAgainstAccumulator,
  PositionAgainstWeeklyDetail,
} from '../../../Pages/Year Pages/SidebetMethods';

import { findRosterByUserId } from '../../../Helper Files/HelperMethods';

// =========================================================================
// TYPES
// =========================================================================

type Mode = 'average' | 'singleYear';

interface AverageLeftRow {
  userId: string;
  teamName: string;
  yearsPlayed: number;

  totalPoints: number;
  totalGames: number;

  avgPerGame: number; // col 2
  avgPerYear: number; // col 3
}

interface AverageRightRow {
  year: number;
  points: number;
}

interface SingleYearLeftRow {
  userId: string;
  teamName: string;
  yearsPlayed: number;

  year: number;

  totalPoints: number; // season total
  games: number; // regular season games that year
  avgPerGame: number; // ✅ col 3
  league: LeagueData;

  weeklyDetails: PositionAgainstWeeklyDetail[];
}

// =========================================================================
// HELPERS
// =========================================================================

const round2 = (n: number) => Math.round(n * 100) / 100;

const buildYearsPlayedMap = (allLeagues: LeagueData[]): Map<string, number> => {
  const map = new Map<string, number>();
  allLeagues.forEach((league) => {
    league.users.forEach((u) => {
      map.set(u.user_id, (map.get(u.user_id) ?? 0) + 1);
    });
  });
  return map;
};

const getTeamName = (league: LeagueData, userId: string): string => {
  const u = league.users.find((x) => x.user_id === userId);
  return u?.metadata?.team_name || `User ${userId.substring(0, 4)}`;
};

/**
 * Count regular-season games played for a user in a single league/year.
 * One game per week (standard Sleeper setup).
 */
const getRegularSeasonGamesPlayed = (league: LeagueData, userId: string): number => {
  const rosterId = findRosterByUserId(userId, league.rosters)?.roster_id;
  if (!rosterId) return 0;

  const playoffStart = league.settings.playoff_week_start;

  const isCurrentSeason = league.nflSeasonInfo?.season === league.season;
  const isRegularSeasonNow = league.nflSeasonInfo?.season_type !== 'post';

  const maxWeekExclusive =
    isCurrentSeason && isRegularSeasonNow
      ? Math.min(league.nflSeasonInfo.week, playoffStart)
      : playoffStart;

  let games = 0;
  league.matchupInfo.forEach((mi) => {
    if (mi.week >= maxWeekExclusive) return;
    const hasMatchup = mi.matchups.some((m) => m.roster_id === rosterId);
    if (hasMatchup) games += 1;
  });

  return games;
};

// =========================================================================
// COMPONENT
// =========================================================================

const PositionPointsAgainstStats: React.FC<
  RecordComponentProps & {
    position: string;
    metricLabel: string;
    minYears?: number;
  }
> = ({ data, position, metricLabel, minYears = 0 }) => {
  const [mode, setMode] = useState<Mode>('average');

  const [selectedAverageUserId, setSelectedAverageUserId] = useState<string | null>(null);
  const [selectedSingleRow, setSelectedSingleRow] = useState<SingleYearLeftRow | null>(null);

  const yearsPlayedMap = useMemo(() => buildYearsPlayedMap(data), [data]);

  // ---------------------------------------------------------------------
  // AVERAGE MODE (Avg/Game + Avg/Year + Total)
  // ---------------------------------------------------------------------

  const averageLeftRows = useMemo((): AverageLeftRow[] => {
    const totals = new Map<string, { totalPoints: number; totalGames: number }>();

    data.forEach((league) => {
      league.users.forEach((u) => {
        const userId = u.user_id;
        const yearsPlayed = yearsPlayedMap.get(userId) ?? 0;
        if (yearsPlayed < minYears) return;

        const pts = SidebetMethods.UserPointsAgainstByPosition(position, u as SleeperUser, league);
        const games = getRegularSeasonGamesPlayed(league, userId);

        const prev = totals.get(userId) ?? { totalPoints: 0, totalGames: 0 };
        totals.set(userId, {
          totalPoints: prev.totalPoints + pts,
          totalGames: prev.totalGames + games,
        });
      });
    });

    const rows: AverageLeftRow[] = [];

    totals.forEach(({ totalPoints, totalGames }, userId) => {
      const yearsPlayed = yearsPlayedMap.get(userId) ?? 0;
      if (yearsPlayed < minYears || yearsPlayed === 0) return;
      if (totalGames <= 0) return;

      let teamName = '';
      for (let i = data.length - 1; i >= 0; i--) {
        if (data[i].users.some((u) => u.user_id === userId)) {
          teamName = getTeamName(data[i], userId);
          break;
        }
      }
      if (!teamName) teamName = `User ${userId.substring(0, 4)}`;

      rows.push({
        userId,
        teamName,
        yearsPlayed,
        totalPoints: round2(totalPoints),
        totalGames,
        avgPerGame: round2(totalPoints / totalGames),
        avgPerYear: round2(totalPoints / yearsPlayed),
      });
    });

    rows.sort((a, b) => b.avgPerGame - a.avgPerGame);
    return rows;
  }, [data, position, yearsPlayedMap, minYears]);

  const averageRightRows = useMemo((): AverageRightRow[] => {
    if (!selectedAverageUserId) return [];

    const rows: AverageRightRow[] = [];
    data.forEach((league) => {
      const user = league.users.find((u) => u.user_id === selectedAverageUserId);
      if (!user) return;

      const year = Number.parseInt(league.season);
      const pts = SidebetMethods.UserPointsAgainstByPosition(position, user as SleeperUser, league);

      rows.push({
        year: Number.isFinite(year) ? year : 0,
        points: round2(pts),
      });
    });

    rows.sort((a, b) => b.year - a.year);
    return rows;
  }, [data, position, selectedAverageUserId]);

  // ---------------------------------------------------------------------
  // SINGLE YEAR MODE (✅ now Avg/Game + Total)
  // ---------------------------------------------------------------------

  const singleYearLeftRows = useMemo((): SingleYearLeftRow[] => {
    const rows: SingleYearLeftRow[] = [];

    data.forEach((league) => {
      const year = Number.parseInt(league.season);
      if (!Number.isFinite(year)) return;

      league.users.forEach((u) => {
        const userId = u.user_id;
        const yearsPlayed = yearsPlayedMap.get(userId) ?? 0;
        if (yearsPlayed < minYears) return;

        const acc: PositionAgainstAccumulator = { details: [] };

        const totalPoints = SidebetMethods.UserPointsAgainstByPosition(
          position,
          u as SleeperUser,
          league,
          acc
        );

        const games = getRegularSeasonGamesPlayed(league, userId);
        if (games <= 0) return;

        const avgPerGame = totalPoints / games;

        rows.push({
          userId,
          teamName: getTeamName(league, userId),
          yearsPlayed,
          year,

          totalPoints: round2(totalPoints),
          games,
          avgPerGame: round2(avgPerGame),

          league,
          weeklyDetails: acc.details,
        });
      });
    });

    // default sort: highest Avg/Game
    rows.sort((a, b) => b.avgPerGame - a.avgPerGame);
    return rows;
  }, [data, position, yearsPlayedMap, minYears]);

  // Per-year extremes for SINGLE YEAR highlighting:
  // now based on Avg/Game (since that’s the primary stat)
  const singleYearExtremes = useMemo(() => {
    const map = new Map<number, { min: number; max: number }>();
    singleYearLeftRows.forEach((r) => {
      const e = map.get(r.year);
      if (!e) map.set(r.year, { min: r.avgPerGame, max: r.avgPerGame });
      else {
        if (r.avgPerGame < e.min) e.min = r.avgPerGame;
        if (r.avgPerGame > e.max) e.max = r.avgPerGame;
      }
    });
    return map;
  }, [singleYearLeftRows]);

  const getSingleYearYearCellClassName = (row: SingleYearLeftRow): string => {
    const ex = singleYearExtremes.get(row.year);
    if (!ex || ex.min === ex.max) return '';
    if (row.avgPerGame === ex.max) return 'highlight-best';
    if (row.avgPerGame === ex.min) return 'highlight-worst';
    return '';
  };

  // Defaults on mode switch
  useEffect(() => {
    if (mode === 'average') {
      if (!selectedAverageUserId && averageLeftRows.length > 0) {
        setSelectedAverageUserId(averageLeftRows[0].userId);
      }
    } else {
      if (!selectedSingleRow && singleYearLeftRows.length > 0) {
        setSelectedSingleRow(singleYearLeftRows[0]);
      }
    }
  }, [mode, averageLeftRows, singleYearLeftRows, selectedAverageUserId, selectedSingleRow]);

  // ---------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------

  return (
    <div className="regular-season-points">
      {/* MODE TOGGLE */}
      <div style={{ marginBottom: 10 }}>
        <label style={{ marginRight: 12 }}>
          <input
            type="radio"
            checked={mode === 'average'}
            onChange={() => setMode('average')}
            style={{ marginRight: 6 }}
          />
          Average
        </label>
        <label>
          <input
            type="radio"
            checked={mode === 'singleYear'}
            onChange={() => setMode('singleYear')}
            style={{ marginRight: 6 }}
          />
          Single Year
        </label>
      </div>

      <div className="two-pane-layout">
        {/* LEFT */}
        <div className="main-table-pane">
          {mode === 'average' ? (
            <table className="statsTable regular-season-table selectable-table">
              <thead>
                <tr>
                  <th>Team (Years)</th>
                  <th>Avg / Game</th>
                  <th>Avg / Year</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {averageLeftRows.map((r, idx) => (
                  <tr
                    key={r.userId}
                    className={`${selectedAverageUserId === r.userId ? 'active selected-row' : ''} ${
                      idx % 2 === 0 ? 'even-row' : 'odd-row'
                    }`}
                    onClick={() =>
                      setSelectedAverageUserId((prev) => (prev === r.userId ? null : r.userId))
                    }
                  >
                    <td className="team-name-cell">
                      {r.teamName} ({r.yearsPlayed})
                    </td>
                    <td>{r.avgPerGame.toFixed(2)}</td>
                    <td>{r.avgPerYear.toFixed(2)}</td>
                    <td>{r.totalPoints.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="statsTable regular-season-table selectable-table">
              <thead>
                <tr>
                  <th>Team (Years)</th>
                  <th>Year</th>
                  <th>Avg / Game</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {singleYearLeftRows.map((r, idx) => (
                  <tr
                    key={`${r.userId}-${r.year}`}
                    className={`${selectedSingleRow?.userId === r.userId &&
                      selectedSingleRow?.year === r.year
                      ? 'active selected-row'
                      : ''
                      } ${idx % 2 === 0 ? 'even-row' : 'odd-row'}`}
                    onClick={() =>
                      setSelectedSingleRow((prev) =>
                        prev?.userId === r.userId && prev?.year === r.year ? null : r
                      )
                    }
                  >
                    <td className="team-name-cell">
                      {r.teamName} ({r.yearsPlayed})
                    </td>
                    <td className={getSingleYearYearCellClassName(r)}>{r.year}</td>
                    <td>{r.avgPerGame.toFixed(2)}</td>
                    <td>{r.totalPoints.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* RIGHT */}
        <div className="detail-pane-wrapper">
          {mode === 'average' ? (
            selectedAverageUserId ? (
              <table className="statsTable detail-table">
                <thead>
                  <tr>
                    <th>Year</th>
                    <th>{metricLabel}</th>
                  </tr>
                </thead>
                <tbody>
                  {averageRightRows.map((r) => (
                    <tr key={r.year}>
                      <td>{r.year}</td>
                      <td>{r.points.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="notImplementedMessage">Select a team to see yearly breakdown.</div>
            )
          ) : selectedSingleRow ? (
            <table className="statsTable detail-table">
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Week</th>
                  <th>Player Name(s)</th>
                  <th>Points</th>
                </tr>
              </thead>
              <tbody>
                {selectedSingleRow.weeklyDetails
                  .slice()
                  .sort((a, b) => (a.year !== b.year ? b.year - a.year : a.week - b.week))
                  .map((d, i) => (
                    <tr key={`${d.year}-${d.week}-${d.playerName}-${i}`}>
                      <td>{d.year}</td>
                      <td>{d.week}</td>
                      <td>{d.playerName}</td>
                      <td>{round2(d.points).toFixed(2)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          ) : (
            <div className="notImplementedMessage">Select a row to see weekly player breakdown.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PositionPointsAgainstStats;
