import React, { useState, useEffect } from 'react';
import LeagueData from '../../Interfaces/LeagueData';
import YearNavBar from '../../Navigation/YearNavBar';
import DraftPick from '../../Interfaces/DraftPick';
import SleeperUser from '../../Interfaces/SleeperUser';
import SleeperRoster from '../../Interfaces/SleeperRoster';
import PlayerYearStats from '../../Interfaces/PlayerYearStats';
import '../../Stylesheets/Year Stylesheets/DraftHeatMap.css'; // Create a CSS file for styling
import DraftInfo from '../../Interfaces/DraftInfo';
import {getBackgroundAndTextColor, getPlayerStats, populatePositionOrderedLists } from './SharedDraftMethods';

interface DraftHeatMapProps {
  data: LeagueData;
}

let positionOrderedLists: Record<string, PlayerYearStats[]> = {};

const DraftHeatMap: React.FC<DraftHeatMapProps> = ({ data }) => {

  const [draftPicks, setDraftPicks] = useState<DraftPick[]>([]);
  const [draftInfo, setDraftInfo] = useState<DraftInfo[]>([]);
  const [rosters, setRosters] = useState<SleeperRoster[]>([]);
  const [users, setUsers] = useState<SleeperUser[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerYearStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [picksResponse, infoResponse, rostersResponse, usersResponse] = await Promise.all([
          fetch(`https://api.sleeper.app/v1/draft/${data.draft_id}/picks`),
          fetch(`https://api.sleeper.app/v1/draft/${data.draft_id}`),
          fetch(`https://api.sleeper.app/v1/league/${data.league_id}/rosters`),
          fetch(`https://api.sleeper.app/v1/league/${data.league_id}/users`),
        ]);
  
        const picks: DraftPick[] = await picksResponse.json();
        const info: DraftInfo[] | DraftInfo = await infoResponse.json();
        const rosters: SleeperRoster[] = await rostersResponse.json();
        const users: SleeperUser[] = await usersResponse.json();
  
        setDraftPicks(picks);
        setDraftInfo(Array.isArray(info) ? info : [info]);
        setRosters(rosters);
        setUsers(users);
  
        const playerIds = picks.map((pick) => pick.player_id);
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
        positionOrderedLists=populatePositionOrderedLists(playerStatsData);

      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };
  
    fetchData();
  }, [data.draft_id, data.league_id, data.season]);

  const draftPicksByRound: Record<number, DraftPick[]> = {};
  draftPicks.forEach((pick) => {
    const round = pick.round;
    if (!draftPicksByRound[round]) {
      draftPicksByRound[round] = [];
    }
    draftPicksByRound[round].push(pick);
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Convert draft_order object to an array of userIds in the correct order
  const orderedUserIds: string[] = Object.keys(draftInfo[0]?.draft_order || {}).sort(
    (a, b) => draftInfo[0].draft_order[a] - draftInfo[0].draft_order[b]
  );

  // Fetch corresponding team names from SleeperUser objects
  const orderedTeamNames: string[] = orderedUserIds.map((userId) => {
    const user = users.find((u) => u.user_id === userId);
    return user ? user.metadata.team_name || 'Unknown Team' : 'Unknown Team';
  });

  const renderHeaderRow = (): React.ReactNode => {
    return (
      <tr>
        {orderedTeamNames.map((teamName, index) => (
          // Add a condition to render the th only if teamName is not "Unknown Team"
          teamName !== 'Unknown Team' && <th key={index}>{teamName}</th>
        ))}
      </tr>
    );
  };

  const generateCellContent = (pick: DraftPick, playerStats: PlayerYearStats[], positionOrderedLists: Record<string, PlayerYearStats[]>, users: SleeperUser[], textColor: string): React.ReactNode => {
    const playerStat = getPlayerStats(pick.player_id, playerStats);
    const position = playerStat?.player.position || '';
    const positionList = positionOrderedLists[position] || [];
    const index = positionList.findIndex((p) => p.player_id === pick.player_id);
    const pickedByUser = users.find((user) => user.user_id === pick.picked_by);
  
    return (
      <div style={{ color: textColor }}>  {/* Add style attribute for text color */}
        <div>{`${pick.metadata.first_name} ${pick.metadata.last_name}`}</div>
        <div>{`Points: ${playerStat?.stats.pts_half_ppr}`}</div>
        {pickedByUser && <div>{`Picked by: ${pickedByUser.metadata.team_name}`}</div>}
        <div>{`Rank of drafted ${playerStat?.player.position}: ${index + 1}`}</div>
      </div>
    );
  };
  
  const renderOddOrEvenRoundPicks = (picksInRound: DraftPick[] | null, isOddRound: boolean): React.ReactNode[] => {
    if (!picksInRound) return [];
    return (isOddRound ? picksInRound : picksInRound.slice().reverse()).map((pick) => {
      const individualPlayerStats = getPlayerStats(pick.player_id, playerStats);
      const position = individualPlayerStats?.player.position || '';
      const positionList = positionOrderedLists[position] || [];
      const playerRank = positionList.findIndex((p) => p.player_id === pick.player_id)+1;

      const [backgroundColor,textColor] = getBackgroundAndTextColor(position, playerRank, individualPlayerStats,positionOrderedLists);
  
      return (
        <td key={pick.pick_no} style={{ backgroundColor }}>
          {generateCellContent(pick, playerStats, positionOrderedLists, users,textColor)}
        </td>
      );
    });
  };
  
  const renderOddRoundPicks = (picksInRound: DraftPick[] | null): React.ReactNode[] => {
    return renderOddOrEvenRoundPicks(picksInRound, true);
  };
  
  const renderEvenRoundPicks = (picksInRound: DraftPick[] | null): React.ReactNode[] => {
    return renderOddOrEvenRoundPicks(picksInRound, false);
  };

  const renderTableBody = (): React.ReactNode[] => {
    return Object.keys(draftPicksByRound).map((roundStr) => {
      const round = parseInt(roundStr, 10);
      const picksInRound = draftPicksByRound[round];
      const isOddRound = round % 2 !== 0;

      return (
        <tr key={round}>
          {isOddRound ? renderOddRoundPicks(picksInRound) : renderEvenRoundPicks(picksInRound)}
        </tr>
      );
    });
  };

  return (
    <div>
      <YearNavBar data={data} />

      <table className="draft-heatmap-table">
        <thead>{renderHeaderRow()}</thead>
        <tbody>{renderTableBody()}</tbody>
      </table>
    </div>
  );
};

export default DraftHeatMap;