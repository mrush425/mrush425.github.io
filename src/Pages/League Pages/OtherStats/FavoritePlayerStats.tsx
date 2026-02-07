import React, { useState, useEffect, useMemo } from 'react';
import { OtherComponentProps } from '../../../Interfaces/OtherStatItem';
import LeagueData from '../../../Interfaces/LeagueData';
import SleeperUser from '../../../Interfaces/SleeperUser';
import {
  getFavoritePlayerByDraft,
  getFavoritePlayerByLineup,
  getFavoritePlayerByOwnership,
  FavoriteDraftedResult,
  FavoriteLineupResult,
  FavoriteOwnedResult,
  formatDraftDetails,
} from '../../../Helper Files/FavoritePlayerMethods';

type FavoriteMode = 'draft' | 'lineup' | 'ownership';
type Position = 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DEF';

interface UserFavoriteRow {
  userId: string;
  teamName: string;
  playerName: string;
  details: string;
  sortValue: number;
  sortValueSecondary: number; // For tiebreaker (earliest pick for draft, total points for lineup/ownership)
}

const POSITIONS: Position[] = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];

const FavoritePlayerStats: React.FC<OtherComponentProps> = ({ data, minYears = 0 }) => {
  const [selectedPosition, setSelectedPosition] = useState<Position>('QB');
  const [selectedMode, setSelectedMode] = useState<FavoriteMode>('draft');
  const [loading, setLoading] = useState(false);
  
  // Cached results for each user
  const [draftResults, setDraftResults] = useState<Map<string, Map<string, FavoriteDraftedResult>>>(new Map());
  const [lineupResults, setLineupResults] = useState<Map<string, Map<string, FavoriteLineupResult>>>(new Map());
  const [ownershipResults, setOwnershipResults] = useState<Map<string, Map<string, FavoriteOwnedResult>>>(new Map());
  
  const [sortColumn, setSortColumn] = useState<string>('details');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Get all unique users across all years, filtered by minYears
  const allUsers = useMemo(() => {
    const userMap = new Map<string, SleeperUser>();
    const yearsMap = new Map<string, number>();
    const currentYear = new Date().getFullYear().toString();
    data.forEach((league: LeagueData) => {
      const isCompleted = league.season !== currentYear;
      league.users.forEach((user: SleeperUser) => {
        if (!userMap.has(user.user_id)) {
          userMap.set(user.user_id, user);
        }
        if (isCompleted) {
          yearsMap.set(user.user_id, (yearsMap.get(user.user_id) ?? 0) + 1);
        }
      });
    });
    return Array.from(userMap.values()).filter(
      (u) => (yearsMap.get(u.user_id) ?? 0) >= minYears
    );
  }, [data, minYears]);

  // Load draft results (async)
  useEffect(() => {
    const loadDraftResults = async () => {
      setLoading(true);
      const newDraftResults = new Map<string, Map<string, FavoriteDraftedResult>>();
      
      for (const user of allUsers) {
        try {
          const results = await getFavoritePlayerByDraft(data, user.user_id, POSITIONS);
          newDraftResults.set(user.user_id, results);
        } catch (error) {
          console.error(`Error loading draft results for user ${user.user_id}:`, error);
        }
      }
      
      setDraftResults(newDraftResults);
      setLoading(false);
    };
    
    loadDraftResults();
  }, [data, allUsers]);

  // Load lineup and ownership results (sync, so do immediately)
  useEffect(() => {
    const newLineupResults = new Map<string, Map<string, FavoriteLineupResult>>();
    const newOwnershipResults = new Map<string, Map<string, FavoriteOwnedResult>>();
    
    for (const user of allUsers) {
      const lineupResult = getFavoritePlayerByLineup(data, user.user_id, POSITIONS);
      newLineupResults.set(user.user_id, lineupResult);
      
      const ownershipResult = getFavoritePlayerByOwnership(data, user.user_id, POSITIONS);
      newOwnershipResults.set(user.user_id, ownershipResult);
    }
    
    setLineupResults(newLineupResults);
    setOwnershipResults(newOwnershipResults);
  }, [data, allUsers]);

  // Build table rows based on selected mode and position
  const rows = useMemo<UserFavoriteRow[]>(() => {
    const result: UserFavoriteRow[] = [];
    
    for (const user of allUsers) {
      const teamName = user.metadata?.team_name || user.display_name || `User ${user.user_id.substring(0, 4)}`;
      let playerName = 'None';
      let details = '-';
      let sortValue = 0;
      let sortValueSecondary = 999999; // Default high for tiebreaker (lower is better for draft picks)
      
      if (selectedMode === 'draft') {
        const userDraftMap = draftResults.get(user.user_id);
        const favPlayer = userDraftMap?.get(selectedPosition);
        if (favPlayer) {
          playerName = favPlayer.playerName;
          details = `${favPlayer.timesDrafted}x: ${formatDraftDetails(favPlayer.draftDetails)}`;
          sortValue = favPlayer.timesDrafted;
          // Earliest pick (lowest pick_no) for tiebreaker
          sortValueSecondary = favPlayer.earliestRound;
        }
      } else if (selectedMode === 'lineup') {
        const userLineupMap = lineupResults.get(user.user_id);
        const favPlayer = userLineupMap?.get(selectedPosition);
        if (favPlayer) {
          playerName = favPlayer.playerName;
          details = `${favPlayer.timesInLineup} games, ${favPlayer.avgPointsPerGame.toFixed(2)} PPG (${favPlayer.totalPoints.toFixed(1)} total)`;
          sortValue = favPlayer.timesInLineup;
          sortValueSecondary = -favPlayer.totalPoints; // Negative so higher points sorts first
        }
      } else if (selectedMode === 'ownership') {
        const userOwnershipMap = ownershipResults.get(user.user_id);
        const favPlayer = userOwnershipMap?.get(selectedPosition);
        if (favPlayer) {
          playerName = favPlayer.playerName;
          details = `${favPlayer.yearsOwned} years (${favPlayer.yearsList.join(', ')}), ${favPlayer.timesInLineup} starts, ${favPlayer.totalPointsInLineup.toFixed(1)} pts`;
          sortValue = favPlayer.yearsOwned;
          sortValueSecondary = -favPlayer.timesInLineup; // Negative so more starts sorts first
        }
      }
      
      result.push({
        userId: user.user_id,
        teamName,
        playerName,
        details,
        sortValue,
        sortValueSecondary,
      });
    }
    
    // Sort rows
    result.sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (sortColumn) {
        case 'teamName':
          aValue = a.teamName.toLowerCase();
          bValue = b.teamName.toLowerCase();
          break;
        case 'playerName':
          aValue = a.playerName.toLowerCase();
          bValue = b.playerName.toLowerCase();
          break;
        case 'details':
          aValue = a.sortValue;
          bValue = b.sortValue;
          break;
        default:
          aValue = a.teamName.toLowerCase();
          bValue = b.teamName.toLowerCase();
      }
      
      if (sortDirection === 'asc') {
        if (aValue !== bValue) return aValue > bValue ? 1 : -1;
        // Tiebreaker: secondary sort (lower is better)
        return a.sortValueSecondary > b.sortValueSecondary ? 1 : -1;
      } else {
        if (aValue !== bValue) return aValue < bValue ? 1 : -1;
        // Tiebreaker: secondary sort (lower is better)
        return a.sortValueSecondary > b.sortValueSecondary ? 1 : -1;
      }
    });
    
    return result;
  }, [allUsers, selectedMode, selectedPosition, draftResults, lineupResults, ownershipResults, sortColumn, sortDirection]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection(column === 'details' ? 'desc' : 'asc');
    }
  };

  const getModeLabel = () => {
    switch (selectedMode) {
      case 'draft': return 'Times Drafted';
      case 'lineup': return 'Games Started';
      case 'ownership': return 'Years Owned';
    }
  };

  return (
    <div className="regular-season-records">
      {/* Position Radio Buttons */}
      <div className="filter-row" style={{ marginBottom: '15px', textAlign: 'center' }}>
        <span style={{ marginRight: '10px', fontWeight: 600 }}>Position:</span>
        {POSITIONS.map((pos) => (
          <label key={pos} style={{ marginRight: '15px', cursor: 'pointer' }}>
            <input
              type="radio"
              name="position"
              value={pos}
              checked={selectedPosition === pos}
              onChange={() => setSelectedPosition(pos)}
              style={{ marginRight: '4px' }}
            />
            {pos}
          </label>
        ))}
      </div>

      {/* Mode Radio Buttons */}
      <div className="filter-row" style={{ marginBottom: '20px', textAlign: 'center' }}>
        <span style={{ marginRight: '10px', fontWeight: 600 }}>Mode:</span>
        <label style={{ marginRight: '15px', cursor: 'pointer' }}>
          <input
            type="radio"
            name="mode"
            value="draft"
            checked={selectedMode === 'draft'}
            onChange={() => setSelectedMode('draft')}
            style={{ marginRight: '4px' }}
          />
          By Draft
        </label>
        <label style={{ marginRight: '15px', cursor: 'pointer' }}>
          <input
            type="radio"
            name="mode"
            value="lineup"
            checked={selectedMode === 'lineup'}
            onChange={() => setSelectedMode('lineup')}
            style={{ marginRight: '4px' }}
          />
          By Lineup
        </label>
        <label style={{ marginRight: '15px', cursor: 'pointer' }}>
          <input
            type="radio"
            name="mode"
            value="ownership"
            checked={selectedMode === 'ownership'}
            onChange={() => setSelectedMode('ownership')}
            style={{ marginRight: '4px' }}
          />
          By Ownership
        </label>
      </div>

      {/* Loading state */}
      {loading && selectedMode === 'draft' && (
        <div className="notImplementedMessage">Loading draft data...</div>
      )}

      {/* Table */}
      {(!loading || selectedMode !== 'draft') && (
        <table className="leagueStatsTable regular-season-table">
          <thead>
            <tr>
              <th
                className={`sortable ${sortColumn === 'teamName' ? `sorted-${sortDirection}` : ''}`}
                onClick={() => handleSort('teamName')}
              >
                Team
              </th>
              <th
                className={`sortable ${sortColumn === 'playerName' ? `sorted-${sortDirection}` : ''}`}
                onClick={() => handleSort('playerName')}
              >
                Favorite {selectedPosition}
              </th>
              <th
                className={`sortable ${sortColumn === 'details' ? `sorted-${sortDirection}` : ''}`}
                onClick={() => handleSort('details')}
              >
                {getModeLabel()}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.userId} className={idx % 2 === 0 ? 'even-row' : 'odd-row'}>
                <td className="team-name-cell">{row.teamName}</td>
                <td>{row.playerName}</td>
                <td>{row.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default FavoritePlayerStats;
