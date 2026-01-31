import React, { useMemo, useState, useEffect } from 'react';
import { RecordComponentProps } from '../../../Interfaces/RecordStatItem'; 
import LeagueData from '../../../Interfaces/LeagueData';
import SleeperUser from '../../../Interfaces/SleeperUser';
import { calculateYearPoints, calculateYearPointsAgainst } from '../../../Helper Files/PointCalculations';


// =========================================================================
// TYPE DEFINITIONS
// =========================================================================

interface TeamRegularSeasonPoints {
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

interface YearlyTeamPoints {
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

type SortKey = keyof TeamRegularSeasonPoints; 
interface SortConfig {
    key: SortKey | null;
    direction: 'ascending' | 'descending';
}

interface MaxMinPointsStats {
    yearsPlayed: { max: number; min: number };
    avgPointsPerGameValue: { max: number; min: number };
    avgPointsAgainstPerGameValue: { max: number; min: number };
}

// =========================================================================
// CORE LOGIC: Aggregation and Calculation
// =========================================================================

const aggregateRegularSeasonPoints = (data: LeagueData[]): TeamRegularSeasonPoints[] => {
    const allUserIDs = new Set<string>();
    data.forEach(league => {
        league.users.forEach(user => allUserIDs.add(user.user_id));
    });

    const results: { [userId: string]: Partial<TeamRegularSeasonPoints> & { yearsPlayed: number, totalPoints: number, totalGamesPlayed: number, totalPointsAgainst: number, teamName: string } } = {};

    Array.from(allUserIDs).forEach(userId => {
        let totalPoints = 0;
        let totalPointsAgainst = 0;
        let totalGamesPlayed = 0;
        let yearsPlayed = 0; 
        let teamName = '';

        data.forEach(league => {
            const userInLeague = league.users.find(u => u.user_id === userId);

            if (userInLeague) {
                yearsPlayed++; 
                teamName = userInLeague.metadata.team_name || `User ${userId.substring(0, 4)}`;

                const roster = league.rosters.find(r => r.owner_id === userId);
                if (roster) {
                    const user = userInLeague as SleeperUser; 
                    
                    const yearPoints = calculateYearPoints(user, league); 
                    totalPoints += yearPoints;

                    const yearPointsAgainst = calculateYearPointsAgainst(user, league);
                    totalPointsAgainst += yearPointsAgainst;

                    const games = roster.settings.wins + roster.settings.losses + roster.settings.ties;
                    totalGamesPlayed += games;
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

    return Object.values(results) as TeamRegularSeasonPoints[];
};

/**
 * Calculates a year-by-year breakdown for a single team.
 */
const getYearlyPointsBreakdown = (data: LeagueData[], userId: string): YearlyTeamPoints[] => {
    const yearlyData: YearlyTeamPoints[] = [];

    data.forEach(league => {
        const userInLeague = league.users.find(u => u.user_id === userId);
        const roster = league.rosters.find(r => r.owner_id === userId);

        if (userInLeague && roster) {
            const year = Number.parseInt(league.season); 
            
            const yearPoints = calculateYearPoints(userInLeague as SleeperUser, league);
            const games = roster.settings.wins + roster.settings.losses + roster.settings.ties;
            const avgPoints = games > 0 ? yearPoints / games : 0;
            const avgPointsRounded = Math.round(avgPoints * 100) / 100;

            const yearPointsAgainst = calculateYearPointsAgainst(userInLeague as SleeperUser, league);
            const avgPointsAgainst = games > 0 ? yearPointsAgainst / games : 0;
            const avgPointsAgainstRounded = Math.round(avgPointsAgainst * 100) / 100;

            yearlyData.push({
                year: year,
                points: Math.round(yearPoints * 100) / 100,
                games: games,
                avgPoints: avgPointsRounded,
                avgPointsDisplay: avgPointsRounded.toFixed(2),

                pointsAgainst: Math.round(yearPointsAgainst * 100) / 100,
                avgPointsAgainst: avgPointsAgainstRounded,
                avgPointsAgainstDisplay: avgPointsAgainstRounded.toFixed(2)
            });
        }
    });

    return yearlyData.sort((a, b) => b.year - a.year);
};


// =========================================================================
// YEARLY BREAKDOWN SUB-COMPONENT (RIGHT PANE)
// =========================================================================

interface YearlyPointsBreakdownProps {
    data: LeagueData[];
    selectedTeam: TeamRegularSeasonPoints;
}

const YearlyPointsBreakdown: React.FC<YearlyPointsBreakdownProps> = ({ data, selectedTeam }) => {
    
    const yearlyStats = useMemo(() => {
        return getYearlyPointsBreakdown(data, selectedTeam.userId);
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
                <div className="notImplementedMessage">No yearly data available for this team.</div>
            )}
        </div>
    );
};


// =========================================================================
// MAIN REACT COMPONENT (RegularSeasonPoints)
// =========================================================================

const RegularSeasonPoints: React.FC<RecordComponentProps & { minYears?: number }> = ({ data, minYears = 0 }) => {
    
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'avgPointsPerGameValue', direction: 'descending' });
    const [selectedTeam, setSelectedTeam] = useState<TeamRegularSeasonPoints | null>(null);
    const [isMobile, setIsMobile] = useState(false);
    const [showMobileDetail, setShowMobileDetail] = useState(false);

    // Sorting by teamName is the only column that needs to be manually implemented for the yearsPlayed to be sortable
    const handleSort = (key: SortKey) => {
        let direction: SortConfig['direction'] = 'descending';
        
        if (sortConfig.key === key && sortConfig.direction === 'descending') {
            direction = 'ascending';
        } else if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            key = 'avgPointsPerGameValue'; 
            direction = 'descending';
        }
        
        setSortConfig({ key, direction });
    };

    const handleRowClick = (team: TeamRegularSeasonPoints) => {
        setSelectedTeam(prev => (prev?.userId === team.userId ? null : team));
        if (isMobile) setShowMobileDetail(true);
    };


    const { sortedPoints, maxMinValues } = useMemo(() => {
        let allItems = aggregateRegularSeasonPoints(data);
        
        let sortableItems = allItems.filter(record => record.yearsPlayed >= minYears && record.totalGamesPlayed > 0);

        if (sortableItems.length === 0) {
            const emptyMaxMin: MaxMinPointsStats = {
                yearsPlayed: { max: 0, min: 0 },
                avgPointsPerGameValue: { max: 0, min: 0 },
                avgPointsAgainstPerGameValue: { max: 0, min: 0 },
            };
            return { sortedPoints: [], maxMinValues: emptyMaxMin };
        }

        const avgValues = sortableItems.map(r => r.avgPointsPerGameValue);
        const avgAgainstValues = sortableItems.map(r => r.avgPointsAgainstPerGameValue); 
        const yearsValues = sortableItems.map(r => r.yearsPlayed);

        const maxMinValues: MaxMinPointsStats = {
            avgPointsPerGameValue: { 
                max: Math.max(...avgValues), 
                min: Math.min(...avgValues) 
            },
            avgPointsAgainstPerGameValue: {
                max: Math.max(...avgAgainstValues), 
                min: Math.min(...avgAgainstValues) 
            },
            yearsPlayed: {
                max: Math.max(...yearsValues),
                min: Math.min(...yearsValues)
            }
        };

        if (sortConfig.key !== null) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key!];
                const bValue = b[sortConfig.key!];

                if (sortConfig.key === 'teamName') {
                    // Custom sorting for teamName (which will fall back to yearsPlayed if names are equal)
                    if (a.teamName < b.teamName) return sortConfig.direction === 'ascending' ? -1 : 1;
                    if (a.teamName > b.teamName) return sortConfig.direction === 'ascending' ? 1 : -1;
                    // If team names are the same, sort by yearsPlayed
                    return sortConfig.direction === 'ascending' ? a.yearsPlayed - b.yearsPlayed : b.yearsPlayed - a.yearsPlayed;
                }
                
                else if (typeof aValue === 'number' && typeof bValue === 'number') {
                    const isAgainst = sortConfig.key === 'avgPointsAgainstPerGameValue';
                    
                    if (isAgainst) {
                        // For points against, descending is best (lowest value is better)
                        if (sortConfig.direction === 'ascending') return aValue - bValue; 
                        return bValue - aValue;
                    } else {
                        // For points scored, descending is best (highest value is better)
                        if (sortConfig.direction === 'ascending') return aValue - bValue;
                        return bValue - aValue;
                    }
                }
                return 0;
            });
        }
        
        if (selectedTeam && !sortableItems.find(t => t.userId === selectedTeam.userId)) {
             setSelectedTeam(null);
        }
        
        return { sortedPoints: sortableItems, maxMinValues };
    }, [data, sortConfig, minYears, selectedTeam]);

