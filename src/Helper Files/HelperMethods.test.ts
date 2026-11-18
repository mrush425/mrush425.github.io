import archivedLeagueData from '../Data/Sleeper Data';
import LeagueData from '../Interfaces/LeagueData';
import { getUserSeasonPlace } from './HelperMethods';

test('uses fractional points for the regular-season finish tiebreaker', () => {
    const source = archivedLeagueData[0];
    const rosters = source.rosters.slice(0, 2).map((roster, index) => ({
        ...roster,
        settings: {
            ...roster.settings,
            wins: 10,
            fpts: 100,
            fpts_decimal: index === 0 ? 45 : 50,
        },
    }));
    const data = {
        ...source,
        rosters,
        users: source.users.filter((user) =>
            rosters.some((roster) => roster.owner_id === user.user_id)
        ),
    } as LeagueData;

    expect(getUserSeasonPlace(rosters[0].owner_id, data)).toBe(2);
    expect(getUserSeasonPlace(rosters[1].owner_id, data)).toBe(1);
});
