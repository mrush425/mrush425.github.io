import React from 'react';
import LeagueData from '../Interfaces/LeagueData';
import SidebetStat from '../Interfaces/SidebetStat';
import MatchupInfo from '../Interfaces/MatchupInfo';
import SleeperUser from '../Interfaces/SleeperUser';
import {
  findRosterByUserId,
  findUserByRosterId,
  getBowlWinner,
  projectedPointsInWeek,
} from './HelperMethods';
import sidebetsData from '../Data/sidebets.json';
import yearTrollData from '../Data/yearTrollData.json';
import SleeperRoster from '../Interfaces/SleeperRoster';
import Matchup from '../Interfaces/Matchup';
import { getLeagueRecordAtSchedule } from './RecordCalculations';
import NFLStandingEntry from '../Interfaces/NFLStandingEntry';
import playerData from '../Data/players.json';
import PlayerYearStats from '../Interfaces/PlayerYearStats';
import yearData from '../Data/yearData.json';

// =============================================================================
// TYPES / EXPORTS
// =============================================================================

export interface PositionAgainstWeeklyDetail {
  year: number;
  week: number;
  playerName: string;
  points: number;
}

export interface PositionAgainstAccumulator {
  details: PositionAgainstWeeklyDetail[];
}

export interface Sidebet {
  methodName: string;
  displayName: string;
  description: string;
  isAsync: boolean;
}

export interface YearSidebet {
  year: number;
  data: { sidebetName: string }[];
}

// =============================================================================
// HELPERS (Regular vs Playoffs, Bye handling)
// =============================================================================

const isPlayoffWeek = (data: LeagueData, week: number): boolean =>
  week >= data.settings.playoff_week_start;

const weekIsIncluded = (
  data: LeagueData,
  week: number,
  includeRegularSeason: boolean,
  includePlayoffs: boolean
): boolean => {
  const playoff = isPlayoffWeek(data, week);
  if (playoff && !includePlayoffs) return false;
  if (!playoff && !includeRegularSeason) return false;
  return true;
};

/**
 * Many of your methods historically defaulted to:
 * - include regular season weeks only
 * - exclude playoffs
 * - and for current season, exclude the current in-progress week
 */
const getRelevantMatchups = (
  data: LeagueData,
  includeRegularSeason: boolean,
  includePlayoffs: boolean,
  excludeCurrentWeekIfCurrentSeason: boolean = true
): MatchupInfo[] => {
  const currentSeasonIsThisLeague = data.nflSeasonInfo.season === data.season;

  // Determine an upper bound week if we should exclude in-progress week
  let maxWeekExclusive: number | null = null;
  if (
    excludeCurrentWeekIfCurrentSeason &&
    currentSeasonIsThisLeague &&
    data.nflSeasonInfo.season_type !== 'post'
  ) {
    // Exclude current week (only include weeks strictly before nflSeasonInfo.week)
    maxWeekExclusive = data.nflSeasonInfo.week;
  }

  return data.matchupInfo.filter((m) => {
    if (maxWeekExclusive !== null && m.week >= maxWeekExclusive) return false;
    return weekIsIncluded(data, m.week, includeRegularSeason, includePlayoffs);
  });
};

/**
 * In playoffs, a team can have a bye.
 * Those weeks should be excluded team-by-team (not league-wide).
 * Conservative rule: in playoffs, if there is no opponent matchup OR opponent points are 0 => bye.
 * (You suggested either condition; this matches that.)
 */
const isPlayoffByeWeek = (data: LeagueData, week: number, oppMatchup?: Matchup): boolean => {
  if (!isPlayoffWeek(data, week)) return false;
  if (!oppMatchup) return true;
  const oppPts = oppMatchup.points ?? 0;
  return oppPts === 0;
};

// =============================================================================
// CLASS
// =============================================================================

class SidebetMethods {
  static Sidebets(): Sidebet[] {
    const sidebets: Sidebet[] = sidebetsData;
    return sidebets;
  }

  // ===========================================================================
  // HEARTBREAKER
  // ===========================================================================

  static Heartbreaker(
    data: LeagueData,
    includeRegularSeason: boolean = true,
    includePlayoffs: boolean = false
  ): SidebetStat[] {
    const orderedSidebets: SidebetStat[] = [];
    data.users.forEach((user) => {
      orderedSidebets.push(this.UserHeartbreaker(data, user, includeRegularSeason, includePlayoffs));
    });

    orderedSidebets.sort((a, b) =>
      a.stat_number && b.stat_number ? a.stat_number - b.stat_number : 100
    );
    return orderedSidebets;
  }

  static UserHeartbreaker(
    data: LeagueData,
    user: SleeperUser,
    includeRegularSeason: boolean = true,
    includePlayoffs: boolean = false
  ): SidebetStat {
    let heartbreakerTotal = 200;
    let points = 0;
    let opponentPoints = 0;
    let week = 0;
    let opponent = '';

    const rosterId: number = data.rosters.find((r) => r.owner_id === user.user_id)?.roster_id || 0;

    const relevantMatchups = getRelevantMatchups(data, includeRegularSeason, includePlayoffs, true);

    relevantMatchups.forEach((matchupInfo) => {
      const matchup = matchupInfo.matchups.find((m) => m.roster_id === rosterId);
      const opponentMatchup = matchupInfo.matchups.find(
        (m) => m.matchup_id === matchup?.matchup_id && m.roster_id !== rosterId
      );

      if (!matchup) return;
      if (isPlayoffByeWeek(data, matchupInfo.week, opponentMatchup)) return;
      if (!opponentMatchup) return;

      if (matchup.points < opponentMatchup.points) {
        const difference = opponentMatchup.points - matchup.points;
        if (difference < heartbreakerTotal) {
          week = matchupInfo.week;
          heartbreakerTotal = difference;
          opponent = findUserByRosterId(opponentMatchup.roster_id, data)?.metadata.team_name || '';
          points = matchup.points;
          opponentPoints = opponentMatchup.points;
        }
      }
    });

    const sidebetStat: SidebetStat = new SidebetStat();
    sidebetStat.user = user;
    sidebetStat.stat_number = heartbreakerTotal;
    sidebetStat.stats_display =
      heartbreakerTotal.toFixed(2) +
      ' during week ' +
      week +
      ' against ' +
      opponent +
      ': ' +
      points +
      ' - ' +
      opponentPoints;

    return sidebetStat;
  }

