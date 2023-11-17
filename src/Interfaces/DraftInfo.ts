interface DraftInfo {
    type: string;
    status: string;
    start_time: number;
    sport: string;
    slot_to_roster_id: Record<string, number>;
    settings: {
      teams: number;
      slots_wr: number;
      slots_te: number;
      slots_rb: number;
      slots_qb: number;
      slots_k: number;
      slots_flex: number;
      slots_def: number;
      slots_bn: number;
      rounds: number;
      reversal_round: number;
      player_type: number;
      pick_timer: number;
      nomination_timer: number;
      cpu_autopick: number;
      autostart: number;
      autopause_start_time: number;
      autopause_end_time: number;
      autopause_enabled: number;
      alpha_sort: number;
    };
    season_type: string;
    season: string;
    metadata: {
      scoring_type: string;
      name: string;
      description: string;
    };
    league_id: string;
    last_picked: number;
    last_message_time: number;
    last_message_id: string;
    draft_order: Record<string, number>;
    draft_id: string;
    creators: string[];
    created: number;
  }

  export default DraftInfo;