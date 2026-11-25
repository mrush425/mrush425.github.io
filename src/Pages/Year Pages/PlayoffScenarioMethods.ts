export type ScenarioPlace = number | 'playoffs';

export interface ScenarioGame {
  week: number;
  matchupId: number;
  team1Index: number;
  team2Index: number;
}

export interface ScenarioTarget {
  teamIndex: number;
  place: ScenarioPlace;
}

export interface ScenarioStatus {
  madePlayoffs: boolean;
  missedPlayoffs: boolean;
  noButlerContention: boolean;
  guaranteedBye: boolean;
  onlyButlerPlaces: boolean;
}

export interface SimulationScenarios {
  count: number;
  teamCount: number;
  gameCount: number;
  outcomes: Uint8Array;
  placements: Uint8Array;
  finalWins: Uint8Array;
}

export interface ScenarioAnalysis {
  matchingRuns: number;
  game1WinsInMatchingRuns: number[];
  gameImpactCounts: number[];
  futureWinsDistribution: number[];
  allFutureWinsDistribution: number[];
  playoffFutureWinsDistribution: number[];
  targetCountIfTeam1Wins: number[];
  targetCountIfTeam2Wins: number[];
  representativeRunIndex: number | null;
  representativeRunIndexesByWins: Array<number | null>;
}

export interface ByeWinDistribution {
  wins: number;
  simulationCount: number;
  playoffByeCount: number;
  losersBracketByeCount: number;
  butlerContentionCount: number;
}

export function getOrdinalPlaceLabel(place: number): string {
  const lastTwoDigits = place % 100;
  const suffix = lastTwoDigits >= 11 && lastTwoDigits <= 13
    ? 'th'
    : place % 10 === 1
      ? 'st'
      : place % 10 === 2
        ? 'nd'
        : place % 10 === 3
          ? 'rd'
          : 'th';
  return `${place}${suffix}`;
}

export function matchesScenarioPlace(
  place: number,
  targetPlace: ScenarioPlace,
  playoffTeamCount: number
): boolean {
  return targetPlace === 'playoffs' ? place <= playoffTeamCount : place === targetPlace;
}

export function getByeWinDistribution(
  scenarios: SimulationScenarios,
  teamIndex: number,
  currentWins: number
): ByeWinDistribution[] {
  const countsByWins = new Map<number, ByeWinDistribution>();

  for (let run = 0; run < scenarios.count; run++) {
    const offset = run * scenarios.teamCount + teamIndex;
    const wins = scenarios.finalWins[offset] - currentWins;
    const place = scenarios.placements[offset];
    let counts = countsByWins.get(wins);

    if (!counts) {
      counts = {
        wins,
        simulationCount: 0,
        playoffByeCount: 0,
        losersBracketByeCount: 0,
        butlerContentionCount: 0,
      };
      countsByWins.set(wins, counts);
    }

    counts.simulationCount++;
    if (place === 1 || place === 2) counts.playoffByeCount++;
    if (place === 7 || place === 8) counts.losersBracketByeCount++;
    if (place > 8) counts.butlerContentionCount++;
  }

  return Array.from(countsByWins.values());
}

export function getRelevantScenarioGameIndexes(
  games: ScenarioGame[],
  target: ScenarioTarget,
  analysis: ScenarioAnalysis,
  simulationCount: number
): number[] {
  const selectedTeamGameIndexes = games.reduce<number[]>((indexes, game, index) => {
    if (game.team1Index === target.teamIndex || game.team2Index === target.teamIndex) {
      indexes.push(index);
    }
    return indexes;
  }, []);
  const clinchingGameIndexes = target.place === 'playoffs'
    ? selectedTeamGameIndexes.filter((index) => {
        const game = games[index];
        const selectedTeamWinCount = game.team1Index === target.teamIndex
          ? analysis.targetCountIfTeam1Wins[index]
          : analysis.targetCountIfTeam2Wins[index];
        return selectedTeamWinCount === simulationCount;
      })
    : [];
  const allowedSelectedTeamGameIndex = clinchingGameIndexes.length === 1
    ? clinchingGameIndexes[0]
    : -1;

  return games.reduce<number[]>((indexes, game, index) => {
    const includesSelectedTeam =
      game.team1Index === target.teamIndex || game.team2Index === target.teamIndex;
    if (!includesSelectedTeam || index === allowedSelectedTeamGameIndex) {
      indexes.push(index);
    }
    return indexes;
  }, []);
}

export function getScenarioStatus(
  placeCounts: ReadonlyMap<number, number>,
  playoffTeamCount: number,
  simulationCount: number
): ScenarioStatus {
  const playoffCount = Array.from({ length: playoffTeamCount }, (_, index) =>
    placeCounts.get(index + 1) || 0
  ).reduce((sum, count) => sum + count, 0);
  const butlerPlaceCount = [9, 10, 11, 12]
    .reduce((sum, place) => sum + (placeCounts.get(place) || 0), 0);
  const byePlaceCount = (placeCounts.get(1) || 0) + (placeCounts.get(2) || 0);

  return {
    madePlayoffs: playoffCount === simulationCount,
    missedPlayoffs: playoffCount === 0,
    noButlerContention: butlerPlaceCount === 0,
    guaranteedBye: byePlaceCount === simulationCount,
    onlyButlerPlaces: butlerPlaceCount === simulationCount,
  };
}

