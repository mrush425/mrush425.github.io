import PlayerYearStats from "../../Interfaces/PlayerYearStats";
import SleeperUser from "../../Interfaces/SleeperUser";


export const calculatePercentileRanges = (listLength: number): [number, number, number, number, number, number] => {
    const firstPercentile = Math.ceil(listLength * 0.05);
    const secondPercentile = Math.ceil(listLength * 0.2);
    const thirdPercentile = Math.ceil(listLength * 0.4);
    const fourthPercentile = Math.ceil(listLength * 0.6);
    const fifthPercentile = Math.ceil(listLength * 0.8);
    const sixthPercentile = Math.ceil(listLength * 0.95);
  
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
    // For K and DEF positions, return light blue
    if (position === 'DEF' || position === 'K') {
        return ['#AED6F1', '#000000'];
    }

    // Calculate percentile ranges for rank-based coloring
    const [firstPercentile, secondPercentile, thirdPercentile, fourthPercentile, fifthPercentile, sixthPercentile] =
        calculatePercentileRanges(positionOrderedLists[position]?.length || 0);

    // Determine background color based on percentiles using the same color scheme
    let backgroundColor = '#ffffff';
    let textColor = '#000000';

    if (positionRank <= firstPercentile) {
        // Top tier performers
        backgroundColor = '#1b5e20';
        textColor = '#ffffff';
    } else if (positionRank <= secondPercentile) {
        // Good performers
        backgroundColor = '#66bb6a';
        textColor = '#ffffff';
    } else if (positionRank <= thirdPercentile) {
        // Above average
        backgroundColor = '#ccffcc';
        textColor = '#004d00';
    } else if (positionRank <= fourthPercentile) {
        // Average
        backgroundColor = '#ffcccc';
        textColor = '#8b0000';
    } else if (positionRank <= fifthPercentile) {
        // Below average
        backgroundColor = '#ff7777';
        textColor = '#4a0e0e';
    } else {
        // Poor performers
        backgroundColor = '#c62828';
        textColor = '#ffffff';
    }
    return [backgroundColor, textColor];
}

export const getValueBasedColor = (draftPick: number, positionRank: number, position: string, totalDraftPicks: number, positionOrderedLists: Record<string, PlayerYearStats[]>, positionDraftStats?: Record<string, { firstRound: number; lastRound: number; totalPicked: number; picksByRound: Record<number, number> }>, playerStats?: PlayerYearStats): [string, string] => {
    // For K and DEF positions, return light blue
    if (position === 'DEF' || position === 'K') {
        return ['#AED6F1', '#000000'];
    }

    // Simple comparison: where was this player picked among their position vs their rank
    // We need to find how many of this position were picked before this pick
    let pickNumberAtPosition = 1;
    
    if (positionDraftStats && positionDraftStats[position]) {
        const { picksByRound, firstRound } = positionDraftStats[position];
        
        // Count how many of this position were picked by this round
        const currentRound = Math.ceil(draftPick / 12);
        for (let r = firstRound; r < currentRound; r++) {
          pickNumberAtPosition += picksByRound[r] || 0;
        }
        
        // Add partial picks in current round
        const picksInCurrentRound = picksByRound[currentRound] || 0;
        const pickInRound = ((draftPick - 1) % 12) + 1;
        if (picksInCurrentRound > 0) {
          pickNumberAtPosition += Math.min(Math.floor(pickInRound / (12 / picksInCurrentRound)), picksInCurrentRound);
        }
    }
    
    // Compare: if pickNumberAtPosition < positionRank, they were picked early (bad)
    //          if pickNumberAtPosition > positionRank, they were picked late (good)
    const rankDifference = pickNumberAtPosition - positionRank; // negative = early/reach, positive = late/value
    
    // Calculate percentile ranking by points for this position
    let pointsPercentile = 1; // Default to worst
    if (playerStats && playerStats.stats) {
        const points = playerStats.stats.pts_half_ppr || 0;
        const positionPlayers = positionOrderedLists[position] || [];
        const betterPlayers = positionPlayers.filter(p => (p.stats.pts_half_ppr || 0) >= points).length;
        pointsPercentile = betterPlayers / Math.max(positionPlayers.length, 1);
    }
    
    let backgroundColor = '#ffffff';
    let textColor = '#000000';

    // Determine color from rank difference (reaches and basic value)
    let rankColor: 'major-reach' | 'reach' | 'minor-reach' | 'neutral' | 'value' | 'great-value' = 'neutral';
    if (rankDifference < -10) {
        rankColor = 'major-reach'; // #c62828
    } else if (rankDifference < -5) {
        rankColor = 'reach'; // #ff7777
    } else if (rankDifference < -2) {
        rankColor = 'minor-reach'; // #ffcccc
    } else if (rankDifference <= 2) {
        rankColor = 'neutral'; // #ccffcc
    } else if (rankDifference <= 5) {
        rankColor = 'value'; // #66bb6a
    } else {
        rankColor = 'great-value'; // #1b5e20
    }

    // Determine color from points percentile (performance requirement)
    let performanceColor: 'stellar' | 'solid' | 'right-on' | 'below' = 'below';
    if (pointsPercentile <= 0.20) {
        performanceColor = 'stellar'; // #1b5e20
    } else if (pointsPercentile <= 0.40) {
        performanceColor = 'solid'; // #66bb6a
    } else if (pointsPercentile <= 0.60) {
        performanceColor = 'right-on'; // #ccffcc
    } else {
        performanceColor = 'below'; // neutral/worse
    }

    // Determine worst of the two criteria
    // Color hierarchy (worst to best): major-reach < reach < minor-reach < below < right-on < neutral < value < solid < great-value < stellar
    const colorRank = {
        'major-reach': 0,
        'reach': 1,
        'minor-reach': 2,
        'below': 3,
        'right-on': 4,
        'neutral': 5,
        'value': 6,
        'solid': 7,
        'great-value': 8,
        'stellar': 9
    } as const;

    const worstColor = colorRank[rankColor] < colorRank[performanceColor] ? rankColor : performanceColor;

    // Map final color to RGB and text color
    const colorMap = {
        'major-reach': ['#c62828', '#ffffff'] as const,
        'reach': ['#ff7777', '#ffffff'] as const,
        'minor-reach': ['#ffcccc', '#8b0000'] as const,
        'below': ['#ccffcc', '#004d00'] as const,
        'right-on': ['#ccffcc', '#004d00'] as const,
        'neutral': ['#ccffcc', '#004d00'] as const,
        'value': ['#66bb6a', '#ffffff'] as const,
        'solid': ['#66bb6a', '#ffffff'] as const,
        'great-value': ['#1b5e20', '#ffffff'] as const,
        'stellar': ['#1b5e20', '#ffffff'] as const
    } as const;

    const [bgColor, textCol] = colorMap[worstColor as keyof typeof colorMap] || ['#ffffff', '#000000'];
    return [bgColor, textCol];
}

export const getUserTeamName = (userId: string, users: SleeperUser[]): string => {
    const user = users.find((u) => u.user_id === userId);
    return user?.metadata.team_name || 'Unknown Team';
}

export const getPlayerStats = (playerId: string, playerStats: PlayerYearStats[]): PlayerYearStats | undefined => {
    return playerStats.find((stats) => stats.player_id === playerId);
}