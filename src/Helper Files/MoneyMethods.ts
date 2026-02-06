import LeagueData from '../Interfaces/LeagueData';
import yearData from '../Data/yearData.json';
import yearTrollData from '../Data/yearTrollData.json';

export interface MoneyStats {
  totalMoneyPaidIn: number;
  totalMoneyEarned: number;
  netMoneyEarned: number;
}

function hasValue(v: any): boolean {
  return v !== '' && v !== null && v !== undefined;
}

function isYearDone(yearTrollDataEntry: any): boolean {
  if (!yearTrollDataEntry || !Array.isArray(yearTrollDataEntry.data)) return false;

  // Year is "done" if ANY row has a money_earned value filled in
  return yearTrollDataEntry.data.some((pd: any) => hasValue(pd.money_earned));
}

/**
 * Calculate total money paid into league and total money earned for a user across all seasons
 * Only counts seasons where:
 *  - user participated, AND
 *  - the year is "done" (money_earned has been populated for that year)
 */
export function calculateMoneyStats(userId: string, leagueData: LeagueData[]): MoneyStats {
  let totalMoneyPaidIn = 0;
  let totalMoneyEarned = 0;

  for (const league of leagueData) {
    const season = Number(league.season);

    const yearDataEntry = (yearData as any[]).find((yd: any) => yd.year === season);
    const yearTrollDataEntry = (yearTrollData as any[]).find((ytd: any) => ytd.year === season);

    if (!yearTrollDataEntry || !Array.isArray(yearTrollDataEntry.data)) continue;

    // Must have been in the league that year
    const playerData = yearTrollDataEntry.data.find((pd: any) => pd.sleeper_id === userId);
    if (!playerData) continue;

    // Must be a completed year
    if (!isYearDone(yearTrollDataEntry)) continue;

    // Paid in (only for completed years the user participated in)
    if (yearDataEntry && Array.isArray(yearDataEntry.data) && yearDataEntry.data.length > 0) {
      const firstEntry = yearDataEntry.data[0];
      const buyIn = Number(firstEntry.buy_in) || 0;
      const sideBetBuyIn = Number(firstEntry.side_bet_buy_in) || 0;
      totalMoneyPaidIn += buyIn + sideBetBuyIn;
    }

    // Earned (only if this user's value is filled in)
    if (hasValue(playerData.money_earned)) {
      totalMoneyEarned += Number(playerData.money_earned) || 0;
    }
  }

  return {
    totalMoneyPaidIn,
    totalMoneyEarned,
    netMoneyEarned: totalMoneyEarned - totalMoneyPaidIn,
  };
}
