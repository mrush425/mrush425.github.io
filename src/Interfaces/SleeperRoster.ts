interface PlayerSettings {
  wins: number;
  waiver_position: number;
  waiver_budget_used: number;
  total_moves: number;
  ties: number;
  ppts_decimal: number;
  ppts: number;
  losses: number;
  fpts_decimal: number;
  fpts_against_decimal: number;
  fpts_against: number;
  fpts: number;
}

interface SleeperRoster {
  taxi: null;
  starters: string[];
  settings: PlayerSettings;
  roster_id: number;
  reserve: string[] | null;
  players: string[];
  player_map: null;
  owner_id: string;
  league_id: string;
  keepers: null;
  co_owners: null;
}

export default SleeperRoster