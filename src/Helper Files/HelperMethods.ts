import LeagueData from "../Interfaces/LeagueData";
import PlayoffData, { PlayoffMatchup } from "../Interfaces/PlayoffData";
import SleeperRoster from "../Interfaces/SleeperRoster";
import SleeperUser from "../Interfaces/SleeperUser";
import playoffJsonData from '../Data/playoffs.json'; // Import your trollData.json
import MatchupInfo from "../Interfaces/MatchupInfo";
import Matchup from "../Interfaces/Matchup";
import PlayerYearStats from "../Interfaces/PlayerYearStats";
import { match } from "assert";


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

export function getBowlWinner(bowlName: string, data: LeagueData): [SleeperUser|undefined, SleeperUser|undefined, string]{
  const selectedSeasonData: PlayoffData | undefined = playoffJsonData.find(d => d['year'].toString() === data.season)

  // Initialize the variables with default values
  let playoffMatchupId1: string = "";
  let playoffMatchupId2: string = "";

  switch(bowlName){
    case "Troll Bowl":
      playoffMatchupId1="25";
      playoffMatchupId2="26";
    break;
    case "Bengal Bowl":
      playoffMatchupId1="27";
      playoffMatchupId2="28";
    break;
    case "Koozie Bowl":
      playoffMatchupId1="29";
      playoffMatchupId2="30";
    break;
    case "Toilet Bowl":
      playoffMatchupId1="31";
      playoffMatchupId2="32";
    break;
    case "Diarrhea Bowl":
      playoffMatchupId1="33";
      playoffMatchupId2="34";
    break;
    case "Butler Bowl":
      playoffMatchupId1="35";
      playoffMatchupId2="36";
    break;
  }

  const playoffStart = data.settings.playoff_week_start;
  const playoffMatchup1: PlayoffMatchup | undefined = selectedSeasonData?.data.find((matchup) => matchup.matchupId.toString() === playoffMatchupId1);
  const playoffMatchup2: PlayoffMatchup | undefined = selectedSeasonData?.data.find((matchup) => matchup.matchupId.toString() === playoffMatchupId2);

  if (playoffMatchup1 && playoffMatchup2) {
      const user1: SleeperUser|undefined = data.users.find(u => u.user_id === playoffMatchup1.user_id);
      const user2: SleeperUser|undefined = data.users.find(u => u.user_id === playoffMatchup2.user_id);
      
      if(user1 && user2){
        let points1:number = Number(getScoreStringForWeek(user1, playoffStart+2,data));
        let points2:number = Number(getScoreStringForWeek(user2, playoffStart+2,data))

        if(bowlName==="Butler Bowl" || bowlName==="Koozie Bowl"){
          points1+=Number(getScoreStringForWeek(user1, playoffStart+1,data));
          points2+=Number(getScoreStringForWeek(user2, playoffStart+1,data));
        }

          if(points1>points2){
              const winString=user1.metadata.team_name + " defeated " + user2.metadata.team_name + ": " + points1 + " - " + points2;
              return [user1,user2,winString];
          }
          else{
            const winString=user2.metadata.team_name + " defeated " + user1.metadata.team_name + ": " + points2 + " - " + points1;
              return [user2,user1,winString];
          }
      }
  }
  return [undefined,undefined,"Season not finished"]; 
}

export function getLeagueWinner(data: LeagueData): SleeperUser|undefined {
const [user1,user2,winnerString] = getBowlWinner("Troll Bowl", data);
return user1;
}

export function getMatchupForWeek(user: SleeperUser, week: Number, data: LeagueData): Matchup|undefined{
  const roster = data.rosters.find(r => r.owner_id === user.user_id);
  if (!roster) return undefined;
  const weekMatchup = data.matchupInfo.find((matchup) => matchup.week === week);
  if(!weekMatchup) return undefined;
  return weekMatchup.matchups.find(m => m.roster_id === roster.roster_id);
}


