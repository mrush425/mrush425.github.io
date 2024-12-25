//PlayoffData.ts
interface PlayoffData {
    year: number;
    data: PlayoffMatchup[];
}

export interface PlayoffMatchup {
    year: number;
    week: number;
    user_id: string;
    matchupId: number;
}

export default PlayoffData;