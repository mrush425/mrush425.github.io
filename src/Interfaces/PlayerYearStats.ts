interface Player_Simple {
    years_exp: number | null;
    team: string;
    position: string;
    news_updated: number | null;
    metadata: {
      rookie_year: string;
    } | null;
    last_name: string;
    injury_status: string | null;
    injury_start_date: number | null;
    injury_notes: string | null;
    injury_body_part: string | null;
    first_name: string;
    fantasy_positions: string[];
  }
  
  interface YearStats {
    rush_tkl_loss: number;
    bonus_fd_rb: number;
    rush_td_40p: number;
    rec_yd: number;
    pts_ppr: number;
    fum: number;
    rec_tgt: number;
    rush_40p: number;
    bonus_rec_rb: number;
    rush_yd: number;
    anytime_tds: number;
    rush_rec_yd: number;
    rush_rz_att: number;
    rec_td_lng: number;
    rec_10_19: number;
    rec_ypr: number;
    rec_air_yd: number;
    pts_half_ppr: number;
    rush_yac: number;
    rush_tkl_loss_yd: number;
    off_snp: number;
    rec_rz_tgt: number;
    rank_ppr: number;
    pos_rank_ppr: number;
    tm_off_snp: number;
    gs: number;
    rush_ypa: number;
    rec_5_9: number;
    rush_att: number;
    rec_fd: number;
    fum_lost: number;
    rec_yar: number;
    rec: number;
    rush_fd: number;
    bonus_rush_rec_yd_100: number;
    tm_st_snp: number;
    rec_lng: number;
    pts_std: number;
    st_snp: number;
    pass_rush_yd: number;
    rush_btkl: number;
    rush_td: number;
    pos_rank_half_ppr: number;
    rank_std: number;
    rec_20_29: number;
    rec_ypt: number;
    rec_td: number;
    gms_active: number;
    tm_def_snp: number;
    rec_0_4: number;
    rank_half_ppr: number;
    gp: number;
    pos_rank_std: number;
    bonus_rush_yd_100: number;
    rush_td_lng: number;
    rush_lng: number;
  }
  
  interface PlayerYearStats {
    player: Player_Simple;
    opponent: null;
    company: string;
    team: string;
    game_id: string;
    player_id: string;
    sport: string;
    season_type: string;
    season: string;
    week: number | null;
    last_modified: number;
    category: string;
    stats: YearStats;
    date: null;
  }
  
  export default PlayerYearStats;