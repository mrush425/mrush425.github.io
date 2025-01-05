import React, { useEffect, useState } from 'react';
import '../../Stylesheets/Hall of Fame Stylesheets/FootballPlayerChampions.css'
import HallOfFameNavBar from '../../Navigation/HallOfFameNavBar';
import HallOfFameProps from './HallOfFameProps';
import { findRosterByUserId, getLeagueWinner } from '../../Helper Files/HelperMethods';
import SleeperUser from '../../Interfaces/SleeperUser';
import SleeperRoster from '../../Interfaces/SleeperRoster';
import MatchupInfo from '../../Interfaces/MatchupInfo';
import Matchup from '../../Interfaces/Matchup';
import Player from '../../Interfaces/Player';



const FootballPlayerChampions: React.FC<HallOfFameProps> = ({ data }) => {

    const [playerData, setPlayerData] = useState<Player[]>([]);
    const [sortedFootballPlayers, setSortedFootballPlayers] = useState<Map<string, FootballPlayerChampionshipInfo[]>>(new Map());
    const [isLoading, setIsLoading] = useState(true);

    let footballPlayerChampionships: FootballPlayerChampionshipInfo[] = [];

    const getFootballPlayerChampions = () => {
        data.map((leagueData) => {
            const leagueWinner: SleeperUser | undefined = getLeagueWinner(leagueData);
            if (leagueWinner) {
                const leagueWinnerRosterId: SleeperRoster | undefined = findRosterByUserId(leagueWinner.user_id, leagueData.rosters);
                const matchupInfo: MatchupInfo | undefined = leagueData.matchupInfo.find((matchupInfo) => matchupInfo.week === leagueData.settings.playoff_week_start + 2);
                const matchup: Matchup | undefined = matchupInfo?.matchups.find((matchup) => matchup.roster_id === leagueWinnerRosterId?.roster_id);

                if (matchup) {
                    matchup.starters.map((starter) => {
                        let footballPlayerChampionshipInfo = footballPlayerChampionships.find((fpci) => fpci.footballPlayerId === starter);
                        if (footballPlayerChampionshipInfo) {
                            footballPlayerChampionshipInfo.wins++;
                            footballPlayerChampionshipInfo.years.push(leagueData.season);
                        }
                        else {
                            footballPlayerChampionshipInfo = {
                                footballPlayerId: starter,
                                wins: 1,
                                years: [leagueData.season]
                            };
                            footballPlayerChampionships.push(footballPlayerChampionshipInfo);
                        }
                    });
                }
            }
        });
        footballPlayerChampionships.sort((a, b) => b.wins - a.wins);

    }

    getFootballPlayerChampions();

    useEffect(() => {
        const fetchDataFromApi = async () => {
            const playerIds = footballPlayerChampionships.map((champion) => champion.footballPlayerId);
            const playerDataResponses = await Promise.all(
                playerIds.map((playerId) =>
                    fetch(
                        `https://api.sleeper.com/players/nfl/${playerId}`
                    )
                )
            );
            const playerStatsData = await Promise.all(
                playerDataResponses.map((response) => response.json())
            );
            
            setPlayerData(playerStatsData);
        };
    
        fetchDataFromApi();
    }, []); // Empty dependency array means this useEffect runs once after the initial render
    
    useEffect(() => {
        if (playerData.length > 0) {
            let sFootballPlayers = new Map<string, FootballPlayerChampionshipInfo[]>();
            sFootballPlayers.set("QB", []);
            sFootballPlayers.set("RB", []);
            sFootballPlayers.set("WR", []);
            sFootballPlayers.set("TE", []);
            sFootballPlayers.set("DEF", []);
            sFootballPlayers.set("K", []);
    
            footballPlayerChampionships.forEach((fpc: FootballPlayerChampionshipInfo) => {
                let position: string | null | undefined = playerData.find((p: Player) => p.player_id === fpc.footballPlayerId)?.position;
                if (position) {
                    sFootballPlayers.get(position)?.push(fpc);
                }
            });
    
            setSortedFootballPlayers(sFootballPlayers);
            setIsLoading(false);
        }
    }, [playerData]);

    const getLargestIndex = (): number => {
        let maxLength = 0;

        // Iterate through the values of the map
        sortedFootballPlayers.forEach((footballPlayers: FootballPlayerChampionshipInfo[]) => {
            // Update maxLength if the current array length is greater
            maxLength = Math.max(maxLength, footballPlayers.length);
        });
        return maxLength;
    }

    const getFootballPlayerDisplay = (playerId: string): string => {
        return "";
    }

    if (isLoading) {
        return (
            <div>
                <HallOfFameNavBar data={data} />
                Loading...
            </div>
        );
    } else {
        //console.log(playerData);
    }

    const renderInnerTable = (playerInfo: FootballPlayerChampionshipInfo): React.ReactNode => {
        if (playerInfo.footballPlayerId && playerInfo.years) {
            const player = playerData.find((p) => p.player_id === playerInfo.footballPlayerId);
            if (player) {
                return (
                    <table>
                        <tbody>
                            {playerInfo.years.map((year, index) => (
                                <tr key={index}>
                                    <td>{index === 0 ? `${player.first_name} ${player.last_name}` : ""}</td>
                                    <td>🏆 {year}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                );
            }
        }
        return null;
    };
    
    
    const renderPlayerCell = (position: string, index: number): React.ReactNode => {
        const playerInfos = sortedFootballPlayers.get(position);
        if (playerInfos && playerInfos.length > index) {
            const playerInfo = playerInfos[index];
            return renderInnerTable(playerInfo);
        }
        return null;
    };
    
    
    return (
        <div>
            <HallOfFameNavBar data={data} />
            <h2>Football Players with Championships</h2>
            <table className='football-player-championships-table'>
                <thead>
                    <tr>
                        <td>QB</td>
                        <td>RB</td>
                        <td>WR</td>
                        <td>TE</td>
                        <td>DEF</td>
                        <td>K</td>
                    </tr>
                </thead>
                <tbody>
                {Array.from({ length: getLargestIndex() }).map((_, index) => (
                    <tr key={index}>
                    <td>{renderPlayerCell("QB", index)}</td>
                    <td>{renderPlayerCell("RB", index)}</td>
                    <td>{renderPlayerCell("WR", index)}</td>
                    <td>{renderPlayerCell("TE", index)}</td>
                    <td>{renderPlayerCell("DEF", index)}</td>
                    <td>{renderPlayerCell("K", index)}</td>
                </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}

interface FootballPlayerChampionshipInfo {
    footballPlayerId: string,
    wins: number,
    years: string[]
}


export default FootballPlayerChampions;