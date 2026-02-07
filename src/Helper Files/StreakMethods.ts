import LeagueData from '../Interfaces/LeagueData';
import SleeperRoster from '../Interfaces/SleeperRoster';
import { findRosterByUserId } from './HelperMethods';

export type StreakType = 'win' | 'loss';

type WeekOutcome = 'W' | 'L' | 'T';

export interface StreakRangePoint {
  year: number;
  week: number;
  label: string; // "week 8, 2014"
}

export interface Streak {
  length: number; // number of weeks
  start: StreakRangePoint;
  end: StreakRangePoint;
}

export interface StreakWeekDetail {
  year: number;
  week: number;
  teamScore: number;
  opponentScore: number;
  outcome: 'W' | 'L' | 'T';
}

interface WeekResult {
  year: number;
  week: number;
  outcome: WeekOutcome;
  myPoints: number;
  oppPoints: number;
}

const formatWeekLabel = (week: number, year: number) => `week ${week}, ${year}`;
const getCurrentYear = (): string => new Date().getFullYear().toString();

/**
 * Builds a chronological list of week outcomes (W/L/T) for the given user across all seasons.
 * - Uses data.matchupInfo like your calculateScheduleRecord.
 * - Only counts regular season (week < playoff_week_start).
 * - Excludes in-progress current season weeks (week < nflSeasonInfo.week) using the same pattern you already use.
 */
function buildUserWeekResults(userId: string, leagues: LeagueData[]): WeekResult[] {
  const currentYear = getCurrentYear();

  const seasons = [...leagues]
    .filter(l => l.season !== currentYear)
    .sort((a, b) => Number(a.season) - Number(b.season));

  const results: WeekResult[] = [];

  for (const league of seasons) {
    if (!league.matchupInfo) continue;

    const roster = findRosterByUserId(userId, league.rosters) as SleeperRoster | undefined;
    const rosterId = (roster as any)?.roster_id;

    // IMPORTANT: rosterId can be 0; only skip if null/undefined
    if (rosterId === undefined || rosterId === null) continue;

    const year = Number(league.season);

    const inProgressSeason =
      league.nflSeasonInfo?.season === league.season &&
      league.nflSeasonInfo?.season_type !== 'post';

    const relevantMatchups = league.matchupInfo.filter((matchup: any) => {
      const isRegularSeason = matchup.week < league.settings.playoff_week_start;
      if (!isRegularSeason) return false;

      if (inProgressSeason) {
        return matchup.week < league.nflSeasonInfo.week;
      }

      return true;
    });

    relevantMatchups.sort((a: any, b: any) => a.week - b.week);

    relevantMatchups.forEach((matchup: any) => {
      const my = matchup.matchups.find((m: any) => m.roster_id === rosterId);
      if (!my) return;

      const opp = matchup.matchups.find(
        (m: any) => m.matchup_id === my.matchup_id && m.roster_id !== my.roster_id
      );
      if (!opp) return;

      const myPts = Number(my.points) || 0;
      const oppPts = Number(opp.points) || 0;

      let outcome: WeekOutcome = 'T';
      if (myPts > oppPts) outcome = 'W';
      else if (myPts < oppPts) outcome = 'L';
      else outcome = 'T'; // ties break streak

      results.push({ year, week: matchup.week, outcome, myPoints: myPts, oppPoints: oppPts });
    });
  }

  results.sort((a, b) => a.year - b.year || a.week - b.week);
  return results;
}

/**
 * Returns all longest win/loss streaks for a user across ALL years.
 * - Streaks carry across years: (year,lastRegularSeasonWeek) -> (nextYear,1)
 * - Ties break streaks.
 * - Gaps break streaks.
 */
