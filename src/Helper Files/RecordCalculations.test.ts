import archivedLeagueData from '../Data/Sleeper Data';
import LeagueData from '../Interfaces/LeagueData';
import Matchup from '../Interfaces/Matchup';
import {
    getAverageLeagueRecordAtSchedule,
    getAverageRecordAgainstLeague,
} from './RecordCalculations';

test('schedule averages include the diagonal record represented in the totals', () => {
    const source = archivedLeagueData[0];
    const users = source.users.slice(0, 4);
    const rosters = source.rosters.slice(0, 4).map((roster, index) => ({
        ...roster,
        roster_id: index + 1,
        owner_id: users[index].user_id,
        settings: {
            ...roster.settings,
            wins: index === 0 ? 1 : 0,
            losses: index === 0 ? 0 : 1,
            ties: 0,
        },
    }));
    const matchup = (
        rosterId: number,
        matchupId: number,
        points: number
    ): Matchup => ({
        players_points: {},
        starters_points: [],
        starters: [],
        matchup_id: matchupId,
        custom_points: null,
        roster_id: rosterId,
        players: [],
        points,
    });
    const data = {
        ...source,
        settings: { ...source.settings, playoff_week_start: 2 },
        nflSeasonInfo: { ...source.nflSeasonInfo, season: '2026' },
        users,
        rosters,
        matchupInfo: [{
            week: 1,
            matchups: [
                matchup(1, 1, 10),
                matchup(2, 1, 9),
                matchup(3, 2, 12),
                matchup(4, 2, 11),
            ],
        }],
    } as LeagueData;

    expect(getAverageRecordAgainstLeague(users[0], data)).toEqual([1, 1, 0]);
    expect(getAverageLeagueRecordAtSchedule(users[0], data)).toEqual([1, 0, 0]);
});
