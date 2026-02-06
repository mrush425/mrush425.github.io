import React, { useState, useEffect } from 'react';
import LeagueData from '../../Interfaces/LeagueData';
import YearNavBar from '../../Navigation/YearNavBar';
import DraftPick from '../../Interfaces/DraftPick';
import PlayerYearStats from '../../Interfaces/PlayerYearStats';
import '../../Stylesheets/YearStylesheets/DraftReportCard.css'; // Create a CSS file for styling
import DraftInfo from '../../Interfaces/DraftInfo';
import TeamDropdown from './TeamDropdown'; // Adjust the path accordingly
import {getBackgroundAndTextColor, getPlayerStats } from './SharedDraftMethods';
import { fetchDraftData } from '../../SleeperApiMethods';

interface DraftReportCardProps {
    data: LeagueData;
}

let positionOrderedLists: Record<string, PlayerYearStats[]> = {};

const DraftReportCard: React.FC<DraftReportCardProps> = ({ data }) => {

    const users = data.users;
    
    const [draftPicks, setDraftPicks] = useState<DraftPick[]>([]);
    const [draftInfo, setDraftInfo] = useState<DraftInfo[]>([]);
    const [allPlayerStats, setPlayerStats] = useState<PlayerYearStats[]>([]);
    const [isLoading, setIsLoading] = useState(true);


    useEffect(() => {
        const fetchDataFromApi = async () => {
            try {
                const [picks, info, pStatsData, pOrderedLists] = await fetchDraftData(data.draft_id, data.league_id, data.season);
                setDraftPicks(picks);
                setDraftInfo(info);
                setPlayerStats(pStatsData);
                positionOrderedLists=pOrderedLists;
                // ... (rest of the code)
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setIsLoading(false);
            }
        };
    
        fetchDataFromApi();
    }, [data.draft_id, data.league_id, data.season]);

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

    // Add a function to get user_id from team_name
    const getUserIdFromTeamName = (teamName: string): string | undefined => {
        const user = users.find((u) => u.metadata.team_name === teamName);
        return user?.user_id;
    };

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <YearNavBar data={data} />

            {/* Render the TeamDropdown component */}
            <TeamDropdown users={users} onSelectTeam={handleTeamSelect} />

            {/* Render other components or data based on the selected team */}
            {selectedTeam && (
                <div>
                    {/* Display table of draft picks for the selected team */}
                    <div className="horizontal-scroll">
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

                                    let [backgroundColor,textColor] = getBackgroundAndTextColor(position,positionRank,playerStatsItem,positionOrderedLists);


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
                                    
                                        const [backgroundColor,textColor] = getBackgroundAndTextColor(position, playerRank, playerStats,positionOrderedLists);

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
                </div>
            )}
        </div>
    );
};

export default DraftReportCard;