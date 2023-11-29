interface PlayerPoints {
    [playerId: string]: number;
  }

interface Matchup {
    players_points: PlayerPoints;
    starters_points: number[];
    starters: string[];
    matchup_id: number;
    custom_points: null | any; // Change 'any' to the appropriate type if necessary
    roster_id: number;
    players: string[];
    points: number;
  }

  export default Matchup;