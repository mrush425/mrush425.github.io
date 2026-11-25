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
}

export interface PointsMatterWinDistribution {
  wins: number;
  pointsMatter: boolean;
  simulationCount: number;
  insideCutoffCount: number;
  competitionGroups: Map<string, PointsMatterCompetitionGroup>;
}

export interface PointsMatterCompetitionGroup {
  competitorIndexes: number[];
  spotsAvailable: number;
  occurrenceCount: number;
}

export interface TeamTiebreakerDependencies {
  exactPlace: boolean;
  playoffBye: boolean;
  butler: boolean;
}

export function getTeamTiebreakerDependencies(
  scenarios: SimulationScenarios,
  teamIndex: number
): TeamTiebreakerDependencies {
  const dependencies: TeamTiebreakerDependencies = {
    exactPlace: false,
    playoffBye: false,
    butler: false,
  };

  for (let run = 0; run < scenarios.count; run++) {
    const runOffset = run * scenarios.teamCount;
    const selectedWins = scenarios.finalWins[runOffset + teamIndex];
    let teamsAboveRecord = 0;
    let recordGroupSize = 1;

    for (let otherTeamIndex = 0; otherTeamIndex < scenarios.teamCount; otherTeamIndex++) {
      if (otherTeamIndex === teamIndex) continue;

      const otherWins = scenarios.finalWins[runOffset + otherTeamIndex];
      if (otherWins > selectedWins) teamsAboveRecord++;
      if (otherWins === selectedWins) recordGroupSize++;
    }

    dependencies.exactPlace = dependencies.exactPlace || recordGroupSize > 1;
    dependencies.playoffBye = dependencies.playoffBye || isCutoffTiebreakerDependent(
      2,
      teamsAboveRecord,
      recordGroupSize
    );
    dependencies.butler = dependencies.butler || isCutoffTiebreakerDependent(
      8,
      teamsAboveRecord,
      recordGroupSize
    );

    if (
      dependencies.exactPlace &&
      dependencies.playoffBye &&
      dependencies.butler
    ) {
      return dependencies;
    }
  }

  return dependencies;
}

function isCutoffTiebreakerDependent(
  cutoffPlace: number,
  teamsAboveRecord: number,
  recordGroupSize: number
): boolean {
  const spotsAvailable = cutoffPlace - teamsAboveRecord;
  return spotsAvailable > 0 && spotsAvailable < recordGroupSize;
}

export function getMostCommonCompetitionGroupsBySpots(
  groups: ReadonlyArray<PointsMatterCompetitionGroup>
): PointsMatterCompetitionGroup[] {
  const mostCommonBySpots = new Map<number, PointsMatterCompetitionGroup>();

  groups.forEach((group) => {
    const current = mostCommonBySpots.get(group.spotsAvailable);
    if (!current || group.occurrenceCount > current.occurrenceCount) {
      mostCommonBySpots.set(group.spotsAvailable, group);
    }
  });

  return Array.from(mostCommonBySpots.values())
    .sort((a, b) => b.spotsAvailable - a.spotsAvailable);
}

export type ExampleScenarioKind = 'playoffs' | 'butler';

export interface ExampleScenarioOption {
  kind: ExampleScenarioKind;
  wins: number;
  pointsMatter: boolean;
  simulationCount: number;
  representativeRunIndex: number;
}

export interface ExampleScenarioWinTotal {
  wins: number;
  simulationCount: number;
  playoffCount: number;
  butlerCount: number;
  playoffPointsMatterCount: number;
  butlerPointsMatterCount: number;
}

export interface ScenarioTiebreakerDetails {
  pointsMatter: boolean;
  spotsAvailable: number;
  competitorIndexes: number[];
}

