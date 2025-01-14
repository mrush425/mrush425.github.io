import LeagueData from "../Interfaces/LeagueData";
import SleeperUser from "../Interfaces/SleeperUser";
import { findRosterByUserId } from "./HelperMethods";

export const calculateScheduleRecord = (team: SleeperUser, schedule: SleeperUser, data: LeagueData): [wins: number, losses: number, ties: number] => {
    let wins: number = 0;
    let losses: number = 0;
    let ties: number = 0;

    if (!data.matchupInfo) {
        return [0, 0, 0]; // or handle it differently based on your use case
    }

    if (team.user_id === schedule.user_id) {
        const roster = findRosterByUserId(team.user_id, data.rosters);
        if (roster) {
            wins = roster.settings.wins;
            losses = roster.settings.losses;
            ties = roster.settings.ties;
        }
    }
    else {
        // Find the matchupInfo for the current team and schedule
        let teamRosterId = findRosterByUserId(team.user_id, data.rosters)?.roster_id;
        let scheduleRosterId = findRosterByUserId(schedule.user_id, data.rosters)?.roster_id;

        let relevantMatchups;
        if (data.nflSeasonInfo.season === data.season && data.nflSeasonInfo.season_type!=="post") {
            relevantMatchups = data.matchupInfo.filter(
                (matchup) =>
                    matchup.week < data.nflSeasonInfo.week &&
                    matchup.week < data.settings.playoff_week_start
                    //matchup.matchups.some((m) => m.roster_id === teamRosterId) &&
                    //matchup.matchups.some((m) => m.roster_id === scheduleRosterId)
                    //^Pretty sure this can be deleted but saving just in case.
            );
        }
        else {
            relevantMatchups = data.matchupInfo.filter(
                (matchup) =>
                    matchup.week < data.settings.playoff_week_start 
                    // matchup.matchups.some((m) => m.roster_id === teamRosterId) &&
                    // matchup.matchups.some((m) => m.roster_id === scheduleRosterId)
                    //^Pretty sure this can be deleted but saving just in case.
            );
        }
        relevantMatchups.forEach((matchup) => {

            const teamMatchup = matchup.matchups.find((m) => m.roster_id === teamRosterId);
            const scheduleMatchup = matchup.matchups.find((m) => m.roster_id === scheduleRosterId);
            const oppMatchup = matchup.matchups.find((m) => m.matchup_id === scheduleMatchup?.matchup_id && m.roster_id !== scheduleMatchup?.roster_id);
            if (teamMatchup && scheduleMatchup) {
                if (scheduleMatchup.matchup_id === teamMatchup.matchup_id) {
                    // If schedule's opponent is the same as teamMatchup, compare directly to schedule
                    wins += teamMatchup.points > scheduleMatchup.points ? 1 : 0;
                    losses += teamMatchup.points < scheduleMatchup.points ? 1 : 0;
                    ties += teamMatchup.points === scheduleMatchup.points ? 1 : 0;
                } else {
                    // Otherwise, compare teamMatchup to schedule's opponent
                    if (oppMatchup) {
                        wins += teamMatchup.points > oppMatchup.points ? 1 : 0;
                        losses += teamMatchup.points < oppMatchup.points ? 1 : 0;
                        ties += teamMatchup.points === oppMatchup.points ? 1 : 0;
                    }
                }
            }
        });
    }

    return [wins, losses, ties];

}

export const calculateRecordAsOfWeek = (team: SleeperUser, asOfWeek: number, data: LeagueData): [wins: number, losses: number, ties: number] => {
    let wins: number = 0;
    let losses: number = 0;
    let ties: number = 0;

    if (!data.matchupInfo) {
        return [0, 0, 0]; // or handle it differently based on your use case
    }

    // Find the matchupInfo for the current team and schedule
    let teamRosterId = findRosterByUserId(team.user_id, data.rosters)?.roster_id;
    let scheduleRosterId = findRosterByUserId(team.user_id, data.rosters)?.roster_id;

    let relevantMatchups;
    if (data.nflSeasonInfo.season === data.season) {
        relevantMatchups = data.matchupInfo.filter(
            (matchup) =>
                matchup.week < data.nflSeasonInfo.week && 
                matchup.week < asOfWeek &&
                matchup.week < data.settings.playoff_week_start &&
                matchup.matchups.some((m) => m.roster_id === teamRosterId) &&
                matchup.matchups.some((m) => m.roster_id === scheduleRosterId)
        );
    }

    relevantMatchups?.forEach((matchup) => {

        const teamMatchup = matchup.matchups.find((m) => m.roster_id === teamRosterId);
        const scheduleMatchup = matchup.matchups.find((m) => m.roster_id === scheduleRosterId);
        const oppMatchup = matchup.matchups.find((m) => m.matchup_id === scheduleMatchup?.matchup_id && m.roster_id !== scheduleMatchup?.roster_id);
        if (teamMatchup && scheduleMatchup) {
            if (scheduleMatchup.matchup_id === teamMatchup.matchup_id) {
                // If schedule's opponent is the same as teamMatchup, compare directly to schedule
                wins += teamMatchup.points > scheduleMatchup.points ? 1 : 0;
                losses += teamMatchup.points < scheduleMatchup.points ? 1 : 0;
                ties += teamMatchup.points === scheduleMatchup.points ? 1 : 0;
            } else {
                // Otherwise, compare teamMatchup to schedule's opponent
                if (oppMatchup) {
                    wins += teamMatchup.points > oppMatchup.points ? 1 : 0;
                    losses += teamMatchup.points < oppMatchup.points ? 1 : 0;
                    ties += teamMatchup.points === oppMatchup.points ? 1 : 0;
                }
            }
        }
    });
    return [wins, losses, ties];
}

