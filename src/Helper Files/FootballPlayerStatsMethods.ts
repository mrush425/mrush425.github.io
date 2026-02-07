import LeagueData from '../Interfaces/LeagueData';
import playerData from '../Data/players.json';
import yearTrollData from '../Data/yearTrollData.json';
import { getUserSeasonPlace, getOverallPlace, getPlayerName } from './HelperMethods';

// =============================================================================
// TYPES / EXPORTS
// =============================================================================

export interface MaxPointsByPositionResult {
  position: string;
  playerName: string;
  playerId: string;
  points: number;
  owner: string;
  opponent: string;
  year: number;
  week: number;
}

export interface JamarcusRusselStatResult {
  position: string;
  playerName: string;
  playerId: string;
  points: number;
  pointsPerGame: number;
  gamesPlayed: number;
  owner: string;
  year: number;
  seasonPlace?: number;
  overallPlace?: number;
}

interface JamarcusRusselPlayerStat {
  position: string;
  playerName: string;
  playerId: string;
  points: number;
  gamesPlayed: number;
}

const jamarcusRusselStatCache = new Map<string, Promise<JamarcusRusselPlayerStat | undefined>>();

// =============================================================================
// FOOTBALL PLAYER STATS METHODS
// =============================================================================

class FootballPlayerStatsMethods {
  private static async fetchJamarcusRusselPlayerStat(
    season: string,
    playerId: string
  ): Promise<JamarcusRusselPlayerStat | undefined> {
    const cacheKey = `${season}-${playerId}`;
    const cached = jamarcusRusselStatCache.get(cacheKey);
    if (cached) return cached;

    const fetchPromise = (async () => {
      try {
        const response = await fetch(
          `https://api.sleeper.com/stats/nfl/player/${playerId}?season_type=regular&season=${season}`
        );

        if (!response.ok) {
          console.error(`Failed to fetch player stats for player ID ${playerId}: HTTP ${response.status}`);
          return undefined;
        }

        const playerStat = await response.json();
        const halfPPRPoints = playerStat?.stats?.pts_half_ppr;
        if (halfPPRPoints === undefined || halfPPRPoints === null) {
          console.warn(`No valid stats found for player ID ${playerId} in season ${season}.`);
          return undefined;
        }

        const playerInfo = (playerData as any)[playerId];
        const playerName = getPlayerName(playerId);
        const position = playerStat?.player?.position || playerInfo?.position || 'N/A';

        // Calculate games played by counting weeks with stats
        let gamesPlayed = 0;
        if (playerStat?.stats_by_week && typeof playerStat.stats_by_week === 'object') {
          gamesPlayed = Object.values(playerStat.stats_by_week).filter((week: any) => week && Object.keys(week).length > 0).length;
        }
        // Fallback to 17 games if we can't determine
        if (gamesPlayed === 0) {
          gamesPlayed = 17;
        }

        return {
          playerId,
          playerName,
          position,
          points: Number(halfPPRPoints),
          gamesPlayed,
        };
      } catch (error) {
        console.error(`Error fetching player stats for player ID ${playerId} in season ${season}:`, error);
        return undefined;
      }
    })();

    jamarcusRusselStatCache.set(cacheKey, fetchPromise);
    return fetchPromise;
  }

  static async JamarcusRusselTop20(data: LeagueData[]): Promise<JamarcusRusselStatResult[]> {
    const results: JamarcusRusselStatResult[] = [];

    const tasks = data.flatMap((league) => {
      const season = league.season;
      const yearDataEntry = yearTrollData.find((yd: any) => yd.year === Number.parseFloat(season));
      if (!yearDataEntry) {
        console.warn(`No yearTrollData found for season ${season}.`);
        return [];
      }

      const gamesPlayed = league.settings.playoff_week_start + 2;

      return league.users.map(async (user) => {
        const playerDataEntry = yearDataEntry.data.find((pd: any) => pd.sleeper_id === user.user_id);
        if (!playerDataEntry) {
          return undefined;
        }

        const playerId = playerDataEntry.first_round_draft_pick_sleeper_id;
        if (!playerId) {
          return undefined;
        }

        const playerStat = await this.fetchJamarcusRusselPlayerStat(season, String(playerId));
        if (!playerStat) return undefined;

        const owner = user.metadata?.team_name || user.display_name || playerDataEntry.player_name || 'Unknown';
        const seasonPlace = getUserSeasonPlace(user.user_id, league);
        const overallPlace = getOverallPlace(user.user_id, season);

        const pointsPerGame = playerStat.points / gamesPlayed;

        const result: JamarcusRusselStatResult = {
          playerId: playerStat.playerId,
          playerName: playerStat.playerName,
          position: playerStat.position,
          points: playerStat.points,
          pointsPerGame,
          gamesPlayed,
          owner,
          year: Number(season),
          seasonPlace,
          overallPlace,
        };

        return result;
      });
    });

    const resolved = await Promise.all(tasks);
    resolved.forEach((result) => {
      if (result) results.push(result);
    });

    results.sort((a, b) => a.pointsPerGame - b.pointsPerGame);
    return results.slice(0, 20);
  }

