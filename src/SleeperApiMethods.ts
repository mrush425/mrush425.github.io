import DraftInfo from "./Interfaces/DraftInfo";
import DraftPick from "./Interfaces/DraftPick";
import LeagueData from "./Interfaces/LeagueData";
import MatchupInfo from "./Interfaces/MatchupInfo";
import PlayerYearStats from "./Interfaces/PlayerYearStats";
import { populatePositionOrderedLists } from "./Pages/Year Pages/SharedDraftMethods";
import trollData from './Data/trollData.json'; // Import your trollData.json


export async function getLeagueData(leagueId: string): Promise<LeagueData[]> {
  const data = new Array();

  while (leagueId !== null && leagueId !== undefined) {
    const leaguePromise = fetch('https://api.sleeper.app/v1/league/' + leagueId).then(response => response.json());
    const statePromise = fetch('https://api.sleeper.app/v1/state/nfl').then(response => response.json());
    const rosterPromise = fetch(`https://api.sleeper.app/v1/league/${leagueId}/rosters`).then(response => response.json());
    const userPromise = fetch(`https://api.sleeper.app/v1/league/${leagueId}/users`).then(response => response.json());

    const [leagueJson, stateJson, rosterJson, userJson] = await Promise.all([leaguePromise, statePromise, rosterPromise, userPromise]);
    
    for (const user of userJson) {
      const trollMatch = trollData.find(troll => troll['Sleeper ID'] === user.user_id);
      if (trollMatch) {
        user.metadata = user.metadata || {};
        user.metadata.team_name = trollMatch.Nickname;
      }
    }

    // Add the additional information to the league data
    leagueJson.nflSeasonInfo = stateJson;
    leagueJson.rosters = rosterJson;
    leagueJson.users = userJson;
    leagueJson.matchupInfo = await getMatchupData(leagueJson);

    data.push(leagueJson);

    leagueId = leagueJson.previous_league_id;
  }

  return data;
}

export async function getMatchupData(leagueData: LeagueData): Promise<MatchupInfo[]> {
  const matchups: MatchupInfo[] = [];
  let maxWeek = 0;

  if (leagueData.nflSeasonInfo.season > leagueData.season || leagueData.nflSeasonInfo.season_type==="post") {
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

export async function fetchDraftData(draftId: string, leagueId: string, season: string): Promise<[DraftPick[], DraftInfo[],PlayerYearStats[], Record<string, PlayerYearStats[]>]> {
  try {
      const [picksResponse, infoResponse] = await Promise.all([
          fetch(`https://api.sleeper.app/v1/draft/${draftId}/picks`),
          fetch(`https://api.sleeper.app/v1/draft/${draftId}`),
      ]);

      const picks: DraftPick[] = await picksResponse.json();
      const info: DraftInfo[] | DraftInfo = await infoResponse.json();

      const playerIds = picks.map((pick) => pick.player_id);
      const playerStatsResponses = await Promise.all(
          playerIds.map((playerId) =>
              fetch(
                  `https://api.sleeper.com/stats/nfl/player/${playerId}?season_type=regular&season=${season}`
              )
          )
      );

      const playerStatsData = await Promise.all(
          playerStatsResponses.map((response) => response.json())
      );

      const positionOrderedLists = populatePositionOrderedLists(playerStatsData);

      return [picks, Array.isArray(info) ? info : [info],playerStatsData,positionOrderedLists];
  } catch (error) {
      console.error('Error fetching data:', error);
      throw error;
  }
}


