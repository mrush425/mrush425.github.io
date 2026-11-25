import {
  analyzeScenario,
  getByeWinDistribution,
  getOrdinalPlaceLabel,
  getPlacementAfterFlippingGame,
  getRelevantScenarioGameIndexes,
  getScenarioStatus,
  matchesScenarioPlace,
  ScenarioAnalysis,
  ScenarioGame,
  SimulationScenarios,
} from './PlayoffScenarioMethods';

const game: ScenarioGame = {
  week: 13,
  matchupId: 1,
  team1Index: 0,
  team2Index: 1,
};

test('matches playoff and exact-place scenario selections', () => {
  expect(matchesScenarioPlace(4, 'playoffs', 6)).toBe(true);
  expect(matchesScenarioPlace(7, 'playoffs', 6)).toBe(false);
  expect(matchesScenarioPlace(4, 4, 6)).toBe(true);
  expect(matchesScenarioPlace(3, 4, 6)).toBe(false);
});

test('formats placement ordinals, including teen and compound values', () => {
  expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23].map(getOrdinalPlaceLabel))
    .toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '23rd']);
});

test('identifies playoff, bye, and Butler status from placement probabilities', () => {
  const playoffStatus = getScenarioStatus(new Map([[1, 500000]]), 6, 500000);
  expect(playoffStatus).toEqual({
    madePlayoffs: true,
    missedPlayoffs: false,
    noButlerContention: true,
    guaranteedBye: true,
    onlyButlerPlaces: false,
  });

  const butlerStatus = getScenarioStatus(new Map([[9, 500000]]), 6, 500000);
  expect(butlerStatus).toEqual({
    madePlayoffs: false,
    missedPlayoffs: true,
    noButlerContention: false,
    guaranteedBye: false,
    onlyButlerPlaces: true,
  });
});

test('counts playoff and losers bracket byes for each final win total', () => {
  const scenarios: SimulationScenarios = {
    count: 6,
    teamCount: 2,
    gameCount: 0,
    outcomes: new Uint8Array(0),
    placements: new Uint8Array([1, 2, 8, 7, 9, 10, 10, 9, 8, 7, 11, 6]),
    finalWins: new Uint8Array([8, 9, 8, 6, 7, 8, 7, 6, 6, 9, 6, 6]),
  };

  expect(getByeWinDistribution(scenarios, 0, 5)).toEqual([
    {
      wins: 3,
      simulationCount: 2,
      playoffByeCount: 1,
      losersBracketByeCount: 1,
      butlerContentionCount: 0,
    },
    {
      wins: 2,
      simulationCount: 2,
      playoffByeCount: 0,
      losersBracketByeCount: 0,
      butlerContentionCount: 2,
    },
    {
      wins: 1,
      simulationCount: 2,
      playoffByeCount: 0,
      losersBracketByeCount: 1,
      butlerContentionCount: 1,
    },
  ]);
});

test('only includes one selected-team matchup when a win guarantees playoffs', () => {
  const games: ScenarioGame[] = [
    { week: 13, matchupId: 1, team1Index: 0, team2Index: 1 },
    { week: 14, matchupId: 2, team1Index: 0, team2Index: 2 },
    { week: 14, matchupId: 3, team1Index: 1, team2Index: 2 },
  ];
  const analysis: ScenarioAnalysis = {
    matchingRuns: 1,
    game1WinsInMatchingRuns: [1, 0, 0],
    gameImpactCounts: [1, 1, 1],
    futureWinsDistribution: [0, 1],
    allFutureWinsDistribution: [1, 1],
    playoffFutureWinsDistribution: [0, 0],
    targetCountIfTeam1Wins: [2, 1, 1],
    targetCountIfTeam2Wins: [0, 1, 1],
    representativeRunIndex: 0,
    representativeRunIndexesByWins: [null, null],
  };

  expect(getRelevantScenarioGameIndexes(
    games,
    { teamIndex: 0, place: 'playoffs' },
    analysis,
    2
  )).toEqual([0, 2]);

  analysis.targetCountIfTeam1Wins[1] = 2;
  expect(getRelevantScenarioGameIndexes(
    games,
    { teamIndex: 0, place: 'playoffs' },
    analysis,
    2
  )).toEqual([2]);

  expect(getRelevantScenarioGameIndexes(
    games,
    { teamIndex: 0, place: 3 },
    analysis,
    2
  )).toEqual([2]);
});

test('flips a matchup and recalculates the target team position', () => {
  const wins = new Uint8Array([8, 7, 7, 6]);
  const points = [100, 90, 110, 80];

  expect(getPlacementAfterFlippingGame(0, game, true, wins, points)).toBe(3);
  expect(getPlacementAfterFlippingGame(0, game, false, wins, points)).toBe(1);
  expect(getPlacementAfterFlippingGame(2, game, true, wins, points)).toBe(2);
});

test('counts matching outcomes and identifies consequential games', async () => {
  const scenarios: SimulationScenarios = {
    count: 2,
    teamCount: 3,
    gameCount: 1,
    outcomes: new Uint8Array([1, 0]),
    placements: new Uint8Array([2, 1, 3, 1, 2, 3]),
    finalWins: new Uint8Array([0, 1, 0, 1, 0, 0]),
  };
  const result = await analyzeScenario(
    scenarios,
    [game],
    [30, 20, 10],
    { teamIndex: 0, place: 'playoffs' },
    1,
    () => undefined,
    () => false
  );

  expect(result.matchingRuns).toBe(1);
  expect(result.game1WinsInMatchingRuns).toEqual([1]);
  expect(result.gameImpactCounts).toEqual([2]);
  expect(result.futureWinsDistribution).toEqual([0, 1]);
  expect(result.futureWinsDistribution.reduce((sum, count) => sum + count, 0))
    .toBe(result.matchingRuns);
  expect(result.allFutureWinsDistribution).toEqual([1, 1]);
  expect(result.playoffFutureWinsDistribution).toEqual([0, 1]);
  expect(result.targetCountIfTeam1Wins).toEqual([2]);
  expect(result.targetCountIfTeam2Wins).toEqual([0]);
  expect(result.representativeRunIndex).toBe(1);
  expect(result.representativeRunIndexesByWins).toEqual([null, 1]);
});

test('tracks a representative run for each possible future win count', async () => {
  const scenarios: SimulationScenarios = {
    count: 2,
    teamCount: 2,
    gameCount: 1,
    outcomes: new Uint8Array([0, 1]),
    placements: new Uint8Array([1, 2, 1, 2]),
    finalWins: new Uint8Array([1, 0, 0, 1]),
  };
  const result = await analyzeScenario(
    scenarios,
    [game],
    [10, 5],
    { teamIndex: 0, place: 'playoffs' },
    1,
    () => undefined,
    () => false
  );

  expect(result.allFutureWinsDistribution).toEqual([1, 1]);
  expect(result.futureWinsDistribution).toEqual([1, 1]);
  expect(result.playoffFutureWinsDistribution).toEqual([1, 1]);
  expect(result.representativeRunIndexesByWins).toEqual([1, 0]);
});
