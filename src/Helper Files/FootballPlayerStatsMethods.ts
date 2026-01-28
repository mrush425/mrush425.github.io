import LeagueData from '../Interfaces/LeagueData';
import playerData from '../Data/players.json';
import { getUserSeasonPlace } from './HelperMethods';

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

// =============================================================================
// FOOTBALL PLAYER STATS METHODS
// =============================================================================

class FootballPlayerStatsMethods {
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

            // For all positions, construct name from first_name and last_name if full_name doesn't exist
            const playerName = playerInfo.full_name || `${playerInfo.first_name || ''} ${playerInfo.last_name || ''}`.trim() || 'Unknown';

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

            // For all positions, construct name from first_name and last_name if full_name doesn't exist
            const playerName = playerInfo.full_name || `${playerInfo.first_name || ''} ${playerInfo.last_name || ''}`.trim() || 'Unknown';

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

            const playerName = playerInfo.full_name || `${playerInfo.first_name || ''} ${playerInfo.last_name || ''}`.trim() || 'Unknown';

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

            const playerName = playerInfo.full_name || `${playerInfo.first_name || ''} ${playerInfo.last_name || ''}`.trim() || 'Unknown';

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
