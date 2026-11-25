import React, { useEffect, useMemo, useState } from 'react';
import LeagueData from '../../Interfaces/LeagueData';
import YearNavBar from '../../Navigation/YearNavBar';
import '../../Stylesheets/YearStylesheets/AllPlayoffPossibilities.css';
import {
  analyzeScenario,
  getByeWinDistribution,
  getOrdinalPlaceLabel,
  getRelevantScenarioGameIndexes,
  getScenarioStatus,
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
  scenarios?: SimulationScenarios;
}

const SIMULATION_COUNT = 500000;
const MAX_BREAKDOWN_WEEKS = 4;

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
  const [selectedScenarioWins, setSelectedScenarioWins] = useState<number | null>(null);
  const [selectedScenarioWeek, setSelectedScenarioWeek] = useState<number | null>(null);
  const [scenarioAnalysis, setScenarioAnalysis] = useState<ScenarioAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

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
        users.forEach((user, index) => {
          userPlaceMap.set(user.user_id, placeCounts[index]);
          userWinsMap.set(user.user_id, winCounts[index]);
        });

        setSimulationResults({
          userWinsMap,
          userPlaceMap,
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
    setSelectedScenarioWins(null);
    setSelectedScenarioWeek(null);
  };

  const renderPlaceTable = () => {
    const headers: Array<number | string> = [
      'Team Name',
      'Seed',
      'Record',
      showSimulationCounts ? 'Playoff Count' : 'Playoff %',
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
                    aria-label={`${user.metadata.team_name || user.display_name}: ${playoffCount} playoff finishes in ${SIMULATION_COUNT} simulations`}
                    aria-pressed={selectedPlayoffs}
                    title={`${playoffCount.toLocaleString()} of ${SIMULATION_COUNT.toLocaleString()} simulations`}
                  >
                    {showSimulationCounts
                      ? playoffCount.toLocaleString()
                      : `${((playoffCount / SIMULATION_COUNT) * 100).toFixed(2)}%`}
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
          <th>Team Name</th>
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

    const user = sortedUsers[selectedTarget.teamIndex];
    const teamName = user?.metadata.team_name || user?.display_name || 'Team';
    const targetLabel = selectedTarget.place === 'playoffs'
      ? 'making the playoffs'
      : `finishing in place ${selectedTarget.place}`;
    const teamPlaceCounts = simulationResults.userPlaceMap.get(user?.user_id || '');
    const seasonStatus = getScenarioStatus(
      teamPlaceCounts || new Map<number, number>(),
      playoffTeamCount,
      SIMULATION_COUNT
    );
    const statusMessages: string[] = [];

    if (seasonStatus.madePlayoffs) {
      statusMessages.push(`${teamName} has made the playoffs ⭐`);
    }
    if (seasonStatus.noButlerContention) {
      statusMessages.push(`${teamName} will not be your butler this year 🎉`);
    }
    if (seasonStatus.guaranteedBye) {
      statusMessages.push('This person will have a bye week one 🔥');
    }
    if (seasonStatus.missedPlayoffs) {
      statusMessages.push(
        `${teamName} is bad and should feel bad, they have missed the playoffs 💩`
      );
    }
    if (seasonStatus.onlyButlerPlaces) {
      statusMessages.push(`${teamName} has a high chance of being the butler this year 🍽️`);
    }

    const byeType = selectedTarget.place === 'playoffs' &&
      seasonStatus.madePlayoffs &&
      !seasonStatus.guaranteedBye
      ? 'playoff'
      : seasonStatus.missedPlayoffs && seasonStatus.noButlerContention
        ? 'losersBracket'
        : null;
    const byeWinRows = byeType
      ? byeWinDistribution
          .filter((entry) => byeType === 'playoff'
            ? entry.playoffByeCount > 0
            : entry.losersBracketByeCount > 0)
          .sort((a, b) => b.wins - a.wins)
      : [];
    const showButlerContentionTable = selectedTarget.place === 'playoffs' &&
      byeWinDistribution.some((entry) => entry.butlerContentionCount > 0);
    const renderButlerContentionTable = () => showButlerContentionTable ? (
      <section className="scenario-summary">
        <h4>Butler Contention by remaining wins</h4>
        <div className="scenario-outcome-table-wrap">
          <table className="scenario-outcome-table">
            <thead>
              <tr>
                <th>Wins</th>
                <th>Butler Contention</th>
                <th>Simulations</th>
              </tr>
            </thead>
            <tbody>
              {byeWinDistribution
                .slice()
                .sort((a, b) => b.wins - a.wins)
                .map((entry) => (
                  <tr key={entry.wins}>
                    <td>{entry.wins}</td>
                    <td>
                      {(entry.butlerContentionCount / entry.simulationCount * 100).toFixed(1)}%
                    </td>
                    <td>
                      {entry.butlerContentionCount.toLocaleString()} /{' '}
                      {entry.simulationCount.toLocaleString()}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    ) : null;
    const renderScenarioHighlights = () => (
      <>
        {statusMessages.length > 0 && (
          <div className="scenario-status-messages">
            {statusMessages.map((message) => <p key={message}>{message}</p>)}
          </div>
        )}
        {byeType && (
          <section className="scenario-summary">
            <h4>
              {byeType === 'playoff' ? 'Playoff bye scenarios' : 'Losers bracket bye scenarios'}
            </h4>
            {byeWinRows.length > 0 ? (
              <div className="scenario-outcome-table-wrap">
                <table className="scenario-outcome-table">
                  <thead>
                    <tr>
                      <th>Wins</th>
                      <th>Bye chance</th>
                      <th>Bye simulations</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byeWinRows.map((entry) => {
                      const byeCount = byeType === 'playoff'
                        ? entry.playoffByeCount
                        : entry.losersBracketByeCount;
                      return (
                        <tr key={entry.wins}>
                          <td>{entry.wins}</td>
                          <td>{(byeCount / entry.simulationCount * 100).toFixed(1)}%</td>
                          <td>{byeCount.toLocaleString()} / {entry.simulationCount.toLocaleString()}</td>
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
        {selectedTarget.place === 'playoffs' &&
          seasonStatus.missedPlayoffs &&
          renderButlerContentionTable()}
      </>
    );

    if (
      selectedTarget.place === 'playoffs' &&
      (seasonStatus.missedPlayoffs || seasonStatus.madePlayoffs)
    ) {
      return renderScenarioHighlights();
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
        </>
      );
    }

    if (analysisError) {
      return (
        <>
          {renderScenarioHighlights()}
          <p className="scenario-error">Scenario analysis failed: {analysisError}</p>
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
        </>
      );
    }

    const games = scenarioGames;
    const futureWinRows = scenarioAnalysis.allFutureWinsDistribution
      .map((simulationCount, wins) => ({
        wins,
        simulationCount,
        resultCount: scenarioAnalysis.futureWinsDistribution[wins] || 0,
        playoffCount: scenarioAnalysis.playoffFutureWinsDistribution[wins] || 0,
      }))
      .filter((entry) => entry.simulationCount > 0)
      .sort((a, b) => b.wins - a.wins);
    const selectableWinRows = futureWinRows.filter((entry) =>
      entry.resultCount > 0 &&
      entry.playoffCount > 0 &&
      entry.playoffCount < entry.simulationCount
    );
    const defaultScenarioWins = selectableWinRows
      .slice()
      .sort((a, b) => b.resultCount - a.resultCount)[0]?.wins ?? null;
    const displayedScenarioWins = selectedScenarioWins !== null &&
      selectableWinRows.some((entry) => entry.wins === selectedScenarioWins)
      ? selectedScenarioWins
      : defaultScenarioWins;
    const representativeRun = displayedScenarioWins === null
      ? null
      : scenarioAnalysis.representativeRunIndexesByWins[displayedScenarioWins];
    const scenarioCount = simulationResults?.scenarios?.count || SIMULATION_COUNT;
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
    const resultRunsLabel = selectedTarget.place === 'playoffs'
      ? 'Playoff runs'
      : 'Selected-result runs';
    const resultDescription = selectedTarget.place === 'playoffs'
      ? `${teamName} makes the playoffs`
      : `${teamName} finishes in place ${selectedTarget.place}`;
    const scenarioWeeks = Array.from(new Set(games.map((game) => game.week)));
    const displayedWeek = selectedScenarioWeek !== null &&
      scenarioWeeks.includes(selectedScenarioWeek)
      ? selectedScenarioWeek
      : scenarioWeeks[0];
    const outcomeAt = (run: number, gameIndex: number): number =>
      simulationResults!.scenarios!.outcomes[
        run * simulationResults!.scenarios!.gameCount + gameIndex
      ];

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
        </p>

        <section className="scenario-summary">
          <div className="scenario-outcome-table-wrap">
            <table className="scenario-outcome-table">
              <thead>
                <tr>
                  <th>Wins</th>
                  <th>{resultRateLabel}</th>
                  <th>{resultRunsLabel}</th>
                </tr>
              </thead>
              <tbody>
                {futureWinRows.map(({ wins, simulationCount, resultCount }) => (
                  <tr key={wins}>
                    <td>{wins}</td>
                    <td>
                      {(resultCount / simulationCount * 100).toFixed(1)}%
                      <small> ({resultCount.toLocaleString()} / {simulationCount.toLocaleString()})</small>
                    </td>
                    <td>
                      {resultCount.toLocaleString()} /{' '}
                      {scenarioAnalysis.matchingRuns.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

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
                return (
                  <li key={`${game.week}-${game.matchupId}`}>
                    <strong>
                      Week {game.week}: {team1?.metadata.team_name || team1?.display_name}
                      {' vs. '}{team2?.metadata.team_name || team2?.display_name}
                    </strong>
                    <div>
                      {resultDescription} in{' '}
                      {(scenarioAnalysis.targetCountIfTeam1Wins[index] /
                        scenarioCount * 100).toFixed(1)}% of simulations if{' '}
                      {team1?.metadata.team_name || team1?.display_name} wins, versus{' '}
                      {(scenarioAnalysis.targetCountIfTeam2Wins[index] /
                        scenarioCount * 100).toFixed(1)}% if{' '}
                      {team2?.metadata.team_name || team2?.display_name} wins.
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="scenario-weekly-breakdown">
          <h4>Example Scenario</h4>
          <small>Wins in remaining weeks</small>
          <div className="scenario-week-selector" role="group" aria-label="Select wins for example scenario">
            {futureWinRows.map(({ wins, simulationCount, resultCount, playoffCount }) => {
              const guaranteedPlayoffs = playoffCount === simulationCount;
              const guaranteedMiss = playoffCount === 0;
              const canSelect = resultCount > 0 &&
                !guaranteedPlayoffs &&
                !guaranteedMiss;
              const playoffChance = (playoffCount / simulationCount * 100).toFixed(1);
              const outcomeEmoji = guaranteedPlayoffs ? ' ⭐' : guaranteedMiss ? ' 💩' : '';
              return (
                <button
                  key={wins}
                  className={wins === displayedScenarioWins ? 'selected' : ''}
                  disabled={!canSelect}
                  onClick={() => setSelectedScenarioWins(wins)}
                  aria-pressed={wins === displayedScenarioWins}
                  aria-label={`${wins} remaining wins, ${playoffChance}% playoff chance`}
                  title={`${wins} wins: ${playoffChance}% playoff chance`}
                >
                  {wins}{outcomeEmoji}
                </button>
              );
            })}
          </div>
          {representativeRun === null ? (
            <p>No remaining win total has a selectable scenario for this result.</p>
          ) : (
            <>
              <div className="scenario-week-selector" role="group" aria-label="Select simulation week">
                {scenarioWeeks.map((week) => (
                  <button
                    key={week}
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
        </section>
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
                  </div>
                  <div className="horizontal-scroll">{renderPlaceTable()}</div>
                  <h2 className="win-distribution-title">Win Distribution</h2>
                  <div className="horizontal-scroll">{renderWinDistributionTable()}</div>
                </>
              )}
            </section>
            <aside className="scenario-panel" aria-label="Playoff scenario breakdown">
              <h3>Scenario Breakdown</h3>
              {renderScenarioPanel()}
            </aside>
          </main>
        </>
      )}
    </div>
  );
};

export default AllPlayoffPossibilities;