  // ===========================================================================
  // HELMET MASTER (unchanged re: matchups; flags not needed)
  // ===========================================================================

  static HelmetMaster(data: LeagueData): SidebetStat[] {
    const helmetStats: SidebetStat[] = data.users
      .map((user) => this.UserHelmetMaster(data, user))
      .filter((stat): stat is SidebetStat => stat !== undefined);

    const validHelmetStats = helmetStats.filter((stat): stat is SidebetStat => stat !== undefined);

    validHelmetStats.sort((a, b) =>
      a.stat_number !== undefined && b.stat_number !== undefined ? a.stat_number - b.stat_number : 0
    );

    return validHelmetStats;
  }

  static UserHelmetMaster(data: LeagueData, user: SleeperUser): SidebetStat | undefined {
    const currentSeason = data.season;
    const userSleeperId = user.user_id;

    const yearDataEntry = yearTrollData.find((yd) => yd.year === Number.parseFloat(currentSeason));
    if (!yearDataEntry) {
      console.warn(`No yearTrollData found for season ${currentSeason}.`);
      return undefined;
    }

    const playerDataEntry = yearDataEntry.data.find((pd: any) => pd.sleeper_id === userSleeperId);
    if (!playerDataEntry) {
      console.warn(`No helmet master data found for user ${user.user_id} in season ${currentSeason}.`);
      return undefined;
    }

    const helmetMasterTeam: string = playerDataEntry.HM_sleeper_id;
    const guessedRecordStr: string = playerDataEntry.HM_guessed_record;

    const [guessedWinsStr, guessedLossesStr, guessedTiesStr] = guessedRecordStr.split('-');
    const guessedWins = parseInt(guessedWinsStr, 10);
    const guessedLosses = parseInt(guessedLossesStr, 10);
    const guessedTies = guessedTiesStr ? parseInt(guessedTiesStr, 10) : 0;

    if (isNaN(guessedWins) || isNaN(guessedLosses) || isNaN(guessedTies)) {
      console.warn(`Invalid guessed record format for user ${user.user_id}: ${guessedRecordStr}.`);
      return undefined;
    }

    const guessedWinPercentage =
      (guessedWins + 0.5 * guessedTies) / (guessedWins + guessedLosses + guessedTies);

    const actualStanding: NFLStandingEntry | undefined = data.nflStandings?.find(
      (standing) => standing.abbreviation.toLowerCase() === helmetMasterTeam.toLowerCase()
    );

    if (!actualStanding) {
      console.warn(`No NFL standing found for team ${helmetMasterTeam}.`);
      return undefined;
    }

    const actualWins = actualStanding.wins;
    const actualLosses = actualStanding.losses;
    const actualTies = actualStanding.ties;
    const actualWinPercentage = actualStanding.winPercent;

    const percentageDifference = Math.abs(guessedWinPercentage - actualWinPercentage);

    const guessedRecordDisplay =
      guessedTies > 0 ? `${guessedWins}-${guessedLosses}-${guessedTies}` : `${guessedWins}-${guessedLosses}`;
    const actualRecordDisplay =
      actualTies > 0 ? `${actualWins}-${actualLosses}-${actualTies}` : `${actualWins}-${actualLosses}`;

    const sidebetStat: SidebetStat = new SidebetStat();
    sidebetStat.user = user;
    sidebetStat.stat_number = percentageDifference;
    sidebetStat.stats_display = `${actualStanding.name} (Guessed: ${guessedRecordDisplay} (${(
      guessedWinPercentage * 100
    ).toFixed(1)}%), Actual: ${actualRecordDisplay} (${(actualWinPercentage * 100).toFixed(1)}%))`;

    return sidebetStat;
  }

  // ===========================================================================
  // MOST POINTS AGAINST (season total, no matchup filtering needed here)
  // ===========================================================================

  static MostPointsAgainst(data: LeagueData): SidebetStat[] {
    const orderedSidebets: SidebetStat[] = [];

    data.rosters.forEach((roster: SleeperRoster) => {
      const sidebetStat: SidebetStat = new SidebetStat();
      sidebetStat.user = data.users.find((u) => u.user_id === roster.owner_id);
      sidebetStat.stat_number = roster.settings.fpts_against + roster.settings.fpts_against_decimal;
      sidebetStat.stats_display = (roster.settings.fpts_against + roster.settings.fpts_against_decimal).toFixed(2);
      orderedSidebets.push(sidebetStat);
    });

    orderedSidebets.sort((a, b) => (a.stat_number && b.stat_number ? b.stat_number - a.stat_number : 100));
    return orderedSidebets;
  }

  // ===========================================================================
  // MOST POINTS IN WEEK + WRAPPERS (Boss / ComingInHot)
  // ===========================================================================

  static BossWhenItCounts(
    data: LeagueData,
    includeRegularSeason: boolean = true,
    includePlayoffs: boolean = false
  ): SidebetStat[] {
    // Original guard (keep behavior)
    if (
      data.nflSeasonInfo.season_type !== 'post' &&
      data.season === data.nflSeasonInfo.season &&
      data.nflSeasonInfo.week < data.settings.playoff_week_start + 2
    ) {
      return [new SidebetStat()];
    }

    // BossWhenItCounts is inherently playoffs (week playoff_week_start+2)
    // If caller excludes playoffs, return empty/default.
    const targetWeek = data.settings.playoff_week_start + 2;
    if (!weekIsIncluded(data, targetWeek, includeRegularSeason, includePlayoffs)) return [new SidebetStat()];

    return this.MostPointsInWeek(data, targetWeek);
  }