export const getLeagueRecordAtSchedule = (user: SleeperUser, data: LeagueData): [wins: number, losses: number, ties: number] => {
    let winsSum = 0;
    let lossesSum = 0;
    let tiesSum = 0;

    for (let index = 0; index < data.users.length; index++) {
        const [wins, losses, ties] = calculateScheduleRecord(data.users[index], user, data);

        winsSum += wins;
        lossesSum += losses;
        tiesSum += ties;
    }

    return [winsSum, lossesSum, tiesSum];
};

export const getAverageLeagueRecordAtSchedule = (user: SleeperUser, data: LeagueData): [wins: number, losses: number, ties: number] => {
    let winsSum = 0;
    let lossesSum = 0;
    let tiesSum = 0;

    [winsSum, lossesSum, tiesSum] = getLeagueRecordAtSchedule(user, data);

    // Calculate the average based on the number of users (excluding the sum column)
    const usersCount = data.users.length;
    return [
        Math.round(winsSum / usersCount),
        Math.round(lossesSum / usersCount),
        Math.round(tiesSum / usersCount),
    ];
};

export const getRecordAgainstLeague = (user: SleeperUser, data: LeagueData): [wins: number, losses: number, ties: number] => {
    let winsSum = 0;
    let lossesSum = 0;
    let tiesSum = 0;

    for (let index = 0; index < data.users.length; index++) {
        const record = calculateScheduleRecord(user, data.users[index], data);
        const [wins, losses, ties] = record;

        winsSum += wins;
        lossesSum += losses;
        tiesSum += ties;
    }

    return [winsSum, lossesSum, tiesSum];
};

export const getAverageRecordAgainstLeague = (user: SleeperUser, data: LeagueData): [wins: number, losses: number, ties: number] => {
    let winsSum = 0;
    let lossesSum = 0;
    let tiesSum = 0;

    [winsSum, lossesSum, tiesSum] = getRecordAgainstLeague(user, data);

    // Calculate the average based on the number of users (excluding the sum column)
    const usersCount = data.users.length;
    return [
        Math.round(winsSum / usersCount),
        Math.round(lossesSum / usersCount),
        Math.round(tiesSum / usersCount),
    ];
};

export const getRecordWinPercentage = (wins: number, losses: number, ties: number): string => {
    const winPercentage: string = ((wins * 100) / (wins + losses + ties)).toFixed(2) + "%";
    return winPercentage;
};

export const getRecordInTop50 = (user: SleeperUser, data: LeagueData): [wins: number, losses: number, ties: number] => {
    let wins = 0;
    let losses = 0;
    let ties = 0;

    //loop over each matcupInfo object from data.matchupInfo
    data.matchupInfo.forEach((matchupInfo) => {
        if ((data.nflSeasonInfo.season === data.season && matchupInfo.week < data.nflSeasonInfo.week && matchupInfo.week < data.settings.playoff_week_start ) ||
            ((data.nflSeasonInfo.season !== data.season || data.nflSeasonInfo.season_type==="post") && matchupInfo.week < data.settings.playoff_week_start)){
                const sortedMatchups = matchupInfo.matchups.sort((a, b) => b.points - a.points);
                const userIndex = sortedMatchups.findIndex(
                    (matchup) => matchup.roster_id === data.rosters.find((roster) => roster.owner_id === user.user_id)?.roster_id
                );
                // Add 1 to wins, losses, or ties based on the user's position in the sorted array
                if (userIndex !== -1) {
                    userIndex < sortedMatchups.length / 2 ? wins++ : losses++;
                } else {
                    ties++;
                }
            }
    });
    return [wins, losses, ties];
};


export const displayRecord = (wins: number, losses: number, ties: number): string => {
    return wins + "-" + losses + "-" + ties;
};