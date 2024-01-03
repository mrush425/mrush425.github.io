import SleeperUser from "./SleeperUser";

class SidebetStat {
    user: SleeperUser | undefined;
    stat_number: number | undefined;
    stats_record: Record | undefined;
    stats_display: string | undefined;

    constructor() {

    }
}

interface Record{
    wins: number;
    losses: number;
    ties: number;
}

export default SidebetStat;