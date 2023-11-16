// DraftHeatMap.tsx
import React, { useState, useEffect } from 'react';
import LeagueData from '../Interfaces/LeagueData';
import YearNavBar from '../Navigation/YearNavBar';
import DraftPick from '../Interfaces/DraftPick'; // Import the DraftPick interface
import SleeperUser from '../Interfaces/SleeperUser'; // Import the SleeperUser interface
import SleeperRoster from '../Interfaces/SleeperRoster'; // Import the SleeperRoster interface
import PlayerYearStats from '../Interfaces/PlayerYearStats'; // Import the PlayerYearStats interface

import '../Stylesheets/DraftHeatMap.css'; // Import a CSS file for styling

interface DraftHeatMapProps {
  data: LeagueData;
}

const DraftHeatMap: React.FC<DraftHeatMapProps> = ({ data }) => {
  // Helper function to get team name from user ID
  const getUserTeamName = (userId: string, users: SleeperUser[]): string => {
    const user = users.find((u) => u.user_id === userId);
    return user?.metadata.team_name || 'Unknown Team';
  };

  // Helper function to get player stats
  const getPlayerStats = (playerId: string, playerStats: PlayerYearStats[]): PlayerYearStats | undefined => {
    return playerStats.find((stats) => stats.player_id === playerId);
  };

  const [draftPicks, setDraftPicks] = useState<DraftPick[]>([]);
  const [rosters, setRosters] = useState<SleeperRoster[]>([]);
  const [users, setUsers] = useState<SleeperUser[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerYearStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDraftPicks = async () => {
      try {
        const response = await fetch(`https://api.sleeper.app/v1/draft/${data.draft_id}/picks`);
        const picks: DraftPick[] = await response.json();
        setDraftPicks(picks);
      } catch (error) {
        console.error('Error fetching draft picks:', error);
      }
    };

    const fetchRosters = async () => {
      try {
        const response = await fetch(`https://api.sleeper.app/v1/league/${data.league_id}/rosters`);
        const rosters: SleeperRoster[] = await response.json();
        setRosters(rosters);
      } catch (error) {
        console.error('Error fetching rosters:', error);
      }
    };

    const fetchUsers = async () => {
      try {
        const response = await fetch(`https://api.sleeper.app/v1/league/${data.league_id}/users`);
        const users: SleeperUser[] = await response.json();
        setUsers(users);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    const fetchPlayerStats = async () => {
      try {
        const playerIds = draftPicks.map((pick) => pick.player_id);
        const playerStatsResponses = await Promise.all(
          playerIds.map((playerId) =>
            fetch(
              `https://api.sleeper.com/stats/nfl/player/${playerId}?season_type=regular&season=${data.season}`
            )
          )
        );

        const playerStatsData = await Promise.all(
          playerStatsResponses.map((response) => response.json())
        );

        setPlayerStats(playerStatsData);
      } catch (error) {
        console.error('Error fetching player stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDraftPicks();
    fetchRosters();
    fetchUsers();
    fetchPlayerStats();
  }, [data.draft_id, data.league_id, data.season, draftPicks]);

  // Organize draft picks by round
  const draftPicksByRound: Record<number, DraftPick[]> = {};
  draftPicks.forEach((pick) => {
    const round = pick.round;
    if (!draftPicksByRound[round]) {
      draftPicksByRound[round] = [];
    }
    draftPicksByRound[round].push(pick);
  });

  // Map roster ID to team name
  const rosterIdToTeamName: Record<number, string> = {};
  rosters.forEach((roster) => {
    rosterIdToTeamName[roster.roster_id] = getUserTeamName(roster.owner_id, users);
  });

  if (isLoading) {
    // Show a loading screen while data is being fetched
    return <div>Loading...</div>;
  }

  return (
    <div>
      <YearNavBar data={data} />

      {/* Display draft picks using a table with styling */}
      <table className="draft-heatmap-table">
        <thead>
          <tr>
            {draftPicksByRound[1]?.map((pick) => (
              <th key={pick.pick_no}>{rosterIdToTeamName[pick.roster_id]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.keys(draftPicksByRound).map((roundStr) => {
            const round = parseInt(roundStr, 10);
            const picksInRound = draftPicksByRound[round];
            const isOddRound = round % 2 !== 0;

            return (
              <tr key={round}>
                {isOddRound
                  ? picksInRound.map((pick) => (
                      <td key={pick.pick_no}>
                        {pick.metadata.first_name} {pick.metadata.last_name}{' '}
                        {getPlayerStats(pick.player_id, playerStats)?.stats.pos_rank_half_ppr}
                      </td>
                    ))
                  : picksInRound
                      .slice()
                      .reverse()
                      .map((pick) => (
                        <td key={pick.pick_no}>
                          {pick.metadata.first_name} {pick.metadata.last_name}{' '}
                          {getPlayerStats(pick.player_id, playerStats)?.stats.pos_rank_half_ppr}
                        </td>
                      ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default DraftHeatMap;
