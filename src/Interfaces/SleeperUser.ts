interface SleeperUser {
    user_id: string;
    metadata: {
      team_name: string;
      mention_pn: string;
      mascot_message_emotion_leg_1: string;
      mascot_item_type_id_leg_9: string;
      mascot_item_type_id_leg_8: string;
      mascot_item_type_id_leg_7: string;
      mascot_item_type_id_leg_6: string;
      mascot_item_type_id_leg_5: string;
      mascot_item_type_id_leg_4: string;
      mascot_item_type_id_leg_3: string;
      mascot_item_type_id_leg_2: string;
      mascot_item_type_id_leg_17: string;
      mascot_item_type_id_leg_16: string;
      mascot_item_type_id_leg_15: string;
      mascot_item_type_id_leg_14: string;
      mascot_item_type_id_leg_13: string;
      mascot_item_type_id_leg_12: string;
      mascot_item_type_id_leg_11: string;
      mascot_item_type_id_leg_10: string;
      mascot_item_type_id_leg_1: string;
      avatar: string | null;
      allow_pn: string;
    };
    league_id: string;
    is_owner: boolean;
    is_bot: boolean;
    display_name: string;
    avatar: string | null;
    archived?: string; // Add any optional properties if available
  }
  
  export default SleeperUser;
  