  static async BestFirstRoundersTop20(data: LeagueData[]): Promise<JamarcusRusselStatResult[]> {
    const results: JamarcusRusselStatResult[] = [];

    const tasks = data.flatMap((league) => {
      const season = league.season;
      const yearDataEntry = yearTrollData.find((yd: any) => yd.year === Number.parseFloat(season));
      if (!yearDataEntry) {
        console.warn(`No yearTrollData found for season ${season}.`);
        return [];
      }

      const gamesPlayed = league.settings.playoff_week_start + 2;

      return league.users.map(async (user) => {
        const playerDataEntry = yearDataEntry.data.find((pd: any) => pd.sleeper_id === user.user_id);
        if (!playerDataEntry) {
          return undefined;
        }

        const playerId = playerDataEntry.first_round_draft_pick_sleeper_id;
        if (!playerId) {
          return undefined;
        }

        const playerStat = await this.fetchJamarcusRusselPlayerStat(season, String(playerId));
        if (!playerStat) return undefined;

        const owner = user.metadata?.team_name || user.display_name || playerDataEntry.player_name || 'Unknown';
        const seasonPlace = getUserSeasonPlace(user.user_id, league);
        const overallPlace = getOverallPlace(user.user_id, season);

        const pointsPerGame = playerStat.points / gamesPlayed;

        const result: JamarcusRusselStatResult = {
          playerId: playerStat.playerId,
          playerName: playerStat.playerName,
          position: playerStat.position,
          points: playerStat.points,
          pointsPerGame,
          gamesPlayed,
          owner,
          year: Number(season),
          seasonPlace,
          overallPlace,
        };

        return result;
      });
    });

    const resolved = await Promise.all(tasks);
    resolved.forEach((result) => {
      if (result) results.push(result);
    });

    results.sort((a, b) => b.pointsPerGame - a.pointsPerGame);
    return results.slice(0, 20);
  }
  /**
   * Get the highest scoring performance by a player at each position.
   * Can optionally filter by a specific user (for Troll pages).
   */
  static MaxPointsByPosition(
    data: LeagueData[],
    selectedPositions: string[] = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'],
    specificUserId?: string
  ): MaxPointsByPositionResult[] {
    const results: MaxPointsByPositionResult[] = [];
    const positionMaxMap = new Map<string, MaxPointsByPositionResult[]>();

    data.forEach((league) => {
      const playoffStartWeek = league.settings.playoff_week_start;
      
      league.matchupInfo.forEach((matchupInfo) => {
        matchupInfo.matchups.forEach((matchup) => {
          // Skip if filtering for specific user and this matchup doesn't belong to them
          if (specificUserId) {
            const roster = league.rosters.find((r) => r.roster_id === matchup.roster_id);
            if (roster?.owner_id !== specificUserId) return;
          }

          const roster = league.rosters.find((r) => r.roster_id === matchup.roster_id);
          const user = league.users.find((u) => u.user_id === roster?.owner_id);
          if (!roster || !user) return;

          // Skip bye weeks (first playoff week, seeds 1,2,7,8 have byes)
          if (matchupInfo.week === playoffStartWeek) {
            const userSeed = getUserSeasonPlace(user.user_id, league);
            if (userSeed === 1 || userSeed === 2 || userSeed === 7 || userSeed === 8) return;
          }

          // Find opponent
          const opponentMatchup = matchupInfo.matchups.find(
            (m) => m.matchup_id === matchup.matchup_id && m.roster_id !== matchup.roster_id
          );
          const opponentRoster = league.rosters.find((r) => r.roster_id === opponentMatchup?.roster_id);
          const opponentUser = league.users.find((u) => u.user_id === opponentRoster?.owner_id);

          const opponentName = opponentUser?.metadata?.team_name || opponentUser?.display_name || 'Unknown';

          // Check each player's points
          Object.entries(matchup.players_points).forEach(([playerId, points]) => {
            const playerInfo = (playerData as any)[playerId];
            if (!playerInfo || !playerInfo.position) return;

            const playerPosition = playerInfo.position;
            if (!selectedPositions.includes(playerPosition)) return;

            const positionKey = playerPosition;
            const currentResults = positionMaxMap.get(positionKey) || [];

            const playerName = getPlayerName(playerId);

            const newResult: MaxPointsByPositionResult = {
              position: playerPosition,
              playerName,
              playerId,
              points,
              owner: user.metadata?.team_name || user.display_name || 'Unknown',
              opponent: opponentName,
              year: Number(league.season),
              week: matchupInfo.week,
            };

            if (currentResults.length === 0 || points > currentResults[0].points) {
              // New high score - replace all previous results
              positionMaxMap.set(positionKey, [newResult]);
            } else if (points === currentResults[0].points) {
              // Tie - add to existing results
              positionMaxMap.set(positionKey, [...currentResults, newResult]);
            }
          });
        });
      });
    });

    // Sort by position order and flatten the array
    const positionOrder = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
    positionOrder.forEach((pos) => {
      const posResults = positionMaxMap.get(pos);
      if (posResults) results.push(...posResults);
    });

    return results;
  }

