import UserAsOfWeekStats from "./UserAsOfWeekStats";

interface AllUserAsOfWeekStats{
    user_id: string;
    team_name: string;
    user_week_stats: UserAsOfWeekStats[];
  }
  
  export default AllUserAsOfWeekStats;