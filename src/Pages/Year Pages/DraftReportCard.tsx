import React, { useState, useEffect } from 'react';
import LeagueData from '../../Interfaces/LeagueData';
import YearNavBar from '../../Navigation/YearNavBar';
import DraftPick from '../../Interfaces/DraftPick';
import SleeperUser from '../../Interfaces/SleeperUser';
import SleeperRoster from '../../Interfaces/SleeperRoster';
import PlayerYearStats from '../../Interfaces/PlayerYearStats';
import '../../Stylesheets/Year Stylesheets/DraftReportCard.css'; // Create a CSS file for styling
import DraftInfo from '../../Interfaces/DraftInfo';
import TeamDropdown from './TeamDropdown'; // Adjust the path accordingly
import { text } from 'stream/consumers';

interface DraftReportCardProps {
    data: LeagueData;
}

let positionOrderedLists: Record<string, PlayerYearStats[]> = {};

const populatePositionOrderedLists = (playerStats: PlayerYearStats[]): void => {
    positionOrderedLists = {};
    playerStats.forEach((stats) => {
        const position = stats.player.position;
        if (!positionOrderedLists[position]) {
            positionOrderedLists[position] = [];
        }

        // Check if the player is already in the list based on the player_id
        const isPlayerInList = positionOrderedLists[position].some((player) => player.player_id === stats.player_id);

        if (!isPlayerInList) {
            positionOrderedLists[position].push(stats);
        }
    });

    // Sort each position list in descending order based on points scored
    for (const position in positionOrderedLists) {
        if (positionOrderedLists.hasOwnProperty(position)) {
            positionOrderedLists[position].sort((a, b) => b.stats.pts_half_ppr - a.stats.pts_half_ppr);
        }
    }

};

const calculatePercentileRanges = (listLength: number): [number, number, number, number, number, number] => {
    const firstPercentile = Math.floor(listLength * 0.05);
    const secondPercentile = Math.floor(listLength * 0.2);
    const thirdPercentile = Math.floor(listLength * 0.4);
    const fourthPercentile = Math.floor(listLength * 0.6);
    const fifthPercentile = Math.floor(listLength * 0.8);
    const sixthPercentile = Math.floor(listLength * 0.95);

    return [firstPercentile, secondPercentile, thirdPercentile, fourthPercentile, fifthPercentile, sixthPercentile];
};


