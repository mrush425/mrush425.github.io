import archivedLeagueData from '../Data/Sleeper Data';
import LeagueData from '../Interfaces/LeagueData';
import Matchup from '../Interfaces/Matchup';
import {
    getCurrentStreak,
    getPreviousStreakRecordLength,
    getUserStreaks,
} from './StreakMethods';

test('finds the previous best streak when the current streak sets a new record', () => {
    const source = archivedLeagueData[0];
    const users = source.users.slice(0, 2);
    const rosters = source.rosters.slice(0, 2).map((roster, index) => ({
        ...roster,
        roster_id: index + 1,
        owner_id: users[index].user_id,
    }));
    const outcomes = ['W', 'W', 'L', 'W', 'W', 'W'];
    const matchup = (
        rosterId: number,
        points: number
    ): Matchup => ({
        players_points: {},
        starters_points: [],
        starters: [],
        matchup_id: 1,
        custom_points: null,
        roster_id: rosterId,
        players: [],
        points,
    });
    const data = {
        ...source,
        season: '2025',
        settings: { ...source.settings, playoff_week_start: 7 },
        nflSeasonInfo: { ...source.nflSeasonInfo, season: '2026', week: 7 },
        users,
        rosters,
        matchupInfo: outcomes.map((outcome, index) => ({
            week: index + 1,
            matchups: outcome === 'W'
                ? [matchup(1, 10), matchup(2, 5)]
                : [matchup(1, 5), matchup(2, 10)],
        })),
    } as LeagueData;
    const currentStreak = getCurrentStreak(users[0].user_id, [data]);

    expect(currentStreak?.length).toBe(3);
    expect(getUserStreaks(users[0].user_id, 'win', [data]).map((streak) => streak.length)).toEqual([2, 3]);
    expect(currentStreak && getPreviousStreakRecordLength(
        users[0].user_id,
        currentStreak.type,
        currentStreak,
        [data]
    )).toBe(2);
});
