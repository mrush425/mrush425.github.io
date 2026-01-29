import LeagueData from '../Interfaces/LeagueData';
import yearData from '../Data/yearData.json';
import yearTrollData from '../Data/yearTrollData.json';

export interface MoneyStats {
  totalMoneyPaidIn: number;
  totalMoneyEarned: number;
  netMoneyEarned: number;
}

/**
 * Calculate total money paid into league and total money earned for a user across all seasons
 */
export function calculateMoneyStats(userId: string, leagueData: LeagueData[]): MoneyStats {
  let totalMoneyPaidIn = 0;
  let totalMoneyEarned = 0;

  // Calculate money paid in - buy_in and side_bet_buy_in are league-wide costs
  leagueData.forEach((league) => {
    const season = Number(league.season);
    const yearDataEntry = (yearData as any[]).find((yd: any) => yd.year === season);
    
    if (yearDataEntry && yearDataEntry.data && yearDataEntry.data.length > 0) {
      // Get the first entry's buy_in and side_bet_buy_in (they're the same for all players in that year)
      const firstEntry = yearDataEntry.data[0];
      const buyIn = firstEntry.buy_in || 0;
      const sideBetBuyIn = firstEntry.side_bet_buy_in || 0;
      totalMoneyPaidIn += buyIn + sideBetBuyIn;
    }
  });

  // Calculate money earned (only count years with non-empty values)
  leagueData.forEach((league) => {
    const season = Number(league.season);
    const yearTrollDataEntry = (yearTrollData as any[]).find((ytd: any) => ytd.year === season);
    
    if (yearTrollDataEntry) {
      const playerData = yearTrollDataEntry.data.find((pd: any) => pd.sleeper_id === userId);
      if (playerData && playerData.money_earned !== '' && playerData.money_earned !== null && playerData.money_earned !== undefined) {
        totalMoneyEarned += playerData.money_earned || 0;
      }
    }
  });

  return {
    totalMoneyPaidIn,
    totalMoneyEarned,
    netMoneyEarned: totalMoneyEarned - totalMoneyPaidIn,
  };
}