export function getScoreStringForWeek(user: SleeperUser, week: Number, data: LeagueData): string {
    const matchup = getMatchupForWeek(user,week,data);
    if(!matchup) return "0";
    return matchup.points.toFixed(2);
  };

  export function getScoreForWeek(user: SleeperUser, week: Number, data: LeagueData): number{
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

  export function getAveragePointsMapAsOfWeek(data: LeagueData, asOfWeek: number): Map<string,number>{
    let averagePointsMap: Map<string, number> = new Map();
    let relevantMatchups;
    
    data.users.forEach((team) => {
      // Find the matchupInfo for the current team
      let teamRosterId = findRosterByUserId(team.user_id, data.rosters)?.roster_id;


      relevantMatchups = data.matchupInfo.filter(
        (matchup) =>
          matchup.week < data.nflSeasonInfo.week &&
          matchup.week < asOfWeek &&
          matchup.week < data.settings.playoff_week_start &&
          matchup.matchups.some((m) => m.roster_id === teamRosterId)
      );
      

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

  export function getLast3WeeksAveragePointsMap(data: LeagueData): Map<string, number> {
    let averagePointsMap: Map<string, number> = new Map();
    
    // Determine the current week based on the season context
    const currentWeek = data.nflSeasonInfo.season === data.season 
      ? data.nflSeasonInfo.week - 1 
      : 100;
  
    data.users.forEach((team) => {
      // Find the roster ID for the current team
      let teamRosterId = findRosterByUserId(team.user_id, data.rosters)?.roster_id;
  
      // Calculate the range of weeks to include in the average (last 3 weeks)
      const startWeek = data.nflSeasonInfo.season_type!=="post" ? Math.max(1, currentWeek - 2) : data.settings.playoff_week_start-3;
      console.log("start week" + startWeek);
      // Filter matchups to get only those for the last 3 weeks and before playoffs
      const relevantMatchups = data.matchupInfo.filter(
        (matchup) =>
          matchup.week >= startWeek &&
          (matchup.week <= currentWeek || data.nflSeasonInfo.season_type==="post") &&
          matchup.week < data.settings.playoff_week_start &&
          matchup.matchups.some((m) => m.roster_id === teamRosterId)
      );
  
      // Calculate the average points for the last 3 weeks
      let total = 0;
      let count = 0;
      relevantMatchups.forEach((matchup) => {
        const teamMatchup: Matchup | undefined = matchup.matchups.find((m) => m.roster_id === teamRosterId);
        if (teamMatchup) {
          total += teamMatchup.points;
          count++;
        }
      });
  
      // Set the average in the map; handle cases where count could be zero
      averagePointsMap.set(team.user_id, count > 0 ? total / count : 0);
    });
  
    return averagePointsMap;
  }

  export async function projectedPointsInWeek(user: SleeperUser, week: number, data: LeagueData): Promise<number>{
    let projectedPoints: number = 0;
    const rosterId = findRosterByUserId(user.user_id, data.rosters)?.roster_id;
    if(!rosterId) return 0;

        // Efficiently find the matchup for the given roster ID:
    const matchup = data.matchupInfo[week - 1].matchups.find(
      (matchup: Matchup) => matchup.roster_id === rosterId
    );

    if (!matchup) return 0;

    // Efficiently calculate projected points for all starters using Promise.all
    const starterPromises = matchup.starters.map(async (playerId) => {
      return await projectedPointsInWeekForPlayer(playerId, week, data);
    });
  
    // Wait for all starter projections to resolve before summing
    const starterPoints = await Promise.all(starterPromises);
  
    projectedPoints = starterPoints.reduce((sum, points) => sum + points, 0);
  
    return projectedPoints;
  }

  export async function projectedPointsInWeekForPlayer(playerId: string,week: number,data: LeagueData): Promise<number> {
    let projectedPoints: number = 0;
    const apiUrl = `https://api.sleeper.com/projections/nfl/player/${playerId}?season_type=regular&season=${data.season}&week=${week}`;
  
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        console.error(`Failed to fetch player stats: ${response.statusText}`);
        return 0;
      }
  
      const playerYearStats: PlayerYearStats = await response.json();
  
      for (const stat of Object.keys(playerYearStats.stats) as Array<keyof typeof playerYearStats.stats>) {
        const value = playerYearStats.stats[stat];
        if (stat in data.scoring_settings) {
          projectedPoints += value * (data.scoring_settings[stat] || 0);
        }
      }
      return projectedPoints;
    } catch (error) {
        console.error(`Error fetching player projections: ${apiUrl}`);
      return 0;
    }
  }