  static ComingInHot(
    data: LeagueData,
    includeRegularSeason: boolean = true,
    includePlayoffs: boolean = false
  ): SidebetStat[] {
    // Week 1 is regular season; if caller excludes regular season, return empty/default
    if (!weekIsIncluded(data, 1, includeRegularSeason, includePlayoffs)) return [new SidebetStat()];
    return this.MostPointsInWeek(data, 1);
  }

  static MostPointsInWeek(data: LeagueData, week: number): SidebetStat[] {
    const orderedSidebets: SidebetStat[] = [];

    const matchupInfo = data.matchupInfo[week - 1];
    if (!matchupInfo) return orderedSidebets;

    matchupInfo.matchups.forEach((matchup: Matchup) => {
      const sidebetStat: SidebetStat = new SidebetStat();
      sidebetStat.user = findUserByRosterId(matchup.roster_id, data);
      sidebetStat.stat_number = matchup.points;
      sidebetStat.stats_display = matchup.points.toFixed(2);
      orderedSidebets.push(sidebetStat);
    });

    orderedSidebets.sort((a, b) => (a.stat_number && b.stat_number ? b.stat_number - a.stat_number : 100));
    return orderedSidebets;
  }

  // ===========================================================================
  // WAFFLE (record-based, not using matchup loop here)
  // ===========================================================================

  static Waffle(data: LeagueData): SidebetStat[] {
    const orderedSidebets: SidebetStat[] = [];

    data.users.forEach((user: SleeperUser) => {
      let winsSum = 0;
      let lossesSum = 0;
      let tiesSum = 0;

      [winsSum, lossesSum, tiesSum] = getLeagueRecordAtSchedule(user, data);

      const sidebetStat: SidebetStat = new SidebetStat();
      sidebetStat.user = user;
      sidebetStat.stats_record = { wins: winsSum, losses: lossesSum, ties: tiesSum };
      sidebetStat.stats_display = sidebetStat.DisplayRecord();
      orderedSidebets.push(sidebetStat);
    });

    orderedSidebets.sort((a, b) =>
      a.stats_record && b.stats_record ? a.stats_record.wins - b.stats_record.wins : 1000
    );
    return orderedSidebets;
  }

  // ===========================================================================
  // BETTER LUCKY THAN GOOD
  // ===========================================================================

  static BetterLuckyThanGood(
    data: LeagueData,
    includeRegularSeason: boolean = true,
    includePlayoffs: boolean = false
  ): SidebetStat[] {
    const orderedSidebets: SidebetStat[] = [];
    data.users.forEach((user) => {
      orderedSidebets.push(this.UserBetterLuckyThanGood(data, user, includeRegularSeason, includePlayoffs));
    });

    orderedSidebets.sort((a, b) => (a.stat_number && b.stat_number ? a.stat_number - b.stat_number : 100));
    return orderedSidebets;
  }

  static UserBetterLuckyThanGood(
    data: LeagueData,
    user: SleeperUser,
    includeRegularSeason: boolean = true,
    includePlayoffs: boolean = false
  ): SidebetStat {
    let betterLuckyThanGoodTotal = 200;
    let points = 0;
    let opponentPoints = 0;
    let week = 0;
    let opponent = '';

    const rosterId: number = data.rosters.find((r) => r.owner_id === user.user_id)?.roster_id || 0;

    const relevantMatchups = getRelevantMatchups(data, includeRegularSeason, includePlayoffs, true);

    relevantMatchups.forEach((matchupInfo) => {
      // Preserve your original “don’t include current week” logic for current season:
      if (data.nflSeasonInfo.season === data.season && matchupInfo.week === data.nflSeasonInfo.week) return;

      const matchup = matchupInfo.matchups.find((m) => m.roster_id === rosterId);
      const opponentMatchup = matchupInfo.matchups.find(
        (m) => m.matchup_id === matchup?.matchup_id && m.roster_id !== rosterId
      );

      if (!matchup) return;
      if (isPlayoffByeWeek(data, matchupInfo.week, opponentMatchup)) return;
      if (!opponentMatchup) return;

      // BetterLuckyThanGood: smallest winning score (still a win)
      if (matchup.points > opponentMatchup.points) {
        if (matchup.points < betterLuckyThanGoodTotal) {
          week = matchupInfo.week;
          betterLuckyThanGoodTotal = matchup.points;
          opponent = findUserByRosterId(opponentMatchup.roster_id, data)?.metadata.team_name || '';
          points = matchup.points;
          opponentPoints = opponentMatchup.points;
        }
      }
    });

    const sidebetStat: SidebetStat = new SidebetStat();
    sidebetStat.user = user;
    sidebetStat.stat_number = betterLuckyThanGoodTotal;
    sidebetStat.stats_display =
      betterLuckyThanGoodTotal.toFixed(2) +
      ' during week ' +
      week +
      ' against ' +
      opponent +
      ': ' +
      points +
      ' - ' +
      opponentPoints;

    return sidebetStat;
  }

  // ===========================================================================
  // JUGGERNAUT
  // ===========================================================================

  static Juggernaut(
    data: LeagueData,
    includeRegularSeason: boolean = true,
    includePlayoffs: boolean = false
  ): SidebetStat[] {
    const orderedSidebets: SidebetStat[] = [];
    data.users.forEach((user) => {
      orderedSidebets.push(this.UserJuggernaut(data, user, includeRegularSeason, includePlayoffs));
    });

    orderedSidebets.sort((a, b) => (a.stat_number && b.stat_number ? b.stat_number - a.stat_number : 0));
    return orderedSidebets;
  }

