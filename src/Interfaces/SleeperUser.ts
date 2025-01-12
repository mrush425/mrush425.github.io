interface SleeperUser {
    user_id: string;
    metadata: {
      team_name: string;
      mention_pn: string;
      allow_pn: string;
      avatar: string;
    };
    league_id: string;
    is_owner: boolean;
    is_bot: boolean;
    display_name: string;
    avatar: string | null;
    archived?: string; // Add any optional properties if available
  }
  
  export default SleeperUser;
  