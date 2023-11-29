import UserWeekStats from "./UserWeekStats";

interface AllUserWeekStats{
    user_id: string;
    team_name: string;
    user_week_stats: UserWeekStats[];
  }
  
  export default AllUserWeekStats;