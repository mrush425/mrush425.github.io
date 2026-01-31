import React, { useMemo, useState, useEffect } from 'react';
import { RecordComponentProps } from '../../../Interfaces/RecordStatItem'; 
import LeagueData from '../../../Interfaces/LeagueData';
import SleeperUser from '../../../Interfaces/SleeperUser';
import { calculatePlayoffPoints, calculatePlayoffPointsAgainst } from '../../../Helper Files/PointCalculations';


// =========================================================================
// TYPE DEFINITIONS
// =========================================================================

interface TeamPlayoffAveragePoints {
    userId: string;
    teamName: string;
    yearsPlayed: number;
    totalPoints: number;
    totalGamesPlayed: number;
    // Points Scored
    avgPointsPerGameValue: number;
    avgPointsPerGameDisplay: string;
    // Points Against
    totalPointsAgainst: number;
    avgPointsAgainstPerGameValue: number;
    avgPointsAgainstPerGameDisplay: string;
}

interface YearlyTeamPlayoffPoints {
    year: number;
    points: number;
    games: number;
    avgPoints: number;
    avgPointsDisplay: string;
    // Points Against
    pointsAgainst: number;
    avgPointsAgainst: number;
    avgPointsAgainstDisplay: string;
}

type SortKey = keyof TeamPlayoffAveragePoints; 
interface SortConfig {
    key: SortKey | null;
    direction: 'ascending' | 'descending';
}

interface MaxMinPlayoffPointsStats {
    yearsPlayed: { max: number; min: number };
    avgPointsPerGameValue: { max: number; min: number };
    avgPointsAgainstPerGameValue: { max: number; min: number };
}

// =========================================================================
// CORE LOGIC: Aggregation and Calculation
// =========================================================================

const aggregatePlayoffAveragePoints = (data: LeagueData[]): TeamPlayoffAveragePoints[] => {
    const allUserIDs = new Set<string>();
    data.forEach(league => {
        league.users.forEach(user => allUserIDs.add(user.user_id));
    });

    const results: { [userId: string]: Partial<TeamPlayoffAveragePoints> & { yearsPlayed: number, totalPoints: number, totalGamesPlayed: number, totalPointsAgainst: number, teamName: string } } = {};

    Array.from(allUserIDs).forEach(userId => {
        let totalPoints = 0;
        let totalPointsAgainst = 0;
        let totalGamesPlayed = 0;
        let yearsPlayed = 0; 
        let teamName = '';

        data.forEach(league => {
            const userInLeague = league.users.find(u => u.user_id === userId);

            if (userInLeague) {
                const { points: playoffPoints, gamesPlayed } = calculatePlayoffPoints(userInLeague as SleeperUser, league);
                const { points: playoffPointsAgainst, gamesPlayed: gamesPlayedAgainst } = calculatePlayoffPointsAgainst(userInLeague as SleeperUser, league);

                // Only count year if they played playoff games
                if (gamesPlayed > 0) {
                    yearsPlayed++; 
                    teamName = userInLeague.metadata.team_name || `User ${userId.substring(0, 4)}`;

                    totalPoints += playoffPoints;
                    totalPointsAgainst += playoffPointsAgainst;
                    // Use the games count from the points calculation (should be same as pointsAgainst)
                    totalGamesPlayed += gamesPlayed;
                }
            }
        });

        if (teamName && yearsPlayed > 0) {
            const avgPoints = totalGamesPlayed > 0 ? totalPoints / totalGamesPlayed : 0;
            const avgPointsRounded = Math.round(avgPoints * 100) / 100;
            
            const avgPointsAgainst = totalGamesPlayed > 0 ? totalPointsAgainst / totalGamesPlayed : 0;
            const avgPointsAgainstRounded = Math.round(avgPointsAgainst * 100) / 100;

            results[userId] = {
                userId: userId,
                teamName: teamName,
                yearsPlayed: yearsPlayed, 
                totalPoints: Math.round(totalPoints * 100) / 100, 
                totalGamesPlayed: totalGamesPlayed,
                avgPointsPerGameValue: avgPointsRounded,
                avgPointsPerGameDisplay: avgPointsRounded.toFixed(2),
                
                totalPointsAgainst: Math.round(totalPointsAgainst * 100) / 100,
                avgPointsAgainstPerGameValue: avgPointsAgainstRounded,
                avgPointsAgainstPerGameDisplay: avgPointsAgainstRounded.toFixed(2),
            };
        }
    });

    return Object.values(results) as TeamPlayoffAveragePoints[];
};

/**
 * Calculates a year-by-year breakdown for a single team's playoff points.
 */