export function getUserLongestStreak(
  userId: string,
  type: StreakType,
  leagues: LeagueData[]
): Streak[] {
  const weekly = buildUserWeekResults(userId, leagues);
  if (weekly.length === 0) return [];

  const target: WeekOutcome = type === 'win' ? 'W' : 'L';

  // Safer than "last week seen for this user":
  // use league.settings.playoff_week_start - 1 as the last regular season week for that year.
  const lastRegularWeekByYear = new Map<number, number>();
  for (const league of leagues) {
    const y = Number(league.season);
    const last = (league.settings?.playoff_week_start ?? 0) - 1;
    if (last > 0) lastRegularWeekByYear.set(y, last);
  }

  const isConsecutive = (prev: WeekResult, next: WeekResult): boolean => {
    if (prev.year === next.year) return next.week === prev.week + 1;

    if (next.year === prev.year + 1) {
      const lastPrev = lastRegularWeekByYear.get(prev.year);
      return lastPrev !== undefined && prev.week === lastPrev && next.week === 1;
    }

    return false;
  };

  let maxLen = 0;
  let best: Streak[] = [];

  let curLen = 0;
  let curStart: { year: number; week: number } | null = null;
  let curEnd: { year: number; week: number } | null = null;

  const finalize = () => {
    if (!curStart || !curEnd || curLen <= 0) return;

    const streak: Streak = {
      length: curLen,
      start: { ...curStart, label: formatWeekLabel(curStart.week, curStart.year) },
      end: { ...curEnd, label: formatWeekLabel(curEnd.week, curEnd.year) },
    };

    if (curLen > maxLen) {
      maxLen = curLen;
      best = [streak];
    } else if (curLen === maxLen && maxLen > 0) {
      best.push(streak);
    }
  };

  for (let i = 0; i < weekly.length; i++) {
    const r = weekly[i];
    const prev = i > 0 ? weekly[i - 1] : null;

    if (prev && !isConsecutive(prev, r)) {
      finalize();
      curLen = 0;
      curStart = null;
      curEnd = null;
    }

    if (r.outcome === target) {
      if (curLen === 0) curStart = { year: r.year, week: r.week };
      curLen++;
      curEnd = { year: r.year, week: r.week };
    } else {
      finalize();
      curLen = 0;
      curStart = null;
      curEnd = null;
    }
  }

  finalize();
  return best;
}

/**
 * Returns the user's current active streak (win or loss).
 * - Only looks at completed seasons + completed weeks of in-progress season
 * - Returns null if no streak exists, or if the most recent game was a tie
 */
export function getCurrentStreak(userId: string, leagues: LeagueData[]): {
  type: StreakType;
  length: number;
  start: StreakRangePoint;
  end: StreakRangePoint;
} | null {
  const weekly = buildUserWeekResults(userId, leagues);
  if (weekly.length === 0) return null;

  // Start from the most recent week and go backwards
  let streakType: StreakType | null = null;
  let length = 0;
  let end: StreakRangePoint | null = null;
  let start: StreakRangePoint | null = null;

  for (let i = weekly.length - 1; i >= 0; i--) {
    const r = weekly[i];

    // If we encounter a tie, streak ends
    if (r.outcome === 'T') {
      break;
    }

    if (streakType === null) {
      // First game in streak
      streakType = r.outcome === 'W' ? 'win' : 'loss';
      end = { year: r.year, week: r.week, label: formatWeekLabel(r.week, r.year) };
      start = { year: r.year, week: r.week, label: formatWeekLabel(r.week, r.year) };
      length = 1;
    } else {
      // Check if this game continues the streak
      const expectedOutcome = streakType === 'win' ? 'W' : 'L';
      if (r.outcome === expectedOutcome) {
        length++;
        start = { year: r.year, week: r.week, label: formatWeekLabel(r.week, r.year) };
      } else {
        // Different outcome, streak ends
        break;
      }
    }
  }

  if (!streakType || !start || !end || length === 0) return null;

  return {
    type: streakType,
    length,
    start,
    end,
  };
}

/**
 * Returns week-by-week matchup details for a specific streak, including the week that ended the streak.
 * @param userId The user whose streak to get details for
 * @param streak The streak to get details for
 * @param type The type of streak (win/loss)
 * @param leagues All league data
 * @returns Array of StreakWeekDetail from streak start to the week it ended (inclusive)
 */
export function getStreakWeekDetails(
  userId: string,
  streak: Streak,
  type: StreakType,
  leagues: LeagueData[]
): StreakWeekDetail[] {
  const weekly = buildUserWeekResults(userId, leagues);
  if (weekly.length === 0) return [];

  // Find the start index of this streak
  const startIdx = weekly.findIndex(
    (w) => w.year === streak.start.year && w.week === streak.start.week
  );
  if (startIdx === -1) return [];

  // Find the end index of the streak
  const endIdx = weekly.findIndex(
    (w) => w.year === streak.end.year && w.week === streak.end.week
  );
  if (endIdx === -1) return [];

  // Include the streak weeks plus one more (the week it ended), if it exists
  const endSlice = endIdx + 2; // +1 for the ending week, +1 because slice is exclusive
  const details = weekly.slice(startIdx, Math.min(endSlice, weekly.length));

  return details.map((w) => ({
    year: w.year,
    week: w.week,
    teamScore: w.myPoints,
    opponentScore: w.oppPoints,
    outcome: w.outcome,
  }));
}
