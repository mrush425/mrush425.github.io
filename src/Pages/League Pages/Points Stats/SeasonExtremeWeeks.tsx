import React, { useEffect, useMemo, useState } from 'react';
import { PointComponentProps } from '../PointsStats';
import LeagueData from '../../../Interfaces/LeagueData';

type ExtremeKind = 'best-low' | 'worst-high';

interface YearExtreme {
  year: number;
  score: number;
  week: number;
  opponentScore: number | null;
}

interface TeamExtreme {
  userId: string;
  teamName: string;
  yearsPlayed: number;
  score: number;
  year: number;
  week: number;
  opponentScore: number | null;
  yearlyExtremes: YearExtreme[];
}

interface WeeklyScore {
  userId: string;
  teamName: string;
  year: number;
  week: number;
  score: number;
  opponentScore: number | null;
}

const getYearlyExtremes = (data: LeagueData[], kind: ExtremeKind): TeamExtreme[] => {
  const scoresByUser = new Map<string, Map<number, WeeklyScore[]>>();
  const teamNames = new Map<string, string>();
  const yearsPlayedByUser = new Map<string, Set<number>>();

  data.forEach((league) => {
    const year = Number.parseInt(league.season, 10);
    const playoffStartWeek = league.settings.playoff_week_start || Number.POSITIVE_INFINITY;
    if (!Number.isFinite(year)) return;

    league.users.forEach((user) => {
      const yearsPlayed = yearsPlayedByUser.get(user.user_id) ?? new Set<number>();
      yearsPlayed.add(year);
      yearsPlayedByUser.set(user.user_id, yearsPlayed);
    });

    league.matchupInfo.forEach((weekInfo) => {
      if (weekInfo.week < 1 || weekInfo.week >= playoffStartWeek) return;

      weekInfo.matchups.forEach((matchup) => {
        if (!Number.isFinite(matchup.points)) return;

        const roster = league.rosters.find((item) => item.roster_id === matchup.roster_id);
        const user = roster && league.users.find((item) => item.user_id === roster.owner_id);
        if (!user || !roster) return;

        const opponentMatchup = weekInfo.matchups.find(
          (item) => item.matchup_id === matchup.matchup_id && item.roster_id !== matchup.roster_id
        );
        const teamName = user.metadata?.team_name || `User ${user.user_id.substring(0, 4)}`;
        const score: WeeklyScore = {
          userId: user.user_id,
          teamName,
          year,
          week: weekInfo.week,
          score: matchup.points,
          opponentScore: opponentMatchup && Number.isFinite(opponentMatchup.points)
            ? opponentMatchup.points
            : null,
        };

        teamNames.set(user.user_id, teamName);
        let yearlyScores = scoresByUser.get(user.user_id);
        if (!yearlyScores) {
          yearlyScores = new Map<number, WeeklyScore[]>();
          scoresByUser.set(user.user_id, yearlyScores);
        }

        const weeklyScores = yearlyScores.get(year) ?? [];
        weeklyScores.push(score);
        yearlyScores.set(year, weeklyScores);
      });
    });
  });

  return Array.from(scoresByUser, ([userId, yearlyScores]) => {
    const yearlyExtremes = Array.from(yearlyScores, ([year, scores]) => {
      const direction = kind === 'best-low' ? 1 : -1;
      const extreme = [...scores].sort(
        (a, b) => direction * (a.score - b.score) || a.week - b.week
      )[0];

      return {
        year,
        score: extreme.score,
        week: extreme.week,
        opponentScore: extreme.opponentScore,
      };
    }).sort((a, b) => b.year - a.year);

    const overallDirection = kind === 'best-low' ? -1 : 1;
    const overallExtreme = [...yearlyExtremes].sort(
      (a, b) => overallDirection * (a.score - b.score) || a.year - b.year
    )[0];

    return {
      userId,
      teamName: teamNames.get(userId) ?? `User ${userId.substring(0, 4)}`,
      yearsPlayed: yearsPlayedByUser.get(userId)?.size ?? yearlyExtremes.length,
      score: overallExtreme.score,
      year: overallExtreme.year,
      week: overallExtreme.week,
      opponentScore: overallExtreme.opponentScore,
      yearlyExtremes,
    };
  });
};