const getYearlyPlayoffPointsBreakdown = (data: LeagueData[], userId: string): YearlyTeamPlayoffPoints[] => {
    const yearlyData: YearlyTeamPlayoffPoints[] = [];

    data.forEach(league => {
        const userInLeague = league.users.find(u => u.user_id === userId);

        if (userInLeague) {
            const year = Number.parseInt(league.season); 
            
            const { points: playoffPoints, gamesPlayed } = calculatePlayoffPoints(userInLeague as SleeperUser, league);
            const { points: playoffPointsAgainst } = calculatePlayoffPointsAgainst(userInLeague as SleeperUser, league);

            // Only include if they played playoff games
            if (gamesPlayed > 0) {
                const avgPoints = playoffPoints / gamesPlayed;
                const avgPointsRounded = Math.round(avgPoints * 100) / 100;

                const avgPointsAgainst = playoffPointsAgainst / gamesPlayed;
                const avgPointsAgainstRounded = Math.round(avgPointsAgainst * 100) / 100;

                yearlyData.push({
                    year: year,
                    points: Math.round(playoffPoints * 100) / 100,
                    games: gamesPlayed,
                    avgPoints: avgPointsRounded,
                    avgPointsDisplay: avgPointsRounded.toFixed(2),

                    pointsAgainst: Math.round(playoffPointsAgainst * 100) / 100,
                    avgPointsAgainst: avgPointsAgainstRounded,
                    avgPointsAgainstDisplay: avgPointsAgainstRounded.toFixed(2)
                });
            }
        }
    });

    return yearlyData.sort((a, b) => b.year - a.year);
};


// =========================================================================
// YEARLY BREAKDOWN SUB-COMPONENT (RIGHT PANE)
// =========================================================================

interface YearlyPlayoffPointsBreakdownProps {
    data: LeagueData[];
    selectedTeam: TeamPlayoffAveragePoints;
}