export function getPlacementAfterFlippingGame(
  targetTeamIndex: number,
  game: ScenarioGame,
  team1Won: boolean,
  finalWins: ArrayLike<number>,
  pointsFor: number[],
  winsOffset = 0
): number {
  const targetWins = finalWins[winsOffset + targetTeamIndex] +
    (targetTeamIndex === game.team1Index ? (team1Won ? -1 : 1) :
      targetTeamIndex === game.team2Index ? (team1Won ? 1 : -1) : 0);
  let place = 1;

  for (let teamIndex = 0; teamIndex < pointsFor.length; teamIndex++) {
    if (teamIndex === targetTeamIndex) continue;

    const winsDelta = teamIndex === game.team1Index ? (team1Won ? -1 : 1) :
      teamIndex === game.team2Index ? (team1Won ? 1 : -1) : 0;
    const otherWins = finalWins[winsOffset + teamIndex] + winsDelta;

    if (
      otherWins > targetWins ||
      (otherWins === targetWins && (
        pointsFor[teamIndex] > pointsFor[targetTeamIndex] ||
        (pointsFor[teamIndex] === pointsFor[targetTeamIndex] && teamIndex < targetTeamIndex)
      ))
    ) {
      place++;
    }
  }

  return place;
}

export async function analyzeScenario(
  scenarios: SimulationScenarios,
  games: ScenarioGame[],
  pointsFor: number[],
  target: ScenarioTarget,
  playoffTeamCount: number,
  onProgress: (progress: number) => void,
  isCancelled: () => boolean
): Promise<ScenarioAnalysis> {
  const analysis: ScenarioAnalysis = {
    matchingRuns: 0,
    game1WinsInMatchingRuns: Array(games.length).fill(0),
    gameImpactCounts: Array(games.length).fill(0),
    futureWinsDistribution: Array(games.length + 1).fill(0),
    allFutureWinsDistribution: Array(games.length + 1).fill(0),
    playoffFutureWinsDistribution: Array(games.length + 1).fill(0),
    targetCountIfTeam1Wins: Array(games.length).fill(0),
    targetCountIfTeam2Wins: Array(games.length).fill(0),
    representativeRunIndex: null,
    representativeRunIndexesByWins: Array(games.length + 1).fill(null),
  };
  const placementOffset = target.teamIndex;

  for (let run = 0; run < scenarios.count; run++) {
    if (isCancelled()) return analysis;

    const runPlacement = scenarios.placements[run * scenarios.teamCount + placementOffset];
    const runMatches = matchesScenarioPlace(runPlacement, target.place, playoffTeamCount);
    let futureWins = 0;

    for (let gameIndex = 0; gameIndex < games.length; gameIndex++) {
      const outcome = scenarios.outcomes[run * scenarios.gameCount + gameIndex];
      if (games[gameIndex].team1Index === target.teamIndex && outcome === 0) futureWins++;
      if (games[gameIndex].team2Index === target.teamIndex && outcome === 1) futureWins++;
      if (runMatches && outcome === 0) {
        analysis.game1WinsInMatchingRuns[gameIndex]++;
      }

      const flippedPlace = getPlacementAfterFlippingGame(
        target.teamIndex,
        games[gameIndex],
        outcome === 0,
        scenarios.finalWins,
        pointsFor,
        run * scenarios.teamCount
      );
      const flippedMatches = matchesScenarioPlace(
        flippedPlace,
        target.place,
        playoffTeamCount
      );
      if (runMatches !== flippedMatches) {
        analysis.gameImpactCounts[gameIndex]++;
      }

      const team1OutcomeMatches = outcome === 0 ? runMatches : flippedMatches;
      const team2OutcomeMatches = outcome === 1 ? runMatches : flippedMatches;
      if (team1OutcomeMatches) analysis.targetCountIfTeam1Wins[gameIndex]++;
      if (team2OutcomeMatches) analysis.targetCountIfTeam2Wins[gameIndex]++;
    }

    analysis.allFutureWinsDistribution[futureWins]++;
    if (runPlacement <= playoffTeamCount) {
      analysis.playoffFutureWinsDistribution[futureWins]++;
    }
    if (runMatches) {
      analysis.matchingRuns++;
      analysis.futureWinsDistribution[futureWins]++;
    }

    if (run % 5000 === 0) {
      onProgress(Math.round((run / scenarios.count) * 100));
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
    }
  }

  if (analysis.matchingRuns === 0 || isCancelled()) {
    onProgress(100);
    return analysis;
  }

  const mostCommonOutcomes = analysis.game1WinsInMatchingRuns.map(
    (wins) => wins * 2 >= analysis.matchingRuns
  );
  const bestAgreementByWins = Array(games.length + 1).fill(-1);
  let bestAgreement = -1;

  for (let run = 0; run < scenarios.count; run++) {
    if (isCancelled()) return analysis;
    const runPlacement = scenarios.placements[run * scenarios.teamCount + placementOffset];
    if (!matchesScenarioPlace(runPlacement, target.place, playoffTeamCount)) continue;

    let agreement = 0;
    let futureWins = 0;
    for (let gameIndex = 0; gameIndex < games.length; gameIndex++) {
      const outcome = scenarios.outcomes[run * scenarios.gameCount + gameIndex];
      if (games[gameIndex].team1Index === target.teamIndex && outcome === 0) futureWins++;
      if (games[gameIndex].team2Index === target.teamIndex && outcome === 1) futureWins++;
      if ((outcome === 0) === mostCommonOutcomes[gameIndex]) agreement++;
    }

    if (agreement > bestAgreement) {
      bestAgreement = agreement;
      analysis.representativeRunIndex = run;
    }

    if (agreement > bestAgreementByWins[futureWins]) {
      bestAgreementByWins[futureWins] = agreement;
      analysis.representativeRunIndexesByWins[futureWins] = run;
    }

    if (run % 5000 === 0) {
      onProgress(Math.round((run / scenarios.count) * 100));
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
    }
  }

  onProgress(100);
  return analysis;
}
