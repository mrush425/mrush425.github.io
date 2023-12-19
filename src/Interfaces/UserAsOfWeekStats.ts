interface UserAsOfWeekStats {
    user_id: string;
    wins: number;
    losses: number;
    ties: number;
    rank: number;
    pointsFor: number;
    pointsAgainst: number;
    week: number;
  }
  
  export default UserAsOfWeekStats;
  