  static UserJuggernaut(
    data: LeagueData,
    user: SleeperUser,
    includeRegularSeason: boolean = true,
    includePlayoffs: boolean = false
  ): SidebetStat {
    let juggernautTotal = 0;
    let points = 0;
    let opponentPoints = 0;
    let week = 0;
    let opponent = '';

    const rosterId: number = data.rosters.find((r) => r.owner_id === user.user_id)?.roster_id || 0;

    const relevantMatchups = getRelevantMatchups(data, includeRegularSeason, includePlayoffs, true);

    relevantMatchups.forEach((matchupInfo) => {
      const matchup = matchupInfo.matchups.find((m) => m.roster_id === rosterId);
      const opponentMatchup = matchupInfo.matchups.find(
        (m) => m.matchup_id === matchup?.matchup_id && m.roster_id !== rosterId
      );

      if (!matchup) return;
      if (isPlayoffByeWeek(data, matchupInfo.week, opponentMatchup)) return;
      if (!opponentMatchup) return;

      if (matchup.points > juggernautTotal) {
        week = matchupInfo.week;
        juggernautTotal = matchup.points;
        opponent = findUserByRosterId(opponentMatchup.roster_id, data)?.metadata.team_name || '';
        points = matchup.points;
        opponentPoints = opponentMatchup.points;
      }
    });

    const sidebetStat: SidebetStat = new SidebetStat();
    sidebetStat.user = user;
    sidebetStat.stat_number = juggernautTotal;
    sidebetStat.stats_display =
      juggernautTotal.toFixed(2) +
      ' during week ' +
      week +
      ' against ' +
      opponent +
      ': ' +
      points +
      ' - ' +
      opponentPoints;

    return sidebetStat;
  }

  // ===========================================================================
  // MAYBE NEXT TIME
  // ===========================================================================

  static MaybeNextTime(
    data: LeagueData,
    includeRegularSeason: boolean = true,
    includePlayoffs: boolean = false
  ): SidebetStat[] {
    const orderedSidebets: SidebetStat[] = [];
    data.users.forEach((user) => {
      orderedSidebets.push(this.UserMaybeNextTime(data, user, includeRegularSeason, includePlayoffs));
    });

    orderedSidebets.sort((a, b) => (a.stat_number && b.stat_number ? b.stat_number - a.stat_number : 0));
    return orderedSidebets;
  }

  static UserMaybeNextTime(
    data: LeagueData,
    user: SleeperUser,
    includeRegularSeason: boolean = true,
    includePlayoffs: boolean = false
  ): SidebetStat {
    let maybeNextTimeTotal = 0;
    let points = 0;
    let opponentPoints = 0;
    let week = 0;
    let opponent = '';

    const rosterId: number = data.rosters.find((r) => r.owner_id === user.user_id)?.roster_id || 0;

    const relevantMatchups = getRelevantMatchups(data, includeRegularSeason, includePlayoffs, true);

    relevantMatchups.forEach((matchupInfo) => {
      const matchup = matchupInfo.matchups.find((m) => m.roster_id === rosterId);
      const opponentMatchup = matchupInfo.matchups.find(
        (m) => m.matchup_id === matchup?.matchup_id && m.roster_id !== rosterId
      );

      if (!matchup) return;
      if (isPlayoffByeWeek(data, matchupInfo.week, opponentMatchup)) return;
      if (!opponentMatchup) return;

      if (matchup.points < opponentMatchup.points) {
        if (matchup.points > maybeNextTimeTotal) {
          week = matchupInfo.week;
          maybeNextTimeTotal = matchup.points;
          opponent = findUserByRosterId(opponentMatchup.roster_id, data)?.metadata.team_name || '';
          points = matchup.points;
          opponentPoints = opponentMatchup.points;
        }
      }
    });

    const sidebetStat: SidebetStat = new SidebetStat();
    sidebetStat.user = user;
    sidebetStat.stat_number = maybeNextTimeTotal;
    sidebetStat.stats_display =
      maybeNextTimeTotal.toFixed(2) +
      ' during week ' +
      week +
      ' against ' +
      opponent +
      ': ' +
      points +
      ' - ' +
      opponentPoints;

    return sidebetStat;
  }

  // ===========================================================================
  // GET WRECKD
  // ===========================================================================

  static GetWreckd(
    data: LeagueData,
    includeRegularSeason: boolean = true,
    includePlayoffs: boolean = false
  ): SidebetStat[] {
    const orderedSidebets: SidebetStat[] = [];
    data.users.forEach((user) => {
      orderedSidebets.push(this.UserGetWreckd(data, user, includeRegularSeason, includePlayoffs));
    });

    orderedSidebets.sort((a, b) => (a.stat_number && b.stat_number ? b.stat_number - a.stat_number : 0));
    return orderedSidebets;
  }

