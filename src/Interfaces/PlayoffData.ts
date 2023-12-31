//PlayoffData.ts
interface PlayoffData {
    year: string;
    playoffMatchups: PlayoffMatchup[];
}

export interface PlayoffMatchup {
    week: number;
    troll: string;
    matchupId: string;
}

export default PlayoffData;