export function getScenarioTiebreakerDetails(
  scenarios: SimulationScenarios,
  teamIndex: number,
  runIndex: number,
  cutoffPlace: number
): ScenarioTiebreakerDetails {
  const runOffset = runIndex * scenarios.teamCount;
  const selectedWins = scenarios.finalWins[runOffset + teamIndex];
  const competitorIndexes: number[] = [];
  let teamsAboveRecord = 0;

  for (let otherTeamIndex = 0; otherTeamIndex < scenarios.teamCount; otherTeamIndex++) {
    const otherWins = scenarios.finalWins[runOffset + otherTeamIndex];
    if (otherWins > selectedWins) teamsAboveRecord++;
    if (otherTeamIndex !== teamIndex && otherWins === selectedWins) {
      competitorIndexes.push(otherTeamIndex);
    }
  }

  const spotsAvailable = cutoffPlace - teamsAboveRecord;
  const pointsMatter = spotsAvailable > 0 &&
    spotsAvailable < competitorIndexes.length + 1;
  return { pointsMatter, spotsAvailable, competitorIndexes };
}

export function getExampleScenarioDistribution(
  scenarios: SimulationScenarios,
  teamIndex: number,
  currentWins: number,
  playoffTeamCount: number
): { options: ExampleScenarioOption[]; winTotals: ExampleScenarioWinTotal[] } {
  const optionsByKey = new Map<string, ExampleScenarioOption>();
  const winTotalsByWins = new Map<number, ExampleScenarioWinTotal>();

  for (let run = 0; run < scenarios.count; run++) {
    const offset = run * scenarios.teamCount + teamIndex;
    const place = scenarios.placements[offset];
    const wins = scenarios.finalWins[offset] - currentWins;
    let teamsAboveRecord = 0;
    let tiedRecordTeams = 0;

    for (let otherTeamIndex = 0; otherTeamIndex < scenarios.teamCount; otherTeamIndex++) {
      const otherWins = scenarios.finalWins[run * scenarios.teamCount + otherTeamIndex];
      if (otherWins > scenarios.finalWins[offset]) teamsAboveRecord++;
      if (otherWins === scenarios.finalWins[offset]) tiedRecordTeams++;
    }

    const playoffSpotsAvailable = playoffTeamCount - teamsAboveRecord;
    const playoffPointsMatter = playoffSpotsAvailable > 0 &&
      playoffSpotsAvailable < tiedRecordTeams;
    const butlerSpotsAvailable = 8 - teamsAboveRecord;
    const butlerPointsMatter = butlerSpotsAvailable > 0 &&
      butlerSpotsAvailable < tiedRecordTeams;
    let winTotal = winTotalsByWins.get(wins);

    if (!winTotal) {
      winTotal = {
        wins,
        simulationCount: 0,
        playoffCount: 0,
        butlerCount: 0,
        playoffPointsMatterCount: 0,
        butlerPointsMatterCount: 0,
      };
      winTotalsByWins.set(wins, winTotal);
    }

    winTotal.simulationCount++;
    if (place <= playoffTeamCount) winTotal.playoffCount++;
    if (place > 8) winTotal.butlerCount++;
    if (playoffPointsMatter) winTotal.playoffPointsMatterCount++;
    if (butlerPointsMatter) winTotal.butlerPointsMatterCount++;

    const addOption = (kind: ExampleScenarioKind, pointsMatter: boolean) => {
      const key = `${kind}-${wins}-${pointsMatter}`;
      const option = optionsByKey.get(key);
      if (option) {
        option.simulationCount++;
      } else {
        optionsByKey.set(key, {
          kind,
          wins,
          pointsMatter,
          simulationCount: 1,
          representativeRunIndex: run,
        });
      }
    };

    if (playoffPointsMatter || place <= playoffTeamCount) {
      addOption('playoffs', playoffPointsMatter);
    }
    if (butlerPointsMatter || place > 8) {
      addOption('butler', butlerPointsMatter);
    }
  }

  return {
    options: Array.from(optionsByKey.values()).sort((a, b) =>
      b.wins - a.wins ||
      Number(a.pointsMatter) - Number(b.pointsMatter) ||
      a.kind.localeCompare(b.kind)
    ),
    winTotals: Array.from(winTotalsByWins.values()).sort((a, b) => b.wins - a.wins),
  };
}