  static UserGetWreckd(
    data: LeagueData,
    user: SleeperUser,
    includeRegularSeason: boolean = true,
    includePlayoffs: boolean = false
  ): SidebetStat {
    let getWreckdTotal = 0;
    let points = 0;
    let opponentPoints = 0;
    let week = 0;
    let opponent = '';

    const rosterId: number = data.rosters.find((r) => r.owner_id === user.user_id)?.roster_id || 0;

    const relevantMatchups = getRelevantMatchups(data, includeRegularSeason, includePlayoffs, true);

    relevantMatchups.forEach((matchupInfo) => {
      const matchup = matchupInfo.matchups.find((m) => m.roster_id === rosterId);
      const opponentMatchup = matchupInfo.matchups.find(
        (m) => m.matchup_id === matchup?.matchup_id && m.roster_id !== rosterId
      );

      if (!matchup) return;
      if (isPlayoffByeWeek(data, matchupInfo.week, opponentMatchup)) return;
      if (!opponentMatchup) return;

      if (matchup.points > opponentMatchup.points) {
        const difference = matchup.points - opponentMatchup.points;
        if (difference > getWreckdTotal) {
          week = matchupInfo.week;
          getWreckdTotal = difference;
          opponent = findUserByRosterId(opponentMatchup.roster_id, data)?.metadata.team_name || '';
          points = matchup.points;
          opponentPoints = opponentMatchup.points;
        }
      }
    });

    const sidebetStat: SidebetStat = new SidebetStat();
    sidebetStat.user = user;
    sidebetStat.stat_number = getWreckdTotal;
    sidebetStat.stats_display =
      getWreckdTotal.toFixed(2) +
      ' during week ' +
      week +
      ' against ' +
      opponent +
      ': ' +
      points +
      ' - ' +
      opponentPoints;

    return sidebetStat;
  }

  // ===========================================================================
  // CHARGER
  // ===========================================================================

  static Charger(
    data: LeagueData,
    includeRegularSeason: boolean = true,
    includePlayoffs: boolean = false
  ): SidebetStat[] {
    const orderedSidebets: SidebetStat[] = [];
    data.users.forEach((user) => {
      orderedSidebets.push(this.UserCharger(data, user, includeRegularSeason, includePlayoffs));
    });

    orderedSidebets.sort((a, b) => (b.stat_number || 0) - (a.stat_number || 0));
    return orderedSidebets;
  }

  static UserCharger(
    data: LeagueData,
    user: SleeperUser,
    includeRegularSeason: boolean = true,
    includePlayoffs: boolean = false
  ): SidebetStat {
    let chargerTotal = 0;
    let weeks10 = '';
    let weeks5 = '';
    let weeks1 = '';

    const rosterId: number = data.rosters.find((r) => r.owner_id === user.user_id)?.roster_id || 0;

    const relevantMatchups = getRelevantMatchups(data, includeRegularSeason, includePlayoffs, true);

    relevantMatchups.forEach((matchupInfo) => {
      const matchup = matchupInfo.matchups.find((m) => m.roster_id === rosterId);
      const opponentMatchup = matchupInfo.matchups.find(
        (m) => m.matchup_id === matchup?.matchup_id && m.roster_id !== rosterId
      );

      if (!matchup) return;
      if (isPlayoffByeWeek(data, matchupInfo.week, opponentMatchup)) return;
      if (!opponentMatchup) return;

      if (matchup.points < opponentMatchup.points) {
        const difference = opponentMatchup.points - matchup.points;

        if (difference < 1) {
          if (weeks1 !== '') weeks1 += ', ';
          weeks1 += matchupInfo.week;
          chargerTotal += 3;
        } else if (difference < 5) {
          if (weeks5 !== '') weeks5 += ', ';
          weeks5 += matchupInfo.week;
          chargerTotal += 2;
        } else if (difference < 10) {
          if (weeks10 !== '') weeks10 += ', ';
          weeks10 += matchupInfo.week;
          chargerTotal += 1;
        }
      }
    });

    const sidebetStat: SidebetStat = new SidebetStat();
    sidebetStat.user = user;
    sidebetStat.stat_number = chargerTotal;
    sidebetStat.stats_display = chargerTotal.toFixed(0);

    if (weeks1 !== '' || weeks5 !== '' || weeks10 !== '') sidebetStat.stats_display += ' - ';
    if (weeks1 !== '') sidebetStat.stats_display += ' <1 week(s): ' + weeks1;
    if (weeks5 !== '') sidebetStat.stats_display += ' <5 week(s): ' + weeks5;
    if (weeks10 !== '') sidebetStat.stats_display += ' <10 week(s): ' + weeks10;

    return sidebetStat;
  }

  // ===========================================================================
  // VIKING
  // ===========================================================================

  static Viking(
    data: LeagueData,
    includeRegularSeason: boolean = true,
    includePlayoffs: boolean = false
  ): SidebetStat[] {
    const orderedSidebets: SidebetStat[] = [];
    data.users.forEach((user) => {
      orderedSidebets.push(this.UserViking(data, user, includeRegularSeason, includePlayoffs));
    });

    orderedSidebets.sort((a, b) => (b.stat_number || 0) - (a.stat_number || 0));
    return orderedSidebets;
  }

  static UserViking(
    data: LeagueData,
    user: SleeperUser,
    includeRegularSeason: boolean = true,
    includePlayoffs: boolean = false
  ): SidebetStat {
    let vikingTotal = 0;
    let weeks10 = '';
    let weeks5 = '';
    let weeks1 = '';

    const rosterId: number = data.rosters.find((r) => r.owner_id === user.user_id)?.roster_id || 0;

    const relevantMatchups = getRelevantMatchups(data, includeRegularSeason, includePlayoffs, true);

    relevantMatchups.forEach((matchupInfo) => {
      const matchup = matchupInfo.matchups.find((m) => m.roster_id === rosterId);
      const opponentMatchup = matchupInfo.matchups.find(
        (m) => m.matchup_id === matchup?.matchup_id && m.roster_id !== rosterId
      );

      if (!matchup) return;
      if (isPlayoffByeWeek(data, matchupInfo.week, opponentMatchup)) return;
      if (!opponentMatchup) return;

      if (matchup.points > opponentMatchup.points) {
        const difference = matchup.points - opponentMatchup.points;

        if (difference < 1) {
          if (weeks1 !== '') weeks1 += ', ';
          weeks1 += matchupInfo.week;
          vikingTotal += 3;
        } else if (difference < 5) {
          if (weeks5 !== '') weeks5 += ', ';
          weeks5 += matchupInfo.week;
          vikingTotal += 2;
        } else if (difference < 10) {
          if (weeks10 !== '') weeks10 += ', ';
          weeks10 += matchupInfo.week;
          vikingTotal += 1;
        }
      }
    });

    const sidebetStat: SidebetStat = new SidebetStat();
    sidebetStat.user = user;
    sidebetStat.stat_number = vikingTotal;
    sidebetStat.stats_display = vikingTotal.toFixed(0);

    if (weeks1 !== '' || weeks5 !== '' || weeks10 !== '') sidebetStat.stats_display += ' - ';
    if (weeks1 !== '') sidebetStat.stats_display += ' <1 week(s): ' + weeks1;
    if (weeks5 !== '') sidebetStat.stats_display += ' <5 week(s): ' + weeks5;
    if (weeks10 !== '') sidebetStat.stats_display += ' <10 week(s): ' + weeks10;

    return sidebetStat;
  }

