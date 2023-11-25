import PlayerYearStats from "../../Interfaces/PlayerYearStats";
import SleeperUser from "../../Interfaces/SleeperUser";


export const calculatePercentileRanges = (listLength: number): [number, number, number, number, number, number] => {
    const firstPercentile = Math.floor(listLength * 0.05);
    const secondPercentile = Math.floor(listLength * 0.2);
    const thirdPercentile = Math.floor(listLength * 0.4);
    const fourthPercentile = Math.floor(listLength * 0.6);
    const fifthPercentile = Math.floor(listLength * 0.8);
    const sixthPercentile = Math.floor(listLength * 0.95);
  
    return [firstPercentile, secondPercentile, thirdPercentile, fourthPercentile, fifthPercentile, sixthPercentile];
  };
  
  export const populatePositionOrderedLists = (playerStats: PlayerYearStats[]): Record<string, PlayerYearStats[]> => {
    let positionOrderedLists: Record<string, PlayerYearStats[]> = {};
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
          positionOrderedLists[position].sort((a, b) => {
              const ptsA = a.stats.pts_half_ppr ?? 0;
              const ptsB = b.stats.pts_half_ppr ?? 0;
  
              return ptsB - ptsA;
          });
      }
    }
    return positionOrderedLists;
  }

  export const getBackgroundAndTextColor = (position: string, positionRank: number, playerStats: PlayerYearStats | undefined, positionOrderedLists: Record<string, PlayerYearStats[]>): [string,string] => {
    // Calculate percentile ranges
    const [firstPercentile, secondPercentile, thirdPercentile, fourthPercentile, fifthPercentile, sixthPercentile] =
        calculatePercentileRanges(positionOrderedLists[position]?.length || 0);

    if (playerStats?.player.first_name==="Raheem"){
        console.log(positionRank,firstPercentile, secondPercentile, thirdPercentile, fourthPercentile, fifthPercentile, sixthPercentile);
    }

    // Determine background color based on percentiles
    let backgroundColor = '#ffffff'; // default color
    let textColor = '#000000';

    if (position === 'DEF' || position === 'K') {
        backgroundColor = '#ffffff';
    } else if (positionRank <= firstPercentile) {
        backgroundColor = '#488f31';
        textColor='#ffffff';
    } else if (positionRank <= secondPercentile) {
        backgroundColor = '#87b474';
    } else if (positionRank <= thirdPercentile) {
        backgroundColor = '#c3d9b8';
    } else if (positionRank <= fourthPercentile) {
        backgroundColor = '#fffad6';
    } else if (positionRank <= fifthPercentile) {
        backgroundColor = '#fcc4c5';
    } else if (positionRank <= sixthPercentile) {
        backgroundColor = '#f1878e';
    } else {
        backgroundColor = '#de425b';
        textColor='#ffffff';
    }
    return [backgroundColor,textColor];
}

export const getUserTeamName = (userId: string, users: SleeperUser[]): string => {
    const user = users.find((u) => u.user_id === userId);
    return user?.metadata.team_name || 'Unknown Team';
}

export const getPlayerStats = (playerId: string, playerStats: PlayerYearStats[]): PlayerYearStats | undefined => {
    return playerStats.find((stats) => stats.player_id === playerId);
}