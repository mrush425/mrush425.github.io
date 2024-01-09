//PlayoffData.ts
interface PlayoffData {
    year: string;
    playoffMatchups: PlayoffMatchup[];
}

export interface PlayoffMatchup {
    week: number;
    user_id: string;
    matchupId: string;
}

export default PlayoffData;