  // ===========================================================================
  // JAMARCUS + UNDERPERFORMER (async; leave behavior, add flags where it loops matchups)
  // ===========================================================================

  static async JamarcusRussel(data: LeagueData): Promise<SidebetStat[]> {
    const jamarcusStats = await Promise.all(data.users.map((user) => this.JamarcusRusselUser(data, user)));

    const validStats = jamarcusStats.filter((stat): stat is SidebetStat => stat !== undefined);

    validStats.sort((a, b) =>
      a.stat_number !== undefined && b.stat_number !== undefined ? a.stat_number - b.stat_number : 0
    );

    return validStats;
  }

  static async JamarcusRusselUser(data: LeagueData, user: SleeperUser): Promise<SidebetStat | undefined> {
    const season = data.season;
    const userSleeperId = user.user_id;

    const yearDataEntry = yearTrollData.find((yd) => yd.year === Number.parseFloat(season));
    if (!yearDataEntry) {
      console.warn(`No yearTrollData found for season ${season}.`);
      return undefined;
    }

    const playerDataEntry = yearDataEntry.data.find((pd: any) => pd.sleeper_id === userSleeperId);
    if (!playerDataEntry) {
      console.warn(`No data found for user ${userSleeperId} in season ${season}.`);
      return undefined;
    }

    const playerId = playerDataEntry.first_round_draft_pick_sleeper_id;
    if (!playerId) {
      console.warn(`No first round draft pick ID for user ${userSleeperId} in season ${season}.`);
      return undefined;
    }

    try {
      const response = await fetch(
        `https://api.sleeper.com/stats/nfl/player/${playerId}?season_type=regular&season=${season}`
      );

      if (!response.ok) {
        console.error(`Failed to fetch player stats for player ID ${playerId}: HTTP ${response.status}`);
        return undefined;
      }

      const playerStat = await response.json();

      if (!playerStat || !playerStat.stats?.pts_half_ppr) {
        console.warn(`No valid stats found for player ID ${playerId} in season ${season}.`);
        return undefined;
      }

      const halfPPRPoints = playerStat.stats.pts_half_ppr;
      const playerName = `${playerStat.player.first_name} ${playerStat.player.last_name}`;

      const sidebetStat: SidebetStat = new SidebetStat();
      sidebetStat.user = user;
      sidebetStat.stat_number = halfPPRPoints;
      sidebetStat.stats_display = `${playerName} (Half PPR Points: ${halfPPRPoints})`;

      return sidebetStat;
    } catch (error) {
      console.error(`Error fetching player stats for user ${userSleeperId} and player ID ${playerId}:`, error);
      return undefined;
    }
  }

  static async Underperformer(
    data: LeagueData,
    includeRegularSeason: boolean = true,
    includePlayoffs: boolean = false
  ): Promise<SidebetStat[]> {
    const underperformerStats = await Promise.all(
      data.users.map((user) => this.UserUnderperformer(data, user, includeRegularSeason, includePlayoffs))
    );

    const validStats = underperformerStats.filter((stat): stat is SidebetStat => stat !== undefined);

    validStats.sort((a, b) =>
      a.stat_number !== undefined && b.stat_number !== undefined ? a.stat_number - b.stat_number : 0
    );

    return validStats;
  }

  static async UserUnderperformer(
    data: LeagueData,
    user: SleeperUser,
    includeRegularSeason: boolean = true,
    includePlayoffs: boolean = false
  ): Promise<SidebetStat | undefined> {
    let currentDifference = 0;
    let matchupFound = false;

    const teamRosterId: number = findRosterByUserId(user.user_id, data.rosters)?.roster_id ?? 0;

    const relevantMatchups = getRelevantMatchups(data, includeRegularSeason, includePlayoffs, true).filter((m) =>
      m.matchups.some((x) => x.roster_id === teamRosterId)
    );

    for (const matchup of relevantMatchups) {
      const teamMatchup: Matchup | undefined = matchup.matchups.find((m) => m.roster_id === teamRosterId);
      const oppMatchup: Matchup | undefined = matchup.matchups.find(
        (m) => m.matchup_id === teamMatchup?.matchup_id && m.roster_id !== teamMatchup?.roster_id
      );

      if (!teamMatchup) continue;
      if (isPlayoffByeWeek(data, matchup.week, oppMatchup)) continue;

      matchupFound = true;

      const projectedPoints = await projectedPointsInWeek(user, matchup.week, data);
      currentDifference += teamMatchup.points - projectedPoints;
    }

    const sidebetStat: SidebetStat = new SidebetStat();
    sidebetStat.user = user;

    if (matchupFound) {
      currentDifference = parseFloat(currentDifference.toFixed(2));

      if (currentDifference !== 0) {
        sidebetStat.stat_number = currentDifference;
        if (currentDifference > 0) {
          sidebetStat.stats_display = `${user.metadata.team_name} was above projection by ${currentDifference}`;
        } else {
          const abs = currentDifference * -1;
          sidebetStat.stats_display = `${user.metadata.team_name} was below projection by ${abs}`;
        }
      } else {
        sidebetStat.stats_display = `Somehow ${user.metadata.team_name} exactly met their projection`;
      }
    } else {
      sidebetStat.stat_number = 0;
      sidebetStat.stats_display = 'Something went wrong';
    }

    return sidebetStat;
  }

