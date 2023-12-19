import LeagueData from "../Interfaces/LeagueData";
import SleeperRoster from "../Interfaces/SleeperRoster";

export function findRosterByUserId(user_id: string, rosters: SleeperRoster[]): SleeperRoster | undefined {
    return rosters.find((roster) => roster.owner_id === user_id);
}

export function getUserPlace(user_id: string, data: LeagueData): number {
    const sortedData = data.rosters.slice().sort((a, b) => {
        const userA = data.users.find((u) => u.user_id === a.owner_id);
        const userB = data.users.find((u) => u.user_id === b.owner_id);
        if (!userA || !userB) return 0;
        return b.settings.wins - a.settings.wins || b.settings.fpts - a.settings.fpts;
      });

      return sortedData.findIndex((user) => user.owner_id===user_id)+1;
}