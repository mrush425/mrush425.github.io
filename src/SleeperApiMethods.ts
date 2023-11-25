import LeagueData from "./Interfaces/LeagueData";

export async function getLeagueData(leagueId: string): Promise<LeagueData[]> {
  const data = new Array();

  while (leagueId !== null && leagueId !== undefined) {
    const leaguePromise = fetch('https://api.sleeper.app/v1/league/' + leagueId).then(response => response.json());
    const statePromise = fetch('https://api.sleeper.app/v1/state/nfl').then(response => response.json());
    const rosterPromise = fetch(`https://api.sleeper.app/v1/league/${leagueId}/rosters`).then(response => response.json());
    const userPromise = fetch(`https://api.sleeper.app/v1/league/${leagueId}/users`).then(response => response.json());

    const [leagueJson, stateJson, rosterJson, userJson] = await Promise.all([leaguePromise, statePromise, rosterPromise, userPromise]);

    // Add the additional information to the league data
    leagueJson.nflSeasonInfo = stateJson;
    leagueJson.rosters = rosterJson;
    leagueJson.users = userJson;

    data.push(leagueJson);

    leagueId = leagueJson.previous_league_id;
  }

  return data;
}