  // ===========================================================================
  // SET AND FORGET + BELT + PARTICIPATION RIBBON (leave as-is)
  // ===========================================================================

  static SetAndForgetWinner(data: LeagueData): SidebetStat[] {
    const orderedSidebets: SidebetStat[] = [];

    const currentYearData = yearData.find((d) => d.year.toString() === data.season);
    if (currentYearData) {
      const leagueData = currentYearData.data[0];

      const winnerId = leagueData.set_and_forget_winner_id;
      const loserId = leagueData.set_and_forget_loser_id;

      const winner_user = data.users.find((user) => user.user_id === winnerId);
      const loser_user = data.users.find((user) => user.user_id === loserId);

      if (winner_user && loser_user) {
        const sidebetStat: SidebetStat = new SidebetStat();
        sidebetStat.user = winner_user;

        const winnerPoints =
          leagueData.set_and_forget_winner_points === '' || leagueData.set_and_forget_winner_points === undefined
            ? 0
            : Number(leagueData.set_and_forget_winner_points);

        const loserPoints =
          leagueData.set_and_forget_loser_points === '' || leagueData.set_and_forget_loser_points === undefined
            ? 0
            : Number(leagueData.set_and_forget_loser_points);

        sidebetStat.stat_number = winnerPoints;
        sidebetStat.stats_display = `${winner_user.metadata.team_name} defeated ${loser_user.metadata.team_name}:
        ${winnerPoints} - ${loserPoints}`;

        orderedSidebets.push(sidebetStat);
      }
    }

    return orderedSidebets;
  }

  static Belt(data: LeagueData): SidebetStat[] {
    const orderedSidebets: SidebetStat[] = [];
    let statDisplay = '';

    let lastWeek = 0;
    if (data.nflSeasonInfo.season === data.season && data.nflSeasonInfo.season_type !== 'post') {
      lastWeek = Math.min(data.nflSeasonInfo.week, data.settings.playoff_week_start);
    } else {
      lastWeek = data.settings.playoff_week_start;
    }

    const currentYearData = yearData.find((d) => d.year.toString() === data.season);
    if (currentYearData) {
      const leagueData = currentYearData.data[0];
      let currentBeltOwnerId = leagueData.belt_starter_id;
      let currentBeltOwner: SleeperUser | undefined = data.users.find((user) => user.user_id === currentBeltOwnerId);

      for (let week = 1; week < lastWeek; week++) {
        const matchup: MatchupInfo | null = data.matchupInfo.find((m) => m.week === week) ?? null;
        if (!matchup) continue;

        const teamRosterId = findRosterByUserId(currentBeltOwnerId, data.rosters)?.roster_id;
        const teamMatchup = matchup.matchups.find((m) => m.roster_id === teamRosterId);
        const oppMatchup = matchup.matchups.find(
          (m) => m.matchup_id === teamMatchup?.matchup_id && m.roster_id !== teamMatchup?.roster_id
        );

        if (teamMatchup && oppMatchup) {
          if (week !== 1) statDisplay += '<br>';
          const oppUser = findUserByRosterId(oppMatchup.roster_id, data);
          statDisplay += `Week ${week}: ${currentBeltOwner?.metadata.team_name} ${teamMatchup.points} -
            ${oppUser?.metadata.team_name} ${oppMatchup.points}`;

          if (teamMatchup.points < oppMatchup.points) {
            currentBeltOwnerId = oppUser?.user_id ?? currentBeltOwnerId;
            currentBeltOwner = oppUser;
          }
        }
      }

      const sidebetStat: SidebetStat = new SidebetStat();
      sidebetStat.user = currentBeltOwner;
      sidebetStat.stats_display = statDisplay;
      orderedSidebets.push(sidebetStat);
    }

    return orderedSidebets;
  }

  static ParticipationRibbon(data: LeagueData): SidebetStat[] {
    const orderedSidebets: SidebetStat[] = [];

    const [user1, , winnerString] = getBowlWinner('Toilet Bowl', data);
    const sidebetStat: SidebetStat = new SidebetStat();
    sidebetStat.user = user1;
    sidebetStat.stat_number = 7;
    sidebetStat.stats_display = winnerString;
    orderedSidebets.push(sidebetStat);

    return orderedSidebets;
  }

  // ===========================================================================
  // POINTS AGAINST BY POSITION (now supports reg/playoffs + bye skip)
  // ===========================================================================