export function incrementPointsMatterCounts(
  orderedTeamIndexes: ReadonlyArray<number>,
  winsByTeam: ArrayLike<number>,
  cutoffPlace: number,
  pointsMatterCounts: Uint32Array
): void {
  let groupStart = 0;

  while (groupStart < orderedTeamIndexes.length) {
    const groupWins = winsByTeam[orderedTeamIndexes[groupStart]];
    let groupEnd = groupStart + 1;
    while (
      groupEnd < orderedTeamIndexes.length &&
      winsByTeam[orderedTeamIndexes[groupEnd]] === groupWins
    ) {
      groupEnd++;
    }

    const spotsAvailable = cutoffPlace - groupStart;
    if (spotsAvailable > 0 && spotsAvailable < groupEnd - groupStart) {
      for (let rank = groupStart; rank < groupEnd; rank++) {
        pointsMatterCounts[orderedTeamIndexes[rank]]++;
      }
    }
    groupStart = groupEnd;
  }
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
      };
      countsByWins.set(wins, counts);
    }

    counts.simulationCount++;
    if (place === 1 || place === 2) counts.playoffByeCount++;
    if (place === 7 || place === 8) counts.losersBracketByeCount++;
  }

  return Array.from(countsByWins.values());
}

export function getPointsMatterWinDistribution(
  scenarios: SimulationScenarios,
  teamIndex: number,
  currentWins: number,
  cutoffPlace: number
): PointsMatterWinDistribution[] {
  const countsByWinsAndPointsMatter = new Map<string, PointsMatterWinDistribution>();

  for (let run = 0; run < scenarios.count; run++) {
    const runOffset = run * scenarios.teamCount;
    const selectedFinalWins = scenarios.finalWins[runOffset + teamIndex];
    const selectedPlace = scenarios.placements[runOffset + teamIndex];
    const recordGroup: number[] = [];
    let teamsAboveRecord = 0;

    for (let otherTeamIndex = 0; otherTeamIndex < scenarios.teamCount; otherTeamIndex++) {
      const otherFinalWins = scenarios.finalWins[runOffset + otherTeamIndex];
      if (otherFinalWins > selectedFinalWins) teamsAboveRecord++;
      if (otherFinalWins === selectedFinalWins) recordGroup.push(otherTeamIndex);
    }

    const spotsAvailable = cutoffPlace - teamsAboveRecord;
    const pointsMatter = spotsAvailable > 0 && spotsAvailable < recordGroup.length;
    const wins = selectedFinalWins - currentWins;
    const key = `${wins}-${pointsMatter}`;
    let counts = countsByWinsAndPointsMatter.get(key);

    if (!counts) {
      counts = {
        wins,
        pointsMatter,
        simulationCount: 0,
        insideCutoffCount: 0,
        competitionGroups: new Map<string, PointsMatterCompetitionGroup>(),
      };
      countsByWinsAndPointsMatter.set(key, counts);
    }

    counts.simulationCount++;
    if (selectedPlace <= cutoffPlace) counts.insideCutoffCount++;

    if (!pointsMatter) continue;

    const competitorIndexes = recordGroup
      .filter((otherTeamIndex) => otherTeamIndex !== teamIndex)
      .sort((a, b) => a - b);
    const competitionKey = `${spotsAvailable}:${competitorIndexes.join(',')}`;
    const competitionGroup = counts.competitionGroups.get(competitionKey);

    if (competitionGroup) {
      competitionGroup.occurrenceCount++;
    } else {
      counts.competitionGroups.set(competitionKey, {
        competitorIndexes,
        spotsAvailable,
        occurrenceCount: 1,
      });
    }
  }

  return Array.from(countsByWinsAndPointsMatter.values()).sort((a, b) =>
    b.wins - a.wins || Number(a.pointsMatter) - Number(b.pointsMatter)
  );
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
