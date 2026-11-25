import {
  analyzeScenario,
  getByeWinDistribution,
  getExampleScenarioDistribution,
  getMostCommonCompetitionGroupsBySpots,
  getOrdinalPlaceLabel,
  getPlacementAfterFlippingGame,
  getPointsMatterWinDistribution,
  getRelevantScenarioGameIndexes,
  getScenarioTiebreakerDetails,
  getScenarioStatus,
  getTeamTiebreakerDependencies,
  incrementPointsMatterCounts,
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

test('counts every team in a tied record group that straddles the playoff cutoff', () => {
  const counts = new Uint32Array(5);
  incrementPointsMatterCounts(
    [0, 1, 2, 3, 4],
    new Uint8Array([6, 5, 5, 5, 4]),
    3,
    counts
  );

  expect(Array.from(counts)).toEqual([0, 1, 1, 1, 0]);
});

test('builds playoff example buttons for points-independent and tiebreaker-dependent runs', () => {
  const scenarios: SimulationScenarios = {
    count: 2,
    teamCount: 5,
    gameCount: 0,
    outcomes: new Uint8Array(0),
    placements: new Uint8Array([1, 2, 3, 4, 5, 1, 2, 3, 4, 5]),
    finalWins: new Uint8Array([8, 8, 8, 7, 6, 8, 7, 7, 7, 6]),
  };

  expect(getExampleScenarioDistribution(scenarios, 0, 6, 2)).toEqual({
    options: [
      {
        kind: 'playoffs',
        wins: 2,
        pointsMatter: false,
        simulationCount: 1,
        representativeRunIndex: 1,
      },
      {
        kind: 'playoffs',
        wins: 2,
        pointsMatter: true,
        simulationCount: 1,
        representativeRunIndex: 0,
      },
    ],
    winTotals: [
      {
        wins: 2,
        simulationCount: 2,
        playoffCount: 2,
        butlerCount: 0,
        playoffPointsMatterCount: 1,
        butlerPointsMatterCount: 0,
      },
    ],
  });
  expect(getScenarioTiebreakerDetails(scenarios, 0, 0, 2)).toEqual({
    pointsMatter: true,
    spotsAvailable: 2,
    competitorIndexes: [1, 2],
  });
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
    },
    {
      wins: 2,
      simulationCount: 2,
      playoffByeCount: 0,
      losersBracketByeCount: 0,
    },
    {
      wins: 1,
      simulationCount: 2,
      playoffByeCount: 0,
      losersBracketByeCount: 1,
    },
  ]);
});

test('splits win totals by cutoff tiebreaker and counts competing teams', () => {
  const scenarios: SimulationScenarios = {
    count: 4,
    teamCount: 4,
    gameCount: 0,
    outcomes: new Uint8Array(0),
    placements: new Uint8Array([
      1, 2, 3, 4,
      2, 1, 3, 4,
      3, 1, 4, 2,
      3, 4, 1, 2,
    ]),
    finalWins: new Uint8Array([
      10, 10, 9, 8,
      10, 10, 10, 9,
      10, 10, 9, 10,
      9, 9, 10, 10,
    ]),
  };

  expect(getPointsMatterWinDistribution(
    scenarios,
    0,
    7,
    2
  )).toEqual([
    {
      wins: 3,
      pointsMatter: false,
      simulationCount: 1,
      insideCutoffCount: 1,
      competitionGroups: new Map(),
    },
    {
      wins: 3,
      pointsMatter: true,
      simulationCount: 2,
      insideCutoffCount: 1,
      competitionGroups: new Map([
        [
          '2:1,2',
          {
            competitorIndexes: [1, 2],
            spotsAvailable: 2,
            occurrenceCount: 1,
          },
        ],
        [
          '2:1,3',
          {
            competitorIndexes: [1, 3],
            spotsAvailable: 2,
            occurrenceCount: 1,
          },
        ],
      ]),
    },
    {
      wins: 2,
      pointsMatter: false,
      simulationCount: 1,
      insideCutoffCount: 0,
      competitionGroups: new Map(),
    },
  ]);
});