  static UserPointsAgainstByPosition(
    position: string,
    user: SleeperUser,
    data: LeagueData,
    acc?: PositionAgainstAccumulator,
    includeRegularSeason: boolean = true,
    includePlayoffs: boolean = false
  ): number {
    let pointsAgainstByPosition = 0;
    const teamRosterId = findRosterByUserId(user.user_id, data.rosters)?.roster_id;

    const relevantMatchups = getRelevantMatchups(data, includeRegularSeason, includePlayoffs, true);
    const year = Number.parseInt(data.season);

    relevantMatchups.forEach((matchup) => {
      const teamMatchup = matchup.matchups.find((m) => m.roster_id === teamRosterId);
      const oppMatchup = matchup.matchups.find(
        (m) => m.matchup_id === teamMatchup?.matchup_id && m.roster_id !== teamMatchup?.roster_id
      );

      if (!teamMatchup) return;
      if (isPlayoffByeWeek(data, matchup.week, oppMatchup)) return;
      if (!oppMatchup) return;

      for (let i = 0; i < oppMatchup.starters.length; i++) {
        const playerId = oppMatchup.starters[i];
        const pts = oppMatchup.starters_points[i] ?? 0;

        if (!(playerId in playerData)) continue;

        const p = (playerData as Record<string, any>)[playerId];
        const fantasyPositions: string[] = p.fantasy_positions || [];
        if (!fantasyPositions.includes(position)) continue;

        pointsAgainstByPosition += pts;

        if (acc) {
          const playerName = `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || String(playerId);
          acc.details.push({
            year: Number.isFinite(year) ? year : 0,
            week: matchup.week,
            playerName,
            points: pts,
          });
        }
      }
    });

    return pointsAgainstByPosition;
  }

  static SortedPointsAgainstByPosition(
    position: string,
    data: LeagueData,
    includeRegularSeason: boolean = true,
    includePlayoffs: boolean = false
  ): SidebetStat[] {
    const orderedSidebets: SidebetStat[] = [];

    data.rosters.forEach((roster: SleeperRoster) => {
      const sidebetStat: SidebetStat = new SidebetStat();
      sidebetStat.user = data.users.find((u) => u.user_id === roster.owner_id);
      if (sidebetStat.user) {
        sidebetStat.stat_number = this.UserPointsAgainstByPosition(
          position,
          sidebetStat.user,
          data,
          undefined,
          includeRegularSeason,
          includePlayoffs
        );
        sidebetStat.stats_display = (sidebetStat.stat_number).toFixed(2);
        orderedSidebets.push(sidebetStat);
      }
    });

    orderedSidebets.sort((a, b) => (a.stat_number && b.stat_number ? b.stat_number - a.stat_number : 100));
    return orderedSidebets;
  }

  static ConnarEffect(
    data: LeagueData,
    includeRegularSeason: boolean = true,
    includePlayoffs: boolean = false
  ): SidebetStat[] {
    return this.SortedPointsAgainstByPosition('QB', data, includeRegularSeason, includePlayoffs);
  }

  static GetRunOver(
    data: LeagueData,
    includeRegularSeason: boolean = true,
    includePlayoffs: boolean = false
  ): SidebetStat[] {
    return this.SortedPointsAgainstByPosition('RB', data, includeRegularSeason, includePlayoffs);
  }

  static ReceivingLosses(
    data: LeagueData,
    includeRegularSeason: boolean = true,
    includePlayoffs: boolean = false
  ): SidebetStat[] {
    return this.SortedPointsAgainstByPosition('WR', data, includeRegularSeason, includePlayoffs);
  }

  static KilledByATightEnd(
    data: LeagueData,
    includeRegularSeason: boolean = true,
    includePlayoffs: boolean = false
  ): SidebetStat[] {
    return this.SortedPointsAgainstByPosition('TE', data, includeRegularSeason, includePlayoffs);
  }

  static KickedInDaBallz(
    data: LeagueData,
    includeRegularSeason: boolean = true,
    includePlayoffs: boolean = false
  ): SidebetStat[] {
    return this.SortedPointsAgainstByPosition('K', data, includeRegularSeason, includePlayoffs);
  }

  static BlueBalls(
    data: LeagueData,
    includeRegularSeason: boolean = true,
    includePlayoffs: boolean = false
  ): SidebetStat[] {
    return this.SortedPointsAgainstByPosition('DEF', data, includeRegularSeason, includePlayoffs);
  }

  // ===========================================================================
  // BEST BAD RECEIVER (unchanged)
  // ===========================================================================

  static async BestBadReceiver(data: LeagueData): Promise<SidebetStat[]> {
    const badReceiverStats = await Promise.all(data.users.map((user) => this.UserBestBadReceiver(data, user)));

    const validStats = badReceiverStats.filter((stat): stat is SidebetStat => stat !== undefined);

    validStats.sort((a, b) =>
      a.stat_number !== undefined && b.stat_number !== undefined ? b.stat_number - a.stat_number : 0
    );

    return validStats;
  }

  static async UserBestBadReceiver(data: LeagueData, user: SleeperUser): Promise<SidebetStat | undefined> {
    const currentSeason = data.season;
    const userSleeperId = user.user_id;

    const yearDataEntry = yearTrollData.find((yd) => yd.year === Number.parseFloat(currentSeason));
    if (!yearDataEntry) {
      console.warn(`No yearTrollData found for season ${currentSeason}.`);
      return undefined;
    }

    const playerDataEntry = yearDataEntry.data.find((pd: any) => pd.sleeper_id === userSleeperId);
    if (!playerDataEntry) {
      console.warn(`No helmet master data found for user ${user.user_id} in season ${currentSeason}.`);
      return undefined;
    }

    const receiverId: string = playerDataEntry.HM_4th_string_sleeper_id.toString();
    if (receiverId === '') return undefined;

    const apiUrl = `https://api.sleeper.com/stats/nfl/player/${receiverId}?season_type=regular&season=${currentSeason}`;
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        console.error(`Failed to fetch player stats: ${response.statusText}`);
        return undefined;
      }

      const playerYearStats: PlayerYearStats = await response.json();
      const points = playerYearStats.stats.pts_half_ppr;

      const sidebetStat: SidebetStat = new SidebetStat();
      sidebetStat.user = user;
      sidebetStat.stat_number = points || 0;
      sidebetStat.stats_display = `${playerYearStats.player.first_name} ${playerYearStats.player.last_name} with ${points} half-PPR points`;

      return sidebetStat;
    } catch (error) {
      console.error('Error fetching player stats');
      return undefined;
    }
  }

  // ===========================================================================
  // TEMPLATE
  // ===========================================================================

  static NewStatTemplate(data: LeagueData): SidebetStat[] {
    const orderedSidebets: SidebetStat[] = [];
    return orderedSidebets;
  }
}

export default SidebetMethods;