const YearlyPlayoffPointsBreakdown: React.FC<YearlyPlayoffPointsBreakdownProps> = ({ data, selectedTeam }) => {
    
    const yearlyStats = useMemo(() => {
        return getYearlyPlayoffPointsBreakdown(data, selectedTeam.userId);
    }, [data, selectedTeam.userId]);

    return (
        <div className="detail-pane">
            <table className="leagueStatsTable detail-table">
                <thead>
                    <tr>
                        <th className="table-col-1">Year</th>
                        <th className="table-col-2">Avg. Points/Game</th>
                        <th className="table-col-2">Avg. Points Against</th>
                    </tr>
                </thead>
                <tbody>
                    {yearlyStats.map((stat) => (
                        <tr key={stat.year}>
                            <td>{stat.year}</td>
                            <td>
                                {stat.avgPointsDisplay} ({stat.points.toFixed(2)})
                            </td>
                            <td>
                                {stat.avgPointsAgainstDisplay} ({stat.pointsAgainst.toFixed(2)})
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {yearlyStats.length === 0 && (
                <div className="notImplementedMessage">No yearly playoff data available for this team.</div>
            )}
        </div>
    );
};

// =========================================================================
// MAIN COMPONENT
// =========================================================================

const PlayoffAveragePointsPerGame: React.FC<RecordComponentProps & { minYears?: number }> = ({
    data,
    minYears = 0,
}) => {
    const [sortConfig, setSortConfig] = React.useState<SortConfig>({
        key: 'avgPointsPerGameValue',
        direction: 'descending',
    });
    const [selectedTeam, setSelectedTeam] = React.useState<TeamPlayoffAveragePoints | null>(null);
    const [isMobile, setIsMobile] = React.useState(false);
    const [showMobileDetail, setShowMobileDetail] = React.useState(false);

    const { sortedTeams, maxMinValues } = useMemo(() => {
        const teams = aggregatePlayoffAveragePoints(data).filter(t => t.yearsPlayed >= minYears);
        
        if (teams.length === 0) {
            return { sortedTeams: [], maxMinValues: { yearsPlayed: { max: 0, min: 0 }, avgPointsPerGameValue: { max: 0, min: 0 }, avgPointsAgainstPerGameValue: { max: 0, min: 0 } } };
        }

        const maxMinStats: MaxMinPlayoffPointsStats = {
            yearsPlayed: {
                max: Math.max(...teams.map(t => t.yearsPlayed)),
                min: Math.min(...teams.map(t => t.yearsPlayed)),
            },
            avgPointsPerGameValue: {
                max: Math.max(...teams.map(t => t.avgPointsPerGameValue)),
                min: Math.min(...teams.map(t => t.avgPointsPerGameValue)),
            },
            avgPointsAgainstPerGameValue: {
                max: Math.max(...teams.map(t => t.avgPointsAgainstPerGameValue)),
                min: Math.min(...teams.map(t => t.avgPointsAgainstPerGameValue)),
            },
        };

        let sorted = [...teams];
        if (sortConfig.key) {
            sorted.sort((a, b) => {
                if (sortConfig.key === 'teamName') {
                    return a.teamName.localeCompare(b.teamName) * (sortConfig.direction === 'ascending' ? 1 : -1);
                }
                const aVal = a[sortConfig.key!];
                const bVal = b[sortConfig.key!];
                if (typeof aVal === 'number' && typeof bVal === 'number') {
                    return (aVal - bVal) * (sortConfig.direction === 'ascending' ? 1 : -1);
                }
                return 0;
            });
        }

        return { sortedTeams: sorted, maxMinValues: maxMinStats };
    }, [data, minYears, sortConfig]);

    useEffect(() => {
        if (!selectedTeam && sortedTeams.length > 0) {
            setSelectedTeam(sortedTeams[0]);
        }
    }, [sortedTeams, selectedTeam]);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const handleSort = (key: SortKey) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'ascending' ? 'descending' : 'ascending',
        }));
    };

    const getSortIndicator = (key: SortKey) => {
        if (sortConfig.key !== key) return null;
        return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
    };

    const getCellClassName = (key: keyof MaxMinPlayoffPointsStats, value: number): string => {
        const stats = maxMinValues[key];
        if (!stats || stats.max === stats.min) return '';

        if (key === 'avgPointsPerGameValue') {
            if (value === stats.max) return 'highlight-best';
            if (value === stats.min) return 'highlight-worst';
        }

        if (key === 'avgPointsAgainstPerGameValue') {
            if (value === stats.min) return 'highlight-best';
            if (value === stats.max) return 'highlight-worst';
        }

        return '';
    };

    if (sortedTeams.length === 0) {
        return (
            <div className="playoff-average-points">
                <div className="notImplementedMessage">
                    No playoff data found (min years: {minYears})
                </div>
            </div>
        );
    }

    const handleBackToList = () => {
        setShowMobileDetail(false);
    };

    return (
        <div className="playoff-average-points">
            {isMobile && showMobileDetail && (
                <button onClick={handleBackToList} className="mobile-back-button">
                    ← Back to List
                </button>
            )}
            <div className="two-pane-layout">
                {/* LEFT PANE: MAIN TABLE */}
                <div className={`main-table-pane ${isMobile && showMobileDetail ? 'mobile-hidden' : ''}`}>
                    <table className="leagueStatsTable regular-season-table selectable-table">
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('teamName')} className="table-col-team sortable">
                                    Team (Years) {getSortIndicator('teamName')}
                                </th>
                                
                                <th onClick={() => handleSort('avgPointsPerGameValue')} className="table-col-2 sortable">
                                    Avg. Points/Game {getSortIndicator('avgPointsPerGameValue')}
                                </th>
                                
                                <th onClick={() => handleSort('avgPointsAgainstPerGameValue')} className="table-col-2 sortable">
                                    Avg. Points Against {getSortIndicator('avgPointsAgainstPerGameValue')}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedTeams.map((team, index) => (
                                <tr
                                    key={team.userId}
                                    className={`${selectedTeam?.userId === team.userId ? 'active selected-row' : ''} ${index % 2 === 0 ? 'even-row' : 'odd-row'}`}
                                    onClick={() => {
                                        setSelectedTeam(team);
                                        if (isMobile) setShowMobileDetail(true);
                                    }}
                                >
                                    <td className="team-name-cell">{team.teamName} ({team.yearsPlayed})</td>
                                    
                                    <td className={getCellClassName('avgPointsPerGameValue', team.avgPointsPerGameValue)}>
                                        {team.avgPointsPerGameDisplay} ({team.totalPoints.toFixed(2)})
                                    </td>
                                    
                                    <td className={getCellClassName('avgPointsAgainstPerGameValue', team.avgPointsAgainstPerGameValue)}>
                                        {team.avgPointsAgainstPerGameDisplay} ({team.totalPointsAgainst.toFixed(2)})
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* RIGHT PANE: YEARLY BREAKDOWN */}
                <div className={`detail-pane-wrapper ${isMobile && !showMobileDetail ? 'mobile-hidden' : ''}`}>
                    {selectedTeam ? (
                        <YearlyPlayoffPointsBreakdown data={data} selectedTeam={selectedTeam} />
                    ) : (
                        <div className="notImplementedMessage">
                            Select a team from the table to see a yearly playoff points breakdown.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PlayoffAveragePointsPerGame;
