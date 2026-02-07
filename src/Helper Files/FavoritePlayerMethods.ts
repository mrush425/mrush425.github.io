import LeagueData from '../Interfaces/LeagueData';
import playerData from '../Data/players.json';
import DraftPick from '../Interfaces/DraftPick';
import { getUserSeasonPlace, findRosterByUserId, getPlayerName } from './HelperMethods';
import Matchup from '../Interfaces/Matchup';

// =============================================================================
// TYPES / EXPORTS
// =============================================================================

export interface DraftDetail {
  year: number;
  round: number;
  pick_no: number;
}

export interface FavoriteDraftedResult {
  position: string;
  playerId: string;
  playerName: string;
  timesDrafted: number;
  draftDetails: DraftDetail[];
  totalDraftPosition: number; // Sum of all pick numbers (for tiebreaker)
  earliestRound: number; // Lowest round number drafted
  mostRecentYear: number; // Most recent year drafted
}

export interface FavoriteLineupResult {
  position: string;
  playerId: string;
  playerName: string;
  timesInLineup: number;
  totalPoints: number;
  avgPointsPerGame: number;
}

export interface FavoriteOwnedResult {
  position: string;
  playerId: string;
  playerName: string;
  yearsOwned: number;
  timesInLineup: number;
  totalPointsInLineup: number;
  yearsList: number[];
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Returns the player's position from the playerData.json file
 */
function getPlayerPosition(playerId: string): string | undefined {
  const player = (playerData as any)[playerId];
  return player?.position;
}

/**
 * Fetch draft picks for a given draft ID
 */
async function fetchDraftPicks(draftId: string): Promise<DraftPick[]> {
  try {
    const response = await fetch(`https://api.sleeper.app/v1/draft/${draftId}/picks`);
    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.error(`Error fetching draft picks for draft ${draftId}:`, error);
    return [];
  }
}

/**
 * Determine if a week is a bye week for the user in playoffs
 * During playoff week 1, seeds 1,2 (winners bracket) and 7,8 (losers bracket) have byes
 */
function isPlayoffByeWeek(league: LeagueData, week: number, userId: string): boolean {
  const playoffStartWeek = league.settings.playoff_week_start;
  
  if (week !== playoffStartWeek) return false;
  
  const userSeed = getUserSeasonPlace(userId, league);
  return userSeed === 1 || userSeed === 2 || userSeed === 7 || userSeed === 8;
}

/**
 * Determine if a week should be included based on matchup data
 * Returns false for bye weeks where opponent has 0 points or no opponent
 */
function shouldIncludeWeek(league: LeagueData, week: number, rosterId: number, userId: string): boolean {
  const playoffStartWeek = league.settings.playoff_week_start;
  
  // Skip bye weeks in playoffs
  if (isPlayoffByeWeek(league, week, userId)) return false;
  
  // For playoff weeks, also check if there's a valid opponent (non-zero points)
  if (week >= playoffStartWeek) {
    const matchupInfo = league.matchupInfo.find(m => m.week === week);
    if (!matchupInfo) return false;
    
    const userMatchup = matchupInfo.matchups.find(m => m.roster_id === rosterId);
    if (!userMatchup) return false;
    
    const oppMatchup = matchupInfo.matchups.find(
      m => m.matchup_id === userMatchup.matchup_id && m.roster_id !== rosterId
    );
    
    // If no opponent or opponent has 0 points, it's a bye
    if (!oppMatchup || oppMatchup.points === 0) return false;
  }
  
  return true;
}

/**
 * Get the maximum week to process for a season
 * For current season, exclude current incomplete week
 * For completed seasons, include all weeks through playoff finals
 */
function getMaxWeek(league: LeagueData): number {
  const playoffEndWeek = league.settings.playoff_week_start + 2;
  
  // If current season and not post-season
  if (league.nflSeasonInfo.season === league.season && league.nflSeasonInfo.season_type !== 'post') {
    return Math.min(league.nflSeasonInfo.week - 1, playoffEndWeek);
  }
  
  return playoffEndWeek;
}

// =============================================================================
// MODE 1: MOST TIMES DRAFTED
// =============================================================================

export async function getFavoritePlayerByDraft(
  allData: LeagueData[],
  userId: string,
  positions: string[] = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']
): Promise<Map<string, FavoriteDraftedResult>> {
  // Map: playerId -> accumulated draft info
  const playerDraftMap = new Map<string, {
    draftDetails: DraftDetail[];
    position: string;
  }>();

  // Fetch draft picks for all years in parallel
  const draftPromises = allData.map(async (league) => {
    const picks = await fetchDraftPicks(league.draft_id);
    return { league, picks };
  });

  const allDrafts = await Promise.all(draftPromises);

  // Process each year's draft
  for (const { league, picks } of allDrafts) {
    const year = Number(league.season);
    
    // Find picks by this user
    const userPicks = picks.filter(pick => pick.picked_by === userId);
    
    for (const pick of userPicks) {
      const playerId = pick.player_id;
      const position = pick.metadata?.position || getPlayerPosition(playerId);
      
      if (!position || !positions.includes(position)) continue;
      
      const existing = playerDraftMap.get(playerId) || { draftDetails: [], position };
      existing.draftDetails.push({
        year,
        round: pick.round,
        pick_no: pick.pick_no,
      });
      playerDraftMap.set(playerId, existing);
    }
  }

  // Convert to results and sort by position
  const resultsByPosition = new Map<string, FavoriteDraftedResult>();

  // For each position, find the favorite
  for (const targetPosition of positions) {
    const candidates: FavoriteDraftedResult[] = [];
    
    const entries = Array.from(playerDraftMap.entries());
    for (const [playerId, info] of entries) {
      if (info.position !== targetPosition) continue;
      
      const timesDrafted = info.draftDetails.length;
      const totalDraftPosition = info.draftDetails.reduce((sum: number, d: DraftDetail) => sum + d.pick_no, 0);
      const earliestRound = Math.min(...info.draftDetails.map((d: DraftDetail) => d.round));
      const mostRecentYear = Math.max(...info.draftDetails.map((d: DraftDetail) => d.year));
      
      candidates.push({
        position: targetPosition,
        playerId,
        playerName: getPlayerName(playerId),
        timesDrafted,
        draftDetails: info.draftDetails.sort((a: DraftDetail, b: DraftDetail) => a.year - b.year),
        totalDraftPosition,
        earliestRound,
        mostRecentYear,
      });
    }
    
    if (candidates.length === 0) continue;
    
    // Sort by tiebreakers:
    // 1. Most times drafted (higher is better)
    // 2. Lowest total draft position (earlier picks overall)
    // 3. Earliest single round (lower round number)
    // 4. Most recently drafted (higher year)
    candidates.sort((a, b) => {
      // 1. Most times drafted
      if (a.timesDrafted !== b.timesDrafted) return b.timesDrafted - a.timesDrafted;
      // 2. Lowest total draft position (soonest total)
      if (a.totalDraftPosition !== b.totalDraftPosition) return a.totalDraftPosition - b.totalDraftPosition;
      // 3. Earliest single round
      if (a.earliestRound !== b.earliestRound) return a.earliestRound - b.earliestRound;
      // 4. Most recently drafted
      return b.mostRecentYear - a.mostRecentYear;
    });
    
    resultsByPosition.set(targetPosition, candidates[0]);
  }

  return resultsByPosition;
}

// =============================================================================
// MODE 2: MOST WEEKS IN ACTIVE LINEUP
// =============================================================================

export function getFavoritePlayerByLineup(
  allData: LeagueData[],
  userId: string,
  positions: string[] = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']
): Map<string, FavoriteLineupResult> {
  // Map: playerId -> { timesInLineup, totalPoints }
  const playerLineupMap = new Map<string, {
    timesInLineup: number;
    totalPoints: number;
    position: string;
  }>();

  for (const league of allData) {
    const roster = findRosterByUserId(userId, league.rosters);
    if (!roster) continue;
    
    const maxWeek = getMaxWeek(league);
    
    for (const matchupInfo of league.matchupInfo) {
      const week = matchupInfo.week;
      
      // Skip weeks beyond max
      if (week > maxWeek) continue;
      
      // Skip bye weeks
      if (!shouldIncludeWeek(league, week, roster.roster_id, userId)) continue;
      
      const userMatchup = matchupInfo.matchups.find(m => m.roster_id === roster.roster_id);
      if (!userMatchup) continue;
      
      // Check each starter
      for (const playerId of userMatchup.starters) {
        if (!playerId || playerId === '0') continue; // Skip empty slots
        
        const position = getPlayerPosition(playerId);
        if (!position || !positions.includes(position)) continue;
        
        const points = userMatchup.players_points?.[playerId] || 0;
        
        const existing = playerLineupMap.get(playerId) || { timesInLineup: 0, totalPoints: 0, position };
        existing.timesInLineup++;
        existing.totalPoints += points;
        playerLineupMap.set(playerId, existing);
      }
    }
  }

  // Convert to results by position
  const resultsByPosition = new Map<string, FavoriteLineupResult>();

  for (const targetPosition of positions) {
    const candidates: FavoriteLineupResult[] = [];
    
    const entries = Array.from(playerLineupMap.entries());
    for (const [playerId, info] of entries) {
      if (info.position !== targetPosition) continue;
      
      candidates.push({
        position: targetPosition,
        playerId,
        playerName: getPlayerName(playerId),
        timesInLineup: info.timesInLineup,
        totalPoints: info.totalPoints,
        avgPointsPerGame: info.timesInLineup > 0 ? info.totalPoints / info.timesInLineup : 0,
      });
    }
    
    if (candidates.length === 0) continue;
    
    // Sort by tiebreakers:
    // 1. Most times in lineup
    // 2. Most total points
    candidates.sort((a, b) => {
      if (a.timesInLineup !== b.timesInLineup) return b.timesInLineup - a.timesInLineup;
      return b.totalPoints - a.totalPoints;
    });
    
    resultsByPosition.set(targetPosition, candidates[0]);
  }

  return resultsByPosition;
}

// =============================================================================
// MODE 3: MOST YEARS OWNED
// =============================================================================

export function getFavoritePlayerByOwnership(
  allData: LeagueData[],
  userId: string,
  positions: string[] = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']
): Map<string, FavoriteOwnedResult> {
  // Map: playerId -> { yearsOwned: Set<number>, timesInLineup, totalPointsInLineup }
  const playerOwnershipMap = new Map<string, {
    yearsOwned: Set<number>;
    timesInLineup: number;
    totalPointsInLineup: number;
    position: string;
  }>();

  for (const league of allData) {
    const year = Number(league.season);
    const roster = findRosterByUserId(userId, league.rosters);
    if (!roster) continue;
    
    // Get all players on roster at end of season
    const rosterPlayers = roster.players || [];
    
    // Track ownership for each player
    for (const playerId of rosterPlayers) {
      const position = getPlayerPosition(playerId);
      if (!position || !positions.includes(position)) continue;
      
      const existing = playerOwnershipMap.get(playerId) || {
        yearsOwned: new Set<number>(),
        timesInLineup: 0,
        totalPointsInLineup: 0,
        position,
      };
      existing.yearsOwned.add(year);
      playerOwnershipMap.set(playerId, existing);
    }
    
    // Track lineup appearances and points
    const maxWeek = getMaxWeek(league);
    
    for (const matchupInfo of league.matchupInfo) {
      const week = matchupInfo.week;
      
      if (week > maxWeek) continue;
      if (!shouldIncludeWeek(league, week, roster.roster_id, userId)) continue;
      
      const userMatchup = matchupInfo.matchups.find(m => m.roster_id === roster.roster_id);
      if (!userMatchup) continue;
      
      for (const playerId of userMatchup.starters) {
        if (!playerId || playerId === '0') continue;
        
        const position = getPlayerPosition(playerId);
        if (!position || !positions.includes(position)) continue;
        
        const points = userMatchup.players_points?.[playerId] || 0;
        
        const existing = playerOwnershipMap.get(playerId);
        if (existing) {
          existing.timesInLineup++;
          existing.totalPointsInLineup += points;
        }
      }
    }
  }

  // Convert to results by position
  const resultsByPosition = new Map<string, FavoriteOwnedResult>();

  for (const targetPosition of positions) {
    const candidates: FavoriteOwnedResult[] = [];
    
    const entries = Array.from(playerOwnershipMap.entries());
    for (const [playerId, info] of entries) {
      if (info.position !== targetPosition) continue;
      
      candidates.push({
        position: targetPosition,
        playerId,
        playerName: getPlayerName(playerId),
        yearsOwned: info.yearsOwned.size,
        timesInLineup: info.timesInLineup,
        totalPointsInLineup: info.totalPointsInLineup,
        yearsList: Array.from(info.yearsOwned).sort((a: number, b: number) => a - b),
      });
    }
    
    if (candidates.length === 0) continue;
    
    // Sort by tiebreakers:
    // 1. Most years owned
    // 2. Most times in active lineup
    // 3. Most points in active lineup
    candidates.sort((a, b) => {
      if (a.yearsOwned !== b.yearsOwned) return b.yearsOwned - a.yearsOwned;
      if (a.timesInLineup !== b.timesInLineup) return b.timesInLineup - a.timesInLineup;
      return b.totalPointsInLineup - a.totalPointsInLineup;
    });
    
    resultsByPosition.set(targetPosition, candidates[0]);
  }

  return resultsByPosition;
}

// =============================================================================
// CONVENIENCE METHODS - Get all modes at once
// =============================================================================

export interface AllFavoritePlayersResult {
  byDraft: Map<string, FavoriteDraftedResult>;
  byLineup: Map<string, FavoriteLineupResult>;
  byOwnership: Map<string, FavoriteOwnedResult>;
}

export async function getAllFavoritePlayers(
  allData: LeagueData[],
  userId: string,
  positions: string[] = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']
): Promise<AllFavoritePlayersResult> {
  const [byDraft, byLineup, byOwnership] = await Promise.all([
    getFavoritePlayerByDraft(allData, userId, positions),
    Promise.resolve(getFavoritePlayerByLineup(allData, userId, positions)),
    Promise.resolve(getFavoritePlayerByOwnership(allData, userId, positions)),
  ]);

  return {
    byDraft,
    byLineup,
    byOwnership,
  };
}

// =============================================================================
// FORMATTING HELPERS
// =============================================================================

export function formatDraftDetails(details: DraftDetail[]): string {
  return details
    .map(d => `${d.year} (Round ${d.round}, Pick ${d.pick_no})`)
    .join(', ');
}

export function formatLineupStats(result: FavoriteLineupResult): string {
  return `${result.timesInLineup} games, ${result.avgPointsPerGame.toFixed(2)} avg PPG`;
}

export function formatOwnershipStats(result: FavoriteOwnedResult): string {
  return `${result.yearsOwned} years, ${result.timesInLineup} starts, ${result.totalPointsInLineup.toFixed(2)} total pts`;
}