const DraftReportCard: React.FC<DraftReportCardProps> = ({ data }) => {
    const getUserTeamName = (userId: string, users: SleeperUser[]): string => {
        const user = users.find((u) => u.user_id === userId);
        return user?.metadata.team_name || 'Unknown Team';
    };

    const getPlayerStats = (playerId: string, playerStats: PlayerYearStats[]): PlayerYearStats | undefined => {
        return playerStats.find((stats) => stats.player_id === playerId);
    };

    const [draftPicks, setDraftPicks] = useState<DraftPick[]>([]);
    const [draftInfo, setDraftInfo] = useState<DraftInfo[]>([]);
    const [rosters, setRosters] = useState<SleeperRoster[]>([]);
    const [users, setUsers] = useState<SleeperUser[]>([]);
    const [allPlayerStats, setPlayerStats] = useState<PlayerYearStats[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [picksResponse, infoResponse, rostersResponse, usersResponse] = await Promise.all([
                    fetch(`https://api.sleeper.app/v1/draft/${data.draft_id}/picks`),
                    fetch(`https://api.sleeper.app/v1/draft/${data.draft_id}`),
                    fetch(`https://api.sleeper.app/v1/league/${data.league_id}/rosters`),
                    fetch(`https://api.sleeper.app/v1/league/${data.league_id}/users`),
                ]);

                const picks: DraftPick[] = await picksResponse.json();
                const info: DraftInfo[] | DraftInfo = await infoResponse.json();
                const rosters: SleeperRoster[] = await rostersResponse.json();
                const users: SleeperUser[] = await usersResponse.json();

                setDraftPicks(picks);
                setDraftInfo(Array.isArray(info) ? info : [info]);
                setRosters(rosters);
                setUsers(users);

                const playerIds = picks.map((pick) => pick.player_id);
                const playerStatsResponses = await Promise.all(
                    playerIds.map((playerId) =>
                        fetch(
                            `https://api.sleeper.com/stats/nfl/player/${playerId}?season_type=regular&season=${data.season}`
                        )
                    )
                );

                const playerStatsData = await Promise.all(
                    playerStatsResponses.map((response) => response.json())
                );

                setPlayerStats(playerStatsData);
                populatePositionOrderedLists(playerStatsData);
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [data.draft_id, data.league_id, data.season]);

    useEffect(() => {
        const fetchRosters = async () => {
            try {
                const response = await fetch(`https://api.sleeper.app/v1/league/${data.league_id}/rosters`);
                const rosters: SleeperRoster[] = await response.json();
                setRosters(rosters);
            } catch (error) {
                console.error('Error fetching rosters:', error);
            }
        };

        const fetchUsers = async () => {
            try {
                const response = await fetch(`https://api.sleeper.app/v1/league/${data.league_id}/users`);
                const users: SleeperUser[] = await response.json();
                setUsers(users);
            } catch (error) {
                console.error('Error fetching users:', error);
            }
        };

        const fetchPlayerStats = async () => {
            try {
                const playerIds = draftPicks.map((pick) => pick.player_id);
                const playerStatsResponses = await Promise.all(
                    playerIds.map((playerId) =>
                        fetch(
                            `https://api.sleeper.com/stats/nfl/player/${playerId}?season_type=regular&season=${data.season}`
                        )
                    )
                );

                const playerStatsData = await Promise.all(
                    playerStatsResponses.map((response) => response.json())
                );

                setPlayerStats(playerStatsData);
                populatePositionOrderedLists(playerStatsData);
            } catch (error) {
                console.error('Error fetching player stats:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRosters();
        fetchUsers();
        fetchPlayerStats();
    }, [data.league_id, data.season, draftPicks]);

    const [selectedTeam, setSelectedTeam] = useState<string>(''); // State to track the selected team
    const [teamDraftPicks, setTeamDraftPicks] = useState<DraftPick[]>([]); // State to store draft picks for the selected team

    // Modify the handleTeamSelect function to use user_id
    const handleTeamSelect = (teamName: string) => {
        const user_id = getUserIdFromTeamName(teamName);

        if (user_id) {
            setSelectedTeam(user_id);

            // Filter draft picks for the selected team
            const teamPicks = draftPicks.filter((pick) => pick.picked_by === user_id);
            setTeamDraftPicks(teamPicks);
        }
    };

    const draftPicksByRound: Record<number, DraftPick[]> = {};
    draftPicks.forEach((pick) => {
        const round = pick.round;
        if (!draftPicksByRound[round]) {
            draftPicksByRound[round] = [];
        }
        draftPicksByRound[round].push(pick);
    });

    const rosterIdToTeamName: Record<number, string> = {};
    rosters.forEach((roster) => {
        rosterIdToTeamName[roster.roster_id] = getUserTeamName(roster.owner_id, users);
    });

    // Add a function to get user_id from team_name
    const getUserIdFromTeamName = (teamName: string): string | undefined => {
        const user = users.find((u) => u.metadata.team_name === teamName);
        return user?.user_id;
    };



    if (isLoading) {
        return <div>Loading...</div>;
    }

    // Convert draft_order object to an array of userIds in the correct order
    const orderedUserIds: string[] = Object.keys(draftInfo[0]?.draft_order || {}).sort(
        (a, b) => draftInfo[0].draft_order[a] - draftInfo[0].draft_order[b]
    );

    // Fetch corresponding team names from SleeperUser objects
    const orderedTeamNames: string[] = orderedUserIds.map((userId) => {
        const user = users.find((u) => u.user_id === userId);
        return user ? user.metadata.team_name || 'Unknown Team' : 'Unknown Team';
    });

    return (
        <div>
            <YearNavBar data={data} />

            {/* Render the TeamDropdown component */}
            <TeamDropdown users={users} onSelectTeam={handleTeamSelect} />

            {/* Render other components or data based on the selected team */}
            {selectedTeam && (
                <div>
                    {/* Display table of draft picks for the selected team */}
                    <table className="team-draft-picks-table">
                        <thead>
                            <tr>
                                <th>Pick No</th>
                                <th>Player Name</th>
                                <th>Position Rank</th>
                                <th>1 After</th>
                                <th>Rank</th>
                                <th>2 After</th>
                                <th>Rank</th>
                                <th>3 After</th>
                                <th>Rank</th>
                            </tr>
                        </thead>
                        <tbody>

                            {Array.isArray(allPlayerStats) &&
                                teamDraftPicks.map((pick, index) => {
                                    const playerStatsItem = getPlayerStats(pick.player_id, allPlayerStats);
                                    if (!playerStatsItem) {
                                        return null; // Skip rendering if playerStatsItem is undefined
                                    }

                                    const position = playerStatsItem.player.position || '';

                                    // Find the index of the player in the ordered list for the corresponding position
                                    const positionRank =
                                        positionOrderedLists[position]?.findIndex((player) => player.player_id === pick.player_id) +
                                        1 || 0;

                                    
                                    const getBackgroundColor = (position: string, positionRank: number, playerStats: PlayerYearStats | undefined): [string,string] => {
                                        // Calculate percentile ranges
                                        const [firstPercentile, secondPercentile, thirdPercentile, fourthPercentile, fifthPercentile, sixthPercentile] =
                                            calculatePercentileRanges(positionOrderedLists[position]?.length || 0);

                                        if (playerStats?.player.first_name==="Raheem"){
                                            console.log(positionRank,firstPercentile, secondPercentile, thirdPercentile, fourthPercentile, fifthPercentile, sixthPercentile);
                                        }

                                        // Determine background color based on percentiles
                                        let backgroundColor = '#ffffff'; // default color
                                        let textColor = '#000000';

                                        if (position === 'DEF' || position === 'K') {
                                            backgroundColor = '#ffffff';
                                        } else if (positionRank <= firstPercentile) {
                                            backgroundColor = '#488f31';
                                            textColor='#ffffff';
                                        } else if (positionRank <= secondPercentile) {
                                            backgroundColor = '#87b474';
                                        } else if (positionRank <= thirdPercentile) {
                                            backgroundColor = '#c3d9b8';
                                        } else if (positionRank <= fourthPercentile) {
                                            backgroundColor = '#fffad6';
                                        } else if (positionRank <= fifthPercentile) {
                                            backgroundColor = '#fcc4c5';
                                        } else if (positionRank <= sixthPercentile) {
                                            backgroundColor = '#f1878e';
                                        } else {
                                            backgroundColor = '#de425b';
                                            textColor='#ffffff';
                                        }
                                        return [backgroundColor,textColor];
                                    }

                                    let [backgroundColor,textColor] = getBackgroundColor(position,positionRank,playerStatsItem);


                                    const getNextPlayerInfo = (currentPick: DraftPick | undefined): [PlayerYearStats | undefined, number | undefined, string | undefined, string | undefined, DraftPick | undefined] => {
                                        if(currentPick === undefined) {
                                            return [undefined, undefined, undefined, undefined, undefined];
                                        }
                                        const currentPickIndex = draftPicks.findIndex(p => p.pick_no === currentPick.pick_no);
                                        
                                        if (currentPickIndex === -1) {
                                            return [undefined, undefined, undefined, undefined, undefined];
                                        }
                                    
                                        const playerIndex = draftPicks.findIndex(
                                            (nextPick, nextIndex) => nextIndex > currentPickIndex && nextPick.metadata.position === position
                                        );
                                    
                                        if (playerIndex === -1) {
                                            return [undefined, undefined, undefined, undefined, undefined];
                                        }
                                    
                                        const playerStats =
                                            playerIndex !== -1 ? getPlayerStats(draftPicks[playerIndex].player_id, allPlayerStats) : undefined;
                                    
                                        const playerRank =
                                            allPlayerStats &&
                                            positionOrderedLists[position]?.findIndex(
                                                (player) => player.player_id === draftPicks[playerIndex].player_id
                                            ) + 1;
                                    
                                        const [backgroundColor,textColor] = getBackgroundColor(position, playerRank, playerStats);

                                        return [playerStats, playerRank, backgroundColor,textColor,draftPicks[playerIndex]];
                                    };

                                    // Get information for next, second, and third players using the getNextPlayerInfo function
                                    const [nextPlayerStats, nextPlayerRank,nextBackgroundColor,nextTextColor,nextPick] = getNextPlayerInfo(pick);
                                    const [secondPlayerStats, secondPlayerRank,secondBackgroundColor,secondTextColor,secondPick] = getNextPlayerInfo(nextPick);
                                    const [thirdPlayerStats, thirdPlayerRank,thirdBackgroundColor,thirdTextColor,thirdPick] = getNextPlayerInfo(secondPick);

                                    return (
                                        <tr key={pick.pick_no}>
                                            <td style={{ backgroundColor: backgroundColor, color:textColor }}>{pick.pick_no}</td>
                                            <td style={{ backgroundColor: backgroundColor, color:textColor  }}>{`${pick.metadata.first_name} ${pick.metadata.last_name}`}</td>
                                            <td style={{ backgroundColor: backgroundColor, color:textColor  }}>{positionRank}</td>
                                            <td style={{ backgroundColor: nextBackgroundColor, color:nextTextColor  }}>{nextPlayerStats ? `${nextPlayerStats.player.first_name} ${nextPlayerStats.player.last_name}` : ''}</td>
                                            <td style={{ backgroundColor: nextBackgroundColor, color:nextTextColor  }}>{nextPlayerRank || ''}</td>
                                            <td style={{ backgroundColor: secondBackgroundColor, color:secondTextColor  }}>{secondPlayerStats ? `${secondPlayerStats.player.first_name} ${secondPlayerStats.player.last_name}` : ''}</td>
                                            <td style={{ backgroundColor: secondBackgroundColor, color:secondTextColor  }}>{secondPlayerRank || ''}</td>
                                            <td style={{ backgroundColor: thirdBackgroundColor, color:thirdTextColor  }}>{thirdPlayerStats ? `${thirdPlayerStats.player.first_name} ${thirdPlayerStats.player.last_name}` : ''}</td>
                                            <td style={{ backgroundColor: thirdBackgroundColor, color:thirdTextColor  }}>{thirdPlayerRank || ''}</td>
                                            {/* Add additional table cells based on the draft pick properties */}
                                        </tr>
                                    );
                                })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default DraftReportCard;