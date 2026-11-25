import React, { useEffect, useMemo, useState } from 'react';
import Modal from 'react-bootstrap/Modal';
import LeagueData from '../../Interfaces/LeagueData';
import YearNavBar from '../../Navigation/YearNavBar';
import '../../Stylesheets/YearStylesheets/AllPlayoffPossibilities.css';
import {
  analyzeScenario,
  getByeWinDistribution,
  getExampleScenarioDistribution,
  getMostCommonCompetitionGroupsBySpots,
  getOrdinalPlaceLabel,
  getPointsMatterWinDistribution,
  getRelevantScenarioGameIndexes,
  getScenarioTiebreakerDetails,
  getScenarioStatus,
  getTeamTiebreakerDependencies,
  ExampleScenarioOption,
  incrementPointsMatterCounts,
  PointsMatterCompetitionGroup,
  PointsMatterWinDistribution,
  ScenarioAnalysis,
  ScenarioGame,
  ScenarioTarget,
  SimulationScenarios,
} from './PlayoffScenarioMethods';
import {
  compareRostersByRegularSeasonFinish,
  getAveragePointsMap,
  getLast3WeeksAveragePointsMap,
  getUserSeasonPlace,
} from '../../Helper Files/HelperMethods';
import { calculateScheduleRecord } from '../../Helper Files/RecordCalculations';

interface AllPlayoffPossibilitiesProps {
  data: LeagueData;
}

interface Record {
  userId: string;
  pointsFor: number;
  wins: number;
  losses: number;
  ties: number;
}

interface SimulationResults {
  userWinsMap: Map<string, Map<number, number>>;
  userPlaceMap: Map<string, Map<number, number>>;
  playoffPointDependencyMap: Map<string, number>;
  scenarios?: SimulationScenarios;
}

const SIMULATION_COUNT = 500000;
const MAX_BREAKDOWN_WEEKS = 4;
const MAX_DETAILED_COMPETITION_GROUPS = 4;