  /**
   * Get the top 50 highest scoring performances across selected positions.
   * Can optionally filter by a specific user (for Troll pages).
   */
  static Top50PointsByPosition(
    data: LeagueData[],
    selectedPositions: string[] = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'],
    specificUserId?: string
  ): MaxPointsByPositionResult[] {
    const allResults: MaxPointsByPositionResult[] = [];

    data.forEach((league) => {
      const playoffStartWeek = league.settings.playoff_week_start;
      
      league.matchupInfo.forEach((matchupInfo) => {
        matchupInfo.matchups.forEach((matchup) => {
          // Skip if filtering for specific user and this matchup doesn't belong to them
          if (specificUserId) {
            const roster = league.rosters.find((r) => r.roster_id === matchup.roster_id);
            if (roster?.owner_id !== specificUserId) return;
          }

          const roster = league.rosters.find((r) => r.roster_id === matchup.roster_id);
          const user = league.users.find((u) => u.user_id === roster?.owner_id);
          if (!roster || !user) return;

          // Skip bye weeks (first playoff week, seeds 1,2,7,8 have byes)
          if (matchupInfo.week === playoffStartWeek) {
            const userSeed = getUserSeasonPlace(user.user_id, league);
            if (userSeed === 1 || userSeed === 2 || userSeed === 7 || userSeed === 8) return;
          }

          // Find opponent
          const opponentMatchup = matchupInfo.matchups.find(
            (m) => m.matchup_id === matchup.matchup_id && m.roster_id !== matchup.roster_id
          );
          const opponentRoster = league.rosters.find((r) => r.roster_id === opponentMatchup?.roster_id);
          const opponentUser = league.users.find((u) => u.user_id === opponentRoster?.owner_id);

          const opponentName = opponentUser?.metadata?.team_name || opponentUser?.display_name || 'Unknown';

          // Check each player's points
          Object.entries(matchup.players_points).forEach(([playerId, points]) => {
            const playerInfo = (playerData as any)[playerId];
            if (!playerInfo || !playerInfo.position) return;

            const playerPosition = playerInfo.position;
            if (!selectedPositions.includes(playerPosition)) return;

            const playerName = getPlayerName(playerId);

            allResults.push({
              position: playerPosition,
              playerName,
              playerId,
              points,
              owner: user.metadata?.team_name || user.display_name || 'Unknown',
              opponent: opponentName,
              year: Number(league.season),
              week: matchupInfo.week,
            });
          });
        });
      });
    });

    // Sort by points descending and take top 50
    allResults.sort((a, b) => b.points - a.points);
    return allResults.slice(0, 50);
  }