interface SeasonExtremeWeeksProps extends PointComponentProps {
  kind: ExtremeKind;
}

const SeasonExtremeWeeks: React.FC<SeasonExtremeWeeksProps> = ({
  data,
  minYears = 0,
  kind,
}) => {
  const teams = useMemo(
    () => getYearlyExtremes(data, kind)
      .filter((team) => team.yearsPlayed >= minYears),
    [data, kind, minYears]
  );
  const [scoreSortDirection, setScoreSortDirection] = useState<'ascending' | 'descending'>(
    kind === 'best-low' ? 'descending' : 'ascending'
  );
  const sortedTeams = useMemo(
    () => [...teams].sort((a, b) => {
      const direction = scoreSortDirection === 'ascending' ? 1 : -1;
      return direction * (a.score - b.score) || a.teamName.localeCompare(b.teamName);
    }),
    [teams, scoreSortDirection]
  );
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!sortedTeams.some((team) => team.userId === selectedUserId)) {
      setSelectedUserId(sortedTeams[0]?.userId ?? null);
    }
  }, [sortedTeams, selectedUserId]);

  const selectedTeam = sortedTeams.find((team) => team.userId === selectedUserId);
  const scoreLabel = kind === 'best-low' ? 'Lowest Score' : 'Highest Score';
  const scoreSortIndicator = scoreSortDirection === 'ascending' ? ' ▲' : ' ▼';

  return (
    <div className="regular-season-points">
      {sortedTeams.length === 0 ? (
        <div className="notImplementedMessage">
          No regular-season scores found for teams with at least {minYears} years.
        </div>
      ) : (
        <div className="two-pane-layout">
          <div className="main-table-pane">
            <table className="leagueStatsTable regular-season-table selectable-table">
              <thead>
                <tr>
                  <th>Team (Years)</th>
                  <th
                    className="sortable"
                    aria-sort={scoreSortDirection === 'ascending' ? 'ascending' : 'descending'}
                    onClick={() => setScoreSortDirection((direction) =>
                      direction === 'ascending' ? 'descending' : 'ascending'
                    )}
                  >
                    Score{scoreSortIndicator}
                  </th>
                  <th>Year</th>
                  <th>Week</th>
                  <th>Opp Score</th>
                </tr>
              </thead>
              <tbody>
                {sortedTeams.map((team, index) => (
                  <tr
                    key={team.userId}
                    className={`${selectedUserId === team.userId ? 'active selected-row' : ''} ${
                      index % 2 === 0 ? 'even-row' : 'odd-row'
                    }`}
                    onClick={() => setSelectedUserId(team.userId)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedUserId(team.userId);
                      }
                    }}
                    tabIndex={0}
                  >
                    <td className="team-name-cell">{team.teamName} ({team.yearsPlayed})</td>
                    <td>{team.score.toFixed(2)}</td>
                    <td>{team.year}</td>
                    <td>{team.week}</td>
                    <td>{team.opponentScore === null ? '-' : team.opponentScore.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="detail-pane-wrapper">
            {selectedTeam && (
              <div className="detail-pane">
                <h4>{selectedTeam.teamName} by Year</h4>
                <table className="leagueStatsTable detail-table">
                  <thead>
                    <tr>
                      <th>Year</th>
                      <th>{scoreLabel}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedTeam.yearlyExtremes.map((yearlyExtreme) => (
                      <tr key={yearlyExtreme.year}>
                        <td>{yearlyExtreme.year}</td>
                        <td>{yearlyExtreme.score.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const BestLowWeek: React.FC<PointComponentProps> = (props) => (
  <SeasonExtremeWeeks {...props} kind="best-low" />
);

export const WorstHighWeek: React.FC<PointComponentProps> = (props) => (
  <SeasonExtremeWeeks {...props} kind="worst-high" />
);