function formatPointsForGap(points: number): string {
  return points.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function buildScenarioGames(
  data: LeagueData,
  users: LeagueData['users'],
  currentWeek: number,
  playoffStartWeek: number
): ScenarioGame[] {
  const teamIndexByRosterId = new Map<number, number>();
  users.forEach((user, index) => {
    const roster = data.rosters.find((entry) => entry.owner_id === user.user_id);
    if (roster) teamIndexByRosterId.set(roster.roster_id, index);
  });

  const games: ScenarioGame[] = [];
  data.matchupInfo
    .filter((week) => week.week >= currentWeek && week.week < playoffStartWeek)
    .sort((a, b) => a.week - b.week)
    .forEach((week) => {
      const gamesByMatchup = new Map<number, typeof week.matchups>();
      week.matchups.forEach((matchup) => {
        const match = gamesByMatchup.get(matchup.matchup_id) || [];
        match.push(matchup);
        gamesByMatchup.set(matchup.matchup_id, match);
      });
      gamesByMatchup.forEach((matchups, matchupId) => {
        if (matchups.length !== 2) return;
        const team1Index = teamIndexByRosterId.get(matchups[0].roster_id);
        const team2Index = teamIndexByRosterId.get(matchups[1].roster_id);
        if (team1Index === undefined || team2Index === undefined) return;
        games.push({ week: week.week, matchupId, team1Index, team2Index });
      });
    });
  return games;
}

const AllPlayoffPossibilities: React.FC<AllPlayoffPossibilitiesProps> = ({ data }) => {
  const [useLast3Points, setUseLast3Points] = useState(false);
  const [showSimulationCounts, setShowSimulationCounts] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [simulationResults, setSimulationResults] = useState<SimulationResults | null>(null);
  const [simulationError, setSimulationError] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<ScenarioTarget | null>(null);
  const [isScenarioPopupOpen, setIsScenarioPopupOpen] = useState(false);
  const [selectedExampleScenario, setSelectedExampleScenario] =
    useState<ExampleScenarioOption | null>(null);
  const [selectedScenarioWeek, setSelectedScenarioWeek] = useState<number | null>(null);
  const [expandedPointsMatterRows, setExpandedPointsMatterRows] = useState<Set<string>>(
    () => new Set()
  );
  const [scenarioAnalysis, setScenarioAnalysis] = useState<ScenarioAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  useEffect(() => {
    const closePopupOnDesktop = () => {
      if (
        typeof window.matchMedia === 'function' &&
        !window.matchMedia('(max-width: 900px)').matches
      ) {
        setIsScenarioPopupOpen(false);
      }
    };

    window.addEventListener('resize', closePopupOnDesktop);
    return () => window.removeEventListener('resize', closePopupOnDesktop);
  }, []);

  const averagePointsMap = useMemo(() => getAveragePointsMap(data), [data]);
  const averageLast3PointsMap = useMemo(() => getLast3WeeksAveragePointsMap(data), [data]);
  const sortedUsers = useMemo(
    () => {
      const rosterOrder = new Map(
        data.rosters.map((roster, index) => [roster.owner_id, index])
      );
      return data.users.slice().sort((a, b) => {
        const rosterA = data.rosters.find((roster) => roster.owner_id === a.user_id);
        const rosterB = data.rosters.find((roster) => roster.owner_id === b.user_id);
        if (!rosterA || !rosterB) return 0;
        const finishDifference = compareRostersByRegularSeasonFinish(rosterA, rosterB);
        if (finishDifference !== 0) return finishDifference;
        return (rosterOrder.get(a.user_id) ?? Number.MAX_SAFE_INTEGER) -
          (rosterOrder.get(b.user_id) ?? Number.MAX_SAFE_INTEGER);
      });
    },
    [data]
  );
  const currentPointsFor = useMemo(
    () => sortedUsers.map((user) => {
      const roster = data.rosters.find((entry) => entry.owner_id === user.user_id);
      return roster ? roster.settings.fpts + roster.settings.fpts_decimal * 0.01 : 0;
    }),
    [data.rosters, sortedUsers]
  );
  const playoffTeamCount = Math.min(
    Math.max(data.settings.playoff_teams || 6, 0),
    data.users.length
  );
  const isCurrentRegularSeason =
    data.nflSeasonInfo.season === data.season &&
    data.nflSeasonInfo.season_type !== 'post';
  const playoffStartWeek = data.settings.playoff_week_start || 0;
  const remainingWeeks = isCurrentRegularSeason && playoffStartWeek > 0
    ? Math.max(playoffStartWeek - data.nflSeasonInfo.week, 0)
    : 0;
  const breakdownAvailable = remainingWeeks > 0 && remainingWeeks <= MAX_BREAKDOWN_WEEKS;
  const pointsMap = useLast3Points ? averageLast3PointsMap : averagePointsMap;
  const scenarioGames = useMemo(
    () => isCurrentRegularSeason && playoffStartWeek > 0
      ? buildScenarioGames(data, sortedUsers, data.nflSeasonInfo.week, playoffStartWeek)
      : [],
    [data, isCurrentRegularSeason, playoffStartWeek, sortedUsers]
  );
  const selectedTeamCurrentWins = useMemo(() => {
    if (!selectedTarget) return 0;
    const user = sortedUsers[selectedTarget.teamIndex];
    return user ? calculateScheduleRecord(user, user, data)[0] : 0;
  }, [data, selectedTarget, sortedUsers]);
  const selectedTeamTiebreakerDependencies = useMemo(
    () => selectedTarget &&
      typeof selectedTarget.place === 'number' &&
      simulationResults?.scenarios
      ? getTeamTiebreakerDependencies(
          simulationResults.scenarios,
          selectedTarget.teamIndex
        )
      : null,
    [selectedTarget, simulationResults?.scenarios]
  );
  const byeWinDistribution = useMemo(
    () => selectedTarget && simulationResults?.scenarios
      ? getByeWinDistribution(
          simulationResults.scenarios,
          selectedTarget.teamIndex,
          selectedTeamCurrentWins
        )
      : [],
    [selectedTarget, selectedTeamCurrentWins, simulationResults?.scenarios]
  );
  const byePointsMatterDistribution = useMemo(
    () => selectedTarget?.place === 'playoffs' && simulationResults?.scenarios
      ? getPointsMatterWinDistribution(
          simulationResults.scenarios,
          selectedTarget.teamIndex,
          selectedTeamCurrentWins,
          2
        )
      : [],
    [selectedTarget, selectedTeamCurrentWins, simulationResults?.scenarios]
  );
  const exampleScenarioDistribution = useMemo(
    (): ReturnType<typeof getExampleScenarioDistribution> =>
      selectedTarget && simulationResults?.scenarios
        ? getExampleScenarioDistribution(
            simulationResults.scenarios,
            selectedTarget.teamIndex,
            selectedTeamCurrentWins,
            playoffTeamCount
          )
        : { options: [], winTotals: [] },
    [
      playoffTeamCount,
      selectedTarget,
      selectedTeamCurrentWins,
      simulationResults?.scenarios,
    ]
  );
  const playoffPointsMatterDistribution = useMemo(
    () => selectedTarget?.place === 'playoffs' && simulationResults?.scenarios
      ? getPointsMatterWinDistribution(
          simulationResults.scenarios,
          selectedTarget.teamIndex,
          selectedTeamCurrentWins,
          playoffTeamCount
        )
      : [],
    [
      playoffTeamCount,
      selectedTarget,
      selectedTeamCurrentWins,
      simulationResults?.scenarios,
    ]
  );
  const butlerPointsMatterDistribution = useMemo(
    () => selectedTarget?.place === 'playoffs' && simulationResults?.scenarios
      ? getPointsMatterWinDistribution(
          simulationResults.scenarios,
          selectedTarget.teamIndex,
          selectedTeamCurrentWins,
          8
        )
      : [],
    [
      selectedTarget,
      selectedTeamCurrentWins,
      simulationResults?.scenarios,
    ]
  );

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadingProgress(0);
    setSimulationError(null);
    setSimulationResults(null);
    setScenarioAnalysis(null);

    const calculate = async () => {
      try {
        const users = sortedUsers;
        const records: Record[] = users.map((user) => {
          const roster = data.rosters.find((entry) => entry.owner_id === user.user_id);
          const [wins, losses, ties] = calculateScheduleRecord(user, user, data);
          return {
            userId: user.user_id,
            pointsFor: roster
              ? roster.settings.fpts + roster.settings.fpts_decimal * 0.01
              : 0,
            wins,
            losses,
            ties,
          };
        });
        const pointsFor = records.map((record) => record.pointsFor);
        const initialWins = records.map((record) => record.wins);
        const regularSeasonGames = scenarioGames;
        const captureScenarios =
          breakdownAvailable && regularSeasonGames.length > 0;
        const outcomeMatrix = captureScenarios
          ? new Uint8Array(SIMULATION_COUNT * regularSeasonGames.length)
          : undefined;
        const placementMatrix = captureScenarios
          ? new Uint8Array(SIMULATION_COUNT * users.length)
          : undefined;
        const finalWinsMatrix = captureScenarios
          ? new Uint8Array(SIMULATION_COUNT * users.length)
          : undefined;
        const placeCounts = users.map(() => new Map<number, number>());
        const winCounts = users.map(() => new Map<number, number>());
        const simulatedWins = new Uint8Array(users.length);
        const playoffPointDependencyCounts = new Uint32Array(users.length);
        const teamOrder = users.map((_, index) => index);
        const selectedPointsMap = pointsMap;
        const team1WinChances = regularSeasonGames.map((game) => {
          const team1Points = selectedPointsMap.get(users[game.team1Index].user_id) || 0;
          const team2Points = selectedPointsMap.get(users[game.team2Index].user_id) || 0;
          const totalPoints = team1Points + team2Points;
          return totalPoints > 0 ? team1Points / totalPoints : 0.5;
        });

        for (let run = 0; run < SIMULATION_COUNT; run++) {
          simulatedWins.set(initialWins);

          regularSeasonGames.forEach((game, gameIndex) => {
            const team1Won = Math.random() < team1WinChances[gameIndex];
            if (outcomeMatrix) {
              outcomeMatrix[run * regularSeasonGames.length + gameIndex] = team1Won ? 0 : 1;
            }
            simulatedWins[team1Won ? game.team1Index : game.team2Index]++;
          });

          teamOrder.sort((teamA, teamB) => {
            const winsDifference = simulatedWins[teamB] - simulatedWins[teamA];
            if (winsDifference !== 0) return winsDifference;
            const pointsDifference = pointsFor[teamB] - pointsFor[teamA];
            if (pointsDifference !== 0) return pointsDifference;
            return teamA - teamB;
          });

          incrementPointsMatterCounts(
            teamOrder,
            simulatedWins,
            playoffTeamCount,
            playoffPointDependencyCounts
          );

          teamOrder.forEach((teamIndex, placeIndex) => {
            const place = placeIndex + 1;
            const placeMap = placeCounts[teamIndex];
            placeMap.set(place, (placeMap.get(place) || 0) + 1);
            const winsMap = winCounts[teamIndex];
            const wins = simulatedWins[teamIndex];
            winsMap.set(wins, (winsMap.get(wins) || 0) + 1);

            if (placementMatrix) {
              placementMatrix[run * users.length + teamIndex] = place;
              finalWinsMatrix![run * users.length + teamIndex] = wins;
            }
          });

          if (run % 5000 === 0) {
            if (cancelled) return;
            setLoadingProgress(Math.round((run / SIMULATION_COUNT) * 100));
            await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
          }
        }

        if (cancelled) return;

        const userPlaceMap = new Map<string, Map<number, number>>();
        const userWinsMap = new Map<string, Map<number, number>>();
        const playoffPointDependencyMap = new Map<string, number>();
        users.forEach((user, index) => {
          userPlaceMap.set(user.user_id, placeCounts[index]);
          userWinsMap.set(user.user_id, winCounts[index]);
          playoffPointDependencyMap.set(
            user.user_id,
            playoffPointDependencyCounts[index]
          );
        });

        setSimulationResults({
          userWinsMap,
          userPlaceMap,
          playoffPointDependencyMap,
          scenarios: captureScenarios
            ? {
                count: SIMULATION_COUNT,
                teamCount: users.length,
                gameCount: regularSeasonGames.length,
                outcomes: outcomeMatrix!,
                placements: placementMatrix!,
                finalWins: finalWinsMatrix!,
              }
            : undefined,
        });
        setIsLoading(false);
        setLoadingProgress(100);
      } catch (error) {
        if (cancelled) return;
        setSimulationError(
          error instanceof Error ? error.message : 'An unexpected error occurred.'
        );
        setIsLoading(false);
      }
    };

    void calculate();
    return () => {
      cancelled = true;
    };
  }, [
    breakdownAvailable,
    data,
    isCurrentRegularSeason,
    playoffTeamCount,
    playoffStartWeek,
    pointsMap,
    scenarioGames,
    sortedUsers,
    useLast3Points,
  ]);

  useEffect(() => {
    let cancelled = false;
    const scenarios = simulationResults?.scenarios;

    if (!selectedTarget || !scenarios || !breakdownAvailable) {
      setScenarioAnalysis(null);
      setAnalysisLoading(false);
      setAnalysisProgress(0);
      setAnalysisError(null);
      return;
    }

    const users = sortedUsers;
    if (selectedTarget.place === 'playoffs') {
      const selectedUser = users[selectedTarget.teamIndex];
      const placeCounts = selectedUser
        ? simulationResults.userPlaceMap.get(selectedUser.user_id)
        : undefined;
      const matchingRuns = placeCounts
        ? Array.from(placeCounts.entries())
            .filter(([place]) => place <= playoffTeamCount)
            .reduce((sum, [, count]) => sum + count, 0)
        : 0;

      if (matchingRuns === 0 || matchingRuns === scenarios.count) {
        setScenarioAnalysis({
          matchingRuns,
          game1WinsInMatchingRuns: Array(scenarioGames.length).fill(0),
          gameImpactCounts: Array(scenarioGames.length).fill(0),
          futureWinsDistribution: [],
          allFutureWinsDistribution: [],
          playoffFutureWinsDistribution: [],
          targetCountIfTeam1Wins: Array(scenarioGames.length).fill(0),
          targetCountIfTeam2Wins: Array(scenarioGames.length).fill(0),
          representativeRunIndex: null,
          representativeRunIndexesByWins: Array(scenarioGames.length + 1).fill(null),
        });
        setAnalysisProgress(100);
        setAnalysisLoading(false);
        return () => {
          cancelled = true;
        };
      }
    }

    setAnalysisLoading(true);
    setAnalysisProgress(0);
    setScenarioAnalysis(null);
    setAnalysisError(null);

    const pointsFor = users.map((user) => {
      const roster = data.rosters.find((entry) => entry.owner_id === user.user_id);
      return roster ? roster.settings.fpts + roster.settings.fpts_decimal * 0.01 : 0;
    });

    void analyzeScenario(
      scenarios,
      scenarioGames,
      pointsFor,
      selectedTarget,
      playoffTeamCount,
      setAnalysisProgress,
      () => cancelled
    ).then((result) => {
      if (cancelled) return;
      setScenarioAnalysis(result);
      setAnalysisLoading(false);
    }).catch((error: unknown) => {
      if (cancelled) return;
      setAnalysisError(
        error instanceof Error ? error.message : 'Unable to analyze these scenarios.'
      );
      setAnalysisLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [
    breakdownAvailable,
    data,
    playoffTeamCount,
    selectedTarget,
    scenarioGames,
    simulationResults,
    sortedUsers,
  ]);

  const selectTarget = (teamIndex: number, place: ScenarioTarget['place']) => {
    setSelectedTarget({ teamIndex, place });
    setSelectedExampleScenario(null);
    setSelectedScenarioWeek(null);
    if (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(max-width: 900px)').matches
    ) {
      setIsScenarioPopupOpen(true);
    }
  };

  const renderPlaceTable = () => {
    const headers: Array<number | string> = [
      'Team',
      'Seed',
      'Record',
      showSimulationCounts ? 'Playoff Occurrences' : 'Playoff %',
      ...Array.from({ length: data.users.length }, (_, index) => index + 1),
    ];

    return (
      <table className="all-possibilities-table">
        <colgroup>
          <col style={{ width: '10%' }} />
          <col style={{ width: '4%' }} />
          <col style={{ width: '7%' }} />
          <col style={{ width: '9%' }} />
          {Array.from({ length: data.users.length }, (_, index) => (
            <col key={index} style={{ width: `${70 / data.users.length}%` }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th
                key={header}
                title={index === 3 ? `Probability of finishing in the top ${playoffTeamCount}` : undefined}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedUsers.map((user, teamIndex) => {
            const userMap = simulationResults?.userPlaceMap.get(user.user_id);
            const playoffCount = userMap
              ? Array.from(userMap.entries())
                  .filter(([place]) => place <= playoffTeamCount)
                  .reduce((sum, [, count]) => sum + count, 0)
              : 0;
            const pointDependencyCount =
              simulationResults?.playoffPointDependencyMap.get(user.user_id) || 0;
            const showTiebreakerAsterisk = !showSimulationCounts &&
              pointDependencyCount > 0 &&
              (playoffCount === 0 || playoffCount === SIMULATION_COUNT);
            const [wins, losses, ties] = calculateScheduleRecord(user, user, data);
            const selectedPlayoffs =
              selectedTarget?.teamIndex === teamIndex && selectedTarget.place === 'playoffs';

            return (
              <tr key={user.user_id}>
                <td title={user.metadata.team_name || user.display_name}>
                  {user.metadata.team_name || user.display_name}
                </td>
                <td>{getUserSeasonPlace(user.user_id, data)}</td>
                <td>{wins}-{losses}-{ties}</td>
                <td>
                  <button
                    className={`scenario-cell-button ${selectedPlayoffs ? 'selected' : ''}`}
                    onClick={() => selectTarget(teamIndex, 'playoffs')}
                    disabled={!breakdownAvailable || isLoading || !simulationResults?.scenarios}
                    aria-label={`${user.metadata.team_name || user.display_name}: ${playoffCount} playoff finishes in ${SIMULATION_COUNT} simulations${pointDependencyCount > 0 ? ', tiebreaker-dependent in some simulations' : ''}`}
                    aria-pressed={selectedPlayoffs}
                    title={`${playoffCount.toLocaleString()} of ${SIMULATION_COUNT.toLocaleString()} simulations${pointDependencyCount > 0 ? `; points-for tiebreakers affected ${pointDependencyCount.toLocaleString()} simulations` : ''}${showTiebreakerAsterisk ? '; * indicates the 0% or 100% result is tiebreaker-dependent' : ''}`}
                  >
                    {showSimulationCounts
                      ? playoffCount.toLocaleString()
                      : `${((playoffCount / SIMULATION_COUNT) * 100).toFixed(2)}%${showTiebreakerAsterisk ? '*' : ''}`}
                  </button>
                </td>
                {Array.from({ length: data.users.length }, (_, placeIndex) => {
                  const place = placeIndex + 1;
                  const count = userMap?.get(place) || 0;
                  const selectedPlace =
                    selectedTarget?.teamIndex === teamIndex && selectedTarget.place === place;
                  return (
                    <td key={place}>
                      <button
                        className={`scenario-cell-button ${selectedPlace ? 'selected' : ''}`}
                        onClick={() => selectTarget(teamIndex, place)}
                        disabled={!breakdownAvailable || isLoading || !simulationResults?.scenarios}
                        aria-label={`${user.metadata.team_name || user.display_name}: place ${place}, ${count} simulations`}
                        aria-pressed={selectedPlace}
                        title={`${count.toLocaleString()} of ${SIMULATION_COUNT.toLocaleString()} simulations`}
                      >
                        {showSimulationCounts
                          ? count.toLocaleString()
                          : `${((count / SIMULATION_COUNT) * 100).toFixed(2)}%`}
                      </button>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  const renderWinDistributionTable = () => (
    <table className="win-distribution-table">
      <thead>
        <tr>
          <th>Team</th>
          <th>Place in Season</th>
          {Array.from({ length: 16 }, (_, index) => <th key={index}>{index}</th>)}
        </tr>
      </thead>
      <tbody>
        {sortedUsers.map((user) => {
          const winsMap = simulationResults?.userWinsMap.get(user.user_id);
          return (
            <tr key={user.user_id}>
              <td>{user.metadata.team_name || user.display_name}</td>
              <td>{getUserSeasonPlace(user.user_id, data)}</td>
              {Array.from({ length: 16 }, (_, wins) => (
                <td key={wins}>{winsMap?.get(wins) || 0}</td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  const renderScenarioPanel = () => {
    if (!breakdownAvailable) {
      return (
        <p>
          The scenario breakdown becomes available with four or fewer regular-season
          weeks remaining. The current forecast tables remain available above.
        </p>
      );
    }

    if (isLoading) {
      return <p>Run the simulation to enable the scenario breakdown.</p>;
    }

    if (simulationError) {
      return <p className="scenario-error">Simulation failed: {simulationError}</p>;
    }

    if (!simulationResults?.scenarios) {
      return <p>Future matchup data is unavailable for the scenario breakdown.</p>;
    }

    if (!selectedTarget) {
      return <p>Select a team&apos;s playoff percentage or finishing-place cell to explore its scenarios.</p>;
    }

    const scenarioCount = simulationResults.scenarios.count;
    const user = sortedUsers[selectedTarget.teamIndex];
    const teamName = user?.metadata.team_name || user?.display_name || 'Team';
    const remainingGamesForTeam = scenarioGames.filter((game) =>
      game.team1Index === selectedTarget.teamIndex ||
      game.team2Index === selectedTarget.teamIndex
    ).length;
    const targetLabel = selectedTarget.place === 'playoffs'
      ? 'making the playoffs'
      : `finishing in place ${selectedTarget.place}`;
    const teamPlaceCounts = simulationResults.userPlaceMap.get(user?.user_id || '');
    const seasonStatus = getScenarioStatus(
      teamPlaceCounts || new Map<number, number>(),
      playoffTeamCount,
      SIMULATION_COUNT
    );
    const hasPlayoffPointsDependency =
      (simulationResults.playoffPointDependencyMap.get(user?.user_id || '') || 0) > 0;
    const hasButlerPointsDependency = selectedTarget.place === 'playoffs'
      ? butlerPointsMatterDistribution.some((entry) => entry.pointsMatter)
      : selectedTeamTiebreakerDependencies?.butler || false;
    const hasByePointsDependency = selectedTarget.place === 'playoffs'
      ? byePointsMatterDistribution.some((entry) => entry.pointsMatter)
      : selectedTeamTiebreakerDependencies?.playoffBye || false;
    const hasSelectedOutcomePointsDependency = selectedTarget.place === 'playoffs'
      ? hasPlayoffPointsDependency
      : selectedTeamTiebreakerDependencies?.exactPlace || false;
    const playoffPointsDependencyRuns = playoffPointsMatterDistribution
      .filter((entry) => entry.pointsMatter)
      .reduce((sum, entry) => sum + entry.simulationCount, 0);
    const statusMessages: string[] = [];

    if (seasonStatus.madePlayoffs && !hasPlayoffPointsDependency) {
      statusMessages.push(`${teamName} has made the playoffs ⭐`);
    }
    if (seasonStatus.noButlerContention && !hasButlerPointsDependency) {
      statusMessages.push(`${teamName} will not be your butler this year 🎉`);
    }
    if (
      seasonStatus.guaranteedBye &&
      !hasByePointsDependency
    ) {
      statusMessages.push('This person will have a bye week one 🔥');
    }
    if (seasonStatus.missedPlayoffs && !hasPlayoffPointsDependency) {
      statusMessages.push(`${teamName} is bad and should feel bad, they have missed the playoffs 💩`);
    }
    if (seasonStatus.onlyButlerPlaces && !hasButlerPointsDependency) {
      statusMessages.push(`${teamName} has a high chance of being the butler this year 🍽️`);
    }

    const byeType = selectedTarget.place === 'playoffs' &&
      seasonStatus.madePlayoffs &&
      (!seasonStatus.guaranteedBye || hasByePointsDependency)
      ? 'playoff'
      : seasonStatus.missedPlayoffs &&
        seasonStatus.noButlerContention &&
        !hasButlerPointsDependency
        ? 'losersBracket'
        : null;
    const byeWinRows = byeType
      ? byeWinDistribution
          .filter((entry) => byeType === 'playoff'
            ? entry.playoffByeCount > 0
            : entry.losersBracketByeCount > 0)
          .sort((a, b) => b.wins - a.wins)
      : [];
    const renderPointsMatterRows = (
      entries: PointsMatterWinDistribution[],
      tableKey: string,
      getOutcomeCount: (entry: PointsMatterWinDistribution) => number,
      getRunDenominator: (entry: PointsMatterWinDistribution) => number,
      showRunDenominator = true
    ) => entries.map((entry) => {
      const rowKey =
        `${selectedTarget.teamIndex}-${tableKey}-${entry.wins}-${entry.pointsMatter}`;
      const isExpanded = expandedPointsMatterRows.has(rowKey);
      const outcomeCount = getOutcomeCount(entry);
      const competitionGroups = Array.from(entry.competitionGroups.values())
        .sort((a, b) =>
          b.occurrenceCount - a.occurrenceCount ||
          b.spotsAvailable - a.spotsAvailable ||
          a.competitorIndexes[0] - b.competitorIndexes[0]
        );
      const exampleCompetitionGroups =
        getMostCommonCompetitionGroupsBySpots(competitionGroups);
      const needsCompetitionSummary =
        competitionGroups.length > MAX_DETAILED_COMPETITION_GROUPS;
      const occurrencesBySpots = new Map<number, number>();
      const occurrencesByCompetitor = new Map<number, number>();

      competitionGroups.forEach((group) => {
        occurrencesBySpots.set(
          group.spotsAvailable,
          (occurrencesBySpots.get(group.spotsAvailable) || 0) + group.occurrenceCount
        );
        group.competitorIndexes.forEach((competitorIndex) => {
          occurrencesByCompetitor.set(
            competitorIndex,
            (occurrencesByCompetitor.get(competitorIndex) || 0) + group.occurrenceCount
          );
        });
      });

      const allCompetitors = Array.from(occurrencesByCompetitor.entries())
        .sort((a, b) => b[1] - a[1] || a[0] - b[0]);
      const renderCompetitionGroup = (group: PointsMatterCompetitionGroup) => (
        <section
          className="scenario-competition-group"
          key={`${group.spotsAvailable}-${group.competitorIndexes.join('-')}`}
        >
          <p>
            {group.occurrenceCount.toLocaleString()}{' '}
            {group.occurrenceCount === 1 ? 'Occurrence' : 'Occurrences'}
            {' - '}{group.spotsAvailable}{' '}
            {group.spotsAvailable === 1 ? 'Spot' : 'Spots'} Available
          </p>
          <div className="scenario-outcome-table-wrap">
            <table className="scenario-outcome-table scenario-competitor-table">
              <thead>
                <tr>
                  <th>Team</th>
                  <th>
                    <span>Points For Gap from {teamName}</span>
                    <small>(Ave per Game)</small>
                  </th>
                </tr>
              </thead>
              <tbody>
                {group.competitorIndexes.map((competitorIndex) => {
                  const competitor = sortedUsers[competitorIndex];
                  if (!competitor) return null;
                  const pointsGap =
                    currentPointsFor[selectedTarget.teamIndex] -
                    currentPointsFor[competitorIndex];
                  const averagePointsGap = pointsGap / Math.max(remainingGamesForTeam, 1);
                  const competitorName =
                    competitor.metadata.team_name || competitor.display_name;
                  return (
                    <tr key={competitor.user_id}>
                      <td>{competitorName}</td>
                      <td>
                        {formatPointsForGap(pointsGap)}{' '}
                        ({formatPointsForGap(averagePointsGap)})
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      );

      const toggleExpanded = () => {
        setExpandedPointsMatterRows((previous) => {
          const next = new Set(previous);
          if (next.has(rowKey)) {
            next.delete(rowKey);
          } else {
            next.add(rowKey);
          }
          return next;
        });
      };

      return (
        <React.Fragment key={rowKey}>
          <tr>
            <td>{entry.wins}</td>
            <td>
              {entry.pointsMatter ? (
                <button
                  type="button"
                  className="scenario-expand-button"
                  aria-expanded={isExpanded}
                  aria-label={`${isExpanded ? 'Hide' : 'Show'} teams tied with ${teamName} at ${entry.wins} remaining wins`}
                  onClick={toggleExpanded}
                >
                  Yes {isExpanded ? '[-]' : '[+]'}
                </button>
              ) : 'No'}
            </td>
            <td>
              {entry.pointsMatter ? (
                <span
                  className="scenario-dependent-indicator"
                  title="Tiebreaker-Dependent"
                  aria-label="Tiebreaker-Dependent"
                  tabIndex={0}
                >
                  ⓘ
                </span>
              ) : (
                <>
                  {(outcomeCount / entry.simulationCount * 100).toFixed(1)}%
                  <small>
                    {' '}({outcomeCount.toLocaleString()} / {entry.simulationCount.toLocaleString()})
                  </small>
                </>
              )}
            </td>
            <td>
              {outcomeCount.toLocaleString()}
              {showRunDenominator && (
                <>
                  {' / '}{getRunDenominator(entry).toLocaleString()}
                </>
              )}
            </td>
          </tr>
          {isExpanded && entry.pointsMatter && (
            <tr
              className="scenario-points-matter-expanded"
              key={`${rowKey}-details`}
            >
              <td colSpan={4}>
                <div className="scenario-points-matter-details">
                  {needsCompetitionSummary && (
                    <section
                      className="scenario-competition-summary"
                    >
                      <h5>Occurrences by spots available</h5>
                      <div className="scenario-outcome-table-wrap">
                        <table className="scenario-outcome-table">
                          <thead>
                            <tr>
                              <th>Spots Available</th>
                              <th>Occurrences</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Array.from(occurrencesBySpots.entries())
                              .sort((a, b) => b[0] - a[0])
                              .map(([spotsAvailable, occurrences]) => (
                                <tr key={spotsAvailable}>
                                  <td>{spotsAvailable}</td>
                                  <td>{occurrences.toLocaleString()}</td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  )}
                  {needsCompetitionSummary && (
                    <section className="scenario-competition-summary">
                      <h5>All competing teams</h5>
                      <div className="scenario-outcome-table-wrap">
                        <table className="scenario-outcome-table scenario-competitor-table">
                          <thead>
                            <tr>
                              <th>Team</th>
                              <th>Occurrences</th>
                              <th>
                                <span>Points For Gap from {teamName}</span>
                                <small>(Ave per Game)</small>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {allCompetitors.map(([competitorIndex, occurrences]) => {
                              const competitor = sortedUsers[competitorIndex];
                              if (!competitor) return null;
                              const pointsGap =
                                currentPointsFor[selectedTarget.teamIndex] -
                                currentPointsFor[competitorIndex];
                              const averagePointsGap =
                                pointsGap / Math.max(remainingGamesForTeam, 1);
                              const competitorName =
                                competitor.metadata.team_name || competitor.display_name;
                              return (
                                <tr key={competitor.user_id}>
                                  <td>{competitorName}</td>
                                  <td>{occurrences.toLocaleString()}</td>
                                  <td>
                                    {formatPointsForGap(pointsGap)}{' '}
                                    ({formatPointsForGap(averagePointsGap)})
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  )}
                  {needsCompetitionSummary && (
                    <h5>Example combination by spots available</h5>
                  )}
                  {(needsCompetitionSummary
                    ? exampleCompetitionGroups
                    : competitionGroups
                  ).map(renderCompetitionGroup)}
                </div>
              </td>
            </tr>
          )}
        </React.Fragment>
      );
    });
    const showButlerContentionTable = selectedTarget.place === 'playoffs' &&
      butlerPointsMatterDistribution.some(
        (entry) => entry.pointsMatter || entry.simulationCount > entry.insideCutoffCount
      );
    const renderButlerContentionTable = () => showButlerContentionTable ? (
      <section className="scenario-summary">
        <h4>Butler contention by remaining wins</h4>
        <div className="scenario-outcome-table-wrap">
          <table className="scenario-outcome-table">
            <thead>
              <tr>
                <th>Remaining wins</th>
                <th>Points matter?</th>
                <th>Butler contention chance</th>
                <th>Occurrences</th>
              </tr>
            </thead>
            <tbody>
              {renderPointsMatterRows(
                butlerPointsMatterDistribution,
                'butler',
                (entry) => entry.pointsMatter
                  ? entry.simulationCount
                  : entry.simulationCount - entry.insideCutoffCount,
                (entry) => entry.simulationCount,
                false
              )}
            </tbody>
          </table>
        </div>
      </section>
    ) : null;
    const renderPlayoffPointsMatterTable = () => (
      <section className="scenario-summary">
        <h4>Playoff chance by remaining wins</h4>
        <div className="scenario-outcome-table-wrap">
          <table className="scenario-outcome-table">
            <thead>
              <tr>
                <th>Remaining wins</th>
                <th>Points matter?</th>
                <th>Playoff chance</th>
                <th>Occurrences</th>
              </tr>
            </thead>
            <tbody>
              {renderPointsMatterRows(
                playoffPointsMatterDistribution,
                'playoffs',
                (entry) => entry.pointsMatter
                  ? entry.simulationCount
                  : entry.insideCutoffCount,
                () => scenarioCount,
                false
              )}
            </tbody>
          </table>
        </div>
      </section>
    );
    const renderPlayoffByePointsMatterTable = () => (
      <section className="scenario-summary">
        <h4>Playoff bye scenarios</h4>
        <div className="scenario-outcome-table-wrap">
          <table className="scenario-outcome-table">
            <thead>
              <tr>
                <th>Remaining wins</th>
                <th>Points matter?</th>
                <th>Playoff bye chance</th>
                <th>Occurrences</th>
              </tr>
            </thead>
            <tbody>
              {renderPointsMatterRows(
                byePointsMatterDistribution,
                'playoff-bye',
                (entry) => entry.pointsMatter
                  ? entry.simulationCount
                  : entry.insideCutoffCount,
                () => scenarioCount,
                false
              )}
            </tbody>
          </table>
        </div>
      </section>
    );
    const renderScenarioHighlights = () => (
      <>
        {statusMessages.length > 0 && (
          <div className="scenario-status-messages">
            {statusMessages.map((message) => <p key={message}>{message}</p>)}
          </div>
        )}
        {byeType === 'playoff' && renderPlayoffByePointsMatterTable()}
        {byeType === 'losersBracket' && (
          <section className="scenario-summary">
            <h4>Losers bracket bye scenarios</h4>
            {byeWinRows.length > 0 ? (
              <div className="scenario-outcome-table-wrap">
                <table className="scenario-outcome-table">
                  <thead>
                    <tr>
                      <th>Remaining wins</th>
                      <th>Losers bracket bye chance</th>
                      <th>Occurrences</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byeWinRows.map((entry) => {
                      return (
                        <tr key={entry.wins}>
                          <td>{entry.wins}</td>
                          <td>
                            {(entry.losersBracketByeCount / entry.simulationCount * 100).toFixed(1)}%
                          </td>
                          <td>
                            {entry.losersBracketByeCount.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No simulated final win total resulted in this bye.</p>
            )}
          </section>
        )}
      </>
    );

    const games = scenarioGames;
    const scenarioWeeks = Array.from(new Set(games.map((game) => game.week)));
    const displayedWeek = selectedScenarioWeek !== null &&
      scenarioWeeks.includes(selectedScenarioWeek)
      ? selectedScenarioWeek
      : scenarioWeeks[0];
    const outcomeAt = (run: number, gameIndex: number): number =>
      simulationResults!.scenarios!.outcomes[
        run * simulationResults!.scenarios!.gameCount + gameIndex
      ];
    const exampleOptions = exampleScenarioDistribution.options;
    const defaultExampleScenario = exampleOptions
      .filter((option) => option.kind === 'playoffs')
      .sort((a, b) => b.simulationCount - a.simulationCount)[0] ||
      exampleOptions
        .slice()
        .sort((a, b) => b.simulationCount - a.simulationCount)[0] ||
      null;
    const displayedExampleScenario = selectedExampleScenario
      ? exampleOptions.find((option) =>
          option.kind === selectedExampleScenario.kind &&
          option.wins === selectedExampleScenario.wins &&
          option.pointsMatter === selectedExampleScenario.pointsMatter
        ) || defaultExampleScenario
      : defaultExampleScenario;
    const selectedExampleWinTotal = displayedExampleScenario
      ? exampleScenarioDistribution.winTotals.find(
          (entry) => entry.wins === displayedExampleScenario.wins
        )
      : undefined;
    const selectedExampleIsGuaranteed = selectedExampleWinTotal !== undefined &&
      (displayedExampleScenario?.kind === 'playoffs'
        ? selectedExampleWinTotal.playoffCount === selectedExampleWinTotal.simulationCount &&
          selectedExampleWinTotal.playoffPointsMatterCount === 0
        : displayedExampleScenario?.kind === 'butler'
          ? selectedExampleWinTotal.butlerCount === selectedExampleWinTotal.simulationCount &&
            selectedExampleWinTotal.butlerPointsMatterCount === 0
          : false);
    const representativeRun = displayedExampleScenario?.representativeRunIndex ?? null;
    const selectedExampleCurrentPlace = representativeRun !== null
      ? simulationResults!.scenarios!.placements[
          representativeRun * simulationResults!.scenarios!.teamCount +
          selectedTarget.teamIndex
        ]
      : null;
    const exampleTiebreakerDetails = displayedExampleScenario?.pointsMatter &&
      representativeRun !== null
      ? getScenarioTiebreakerDetails(
          simulationResults.scenarios,
          selectedTarget.teamIndex,
          representativeRun,
          displayedExampleScenario.kind === 'playoffs' ? playoffTeamCount : 8
        )
      : null;
    const renderExampleTiebreakerDetails = () => {
      if (!displayedExampleScenario?.pointsMatter || !exampleTiebreakerDetails) return null;
      const tiedTeamCount = exampleTiebreakerDetails.competitorIndexes.length + 1;
      const opponentsToBeat = tiedTeamCount - exampleTiebreakerDetails.spotsAvailable;
      const competitorsToLoseTo = exampleTiebreakerDetails.spotsAvailable;
      const isPlayoffScenario = displayedExampleScenario.kind === 'playoffs';

      return (
        <section className="scenario-summary scenario-example-tiebreaker">
          <h5>
            {isPlayoffScenario
              ? 'Teams competing for playoff spots'
              : 'Teams competing for Butler contention'}
          </h5>
          <p>
            {isPlayoffScenario
              ? `${teamName} must outscore at least ${opponentsToBeat} of these tied teams to make the playoffs.`
              : `${teamName} must be outscored by at least ${competitorsToLoseTo} of these tied teams to reach Butler contention.`}
          </p>
          <div className="scenario-outcome-table-wrap">
            <table className="scenario-outcome-table scenario-competitor-table">
              <thead>
                <tr>
                  <th>Team</th>
                  <th>
                    <span>Points For Gap from {teamName}</span>
                    <small>(Ave per Game)</small>
                  </th>
                </tr>
              </thead>
              <tbody>
                {exampleTiebreakerDetails.competitorIndexes.map((competitorIndex) => {
                  const competitor = sortedUsers[competitorIndex];
                  if (!competitor) return null;
                  const pointsGap =
                    currentPointsFor[selectedTarget.teamIndex] -
                    currentPointsFor[competitorIndex];
                  const averagePointsGap = pointsGap / Math.max(remainingGamesForTeam, 1);
                  return (
                    <tr key={competitor.user_id}>
                      <td>{competitor.metadata.team_name || competitor.display_name}</td>
                      <td>
                        {formatPointsForGap(pointsGap)}{' '}
                        ({formatPointsForGap(averagePointsGap)})
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      );
    };
    const renderExampleButtonRow = (
      kind: ExampleScenarioOption['kind'],
      icon: string,
      rowLabel: string
    ) => (
      <div className="scenario-example-row">
        <span className="scenario-example-icon" role="img" aria-label={rowLabel}>
          {icon}
        </span>
        <div
          className="scenario-example-buttons"
          role="group"
          aria-label={`${rowLabel} examples`}
        >
          {exampleOptions.some((option) => option.kind === kind)
            ? exampleScenarioDistribution.winTotals.flatMap((winTotal) =>
                [false, true].map((pointsMatter) => {
                  const option = exampleOptions.find((entry) =>
                    entry.kind === kind &&
                    entry.wins === winTotal.wins &&
                    entry.pointsMatter === pointsMatter
                  );
                  if (!option) return null;

                  const isSelected = displayedExampleScenario?.kind === kind &&
                    displayedExampleScenario.wins === option.wins &&
                    displayedExampleScenario.pointsMatter === pointsMatter;
                  const guaranteedPlayoffs = kind === 'playoffs' &&
                    !pointsMatter &&
                    winTotal.playoffCount === winTotal.simulationCount &&
                    winTotal.playoffPointsMatterCount === 0;
                  const guaranteedButler = kind === 'butler' &&
                    !pointsMatter &&
                    winTotal.butlerCount === winTotal.simulationCount &&
                    winTotal.butlerPointsMatterCount === 0;
                  const className = [
                    'scenario-example-win-button',
                    isSelected ? 'selected' : '',
                    guaranteedPlayoffs ? 'scenario-example-playoff-guaranteed' : '',
                    guaranteedButler ? 'scenario-example-butler-guaranteed' : '',
                  ].filter(Boolean).join(' ');
                  const outcomeLabel = kind === 'playoffs'
                    ? 'playoff scenario'
                    : 'Butler contention scenario';
                  const dependencyLabel = pointsMatter
                    ? `, points tiebreaker matters in ${option.simulationCount.toLocaleString()} scenarios`
                    : ', points tiebreaker does not matter';

                  return (
                    <button
                      type="button"
                      key={`${kind}-${option.wins}-${pointsMatter}`}
                      className={className}
                      onClick={() => setSelectedExampleScenario(option)}
                      aria-pressed={isSelected}
                      aria-label={`${option.wins} remaining wins, ${outcomeLabel}${dependencyLabel}`}
                      title={`${option.wins}${pointsMatter ? '*' : ''} wins${dependencyLabel}`}
                    >
                      {option.wins}{pointsMatter ? '*' : ''}
                    </button>
                  );
                })
              )
            : <span className="scenario-example-empty">-</span>}
        </div>
      </div>
    );
    const renderExampleScenario = () => (
      <section className="scenario-weekly-breakdown">
        <h4>Example Scenario</h4>
        <small>Wins in remaining weeks; * marks a points-dependent tiebreaker</small>
        {exampleOptions.length === 0 ? (
          <p>No playoff or Butler contention examples are available for this team.</p>
        ) : (
          <>
            {renderExampleButtonRow('playoffs', '⭐', 'Playoffs')}
            {renderExampleButtonRow('butler', '💩', 'Butler contention')}
            {displayedExampleScenario && (
              <p className="scenario-example-message">
                {displayedExampleScenario.pointsMatter
                  ? `This ${displayedExampleScenario.kind === 'playoffs' ? 'playoff' : 'Butler contention'} scenario is points-tiebreaker dependent. Under current points-for, ${teamName} ${displayedExampleScenario.kind === 'playoffs'
                    ? selectedExampleCurrentPlace !== null &&
                      selectedExampleCurrentPlace <= playoffTeamCount
                      ? 'makes the playoffs'
                      : 'misses the playoffs'
                    : selectedExampleCurrentPlace !== null && selectedExampleCurrentPlace > 8
                      ? 'is in Butler contention'
                      : 'is not in Butler contention'}.`
                  : selectedExampleIsGuaranteed
                    ? displayedExampleScenario.kind === 'playoffs'
                      ? `All scenarios with ${displayedExampleScenario.wins} remaining wins make the playoffs.`
                      : `All scenarios with ${displayedExampleScenario.wins} remaining wins result in Butler contention.`
                    : displayedExampleScenario.kind === 'playoffs'
                      ? `${teamName} makes the playoffs in this example.`
                      : `This example results in Butler contention for ${teamName}.`}
              </p>
            )}
            {renderExampleTiebreakerDetails()}
            {representativeRun === null ? (
              <p>No example run is available for this selection.</p>
            ) : (
              <>
                <div
                  className="scenario-week-selector"
                  role="group"
                  aria-label="Select simulation week"
                >
                  {scenarioWeeks.map((week) => (
                    <button
                      key={week}
                      type="button"
                      className={week === displayedWeek ? 'selected' : ''}
                      onClick={() => setSelectedScenarioWeek(week)}
                      aria-pressed={week === displayedWeek}
                    >
                      Week {week}
                    </button>
                  ))}
                </div>
                {displayedWeek !== undefined && (
                  <div className="scenario-week">
                    <h5>Week {displayedWeek}</h5>
                    {games.map((game, gameIndex) => {
                      if (game.week !== displayedWeek) return null;
                      const team1Won = outcomeAt(representativeRun, gameIndex) === 0;
                      const team1 = sortedUsers[game.team1Index];
                      const team2 = sortedUsers[game.team2Index];
                      return (
                        <div className="scenario-matchup" key={game.matchupId}>
                          <span className={team1Won ? 'scenario-winner' : 'scenario-loser'}>
                            {team1?.metadata.team_name || team1?.display_name}
                            <strong> ({team1Won ? 'W' : 'L'})</strong>
                          </span>
                          <span className="scenario-versus">vs</span>
                          <span className={team1Won ? 'scenario-loser' : 'scenario-winner'}>
                            {team2?.metadata.team_name || team2?.display_name}
                            <strong> ({team1Won ? 'L' : 'W'})</strong>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </section>
    );

    if (
      selectedTarget.place === 'playoffs' &&
      (seasonStatus.missedPlayoffs || seasonStatus.madePlayoffs)
    ) {
      if (hasPlayoffPointsDependency) {
        return (
          <>
            {renderScenarioHighlights()}
            <p className="scenario-selected-result">
              Playoff outcomes depend on the points-for tiebreaker in{' '}
              {playoffPointsDependencyRuns.toLocaleString()} of{' '}
              {scenarioCount.toLocaleString()} simulations, using current points-for totals.
            </p>
            {renderPlayoffPointsMatterTable()}
            {renderButlerContentionTable()}
            {renderExampleScenario()}
          </>
        );
      }
      return (
        <>
          {renderScenarioHighlights()}
          {renderButlerContentionTable()}
          {renderExampleScenario()}
        </>
      );
    }

    if (analysisLoading) {
      return (
        <>
          {renderScenarioHighlights()}
          <div>
            <p>Finding representative paths and consequential matchups...</p>
            <div className="scenario-progress">
              <div style={{ width: `${analysisProgress}%` }} />
            </div>
            <small>{analysisProgress}% analyzed</small>
          </div>
          {renderExampleScenario()}
        </>
      );
    }

    if (analysisError) {
      return (
        <>
          {renderScenarioHighlights()}
          <p className="scenario-error">Scenario analysis failed: {analysisError}</p>
          {renderExampleScenario()}
        </>
      );
    }

    if (!scenarioAnalysis || scenarioAnalysis.matchingRuns === 0) {
      return (
        <>
          {renderScenarioHighlights()}
          <p>
            No simulated runs had {teamName} {targetLabel}. The result is too unlikely
            to appear in this simulation sample.
          </p>
          {renderExampleScenario()}
        </>
      );
    }

    const futureWinRows = scenarioAnalysis.allFutureWinsDistribution
      .map((simulationCount, wins) => ({
        wins,
        simulationCount,
        resultCount: scenarioAnalysis.futureWinsDistribution[wins] || 0,
        playoffCount: scenarioAnalysis.playoffFutureWinsDistribution[wins] || 0,
      }))
      .filter((entry) => entry.simulationCount > 0)
      .sort((a, b) => b.wins - a.wins);
    const relevantGameIndexes = new Set(getRelevantScenarioGameIndexes(
      games,
      selectedTarget,
      scenarioAnalysis,
      scenarioCount
    ));
    const rankedImportantGames = games
      .map((game, index) => ({ game, index, impact: scenarioAnalysis.gameImpactCounts[index] }))
      .filter((entry) => entry.impact > 0 && relevantGameIndexes.has(entry.index))
      .sort((a, b) => b.impact - a.impact);
    const selectedTeamClinchingGame = rankedImportantGames.find(({ game }) =>
      game.team1Index === selectedTarget.teamIndex ||
      game.team2Index === selectedTarget.teamIndex
    );
    const importantGames = rankedImportantGames
      .filter((entry) => entry.index !== selectedTeamClinchingGame?.index)
      .slice(0, selectedTeamClinchingGame ? 4 : 5);
    if (selectedTeamClinchingGame) importantGames.push(selectedTeamClinchingGame);
    importantGames.sort((a, b) => b.impact - a.impact);
    const resultRateLabel = selectedTarget.place === 'playoffs'
      ? 'Playoff chance'
      : `Place ${selectedTarget.place} chance`;
    const resultDescription = selectedTarget.place === 'playoffs'
      ? `${teamName} makes the playoffs`
      : `${teamName} finishes in place ${selectedTarget.place}`;

    return (
      <>
        {renderScenarioHighlights()}
        <p className="scenario-selected-result">
          <strong>{teamName}</strong>{' '}
          {selectedTarget.place === 'playoffs'
            ? 'is in the playoffs'
            : `is in ${getOrdinalPlaceLabel(selectedTarget.place)} place`}{' '}
          {scenarioAnalysis.matchingRuns.toLocaleString()} of{' '}
          {scenarioCount.toLocaleString()} simulations ({(
            scenarioAnalysis.matchingRuns / scenarioCount * 100
          ).toFixed(2)}%).
          {hasSelectedOutcomePointsDependency &&
            ' Assuming current points-for remain unchanged.'}
        </p>

        {selectedTarget.place === 'playoffs'
          ? renderPlayoffPointsMatterTable()
          : (
            <section className="scenario-summary">
              <div className="scenario-outcome-table-wrap">
                <table className="scenario-outcome-table">
                  <thead>
                    <tr>
                      <th>Remaining wins</th>
                      <th>{resultRateLabel}</th>
                      <th>Occurrences</th>
                    </tr>
                  </thead>
                  <tbody>
                    {futureWinRows.map(({ wins, simulationCount, resultCount }) => (
                      <tr key={wins}>
                        <td>{wins}</td>
                        <td>
                          {(resultCount / simulationCount * 100).toFixed(1)}%
                          <small>
                            {' '}({resultCount.toLocaleString()} / {simulationCount.toLocaleString()})
                          </small>
                        </td>
                        <td>
                          {resultCount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

        {renderButlerContentionTable()}

        <section className="scenario-summary">
          <h4>Key Matchups</h4>
          <small className="scenario-note">
            Your matchups are included only if there is a win-and-in scenario.
          </small>
          {importantGames.length === 0 ? (
            <p>Flipping any single remaining matchup did not change this result in the simulations.</p>
          ) : (
            <ul className="scenario-impact-list">
              {importantGames.map(({ game, index }) => {
                const team1 = sortedUsers[game.team1Index];
                const team2 = sortedUsers[game.team2Index];
                const team1Name = team1?.metadata.team_name || team1?.display_name || 'Team 1';
                const team2Name = team2?.metadata.team_name || team2?.display_name || 'Team 2';
                const team1OutcomeCount = scenarioAnalysis.targetCountIfTeam1Wins[index];
                const team2OutcomeCount = scenarioAnalysis.targetCountIfTeam2Wins[index];
                const team1IsPreferred = team1OutcomeCount > team2OutcomeCount;
                const team2IsPreferred = team2OutcomeCount > team1OutcomeCount;
                const firstTeamName = team1OutcomeCount >= team2OutcomeCount
                  ? team1Name
                  : team2Name;
                const firstOutcomeCount = Math.max(team1OutcomeCount, team2OutcomeCount);
                const secondTeamName = team1OutcomeCount >= team2OutcomeCount
                  ? team2Name
                  : team1Name;
                const secondOutcomeCount = Math.min(team1OutcomeCount, team2OutcomeCount);
                const firstTeamClass = team1OutcomeCount === team2OutcomeCount
                  ? ''
                  : 'scenario-impact-want-win';
                const secondTeamClass = team1OutcomeCount === team2OutcomeCount
                  ? ''
                  : 'scenario-impact-want-lose';
                return (
                  <li key={`${game.week}-${game.matchupId}`}>
                    <strong>
                      Week {game.week}:{' '}
                      <span className={team1IsPreferred
                        ? 'scenario-impact-want-win'
                        : team2IsPreferred
                          ? 'scenario-impact-want-lose'
                          : ''}
                      >
                        {team1Name}
                      </span>
                      {' vs. '}
                      <span className={team2IsPreferred
                        ? 'scenario-impact-want-win'
                        : team1IsPreferred
                          ? 'scenario-impact-want-lose'
                          : ''}
                      >
                        {team2Name}
                      </span>
                    </strong>
                    <div>
                      {resultDescription} in{' '}
                      {(firstOutcomeCount / scenarioCount * 100).toFixed(1)}% of simulations if{' '}
                      <span className={firstTeamClass}>{firstTeamName}</span> wins, versus{' '}
                      {(secondOutcomeCount / scenarioCount * 100).toFixed(1)}% if{' '}
                      <span className={secondTeamClass}>{secondTeamName}</span> wins.
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {renderExampleScenario()}
      </>
    );
  };

  return (
    <div>
      <YearNavBar data={data} />
      <h2 className="possibilities-title">
        {SIMULATION_COUNT.toLocaleString()} Simulations -{' '}
        {!useLast3Points ? 'Average Points' : 'Last 3 Game Average Points'}
      </h2>

      {isLoading ? (
        <div className="simulation-loading">
          <div>Calculating playoff possibilities...</div>
          <div className="simulation-progress">
            <div style={{ width: `${loadingProgress}%` }} />
          </div>
          <div>{loadingProgress}% complete</div>
        </div>
      ) : (
        <>
          <div className="possibilities-toggle">
            <button onClick={() => setUseLast3Points(!useLast3Points)}>
              {useLast3Points
                ? 'Run with Average Points'
                : 'Run with Last 3 Game Average Points'}
            </button>
          </div>
          <main className="possibilities-layout">
            <section className="possibilities-tables" aria-label="Simulation results">
              {simulationError ? (
                <p className="scenario-error">Simulation failed: {simulationError}</p>
              ) : (
                <>
                  <div className="place-table-controls">
                    <span>Finishing-place outcomes</span>
                    <button
                      onClick={() => setShowSimulationCounts(!showSimulationCounts)}
                      aria-pressed={showSimulationCounts}
                    >
                      {showSimulationCounts ? 'Show percentages' : 'Show simulation counts'}
                    </button>
                    <button
                      type="button"
                      className="scenario-popup-trigger"
                      onClick={() => setIsScenarioPopupOpen(true)}
                      disabled={!selectedTarget}
                      aria-haspopup="dialog"
                      aria-expanded={isScenarioPopupOpen}
                      aria-controls="scenario-breakdown-modal"
                    >
                      Scenario breakdown
                    </button>
                  </div>
                  <div className="horizontal-scroll">{renderPlaceTable()}</div>
                  <h2 className="win-distribution-title">Win Distribution</h2>
                  <div className="horizontal-scroll">{renderWinDistributionTable()}</div>
                </>
              )}
            </section>
            <aside
              className="scenario-panel desktop-scenario-panel"
              aria-label="Playoff scenario breakdown"
            >
              <h3>Scenario Breakdown</h3>
              {renderScenarioPanel()}
            </aside>
          </main>
          <Modal
            id="scenario-breakdown-modal"
            show={isScenarioPopupOpen}
            onHide={() => setIsScenarioPopupOpen(false)}
            centered
            size="lg"
            dialogClassName="scenario-popup-dialog"
            contentClassName="scenario-popup-content"
          >
            <Modal.Header closeButton>
              <Modal.Title>Scenario Breakdown</Modal.Title>
            </Modal.Header>
            <Modal.Body className="scenario-popup-body">
              <div className="scenario-panel scenario-popup-panel">
                {renderScenarioPanel()}
              </div>
            </Modal.Body>
          </Modal>
        </>
      )}
    </div>
  );
};

export default AllPlayoffPossibilities;
