import LeagueData from "./Interfaces/LeagueData"

export async function getLeagueData(leagueId: string): Promise<LeagueData[]>{
    const data = new Array();
    while(leagueId!==null && leagueId!==undefined){
        const response = await fetch('https://api.sleeper.app/v1/league/'+leagueId);
        const responseJson = await response.json();
        data.push(responseJson);

        leagueId=responseJson.previous_league_id
    }
    return data;
}