  /**
   * Get the highest scoring BENCH performance by a player at each position.
   * Can optionally filter by a specific user (for Troll pages).
   */
  static MaxPointsByPositionBench(
    data: LeagueData[],
    selectedPositions: string[] = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'],
    specificUserId?: string
  ): MaxPointsByPositionResult[] {
    const results: MaxPointsByPositionResult[] = [];
    const positionMaxMap = new Map<string, MaxPointsByPositionResult[]>();

    data.forEach((league) => {
      const playoffStartWeek = league.settings.playoff_week_start;
      
      league.matchupInfo.forEach((matchupInfo) => {
        matchupInfo.matchups.forEach((matchup) => {
          // Skip if filtering for specific user and this matchup doesn't belong to them
          if (specificUserId) {
            const roster = league.rosters.find((r) => r.roster_id === matchup.roster_id);
            if (roster?.owner_id !== specificUserId) return;
          }

          const roster = league.rosters.find((r) => r.roster_id === matchup.roster_id);
          const user = league.users.find((u) => u.user_id === roster?.owner_id);
          if (!roster || !user) return;

          // Skip bye weeks (first playoff week, seeds 1,2,7,8 have byes)
          if (matchupInfo.week === playoffStartWeek) {
            const userSeed = getUserSeasonPlace(user.user_id, league);
            if (userSeed === 1 || userSeed === 2 || userSeed === 7 || userSeed === 8) return;
          }

          // Find opponent
          const opponentMatchup = matchupInfo.matchups.find(
            (m) => m.matchup_id === matchup.matchup_id && m.roster_id !== matchup.roster_id
          );
          const opponentRoster = league.rosters.find((r) => r.roster_id === opponentMatchup?.roster_id);
          const opponentUser = league.users.find((u) => u.user_id === opponentRoster?.owner_id);

          const opponentName = opponentUser?.metadata?.team_name || opponentUser?.display_name || 'Unknown';

          // Get bench players only (players not in starters)
          const benchPlayers = matchup.players.filter(playerId => !matchup.starters.includes(playerId));

          // Check each bench player's points
          benchPlayers.forEach((playerId) => {
            const points = matchup.players_points[playerId] || 0;
            const playerInfo = (playerData as any)[playerId];
            if (!playerInfo || !playerInfo.position) return;

            const playerPosition = playerInfo.position;
            if (!selectedPositions.includes(playerPosition)) return;

            const positionKey = playerPosition;
            const currentResults = positionMaxMap.get(positionKey) || [];

            const playerName = getPlayerName(playerId);

            const newResult: MaxPointsByPositionResult = {
              position: playerPosition,
              playerName,
              playerId,
              points,
              owner: user.metadata?.team_name || user.display_name || 'Unknown',
              opponent: opponentName,
              year: Number(league.season),
              week: matchupInfo.week,
            };

            if (currentResults.length === 0 || points > currentResults[0].points) {
              positionMaxMap.set(positionKey, [newResult]);
            } else if (points === currentResults[0].points) {
              positionMaxMap.set(positionKey, [...currentResults, newResult]);
            }
          });
        });
      });
    });

    const positionOrder = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
    positionOrder.forEach((pos) => {
      const posResults = positionMaxMap.get(pos);
      if (posResults) results.push(...posResults);
    });

    return results;
  }

  /**
   * Get the top 50 highest scoring BENCH performances across selected positions.
   * Can optionally filter by a specific user (for Troll pages).
   */
  static Top50PointsByPositionBench(
    data: LeagueData[],
    selectedPositions: string[] = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'],
    specificUserId?: string
  ): MaxPointsByPositionResult[] {
    const allResults: MaxPointsByPositionResult[] = [];

    data.forEach((league) => {
      const playoffStartWeek = league.settings.playoff_week_start;
      
      league.matchupInfo.forEach((matchupInfo) => {
        matchupInfo.matchups.forEach((matchup) => {
          if (specificUserId) {
            const roster = league.rosters.find((r) => r.roster_id === matchup.roster_id);
            if (roster?.owner_id !== specificUserId) return;
          }

          const roster = league.rosters.find((r) => r.roster_id === matchup.roster_id);
          const user = league.users.find((u) => u.user_id === roster?.owner_id);
          if (!roster || !user) return;

          // Skip bye weeks (first playoff week, seeds 1,2,7,8 have byes)
          if (matchupInfo.week === playoffStartWeek) {
            const userSeed = getUserSeasonPlace(user.user_id, league);
            if (userSeed === 1 || userSeed === 2 || userSeed === 7 || userSeed === 8) return;
          }

          // Skip bye weeks (first playoff week, seeds 1,2,7,8 have byes)
          if (matchupInfo.week === playoffStartWeek) {
            const userSeed = getUserSeasonPlace(user.user_id, league);
            if (userSeed === 1 || userSeed === 2 || userSeed === 7 || userSeed === 8) return;
          }

          const opponentMatchup = matchupInfo.matchups.find(
            (m) => m.matchup_id === matchup.matchup_id && m.roster_id !== matchup.roster_id
          );
          const opponentRoster = league.rosters.find((r) => r.roster_id === opponentMatchup?.roster_id);
          const opponentUser = league.users.find((u) => u.user_id === opponentRoster?.owner_id);

          const opponentName = opponentUser?.metadata?.team_name || opponentUser?.display_name || 'Unknown';

          // Get bench players only (players not in starters)
          const benchPlayers = matchup.players.filter(playerId => !matchup.starters.includes(playerId));

          benchPlayers.forEach((playerId) => {
            const points = matchup.players_points[playerId] || 0;
            const playerInfo = (playerData as any)[playerId];
            if (!playerInfo || !playerInfo.position) return;

            const playerPosition = playerInfo.position;
            if (!selectedPositions.includes(playerPosition)) return;

            const playerName = getPlayerName(playerId);

            allResults.push({
              position: playerPosition,
              playerName,
              playerId,
              points,
              owner: user.metadata?.team_name || user.display_name || 'Unknown',
              opponent: opponentName,
              year: Number(league.season),
              week: matchupInfo.week,
            });
          });
        });
      });
    });

    allResults.sort((a, b) => b.points - a.points);
    return allResults.slice(0, 50);
  }
}

export default FootballPlayerStatsMethods;
