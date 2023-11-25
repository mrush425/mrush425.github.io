import LeagueData from "./Interfaces/LeagueData";
import MatchupInfo from "./Interfaces/MatchupInfo";

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

export async function getMatchupData(leagueData: LeagueData): Promise<MatchupInfo[]> {
  const matchups: MatchupInfo[] = [];
  let maxWeek = 0;

  if (leagueData.nflSeasonInfo.season > leagueData.season) {
    maxWeek = leagueData.settings.playoff_week_start + 2;
  } else {
    maxWeek = leagueData.nflSeasonInfo.week;
  }

  const apiUrl = 'https://api.sleeper.app/v1/league/' + leagueData.league_id + '/matchups/';

  const fetchMatchup = async (week: number): Promise<MatchupInfo> => {
    const response = await fetch(apiUrl + week);
    const data = await response.json();

    return {
      week,
      matchups: data,
    };
  };

  const promises: Promise<MatchupInfo>[] = [];

  for (let week = 1; week <= maxWeek; week++) {
    promises.push(fetchMatchup(week));
  }

  matchups.push(...(await Promise.all(promises)));

  return matchups;
}
