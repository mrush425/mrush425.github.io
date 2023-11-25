import MatchupInfo from "./MatchupInfo";
import SleeperRoster from "./SleeperRoster";
import SleeperUser from "./SleeperUser";

interface ScoringSettings {
    st_ff: number;
    pts_allow_7_13: number;
    def_st_ff: number;
    rec_yd: number;
    fum_rec_td: number;
    pts_allow_35p: number;
    pts_allow_28_34: number;
    fum: number;
    rush_yd: number;
    pass_td: number;
    blk_kick: number;
    pass_yd: number;
    safe: number;
    def_td: number;
    fgm_50p: number;
    def_st_td: number;
    fum_rec: number;
    rush_2pt: number;
    fgmiss_0_19: number;
    xpm: number;
    pts_allow_21_27: number;
    fgm_20_29: number;
    fgmiss_20_29: number;
    pts_allow_1_6: number;
    fum_lost: number;
    def_st_fum_rec: number;
    int: number;
    fgm_0_19: number;
    pts_allow_14_20: number;
    rec: number;
    fgmiss_30_39: number;
    ff: number;
    fgmiss: number;
    st_fum_rec: number;
    rec_2pt: number;
    rush_td: number;
    xpmiss: number;
    fgm_30_39: number;
    rec_td: number;
    st_td: number;
    pass_2pt: number;
    pts_allow_0: number;
    pass_int: number;
    fgm_40_49: number;
    sack: number;
  }
  
  interface Settings {
    daily_waivers_last_ran: number;
    reserve_allow_cov: number;
    reserve_slots: number;
    leg: number;
    offseason_adds: number;
    bench_lock: number;
    trade_review_days: number;
    league_average_match: number;
    waiver_type: number;
    max_keepers: number;
    type: number;
    pick_trading: number;
    daily_waivers: number;
    taxi_years: number;
    trade_deadline: number;
    reserve_allow_sus: number;
    reserve_allow_out: number;
    playoff_round_type: number;
    waiver_day_of_week: number;
    taxi_allow_vets: number;
    reserve_allow_dnr: number;
    reserve_allow_doubtful: number;
    waiver_clear_days: number;
    playoff_week_start: number;
    daily_waivers_days: number;
    last_scored_leg: number;
    taxi_slots: number;
    playoff_type: number;
    daily_waivers_hour: number;
    num_teams: number;
    squads: number;
    playoff_teams: number;
    playoff_seed_type: number;
    start_week: number;
    reserve_allow_na: number;
    draft_rounds: number;
    taxi_deadline: number;
    capacity_override: number;
    disable_adds: number;
    waiver_budget: number;
    last_report: number;
  }
  
  interface Metadata {
    latest_league_winner_roster_id: string;
    continued: string;
  }

  interface NflSeasonInfo{
    season_start_date: string;
    previous_season: string;
    league_create_season: string;
    display_week: number;
    league_season: string;
    season_type: string;
    season: string;
    leg: number;
    week: number;
  }
  
  interface LeagueData {
    total_rosters: number;
    loser_bracket_id: number;
    group_id: null;
    bracket_id: number;
    roster_positions: string[];
    previous_league_id: string;
    league_id: string;
    draft_id: string;
    last_read_id: null;
    last_pinned_message_id: null;
    last_message_time: number;
    last_message_text_map: null;
    last_message_attachment: null;
    last_author_is_bot: boolean;
    last_author_id: string;
    last_author_display_name: string;
    last_author_avatar: null;
    last_message_id: string;
    avatar: null;
    scoring_settings: ScoringSettings;
    company_id: null;
    sport: string;
    season_type: string;
    season: string;
    shard: number;
    settings: Settings;
    metadata: Metadata;
    nflSeasonInfo: NflSeasonInfo;
    status: string;
    name: string;
    rosters: SleeperRoster[];
    users: SleeperUser[];
    matchupInfo: MatchupInfo[];
  }


  
  export default LeagueData;