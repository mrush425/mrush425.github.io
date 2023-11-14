import LeagueData from "./Interfaces/LeagueData"

export async function getLeagueData(leagueId: string): Promise<LeagueData[]>{
    const response = await fetch('https://api.sleeper.app/v1/league/'+leagueId);
    const data = await response.json();
    return data;
}