    useEffect(() => {
        if (!selectedTeam && sortedPoints.length > 0) {
            setSelectedTeam(sortedPoints[0]);
        }
    }, [sortedPoints, selectedTeam]);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);


    // Removed getSortIndicator for 'yearsPlayed' since it's now part of 'teamName' or implicit.
    const getSortIndicator = (key: SortKey) => {
        if (sortConfig.key !== key) return null;
        return sortConfig.direction === 'ascending' ? ' \u25B2' : ' \u25BC';
    };

    const getCellClassName = (key: keyof MaxMinPointsStats, value: number): string => {
        const { max, min } = maxMinValues[key];
        
        if (max === min) return ''; 
        
        if (key === 'avgPointsPerGameValue') {
            if (value === max) return 'highlight-best';
            if (value === min) return 'highlight-worst';
        }
        
        if (key === 'avgPointsAgainstPerGameValue') {
            if (value === min) return 'highlight-best'; // Lowest is best for Points Against
            if (value === max) return 'highlight-worst'; // Highest is worst for Points Against
        }
        
        return '';
    };
    
    if (sortedPoints.length === 0) {
        return (
            <div className="regular-season-points">
                <div className="notImplementedMessage">
                    No points data found for the current filter settings (min years: {minYears}).
                </div>
            </div>
        );
    }

    const handleBackToList = () => {
        setShowMobileDetail(false);
    };

    return (
        <div className="regular-season-points">
            {isMobile && showMobileDetail && (
                <button onClick={handleBackToList} className="mobile-back-button">
                    ← Back to List
                </button>
            )}
            <div className="two-pane-layout">
                
                {/* -------------------- LEFT PANE: MAIN TABLE -------------------- */}
                <div className={`main-table-pane ${isMobile && showMobileDetail ? 'mobile-hidden' : ''}`}>
                    <div className="table-scroll-container">
                        <table className="leagueStatsTable regular-season-table selectable-table\">
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('teamName')} className="table-col-2 sortable">
                                    Team (Years) {getSortIndicator('teamName')}
                                </th>
                                
                                <th onClick={() => handleSort('avgPointsPerGameValue')} className="table-col-2 sortable">
                                    Avg. Pts {getSortIndicator('avgPointsPerGameValue')}
                                </th>
                                
                                <th onClick={() => handleSort('avgPointsAgainstPerGameValue')} className="table-col-2 sortable">
                                    Avg. Pts Against {getSortIndicator('avgPointsAgainstPerGameValue')}
                                </th>
                                
                                {/* REMOVED 'Years' COLUMN */}
                            </tr>
                        </thead>
                        <tbody>
                            {sortedPoints.map((point, index) => (
                                <tr 
                                    key={point.userId} 
                                    className={`${selectedTeam?.userId === point.userId ? 'active selected-row' : ''} ${index % 2 === 0 ? 'even-row' : 'odd-row'}`}
                                    onClick={() => handleRowClick(point)}
                                >
                                    <td className="team-name-cell">{point.teamName} ({point.yearsPlayed})</td>
                                    
                                    <td className={getCellClassName('avgPointsPerGameValue', point.avgPointsPerGameValue)}>
                                        {point.avgPointsPerGameDisplay} ({point.totalPoints.toFixed(2)})
                                    </td>
                                    
                                    <td className={getCellClassName('avgPointsAgainstPerGameValue', point.avgPointsAgainstPerGameValue)}>
                                        {point.avgPointsAgainstPerGameDisplay} ({point.totalPointsAgainst.toFixed(2)})
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    </div>
                </div>

                {/* -------------------- RIGHT PANE: YEARLY BREAKDOWN -------------------- */}
                <div className={`detail-pane-wrapper ${isMobile && !showMobileDetail ? 'mobile-hidden' : ''}`}>
                    {selectedTeam ? (
                        <YearlyPointsBreakdown data={data} selectedTeam={selectedTeam} />
                    ) : (
                        <div className="notImplementedMessage">
                            Select a team from the table to see a yearly points breakdown.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RegularSeasonPoints;