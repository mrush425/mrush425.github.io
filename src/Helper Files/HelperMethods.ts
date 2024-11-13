import LeagueData from "../Interfaces/LeagueData";
import PlayoffData, { PlayoffMatchup } from "../Interfaces/PlayoffData";
import SleeperRoster from "../Interfaces/SleeperRoster";
import SleeperUser from "../Interfaces/SleeperUser";
import playoffJsonData from '../Data/playoffs.json'; // Import your trollData.json
import MatchupInfo from "../Interfaces/MatchupInfo";
import Matchup from "../Interfaces/Matchup";


export function findRosterByUserId(user_id: string, rosters: SleeperRoster[]): SleeperRoster | undefined {
    return rosters.find((roster) => roster.owner_id === user_id);
}

export function findUserByRosterId(roster_id: number, data: LeagueData): SleeperUser | undefined {
    return data.users.find(u => u.user_id === data.rosters.find(r => r.roster_id === roster_id)?.owner_id)
}

export function getUserSeasonPlace(user_id: string, data: LeagueData): number {
    const sortedData = data.rosters.slice().sort((a, b) => {
        const userA = data.users.find((u) => u.user_id === a.owner_id);
        const userB = data.users.find((u) => u.user_id === b.owner_id);
        if (!userA || !userB) return 0;
        return b.settings.wins - a.settings.wins || b.settings.fpts - a.settings.fpts;
    });

    return sortedData.findIndex((user) => user.owner_id === user_id) + 1;
}

export function getLeagueWinner(data: LeagueData): SleeperUser|undefined {
    const selectedSeasonData: PlayoffData | undefined = playoffJsonData.find(d => d['year'] === data.season)

    const playoffStart = data.settings.playoff_week_start;
    const playoffMatchup1: PlayoffMatchup | undefined = selectedSeasonData?.playoffMatchups.find((matchup) => matchup.matchupId === "25");
    const playoffMatchup2: PlayoffMatchup | undefined = selectedSeasonData?.playoffMatchups.find((matchup) => matchup.matchupId === "26");

    if (playoffMatchup1 && playoffMatchup2) {
        const user1: SleeperUser|undefined = data.users.find(u => u.user_id === playoffMatchup1.user_id);
        const user2: SleeperUser|undefined = data.users.find(u => u.user_id === playoffMatchup2.user_id);

        if(data.season==="2023"){
            console.log(user1?.metadata.team_name);
            if(user1){
                console.log(getScoreStringForWeek(user1, playoffStart+2,data));
            }
            console.log(user2?.metadata.team_name);
            if(user2){
                console.log(getScoreStringForWeek(user2, playoffStart+2,data));
            }
        }
        
        if(user1 && user2){
            if(Number(getScoreStringForWeek(user1, playoffStart+2,data))>Number(getScoreStringForWeek(user2, playoffStart+2,data))){
                return user1;
            }
            else{
                return user2;
            }
        }
    }
    return undefined;
}

export function getScoreStringForWeek(user: SleeperUser, week: Number, data: LeagueData): string {
    const roster = data.rosters.find(r => r.owner_id === user.user_id);
    if (!roster) return "0";
    const weekMatchup = data.matchupInfo.find((matchup) => matchup.week === week);
    if(!weekMatchup) return "0";
    const matchup = weekMatchup.matchups.find(m => m.roster_id === roster.roster_id);
    if(!matchup) return "0";
    return matchup.points.toFixed(2);
  };

  export function getScoreForWeek(user: SleeperUser, week: Number, data: LeagueData): Number{
    return Number.parseFloat(getScoreStringForWeek(user,week,data));
  }

  export function getAveragePointsMap(data: LeagueData): Map<string,number>{
    let averagePointsMap: Map<string, number> = new Map();
    let relevantMatchups;
    
    data.users.forEach((team) => {
      // Find the matchupInfo for the current team
      let teamRosterId = findRosterByUserId(team.user_id, data.rosters)?.roster_id;

      if (data.nflSeasonInfo.season === data.season) {
        relevantMatchups = data.matchupInfo.filter(
          (matchup) =>
            matchup.week < data.nflSeasonInfo.week &&
            matchup.week < data.settings.playoff_week_start &&
            matchup.matchups.some((m) => m.roster_id === teamRosterId)
        );
      }
      else {
        relevantMatchups = data.matchupInfo.filter(  
          (matchup) =>
            matchup.week < data.settings.playoff_week_start &&
            matchup.matchups.some((m) => m.roster_id === teamRosterId)
        );
      }
      let total:number = 0;
      let count:number = 0;
      relevantMatchups.forEach((matchup) => {
        const teamMatchup: Matchup | undefined = matchup.matchups.find((m) => m.roster_id === teamRosterId);
        if (teamMatchup) {
          total+=teamMatchup.points;
          count++;
        }
      });
      averagePointsMap.set(team.user_id, (total/count));
    });
    return averagePointsMap;
  }