test('selects the most common competition group for each spots-available count', () => {
  const groups = [
    { competitorIndexes: [4], spotsAvailable: 1, occurrenceCount: 2 },
    { competitorIndexes: [1, 2], spotsAvailable: 2, occurrenceCount: 3 },
    { competitorIndexes: [6], spotsAvailable: 1, occurrenceCount: 5 },
    { competitorIndexes: [5, 7], spotsAvailable: 2, occurrenceCount: 1 },
  ];

  expect(getMostCommonCompetitionGroupsBySpots(groups)).toEqual([
    groups[1],
    groups[2],
  ]);
});

test('detects exact-place, bye, and Butler tiebreaker dependencies', () => {
  const tiedScenarios: SimulationScenarios = {
    count: 1,
    teamCount: 3,
    gameCount: 0,
    outcomes: new Uint8Array(0),
    placements: new Uint8Array([1, 2, 3]),
    finalWins: new Uint8Array([10, 10, 8]),
  };
  const untiedScenarios: SimulationScenarios = {
    ...tiedScenarios,
    finalWins: new Uint8Array([10, 9, 8]),
  };

  expect(getTeamTiebreakerDependencies(tiedScenarios, 0)).toEqual({
    exactPlace: true,
    playoffBye: false,
    butler: false,
  });
  const playoffByeScenarios: SimulationScenarios = {
    ...tiedScenarios,
    finalWins: new Uint8Array([10, 9, 9]),
  };
  expect(getTeamTiebreakerDependencies(playoffByeScenarios, 1)).toEqual({
    exactPlace: true,
    playoffBye: true,
    butler: false,
  });
  const butlerScenarios: SimulationScenarios = {
    count: 1,
    teamCount: 9,
    gameCount: 0,
    outcomes: new Uint8Array(0),
    placements: new Uint8Array([8, 9, 1, 2, 3, 4, 5, 6, 7]),
    finalWins: new Uint8Array([7, 7, 9, 9, 9, 9, 9, 9, 8]),
  };
  expect(getTeamTiebreakerDependencies(butlerScenarios, 0)).toEqual({
    exactPlace: true,
    playoffBye: false,
    butler: true,
  });
  expect(getTeamTiebreakerDependencies(untiedScenarios, 0)).toEqual({
    exactPlace: false,
    playoffBye: false,
    butler: false,
  });
});

test('detects playoff tiebreaker dependencies at 0% and 100% current-points outcomes', () => {
  const placementsByCurrentPoints = [
    new Uint8Array([5, 1, 2, 3, 4]),
    new Uint8Array([1, 2, 3, 4, 5]),
  ];

  placementsByCurrentPoints.forEach((placements, index) => {
    const scenarios: SimulationScenarios = {
      count: 1,
      teamCount: 5,
      gameCount: 0,
      outcomes: new Uint8Array(0),
      placements,
      finalWins: new Uint8Array([7, 7, 7, 7, 6]),
    };
    const distribution = getPointsMatterWinDistribution(scenarios, 0, 7, 3);

    expect(distribution).toEqual([
      expect.objectContaining({
        pointsMatter: true,
        simulationCount: 1,
        insideCutoffCount: index,
      }),
    ]);
  });
});

test('treats a tied record spanning 8th and 9th as Butler points contention', () => {
  const scenarios: SimulationScenarios = {
    count: 1,
    teamCount: 9,
    gameCount: 0,
    outcomes: new Uint8Array(0),
    placements: new Uint8Array([8, 9, 1, 2, 3, 4, 5, 6, 7]),
    finalWins: new Uint8Array([7, 7, 9, 9, 9, 9, 9, 9, 9]),
  };

  expect(getPointsMatterWinDistribution(
    scenarios,
    0,
    6,
    8
  )).toEqual([
    {
      wins: 1,
      pointsMatter: true,
      simulationCount: 1,
      insideCutoffCount: 1,
      competitionGroups: new Map([[
        '1:1',
        {
          competitorIndexes: [1],
          spotsAvailable: 1,
          occurrenceCount: 1,
        },
      ]]),
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
