import LeagueData from "../Interfaces/LeagueData";
import SleeperUser from "../Interfaces/SleeperUser";
import { findRosterByUserId, getUserSeasonPlace } from "./HelperMethods";

/**
 * Calculates the total fantasy points scored by a specific team for the entire year (season).
 * It combines the integer part (fpts) and the decimal part (fpts_decimal / 100) 
 * found in the SleeperRoster settings, and returns the result rounded to 2 decimal places.
 * * @param user The SleeperUser object for the team.
 * @param data The LeagueData object containing rosters.
 * @returns The total fantasy points scored, rounded to 2 decimal places.
 */
export const calculateYearPoints = (user: SleeperUser, data: LeagueData): number => {
    const roster = findRosterByUserId(user.user_id, data.rosters);
    
    if (!roster) {
        return 0;
    }

    const { fpts, fpts_decimal } = roster.settings;

    // 1. Combine integer and decimal parts: fpts_decimal is an integer representing hundredths.
    const rawTotalPoints = fpts + (fpts_decimal / 100);

    // 2. Round the result to two decimal places to ensure precision.
    const roundedTotalPoints = Math.round(rawTotalPoints * 100) / 100;

    return roundedTotalPoints; 
};

/**
 * Calculates the total fantasy points scored AGAINST a team for a single season.
 * Sleeper stores points as two parts: fpts_against (integer part) and fpts_against_decimal (decimal part).
 * @param user The Sleeper user object (to ensure the user exists)
 * @param league The LeagueData object containing the roster settings
 * @returns The total points scored against the team, rounded to two decimal places.
 */
export const calculateYearPointsAgainst = (user: SleeperUser, league: LeagueData): number => {
    const roster = league.rosters.find(r => r.owner_id === user.user_id);

    if (!roster) {
        return 0;
    }

    const pointsAgainstInteger = roster.settings.fpts_against || 0;
    const pointsAgainstDecimal = roster.settings.fpts_against_decimal || 0;
    
    const rawTotalPointsAgainst = pointsAgainstInteger + (pointsAgainstDecimal / 100);

    return Math.round(rawTotalPointsAgainst * 100) / 100;
};

/**
 * Calculates the total fantasy points scored by a team during playoff weeks only.
 * Only includes weeks >= playoff_week_start where the team actually plays (not on bye).
 * Users in positions 1, 2, 7, 8 have a bye in the first playoff week.
 * @param user The SleeperUser object for the team.
 * @param data The LeagueData object containing matchupInfo and settings.
 * @returns An object with total points and games played during playoffs.
 */
export const calculatePlayoffPoints = (
    user: SleeperUser,
    data: LeagueData
): { points: number; gamesPlayed: number } => {
    if (!data.matchupInfo || !data.rosters) {
        return { points: 0, gamesPlayed: 0 };
    }

    const roster = findRosterByUserId(user.user_id, data.rosters);
    if (!roster) {
        return { points: 0, gamesPlayed: 0 };
    }

    const playoffStartWeek = data.settings.playoff_week_start || Infinity;
    
    // Check if user has a bye in the first playoff week (positions 1, 2, 7, 8)
    const seasonPlace = getUserSeasonPlace(user.user_id, data);
    const hasByeInFirstWeek = [1, 2, 7, 8].includes(seasonPlace);
    
    let totalPoints = 0;
    let gamesPlayed = 0;

    data.matchupInfo.forEach((weekBlock) => {
        if (weekBlock.week < playoffStartWeek) return;
        
        // Skip first playoff week if user has a bye
        if (hasByeInFirstWeek && weekBlock.week === playoffStartWeek) return;

        const teamMatchup = weekBlock.matchups.find((m) => m.roster_id === roster.roster_id);
        if (!teamMatchup) return;

        // Check if team is on bye (no opponent)
        const hasOpponent = weekBlock.matchups.some(
            (m) => m.matchup_id === teamMatchup.matchup_id && m.roster_id !== roster.roster_id
        );
        if (!hasOpponent) return;

        totalPoints += teamMatchup.points ?? 0;
        gamesPlayed++;
    });

    return { points: Math.round(totalPoints * 100) / 100, gamesPlayed };
};

/**
 * Calculates the total fantasy points scored AGAINST a team during playoff weeks only.
 * Only includes weeks >= playoff_week_start where the team actually plays (not on bye).
 * Users in positions 1, 2, 7, 8 have a bye in the first playoff week.
 * @param user The SleeperUser object for the team.
 * @param data The LeagueData object containing matchupInfo and settings.
 * @returns An object with total points against and games played during playoffs.
 */
export const calculatePlayoffPointsAgainst = (
    user: SleeperUser,
    data: LeagueData
): { points: number; gamesPlayed: number } => {
    if (!data.matchupInfo || !data.rosters) {
        return { points: 0, gamesPlayed: 0 };
    }

    const roster = findRosterByUserId(user.user_id, data.rosters);
    if (!roster) {
        return { points: 0, gamesPlayed: 0 };
    }

    const playoffStartWeek = data.settings.playoff_week_start || Infinity;
    
    // Check if user has a bye in the first playoff week (positions 1, 2, 7, 8)
    const seasonPlace = getUserSeasonPlace(user.user_id, data);
    const hasByeInFirstWeek = [1, 2, 7, 8].includes(seasonPlace);
    
    let totalPointsAgainst = 0;
    let gamesPlayed = 0;

    data.matchupInfo.forEach((weekBlock) => {
        if (weekBlock.week < playoffStartWeek) return;
        
        // Skip first playoff week if user has a bye
        if (hasByeInFirstWeek && weekBlock.week === playoffStartWeek) return;

        const teamMatchup = weekBlock.matchups.find((m) => m.roster_id === roster.roster_id);
        if (!teamMatchup) return;

        const oppMatchup = weekBlock.matchups.find(
            (m) => m.matchup_id === teamMatchup.matchup_id && m.roster_id !== roster.roster_id
        );
        if (!oppMatchup) return;

        totalPointsAgainst += oppMatchup.points ?? 0;
        gamesPlayed++;
    });

    return { points: Math.round(totalPointsAgainst * 100) / 100, gamesPlayed };
};