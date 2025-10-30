interface YearTrollData {
  year: number;
  data: PlayerSeason[];
}

interface PlayerSeason {
  year: number;
  player_name: string;
  place: number;
  money_earned: number;
  draft_position: number;
  draft_choice: number;
  best_team_votes: number;
  worst_team_votes: number;

  helmet_master: string;              // e.g., "Carolina Panthers"
  HM_sleeper_id: string;              // e.g., "CAR"
  HM_guessed_record: string;          // e.g., "13-3"

  HM_4th_string: string;
  HM_4th_string_sleeper_id: number | "";

  first_round_draft_pick: string;
  first_round_draft_pick_sleeper_id: number;

  sleeper_id: string;
}

export default YearTrollData;