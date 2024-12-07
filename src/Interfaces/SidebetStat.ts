import SleeperUser from "./SleeperUser";

class SidebetStat {
    user: SleeperUser | undefined;
    stat_number: number | undefined;
    stats_record: Record | undefined;
    stats_display: string | undefined;
    year: number | undefined;

    constructor() {

    }

    DisplayRecord(): string{
        if(this.stats_record){
            const winPercentage = (this.stats_record.wins*100) / (this.stats_record.losses+this.stats_record.ties+this.stats_record.wins);
            return this.stats_record.wins + "-" + this.stats_record.losses + "-" + this.stats_record.ties + " (" + winPercentage.toFixed(2) + "%)";
        }
        return "";
    }
}

export interface Record{
    wins: number;
    losses: number;
    ties: number;
}

export default SidebetStat;