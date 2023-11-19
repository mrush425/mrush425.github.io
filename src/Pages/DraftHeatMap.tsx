import React, { useState, useEffect } from 'react';
import LeagueData from '../Interfaces/LeagueData';
import YearNavBar from '../Navigation/YearNavBar';
import DraftPick from '../Interfaces/DraftPick';
import SleeperUser from '../Interfaces/SleeperUser';
import SleeperRoster from '../Interfaces/SleeperRoster';
import PlayerYearStats from '../Interfaces/PlayerYearStats';
import '../Stylesheets/DraftHeatMap.css';
import DraftInfo from '../Interfaces/DraftInfo';
import { text } from 'stream/consumers';

interface DraftHeatMapProps {
  data: LeagueData;
}

let positionOrderedLists: Record<string, PlayerYearStats[]> = {};

const populatePositionOrderedLists = (playerStats: PlayerYearStats[]): void => {
  positionOrderedLists={};
  playerStats.forEach((stats) => {
    const position = stats.player.position;
    if (!positionOrderedLists[position]) {
      positionOrderedLists[position] = [];
    }

    // Check if the player is already in the list based on the player_id
    const isPlayerInList = positionOrderedLists[position].some((player) => player.player_id === stats.player_id);

    if (!isPlayerInList) {
      positionOrderedLists[position].push(stats);
    }
  });

  // Sort each position list in descending order based on points scored
  for (const position in positionOrderedLists) {
    if (positionOrderedLists.hasOwnProperty(position)) {
      positionOrderedLists[position].sort((a, b) => b.stats.pts_half_ppr - a.stats.pts_half_ppr);
    }
  }

};

const calculatePercentileRanges = (listLength: number): [number, number, number, number, number, number] => {
  const firstPercentile = Math.floor(listLength * 0.05);
  const secondPercentile = Math.floor(listLength * 0.2);
  const thirdPercentile = Math.floor(listLength * 0.4);
  const fourthPercentile = Math.floor(listLength * 0.6);
  const fifthPercentile = Math.floor(listLength * 0.8);
  const sixthPercentile = Math.floor(listLength * 0.95);

  return [firstPercentile, secondPercentile, thirdPercentile, fourthPercentile, fifthPercentile, sixthPercentile];
};


const DraftHeatMap: React.FC<DraftHeatMapProps> = ({ data }) => {
  const getUserTeamName = (userId: string, users: SleeperUser[]): string => {
    const user = users.find((u) => u.user_id === userId);
    return user?.metadata.team_name || 'Unknown Team';
  };

  const getPlayerStats = (playerId: string, playerStats: PlayerYearStats[]): PlayerYearStats | undefined => {
    return playerStats.find((stats) => stats.player_id === playerId);
  };

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
        populatePositionOrderedLists(playerStatsData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [data.draft_id, data.league_id, data.season]);

  useEffect(() => {
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
        populatePositionOrderedLists(playerStatsData);
      } catch (error) {
        console.error('Error fetching player stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRosters();
    fetchUsers();
    fetchPlayerStats();
  }, [data.league_id, data.season, draftPicks]);

  const draftPicksByRound: Record<number, DraftPick[]> = {};
  draftPicks.forEach((pick) => {
    const round = pick.round;
    if (!draftPicksByRound[round]) {
      draftPicksByRound[round] = [];
    }
    draftPicksByRound[round].push(pick);
  });

  const rosterIdToTeamName: Record<number, string> = {};
  rosters.forEach((roster) => {
    rosterIdToTeamName[roster.roster_id] = getUserTeamName(roster.owner_id, users);
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

  const wasPickByRoster = (pickNumber: number, rosterId: number): boolean=> {
    return false;
    const pickRemainder = pickNumber%24;
    if(pickRemainder<=12){
      return rosterId===pickRemainder;
    }
    else{
      return rosterId===24-pickRemainder;
    }
  };

  const generateCellContent = (pick: DraftPick, playerStats: PlayerYearStats[], positionOrderedLists: Record<string, PlayerYearStats[]>, users: SleeperUser[], rosterIdToTeamName: Record<number, string>): React.ReactNode => {
    const playerStat = getPlayerStats(pick.player_id, playerStats);
    const position = playerStat?.player.position || '';
    const positionList = positionOrderedLists[position] || [];
    const index = positionList.findIndex((p) => p.player_id === pick.player_id);
  
    const [firstPercentile, secondPercentile, thirdPercentile, fourthPercentile, fifthPercentile, sixthPercentile] = calculatePercentileRanges(positionList.length);
  
    let textColor = '';  // Add this line
  
    if(position==="DEF" || position==="K"){
      textColor = 'black';
    }
    else if (index < firstPercentile) {
      textColor = 'white';  
    } else if (index < secondPercentile) {
      textColor = 'black'; 
    } else if (index < thirdPercentile) {
      textColor = 'black';  
    } else if (index < fourthPercentile) {
      textColor = 'black';  
    } else if (index < fifthPercentile) {
      textColor = 'black';  
    } else if (index < sixthPercentile) {
      textColor = 'black';  
    } else {
      textColor = 'white';  
    }
  
    const pickedByUser = users.find((user) => user.user_id === pick.picked_by);
    const isPickedByColumnOwner = pickedByUser && wasPickByRoster(pick.pick_no, pick.roster_id);
  
    return (
      <div style={{ color: textColor }}>  {/* Add style attribute for text color */}
        <div>{`${pick.metadata.first_name} ${pick.metadata.last_name}`}</div>
        <div>{`Points: ${playerStat?.stats.pts_half_ppr}`}</div>
        {!isPickedByColumnOwner && pickedByUser && <div>{`Picked by: ${pickedByUser.metadata.team_name}`}</div>}
        <div>{`Rank of drafted ${playerStat?.player.position}: ${index + 1}`}</div>
      </div>
    );
  };
  
  const renderOddOrEvenRoundPicks = (picksInRound: DraftPick[] | null, isOddRound: boolean): React.ReactNode[] => {
    if (!picksInRound) return [];
    return (isOddRound ? picksInRound : picksInRound.slice().reverse()).map((pick) => {
      const playerStat = getPlayerStats(pick.player_id, playerStats);
      const position = playerStat?.player.position || '';
      const positionList = positionOrderedLists[position] || [];
      const index = positionList.findIndex((p) => p.player_id === pick.player_id);
  
      const [firstPercentile, secondPercentile, thirdPercentile, fourthPercentile, fifthPercentile, sixthPercentile] = calculatePercentileRanges(positionList.length);
  
      let backgroundColor = '';

      //console.log(index + " " + firstPercentile+ " " + secondPercentile+ " " + thirdPercentile+ " " + fourthPercentile+ " " + fifthPercentile+ " " + sixthPercentile);

      if (position==="DEF" || position==="K") backgroundColor="#ffffff"
      else if (index < firstPercentile) backgroundColor = '#488f31';
      else if (index < secondPercentile) backgroundColor = '#87b474';
      else if (index < thirdPercentile) backgroundColor = '#c3d9b8';
      else if (index < fourthPercentile) backgroundColor = '#fffad6';
      else if (index < fifthPercentile) backgroundColor = '#fcc4c5';
      else if (index < sixthPercentile) backgroundColor = '#f1878e';
      else backgroundColor = '#de425b';

  
      return (
        <td key={pick.pick_no} style={{ backgroundColor }}>
          {generateCellContent(pick, playerStats, positionOrderedLists, users, rosterIdToTeamName)}
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